import { BookOpen, Map } from 'lucide-react'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'

/**
 * 初回ユーザー向けの導入カード
 *
 * 2つの明確な学習パスを提示:
 * - クイズで学ぶ（全体像モード）: 問題を解きながら覚える
 * - 読んでから解く: 解説を読んでからクイズに挑戦
 *
 * 「ランダム20問」は初心者には難しすぎるため非表示。
 * 経験者向けのモードは QuickActions で表示される。
 */
export function FirstTimeGuide() {
  const { startSession, setViewState } = useQuizStore()

  return (
    <div className="mb-5">
      <div className="rounded-2xl border-2 border-claude-orange/30 bg-gradient-to-r from-claude-orange/5 to-transparent p-4 dark:border-claude-orange/40 dark:from-claude-orange/10">
        <p className="mb-1 text-xs font-semibold text-claude-orange">はじめての方へ</p>
        <p className="mb-4 text-sm text-claude-dark dark:text-stone-200">
          AI の知識は問いません。2つの学び方から選べます。
        </p>
        <div className="space-y-2">
          <button
            onClick={() => {
              haptics.light()
              startSession({ mode: 'overview' })
            }}
            className="tap-highlight flex w-full items-center gap-3 rounded-2xl bg-claude-orange px-4 py-3 text-left shadow-sm"
          >
            <Map className="h-5 w-5 flex-shrink-0 text-white/80" />
            <div>
              <p className="text-sm font-semibold text-white">クイズで学ぶ</p>
              <p className="text-xs text-white/70">問題を解きながら覚える（6チャプター構成）</p>
            </div>
          </button>
          <button
            onClick={() => {
              haptics.light()
              setViewState('studyFirst')
            }}
            className="tap-highlight flex w-full items-center gap-3 rounded-2xl border border-claude-orange/30 bg-white px-4 py-3 text-left dark:bg-stone-800"
          >
            <BookOpen className="h-5 w-5 flex-shrink-0 text-claude-orange" />
            <div>
              <p className="text-sm font-semibold text-claude-dark dark:text-stone-200">読んでから解く</p>
              <p className="text-xs text-stone-400">解説を読んでからクイズに挑戦</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
