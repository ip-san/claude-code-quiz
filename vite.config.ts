import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

// Custom plugin to build preload as CommonJS
function buildPreloadCJS(): Plugin {
  return {
    name: 'build-preload-cjs',
    async buildStart() {
      // Ensure dist-electron exists
      if (!existsSync('dist-electron')) {
        mkdirSync('dist-electron', { recursive: true })
      }

      // Build preload with esbuild as CommonJS
      const result = await build({
        entryPoints: ['electron/preload.ts'],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        outfile: 'dist-electron/preload.cjs',
        external: ['electron'],
      })
    },
    configureServer(server) {
      // Rebuild preload on file change
      server.watcher.on('change', async (file) => {
        if (file.includes('preload.ts')) {
          await build({
            entryPoints: ['electron/preload.ts'],
            bundle: true,
            platform: 'node',
            target: 'node18',
            format: 'cjs',
            outfile: 'dist-electron/preload.cjs',
            external: ['electron'],
          })
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    buildPreloadCJS(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
