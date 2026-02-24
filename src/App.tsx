import { useEffect, useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { ModeSelection } from '@/components/Menu/ModeSelection'
import { QuizCard } from '@/components/Quiz/QuizCard'
import { QuizResult } from '@/components/Quiz/QuizResult'
import { Timer } from '@/components/Quiz/Timer'
import { ProgressDashboard } from '@/components/Progress/ProgressDashboard'
import { Loader2, X } from 'lucide-react'

export default function App() {
  const { viewState, getProgress, sessionState, isLoading, initialize } = useQuizStore()

  // Initialize store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-claude-cream">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-claude-orange" />
          <p className="text-claude-gray">読み込み中...</p>
        </div>
      </div>
    )
  }

  // Render based on view state
  if (viewState === 'menu') {
    return (
      <div className="min-h-screen bg-claude-cream">
        {/* macOS titlebar drag region */}
        <div className="h-8 titlebar-drag bg-transparent" />
        <ModeSelection />
      </div>
    )
  }

  if (viewState === 'progress') {
    return (
      <div className="min-h-screen bg-claude-cream">
        {/* macOS titlebar drag region */}
        <div className="h-8 titlebar-drag bg-transparent" />
        <ProgressDashboard />
      </div>
    )
  }

  if (viewState === 'result') {
    return (
      <div className="min-h-screen bg-claude-cream">
        {/* macOS titlebar drag region */}
        <div className="h-8 titlebar-drag bg-transparent" />
        <QuizResult />
      </div>
    )
  }

  // Quiz view
  const progress = getProgress()
  const timeRemaining = sessionState?.timeRemaining ?? null

  return (
    <QuizView
      progress={progress}
      timeRemaining={timeRemaining}
    />
  )
}

/**
 * Quiz View Component
 * Separated to manage local state for quit confirmation dialog
 */
function QuizView({
  progress,
  timeRemaining,
}: {
  progress: { current: number; total: number }
  timeRemaining: number | null
}) {
  const { endSession, sessionState } = useQuizStore()
  const isReviewMode = sessionState?.isReviewMode ?? false
  const [showQuitDialog, setShowQuitDialog] = useState(false)

  const handleQuitClick = () => {
    setShowQuitDialog(true)
  }

  const handleConfirmQuit = () => {
    setShowQuitDialog(false)
    endSession()
  }

  const handleCancelQuit = () => {
    setShowQuitDialog(false)
  }

  // Keyboard handler for quit dialog
  useEffect(() => {
    if (!showQuitDialog) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setShowQuitDialog(false)
      }
    }

    // Use capture phase to intercept before QuizCard's handler
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [showQuitDialog])

  return (
    <div className="min-h-screen bg-claude-cream">
      {/* macOS titlebar drag region */}
      <div className="h-8 titlebar-drag bg-transparent" />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Quiz Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isReviewMode && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                復習モード
              </span>
            )}
            <span className="text-sm text-claude-gray">
              問題 {progress.current} / {progress.total}
            </span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-claude-orange transition-all"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {timeRemaining !== null && <Timer />}
            <button
              onClick={handleQuitClick}
              className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100"
              aria-label={isReviewMode ? '復習を終了する' : 'クイズを中止する'}
            >
              <X className="h-4 w-4" />
              {isReviewMode ? '復習を終了' : '中止'}
            </button>
          </div>
        </div>

        {/* Quiz Card */}
        <QuizCard />
      </div>

      {/* Quit Confirmation Dialog */}
      {showQuitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-claude-dark">
              クイズを中止しますか？
            </h3>
            <p className="mb-6 text-sm text-stone-500">
              現在の進捗は保存されません。メニューに戻ります。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelQuit}
                className="flex-1 rounded-lg border border-stone-300 py-2 text-stone-600 transition-colors hover:bg-stone-50"
              >
                続ける
              </button>
              <button
                onClick={handleConfirmQuit}
                className="flex-1 rounded-lg bg-red-500 py-2 text-white transition-colors hover:bg-red-600"
              >
                中止する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
