/**
 * UsageRecommend の早期リターン状態を表示するサブコンポーネント群。
 * メインカード表示前の3つの状態（セットアップ、分析、空セッション）を担当。
 */

import { Sparkles } from 'lucide-react'
import { ProgressLabel } from './ProgressLabel'

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
        <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-claude-orange" />
        <div className="flex-1">
          <p className="text-sm font-medium text-claude-dark dark:text-stone-200">自動レコメンドを有効にしますか？</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Claude Code の全セッション終了時にログを収集し、その日の作業に合ったクイズを自動で提案します
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onSetup}
              className="tap-highlight rounded-lg bg-claude-orange px-4 py-2 text-xs font-medium text-white"
              aria-label="自動レコメンドを有効にする"
            >
              有効にする
            </button>
            <button
              onClick={onDismiss}
              className="tap-highlight rounded-lg px-4 py-2 text-xs text-stone-500"
              aria-label="後で設定する"
            >
              後で
            </button>
          </div>
          {setupDone && (
            <p className="mt-2 text-xs font-medium text-claude-orange">
              設定完了。次回の Claude Code セッションから自動収集が始まります。
            </p>
          )}
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
}: {
  loading: boolean
  aiError: string | null
  onAnalyze: () => void
}) {
  return (
    <button
      onClick={onAnalyze}
      disabled={loading}
      aria-label="利用履歴を分析してクイズをレコメンド"
      className="tap-highlight mb-5 flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left dark:border-stone-700 dark:bg-stone-800"
    >
      {loading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-claude-orange" />
      ) : (
        <Sparkles className="h-5 w-5 text-claude-orange" />
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-claude-dark dark:text-stone-200">
          {loading ? '分析中...' : 'あなたの利用履歴からレコメンド'}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {loading ? (
            <ProgressLabel text="利用履歴を分析中" />
          ) : (
            'AI があなたの作業意図を理解し、最適な復習問題を選びます'
          )}
        </div>
        {aiError && <p className="mt-1 text-xs text-red-500">{aiError}</p>}
      </div>
    </button>
  )
}

/** セッションデータが空の場合 */
export function EmptySession() {
  return (
    <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
      <p className="text-sm font-medium text-claude-dark dark:text-stone-200">Claude Code の利用履歴がまだありません</p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        Claude Code でいくつか作業をしてから、もう一度お試しください。セッション終了時に自動でログが蓄積されます。
      </p>
    </div>
  )
}
