/**
 * Vite Configuration for Electron + React
 *
 * 【重要な設計判断】
 * このプロジェクトでは package.json に "type": "module" を設定しているため、
 * Electron の main / preload スクリプトで ESM/CommonJS の競合が発生する。
 *
 * 【問題】
 * 1. Electron 31 (Node v20.18.0) で ESM 形式の main.js を読み込むと
 *    cjsPreparseModuleExports でクラッシュする既知の問題がある
 * 2. preload スクリプトも CommonJS 形式でなければならない
 * 3. "type": "module" があると .js ファイルは ESM として解釈される
 * 4. vite-plugin-electron は内部で esbuild を使用し、format 設定を無視する
 *
 * 【解決策】
 * - vite-plugin-electron を使わず、esbuild で直接 CJS 形式に変換
 * - .cjs 拡張子は "type": "module" の影響を受けず、常に CommonJS として解釈される
 * - dev モードでは Vite サーバー起動後に Electron プロセスを自動起動
 */

import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { build } from 'esbuild'
import { mkdirSync, existsSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'

/**
 * Electron の main.ts と preload.ts を CJS 形式でビルドし、
 * dev モードでは Electron プロセスを自動起動するプラグイン
 */
function buildElectronCJS(): Plugin {
  const esbuildOptions = {
    bundle: true,
    platform: 'node' as const,
    target: 'node18',
    format: 'cjs' as const,
    external: ['electron'],
  }

  let electronProcess: ChildProcess | null = null

  async function buildAll() {
    if (!existsSync('dist-electron')) {
      mkdirSync('dist-electron', { recursive: true })
    }

    await Promise.all([
      build({
        ...esbuildOptions,
        entryPoints: ['electron/main.ts'],
        outfile: 'dist-electron/main.cjs',
      }),
      build({
        ...esbuildOptions,
        entryPoints: ['electron/preload.ts'],
        outfile: 'dist-electron/preload.cjs',
      }),
    ])
  }

  function startElectron() {
    // 既存の Electron プロセスを終了
    if (electronProcess) {
      electronProcess.kill()
      electronProcess = null
    }

    // Electron プロセスを起動
    // ELECTRON_RUN_AS_NODE を削除（VSCode 等の Electron ベース環境から継承されると
    // Electron が Node.js モードで起動してしまい、GUI が表示されない）
    const electronBin = resolve('node_modules', '.bin', 'electron')
    const env = { ...process.env, NODE_ENV: 'development' }
    delete env.ELECTRON_RUN_AS_NODE
    // shell: true で Windows の .cmd ファイルも正しく実行される
    electronProcess = spawn(electronBin, ['.'], {
      stdio: 'inherit',
      env,
      shell: true,
    })

    electronProcess.on('close', (code) => {
      if (code !== null) {
        // Electron が正常終了した場合、Vite サーバーも終了
        process.exit(0)
      }
    })
  }

  return {
    name: 'build-electron-cjs',

    // プロダクションビルド時に Electron ファイルをビルド
    async buildStart() {
      await buildAll()
    },

    // dev モード: Electron 自動起動 + ファイル監視
    configureServer(server) {
      // Vite サーバー起動後に Electron をビルド & 起動
      server.httpServer?.once('listening', async () => {
        await buildAll()
        startElectron()
      })

      // Electron ファイルの変更を監視して再ビルド & 再起動
      server.watcher.on('change', async (file) => {
        // Windows のバックスラッシュパスでもマッチするよう正規化
        const normalized = file.replace(/\\/g, '/')
        if (normalized.includes('electron/main.ts') || normalized.includes('electron/preload.ts')) {
          await buildAll()
          startElectron()
        }
      })
    },
  }
}

export default defineConfig({
  // Electron用: 相対パスでアセットを読み込む（絶対パスだとfile://で動作しない）
  base: './',

  plugins: [
    react(),

    // main.ts と preload.ts を CJS 形式でビルド + dev 時に Electron 自動起動
    buildElectronCJS(),
  ],

  resolve: {
    alias: {
      // '@/...' で src/ からのパスを指定可能
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    strictPort: true, // ポートが使用中の場合はエラーにする
  },
})
