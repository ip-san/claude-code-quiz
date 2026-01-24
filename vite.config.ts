/**
 * Vite Configuration for Electron + React
 *
 * 【重要な設計判断】
 * このプロジェクトでは package.json に "type": "module" を設定しているため、
 * Electron の preload スクリプトで ESM/CommonJS の競合が発生しました。
 *
 * 【ハマりポイント】
 * 1. Electron の preload スクリプトは CommonJS 形式でなければならない
 * 2. しかし "type": "module" があると .js ファイルは ESM として解釈される
 * 3. vite-plugin-electron の rollupOptions.output.format: 'cjs' は無視される
 *    （内部で esbuild を使用しているため）
 *
 * 【解決策】
 * - preload スクリプトは vite-plugin-electron から除外
 * - カスタム Vite プラグインで esbuild を直接呼び出し、.cjs 形式で出力
 * - .cjs 拡張子は "type": "module" の影響を受けず、常に CommonJS として解釈される
 *
 * 【エラー例】もし preload.js として出力した場合：
 * "ERR_REQUIRE_ESM: require() of ES Module ... not supported"
 */

import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { build } from 'esbuild'
import { mkdirSync, existsSync } from 'fs'

/**
 * カスタムプラグイン: preload スクリプトを CommonJS 形式でビルド
 *
 * 【なぜ vite-plugin-electron を使わないのか】
 * vite-plugin-electron は内部で esbuild を使用しており、
 * rollupOptions の format 設定を無視します。
 * そのため、preload スクリプトが ESM 形式で出力されてしまい、
 * Electron が読み込めなくなります。
 *
 * 【なぜ esbuild を直接使うのか】
 * esbuild は format: 'cjs' を正しく尊重し、
 * require() を使った純粋な CommonJS コードを出力します。
 */
function buildPreloadCJS(): Plugin {
  return {
    name: 'build-preload-cjs',

    /**
     * ビルド開始時に preload.cjs を生成
     */
    async buildStart() {
      if (!existsSync('dist-electron')) {
        mkdirSync('dist-electron', { recursive: true })
      }

      await build({
        entryPoints: ['electron/preload.ts'],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs', // ここが重要: CommonJS 形式を強制
        outfile: 'dist-electron/preload.cjs', // .cjs 拡張子で出力
        external: ['electron'], // electron は外部モジュールとして扱う
      })
    },

    /**
     * 開発サーバー起動時: preload.ts の変更を監視して再ビルド
     */
    configureServer(server) {
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
    },
  }
}

export default defineConfig({
  plugins: [
    react(),

    // 【順序重要】buildPreloadCJS を electron より前に配置
    // これにより、Electron 起動前に preload.cjs が確実に存在する
    buildPreloadCJS(),

    // main.ts のみを vite-plugin-electron でビルド
    // preload.ts は上記のカスタムプラグインで処理するため除外
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
      // 【注意】ここに preload の entry を追加しないこと！
      // 追加すると ESM 形式で出力されてしまう
    ]),

    // Renderer プロセスで Node.js API を使用可能にする
    electronRenderer(),
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
