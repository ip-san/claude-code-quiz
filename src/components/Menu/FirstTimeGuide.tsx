import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'

/**
 * 初回ユーザー向けの導入カード
 * 全体像モードの推奨 + 読んでから解く + 気軽にチャレンジ
 */
export function FirstTimeGuide() {
  const { startSession, setViewState } = useQuizStore()

  return (
    <div className="mb-5 space-y-3">
      <div className="rounded-2xl border-2 border-claude-orange/30 bg-gradient-to-r from-claude-orange/5 to-transparent p-4 dark:border-claude-orange/40 dark:from-claude-orange/10">
        <p className="mb-1 text-xs font-semibold text-claude-orange">はじめての方へ</p>
        <p className="mb-3 text-sm text-claude-dark">
          AI の知識は問いません。基礎から順番にガイドします。完了すると修了証が発行されます。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              haptics.light()
              startSession({ mode: 'overview' })
            }}
            className="tap-highlight inline-flex items-center gap-2 rounded-2xl bg-claude-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            🗺️ クイズで学ぶ
          </button>
          <button
            onClick={() => {
              haptics.light()
              setViewState('studyFirst')
            }}
            className="tap-highlight inline-flex items-center gap-2 rounded-2xl border border-claude-orange/30 bg-claude-orange/5 px-5 py-2.5 text-sm font-semibold text-claude-orange"
          >
            📖 読んでから解く
          </button>
        </div>
      </div>
      <button
        onClick={() => {
          haptics.light()
          startSession({ mode: 'random' })
        }}
        className="tap-highlight w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
      >
        🎲 まずは気軽にチャレンジ
      </button>
    </div>
  )
}
