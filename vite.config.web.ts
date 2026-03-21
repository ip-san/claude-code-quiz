/**
 * Vite Configuration for Web/PWA Build
 *
 * Electron用のvite.config.tsとは別に、Web版のビルド設定を定義。
 * GitHub Pages にデプロイするためのPWA設定を含む。
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  base: '/claude-code-quiz/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,ico}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Skip waiting — new service worker takes over immediately
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Claude Code Quiz',
        short_name: 'CC Quiz',
        description: 'Claude Code の機能と使い方を学習するクイズアプリ',
        theme_color: '#D97757',
        background_color: '#FAF9F5',
        display: 'standalone',
        scope: '/claude-code-quiz/',
        start_url: '/claude-code-quiz/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        orientation: 'portrait' as const,
        shortcuts: [
          { name: 'クイックスタート', url: '/claude-code-quiz/', description: 'クイズをすぐ開始' },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
  },

  server: {
    port: 5174,
  },
})
