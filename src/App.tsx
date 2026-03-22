import { useEffect, useState, useMemo } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { isElectron } from '@/lib/platformAPI'
import { ModeSelection } from '@/components/Menu/ModeSelection'
import { QuizCard } from '@/components/Quiz/QuizCard'
import { QuizResult } from '@/components/Quiz/QuizResult'
import { Timer } from '@/components/Quiz/Timer'
import { ProgressDashboard } from '@/components/Progress/ProgressDashboard'
import { getChapterFromTags } from '@/domain/valueObjects/OverviewChapter'
import { XCircle } from 'lucide-react'

/** Update theme-color meta tag for status bar coloring */
function setThemeColor(color: string) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', color)
}
import { lazy, Suspense, useRef } from 'react'
import { OfflineIndicator } from '@/components/Layout/OfflineIndicator'
import { InstallPrompt } from '@/components/Layout/InstallPrompt'

// Lazy-load PWA update prompt only in web builds (avoids virtual:pwa-register error in Electron)
const PWAUpdatePrompt = !isElectron
  ? lazy(() => import('@/components/Layout/PWAUpdatePrompt').then(m => ({ default: m.PWAUpdatePrompt })))
  : null

export default function App() {
  const { viewState, getProgress, sessionState, isLoading, initialize, endSession, suspendSession } = useQuizStore()

  // Initialize store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Browser back button — always returns to menu
  useEffect(() => {
    if (isLoading || isElectron) return

    const handlePopState = () => {
      const currentView = useQuizStore.getState().viewState
      if (currentView === 'menu') return

      if (currentView === 'quiz') {
        const session = useQuizStore.getState().sessionState
        if (session?.isReviewMode) {
          endSession()
        } else {
          suspendSession()
        }
      } else {
        endSession()
      }
    }

    window.addEventListener('popstate', handlePopState)

    // Push one state entry when leaving menu (so back goes to menu, not out of app)
    // Only push if not already at this view (prevent duplicate entries)
    if (viewState !== 'menu' && window.history.state?.view !== viewState) {
      window.history.replaceState({ view: 'menu' }, '')
      window.history.pushState({ view: viewState }, '')
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [viewState, isLoading, endSession, suspendSession])

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-claude-cream px-4 pt-12">
        <div className="mx-auto w-full sm:max-w-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-8 w-48 animate-pulse rounded-lg bg-stone-200" />
            <div className="mx-auto h-4 w-32 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-200" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // PWA overlays (web only)
  const pwaOverlays = !isElectron ? (
    <>
      <OfflineIndicator />
      <InstallPrompt />
      {PWAUpdatePrompt && <Suspense fallback={null}><PWAUpdatePrompt /></Suspense>}
    </>
  ) : null

  // Render based on view state with entrance animation
  const viewContent = (() => {
    switch (viewState) {
      case 'menu':
        return <ModeSelection />
      case 'progress':
        return <ProgressDashboard />
      case 'result':
        return <QuizResult />
      default:
        return null
    }
  })()

  if (viewContent) {
    // Status bar color per screen
    const themeColors: Record<string, string> = {
      menu: '#FAF9F5',
      progress: '#FAF9F5',
      result: '#FAF9F5',
    }
    setThemeColor(themeColors[viewState] ?? '#FAF9F5')

    return (
      <div className="min-h-screen bg-claude-cream" key={viewState}>
        {isElectron && <div className="h-8 titlebar-drag bg-transparent" />}
        <div className="animate-view-enter">
          {viewContent}
        </div>
        {pwaOverlays}
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
  const dialogRef = useRef<HTMLDivElement | null>(null)

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
        return
      }
      // Focus trap within dialog via ref
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [showQuitDialog])

  // Quiz screen uses lighter status bar
  useEffect(() => {
    setThemeColor('#FAF9F5')
  }, [])

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
              <span className="text-sm text-stone-500">
                <span className="font-bold text-claude-dark">{progress.current}</span>
                <span className="mx-0.5">/</span>
                <span>{progress.total}</span>
              </span>
              {timeRemaining !== null && <Timer />}
            </div>
            <button
              onClick={handleQuitClick}
              className="tap-highlight flex items-center gap-1.5 rounded-full px-1 py-1 sm:border sm:border-stone-300 sm:px-3.5 sm:py-1.5"
              aria-label={isReviewMode ? '復習を終了する' : 'クイズを中止する'}
            >
              <XCircle className="h-6 w-6 text-stone-400 sm:h-4 sm:w-4" />
              <span className="hidden text-sm font-medium text-stone-600 sm:inline">
                {isReviewMode ? '終了' : '中止'}
              </span>
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={progress.current} aria-valuemin={1} aria-valuemax={progress.total} aria-label="問題の進捗">
            <div
              className="h-full rounded-full progress-gradient transition-all"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1">
        <div className="mx-auto px-3 py-3 sm:max-w-3xl sm:px-4 sm:py-6">
          <QuizCard isModalOpen={showQuitDialog} />
        </div>
      </div>

      {/* iOS-style bottom sheet dialog */}
      {showQuitDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="quit-dialog-title" onClick={handleCancelQuit}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Sheet */}
          <div
            className="relative mx-2 mb-2 w-full max-w-sm animate-slide-down rounded-2xl bg-white p-6 shadow-2xl sm:mx-4 sm:mb-0 sm:animate-none"
            onClick={(e) => e.stopPropagation()}
            ref={(el) => {
              dialogRef.current = el
              if (el) {
                const btns = el.querySelectorAll('button')
                btns[btns.length - 1]?.focus()
              }
            }}
          >
            <h3 id="quit-dialog-title" className="mb-2 text-center text-lg font-semibold text-claude-dark">
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
