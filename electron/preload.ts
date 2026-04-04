/**
 * Electron Preload Script
 *
 * 【このファイルの役割】
 * Main プロセスと Renderer プロセスの「橋渡し」をする。
 * Renderer（React アプリ）から直接 Node.js API にアクセスさせず、
 * contextBridge を通じて安全な API のみを公開する。
 *
 * 【アーキテクチャ】
 * Main Process <-- IPC --> Preload Script <-- contextBridge --> Renderer Process
 *                          ^^^^^^^^^^^^^^^^
 *                          このファイル
 *
 * 【なぜ Preload スクリプトが必要なのか】
 * Electron のセキュリティモデルでは：
 * - nodeIntegration: false で Renderer から Node.js API へのアクセスを禁止
 * - contextIsolation: true で Preload と Renderer のグローバルオブジェクトを分離
 *
 * この状態で Renderer が Electron 機能（ファイル操作、クリップボード等）を
 * 使うには、Preload スクリプトで contextBridge.exposeInMainWorld() を使って
 * 明示的に API を公開する必要がある。
 *
 * 【重要：CommonJS 形式でビルドする必要がある】
 * このファイルは .cjs 形式で出力される。理由は vite.config.ts を参照。
 *
 * 要約：
 * - package.json に "type": "module" があるため .js は ESM として解釈される
 * - しかし Electron の preload は require() で読み込まれるため CommonJS が必要
 * - .cjs 拡張子にすることで "type": "module" の影響を受けなくなる
 *
 * 【ハマりポイント】
 * vite-plugin-electron の rollupOptions.output.format: 'cjs' は効かない。
 * カスタムプラグインで esbuild を直接呼び出して解決した。
 * 詳細は vite.config.ts の buildPreloadCJS() を参照。
 */

import { contextBridge, ipcRenderer } from 'electron'

/**
 * Renderer プロセスに公開する安全な API
 *
 * 【セキュリティ原則】
 * - 必要最小限の API のみ公開する
 * - ユーザー入力を直接 shell.openExternal() に渡さない（Main 側で検証）
 * - ファイルパスを Renderer に返さない（内容のみ返す）
 *
 * 【IPC 通信パターン】
 * ipcRenderer.invoke() を使用する理由：
 * - Promise ベースで async/await と相性が良い
 * - Main プロセスからの戻り値を受け取れる
 * - エラーハンドリングが容易
 *
 * 古い ipcRenderer.send()/on() パターンは使用しない。
 */
const electronAPI = {
  /**
   * 外部 URL をシステムのデフォルトブラウザで開く
   *
   * 【セキュリティ】
   * Main プロセス側で HTTPS のみ許可するバリデーションを行う。
   * Renderer から渡される URL を無条件で信頼しない。
   */
  openExternal: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke('open-external', url)
  },

  /**
   * テキストをシステムクリップボードにコピー
   */
  copyToClipboard: (text: string): Promise<boolean> => {
    return ipcRenderer.invoke('copy-to-clipboard', text)
  },

  /**
   * 学習進捗データのエクスポート
   *
   * Renderer から JSON 文字列を受け取り、Main プロセスで
   * ファイル保存ダイアログを表示してファイルに書き込む。
   */
  exportProgress: (data: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('export-progress', data)
  },

  /**
   * 学習進捗データのインポート
   */
  importProgress: (): Promise<{ success: boolean; data?: string; error?: string }> => {
    return ipcRenderer.invoke('import-progress')
  },

  /**
   * CSV ファイルのエクスポート
   */
  exportCsv: (data: string, defaultFilename: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('export-csv', data, defaultFilename)
  },
  /**
   * Claude Code 利用履歴を解析してレコメンド用データを返す（Electron限定）
   */
  analyzeUsage: (
    daysBack: number
  ): Promise<{
    tools: Record<string, number>
    topics: { topic: string; hits: number }[]
    categoryScores: Record<string, number>
    recommendedIds: string[]
    sessionCount: number
    promptSamples: string[]
  } | null> => {
    return ipcRenderer.invoke('analyze-usage', daysBack)
  },
  /**
   * /recommend スキルを Claude CLI 経由で実行する
   */
  runRecommendSkill: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('run-recommend-skill')
  },

  isRecommendRunning: (): Promise<boolean> => {
    return ipcRenderer.invoke('is-recommend-running')
  },

  /**
   * グローバルフックの設定/削除
   */
  setupGlobalHooks: (remove: boolean): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('setup-global-hooks', remove)
  },

  /**
   * グローバルフックが設定済みか確認
   */
  checkGlobalHooks: (): Promise<boolean> => {
    return ipcRenderer.invoke('check-global-hooks')
  },

  /**
   * SessionEnd フックが蓄積した今日のレコメンドデータを取得する
   */
  getCachedRecommend: (): Promise<{
    date: string
    sessionCount: number
    questionCount: number
    ids: string[]
    topCategories: string[]
    topics: { topic: string; hits: number }[]
    promptSamples: string[]
  } | null> => {
    return ipcRenderer.invoke('get-cached-recommend')
  },
} as const

/**
 * API を Renderer プロセスのグローバルオブジェクト（window）に公開
 *
 * 【使用方法】
 * Renderer（React）側では window.electronAPI.xxx() で呼び出す。
 * 型定義は src/types/electron.d.ts で行う。
 *
 * 【contextBridge の仕組み】
 * - Preload のコンテキストと Renderer のコンテキストは分離されている
 * - contextBridge は両者の間に安全な通信チャネルを作る
 * - 公開されたオブジェクトは自動的にシリアライズ/デシリアライズされる
 * - 関数は Proxy でラップされ、直接参照は渡されない
 */
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

/**
 * TypeScript 用の型エクスポート
 *
 * この型は src/types/electron.d.ts で使用される。
 * Window インターフェースを拡張して型安全性を確保する。
 */
export type ElectronAPI = typeof electronAPI
