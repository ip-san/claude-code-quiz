/**
 * UsageRecommend の早期リターン状態を表示するサブコンポーネント群。
 * メインカード表示前の3つの状態（セットアップ、分析、空セッション）を担当。
 */

import { Sparkles } from 'lucide-react'
import { locale } from '@/config/locale'
import { ProgressLabel } from './ProgressLabel'

const L = locale.recommend

/** フック未設定時のセットアップバナー */
export function SetupBanner({
  setupDone,
  onSetup,
  onDismiss,
}: {
  setupDone: boolean
  onSetup: () => void
  onDismiss: () => void
}) {
  return (
    <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-claude-orange" />
        <div className="flex-1">
          <p className="text-sm font-medium text-claude-dark dark:text-stone-200">{L.setupTitle}</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{L.setupDesc}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onSetup}
              className="tap-highlight rounded-lg bg-claude-orange px-4 py-2 text-xs font-medium text-white"
              aria-label={L.setupEnable}
            >
              {L.setupEnable}
            </button>
            <button
              onClick={onDismiss}
              className="tap-highlight rounded-lg px-4 py-2 text-xs text-stone-500"
              aria-label={L.setupLater}
            >
              {L.setupLater}
            </button>
          </div>
          {setupDone && <p className="mt-2 text-xs font-medium text-claude-orange">{L.setupDone}</p>}
        </div>
      </div>
    </div>
  )
}

/** 初回分析ボタン（プログレス付き） */
export function AnalyzeButton({
  loading,
  aiError,
  onAnalyze,
  elapsed = 0,
}: {
  loading: boolean
  aiError: string | null
  onAnalyze: () => void
  elapsed?: number
}) {
  // 漸近的プログレス: 90秒で約85%、完了まで100%にならない
  const estimatedTotal = 90
  const progress = loading ? Math.min((1 - Math.exp(-elapsed / estimatedTotal)) * 95, 95) : 0

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
      <button
        onClick={onAnalyze}
        disabled={loading}
        aria-label={L.analyzeLabel}
        className="tap-highlight flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-claude-orange" />
        ) : (
          <Sparkles className="h-5 w-5 text-claude-orange" />
        )}
        <div className="flex-1">
          <div className="text-sm font-medium text-claude-dark dark:text-stone-200">
            {loading ? locale.recommend.analyzing : locale.recommend.analyzeLabel}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {loading ? <ProgressLabel text={locale.recommend.analyzingProgress} /> : locale.recommend.analyzeDesc}
          </div>
          {aiError && <p className="mt-1 text-xs text-red-500">{aiError}</p>}
        </div>
      </button>
      {loading && (
        <div className="h-1 bg-stone-100 dark:bg-stone-700">
          <div
            className="h-full rounded-r-full bg-linear-to-r from-claude-orange to-amber-400 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** セッションデータが空の場合 */
export function EmptySession() {
  return (
    <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
      <p className="text-sm font-medium text-claude-dark dark:text-stone-200">{L.emptyTitle}</p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{L.emptyDesc}</p>
    </div>
  )
}
