import { BookOpen, ChevronRight, Map } from 'lucide-react'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'

interface FirstTimeGuideProps {
  onOpenModes: () => void
}

/**
 * 初回ユーザー向けの導入カード
 *
 * 初心者向け:
 * - クイズで学ぶ（全体像モード）
 * - 読んでから解く
 *
 * 経験者向け:
 * - 「すでに活用されている方へ」→ ハンバーガーメニューをクイズモード展開状態で開く
 */
export function FirstTimeGuide({ onOpenModes }: FirstTimeGuideProps) {
  const { startSession, setViewState } = useQuizStore()

  return (
    <div className="mb-5 space-y-3">
      {/* 初心者向け */}
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

      {/* 経験者向け */}
      <button
        onClick={() => {
          haptics.light()
          onOpenModes()
        }}
        className="tap-highlight flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left dark:border-stone-700 dark:bg-stone-800"
      >
        <span className="text-sm text-stone-400">🎯</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-claude-dark dark:text-stone-200">すでに活用されている方へ</p>
          <p className="text-xs text-stone-400">実力テスト・カテゴリ別など多様なモード</p>
        </div>
        <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600" />
      </button>
    </div>
  )
}
