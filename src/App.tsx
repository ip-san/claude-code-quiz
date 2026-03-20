import { useEffect, useState, useMemo } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { isElectron } from '@/lib/platformAPI'
import { ModeSelection } from '@/components/Menu/ModeSelection'
import { QuizCard } from '@/components/Quiz/QuizCard'
import { QuizResult } from '@/components/Quiz/QuizResult'
import { Timer } from '@/components/Quiz/Timer'
import { ProgressDashboard } from '@/components/Progress/ProgressDashboard'
import { getChapterFromTags } from '@/domain/valueObjects/OverviewChapter'
import { Loader2, XCircle } from 'lucide-react'

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
        {isElectron && <div className="h-8 titlebar-drag bg-transparent" />}
        <ModeSelection />
      </div>
    )
  }

  if (viewState === 'progress') {
    return (
      <div className="min-h-screen bg-claude-cream">
        {isElectron && <div className="h-8 titlebar-drag bg-transparent" />}
        <ProgressDashboard />
      </div>
    )
  }

  if (viewState === 'result') {
    return (
      <div className="min-h-screen bg-claude-cream">
        {isElectron && <div className="h-8 titlebar-drag bg-transparent" />}
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
 * Quiz View Component — native app-like layout
 * Sticky header + scrollable content + bottom sheet dialog
 */
function QuizView({
  progress,
  timeRemaining,
}: {
  progress: { current: number; total: number }
  timeRemaining: number | null
}) {
  const { endSession, suspendSession, sessionState } = useQuizStore()
  const isReviewMode = sessionState?.isReviewMode ?? false
  const isOverviewMode = sessionState?.config.mode === 'overview'
  const [showQuitDialog, setShowQuitDialog] = useState(false)

  const currentChapter = useMemo(() => {
    if (!isOverviewMode || !sessionState) return null
    const currentQuestion = sessionState.questions[sessionState.currentIndex]
    return currentQuestion ? getChapterFromTags(currentQuestion.tags) : null
  }, [isOverviewMode, sessionState])

  const handleQuitClick = () => {
    setShowQuitDialog(true)
  }

  const handleConfirmQuit = () => {
    setShowQuitDialog(false)
    if (isReviewMode) {
      endSession()
    } else {
      suspendSession()
    }
  }

  const handleCancelQuit = () => {
    setShowQuitDialog(false)
  }

  useEffect(() => {
    if (!showQuitDialog) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setShowQuitDialog(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [showQuitDialog])

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 sm:bg-claude-cream">
      {isElectron && <div className="h-8 titlebar-drag bg-transparent" />}

      {/* Sticky header — native navigation bar feel */}
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-claude-cream/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-3 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isReviewMode && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  復習
                </span>
              )}
              {isOverviewMode && currentChapter && (
                <span className="rounded-full bg-claude-orange/10 px-2.5 py-0.5 text-xs font-medium text-claude-orange">
                  {currentChapter.icon} Ch.{currentChapter.id}
                </span>
              )}
              <span className="text-sm font-medium text-claude-dark">
                {progress.current} / {progress.total}
              </span>
              {timeRemaining !== null && <Timer />}
            </div>
            <button
              onClick={handleQuitClick}
              className="tap-highlight flex h-9 w-9 items-center justify-center rounded-full"
              aria-label={isReviewMode ? '復習を終了する' : 'クイズを中止する'}
            >
              <XCircle className="h-6 w-6 text-stone-400" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-claude-orange transition-all"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1">
        <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
          <QuizCard />
        </div>
      </div>

      {/* iOS-style bottom sheet dialog */}
      {showQuitDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={handleCancelQuit}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Sheet */}
          <div
            className="relative mx-2 mb-2 w-full max-w-sm animate-slide-down rounded-2xl bg-white p-6 shadow-2xl sm:mx-4 sm:mb-0 sm:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-center text-lg font-semibold text-claude-dark">
              {isReviewMode ? '復習を中止しますか？' : 'クイズを中止しますか？'}
            </h3>
            <p className="mb-6 text-center text-sm text-stone-500">
              {isReviewMode
                ? 'メニューに戻ります。'
                : '進捗は保存されます。あとで続きから再開できます。'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmQuit}
                className="tap-highlight w-full rounded-xl bg-red-500 py-3.5 text-base font-semibold text-white"
              >
                中止する
              </button>
              <button
                onClick={handleCancelQuit}
                className="tap-highlight w-full rounded-xl py-3.5 text-base font-semibold text-claude-orange"
              >
                続ける
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
