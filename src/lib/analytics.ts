/**
 * アナリティクス抽象レイヤー
 *
 * GTM (Google Tag Manager) 経由で GA4 にイベントを送信する。
 * - GTM ID が未設定の場合は全操作が no-op になる
 * - Electron / PWA 両対応（platform パラメータで区別）
 * - dataLayer への push で GTM にイベントを渡す
 */

import { isElectron } from './platformAPI'

// Vite の環境変数から GTM ID を取得
const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined

/** アナリティクスが有効かどうか */
export const isAnalyticsEnabled = !!GTM_ID

/** プラットフォーム識別子（全イベントに自動付与） */
const PLATFORM = isElectron ? 'electron' : 'pwa'

// GTM の dataLayer 型定義
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

/**
 * GTM スクリプトを動的に挿入する
 * index.html に直接書くとCSPの管理が煩雑になるため、
 * ランタイムで挿入し、環境変数で制御可能にする
 */
export function initGTM(): void {
  if (!isAnalyticsEnabled || !GTM_ID) return

  // dataLayer 初期化
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  })

  // GTM スクリプト挿入
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`
  document.head.appendChild(script)
}

/**
 * dataLayer にイベントを送信する
 */
function pushEvent(event: string, params?: Record<string, unknown>): void {
  if (!isAnalyticsEnabled) return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event, platform: PLATFORM, ...params })
}

// ============================================================
// イベント定義
// ============================================================

/** チュートリアル完了/スキップ */
export function trackTutorial(action: 'complete' | 'skip', slideIndex?: number): void {
  pushEvent('tutorial_progress', {
    action,
    slide_index: slideIndex,
  })
}

/** クイズモード開始 */
export function trackQuizStart(mode: string, questionCount: number, category?: string): void {
  pushEvent('quiz_start', {
    quiz_mode: mode,
    question_count: questionCount,
    category: category ?? undefined,
  })
}

/** クイズモード完了 */
export function trackQuizComplete(
  mode: string,
  score: number,
  total: number,
  accuracy: number,
  durationSec: number
): void {
  pushEvent('quiz_complete', {
    quiz_mode: mode,
    score,
    total,
    accuracy,
    duration_sec: durationSec,
  })
}

/** チャプター進捗（全体像モード） */
export function trackChapterProgress(chapterId: number, action: 'start' | 'complete', accuracy?: number): void {
  pushEvent('chapter_progress', {
    chapter_id: chapterId,
    action,
    accuracy: accuracy ?? undefined,
  })
}

/** 「読んでから解く」モード利用 */
export function trackStudyFirst(chapterId: number, action: 'start_reading' | 'finish_reading' | 'start_quiz'): void {
  pushEvent('study_first', {
    chapter_id: chapterId,
    action,
  })
}

/** ブックマーク操作 */
export function trackBookmark(action: 'add' | 'remove'): void {
  pushEvent('bookmark', { action })
}

/** 検索利用 */
export function trackSearch(resultCount: number): void {
  pushEvent('quiz_search', { result_count: resultCount })
}

/** 解説リーダー利用 */
export function trackReaderOpen(): void {
  pushEvent('reader_open')
}

/** シェア */
export function trackShare(method: string): void {
  pushEvent('share_result', { method })
}

/** 修了証ダウンロード */
export function trackCertificate(mode: string): void {
  pushEvent('certificate_download', { quiz_mode: mode })
}
