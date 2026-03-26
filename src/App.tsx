import { useEffect, useMemo, useState } from 'react'
import { ModeSelection } from '@/components/Menu/ModeSelection'
import { QuizCard } from '@/components/Quiz/QuizCard'
import { Timer } from '@/components/Quiz/Timer'
import { isElectron } from '@/lib/platformAPI'
import { useQuizStore } from '@/stores/quizStore'

// Lazy-load screens not needed on initial render
const QuizResult = lazy(() => import('@/components/Quiz/QuizResult').then((m) => ({ default: m.QuizResult })))
const ProgressDashboard = lazy(() =>
  import('@/components/Progress/ProgressDashboard').then((m) => ({ default: m.ProgressDashboard }))
)
const ExplanationReader = lazy(() =>
  import('@/components/Reader/ExplanationReader').then((m) => ({ default: m.ExplanationReader }))
)
const ScenarioList = lazy(() => import('@/components/Quiz/ScenarioView').then((m) => ({ default: m.ScenarioList })))
const ScenarioView = lazy(() => import('@/components/Quiz/ScenarioView').then((m) => ({ default: m.ScenarioView })))

import { ArrowLeft, XCircle } from 'lucide-react'
import { SCENARIOS } from '@/data/scenarios'
import { getChapterFromTags } from '@/domain/valueObjects/OverviewChapter'
import { headerStyles, pageStyles } from '@/lib/styles'

/** Compact loading indicator for lazy-loaded screens */
function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-claude-cream dark:bg-stone-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-claude-orange dark:border-stone-700" />
    </div>
  )
}

/** Update theme-color meta tag for status bar coloring */
function setThemeColor(color: string) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', color)
}

import { lazy, Suspense, useRef } from 'react'
import { InstallPrompt } from '@/components/Layout/InstallPrompt'
import { OfflineIndicator } from '@/components/Layout/OfflineIndicator'
import { hasSeenWelcome, WelcomeScreen } from '@/components/Layout/WelcomeScreen'

// Lazy-load PWA update prompt only in web builds (avoids virtual:pwa-register error in Electron)
const PWAUpdatePrompt = !isElectron
  ? lazy(() => import('@/components/Layout/PWAUpdatePrompt').then((m) => ({ default: m.PWAUpdatePrompt })))
  : null

export default function App() {
  const { viewState, getProgress, sessionState, isLoading, initialize, endSession, suspendSession } = useQuizStore()
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome())

  // Initialize store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [viewState])

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

  // PWA overlays (web only) — declared before early returns so all screens can use it
  const pwaOverlays = !isElectron ? (
    <>
      <OfflineIndicator />
      <InstallPrompt />
      {PWAUpdatePrompt && (
        <Suspense fallback={null}>
          <PWAUpdatePrompt />
        </Suspense>
      )}
    </>
  ) : null

  // Show welcome screen for first-time users (with PWA install prompt)
  if (showWelcome && !isLoading) {
    return (
      <>
        <WelcomeScreen onComplete={() => setShowWelcome(false)} />
        {pwaOverlays}
      </>
    )
  }

  // Show branded loading screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-claude-cream">
        <div className="animate-bounce-in text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-claude-orange shadow-lg">
            <span className="text-4xl font-bold text-white">CC</span>
          </div>
          <h1 className="mb-1 text-xl font-bold text-claude-dark">Claude Code Quiz</h1>
          <p className="text-sm text-claude-gray">読み込み中...</p>
        </div>
      </div>
    )
  }

  // Render based on view state with entrance animation
  const viewContent = (() => {
    switch (viewState) {
      case 'menu':
        return <ModeSelection />
      case 'progress':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ProgressDashboard />
          </Suspense>
        )
      case 'reader':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ExplanationReader />
          </Suspense>
        )
      case 'scenarioSelect':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ScenarioSelectView />
          </Suspense>
        )
      case 'result':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <QuizResult />
          </Suspense>
        )
      default:
        return null
    }
  })()

  if (viewContent) {
    // Status bar color per screen
    const themeColors: Record<string, string> = {
      menu: '#FAF9F5',
      progress: '#FAF9F5',
      reader: '#FAF9F5',
      result: '#FAF9F5',
      scenarioSelect: '#FAF9F5',
    }
    setThemeColor(themeColors[viewState] ?? '#FAF9F5')

    return (
      <div className="min-h-screen bg-claude-cream" key={viewState}>
        {isElectron && <div className="h-8 titlebar-drag bg-transparent" />}
        <div className="animate-view-enter">{viewContent}</div>
        {pwaOverlays}
      </div>
    )
  }

  // Quiz view
  const progress = getProgress()
  const timeRemaining = sessionState?.timeRemaining ?? null

  return <QuizView progress={progress} timeRemaining={timeRemaining} />
}

/** Quiz content switcher — renders ScenarioView or QuizCard based on mode */
function QuizContent({ isModalOpen }: { isModalOpen: boolean }) {
  const { sessionState, activeScenarioId } = useQuizStore()
  const mode = sessionState?.config.mode

  if (mode === 'scenario' && activeScenarioId) {
    const scenario = SCENARIOS.find((s) => s.id === activeScenarioId)
    if (scenario) {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <ScenarioView scenario={scenario} isModalOpen={isModalOpen} />
        </Suspense>
      )
    }
  }

  return <QuizCard isModalOpen={isModalOpen} />
}

/** Scenario selection screen */
function ScenarioSelectView() {
  const { endSession, startScenarioSession } = useQuizStore()
  return (
    <div className="min-h-screen bg-claude-cream dark:bg-stone-900">
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-800/80">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            <button onClick={endSession} className="tap-highlight rounded-full p-1" aria-label="戻る">
              <ArrowLeft className="h-5 w-5 text-stone-600 dark:text-stone-300" />
            </button>
            <h1 className="text-lg font-bold text-claude-dark">実践シナリオ</h1>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-4">
        <Suspense fallback={<LoadingSpinner />}>
          <ScenarioList onSelect={(id) => startScenarioSession(id)} />
        </Suspense>
      </div>
    </div>
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
  const triggerRef = useRef<HTMLButtonElement | null>(null)

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
    // Restore focus to the trigger button
    requestAnimationFrame(() => triggerRef.current?.focus())
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
    <div className={`flex min-h-screen flex-col ${pageStyles.quiz}`}>
      {isElectron && <div className="h-8 titlebar-drag bg-transparent" />}

      {/* Sticky header — native navigation bar feel */}
      <div className={headerStyles.sticky}>
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-3 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isReviewMode && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">復習</span>
              )}
              {isOverviewMode && currentChapter && (
                <span className="rounded-full bg-claude-orange/10 px-2.5 py-0.5 text-xs font-medium text-claude-orange">
                  {currentChapter.icon} Ch.{currentChapter.id}
                </span>
              )}
              <span className="text-sm text-stone-500">
                <span className="font-bold text-claude-dark">{progress.current}</span>
                <span className="mx-0.5 text-stone-400">/</span>
                <span>{progress.total}</span>
              </span>
              {timeRemaining !== null && <Timer />}
            </div>
            <button
              ref={triggerRef}
              onClick={handleQuitClick}
              className="tap-highlight flex items-center gap-1.5 rounded-full px-1 py-1 sm:border sm:border-stone-300 sm:px-3.5 sm:py-1.5 sm:dark:border-stone-600"
              aria-label={isReviewMode ? '復習を終了する' : 'クイズを中止する'}
            >
              <XCircle className="h-6 w-6 text-stone-400 sm:h-4 sm:w-4" />
              <span className="hidden text-sm font-medium text-stone-600 dark:text-stone-300 sm:inline">
                {isReviewMode ? '終了' : '中止'}
              </span>
            </button>
          </div>
          {/* Progress bar */}
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700 sm:h-1"
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemin={1}
            aria-valuemax={progress.total}
            aria-label="問題の進捗"
          >
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
          <QuizContent isModalOpen={showQuitDialog} />
        </div>
      </div>

      {/* iOS-style bottom sheet dialog */}
      {showQuitDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quit-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelQuit()
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Sheet */}
          <div
            className="relative mx-2 mb-2 w-full max-w-sm animate-slide-down rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-800 sm:mx-4 sm:mb-0 sm:animate-none"
            onClick={(e) => e.stopPropagation()}
            ref={(el) => {
              dialogRef.current = el
              if (el) {
                const btns = el.querySelectorAll('button')
                btns[0]?.focus()
              }
            }}
          >
            <h3 id="quit-dialog-title" className="mb-2 text-center text-lg font-semibold text-claude-dark">
              {isReviewMode ? '復習を中止しますか？' : 'クイズを中止しますか？'}
            </h3>
            <p className="mb-6 text-center text-sm text-stone-500">
              {isReviewMode ? 'メニューに戻ります。' : '進捗は保存されます。あとで続きから再開できます。'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCancelQuit}
                className="tap-highlight w-full rounded-2xl bg-claude-orange py-3.5 text-base font-semibold text-white"
              >
                続ける
              </button>
              <button
                onClick={handleConfirmQuit}
                className="tap-highlight w-full rounded-2xl py-3.5 text-base font-semibold text-red-500"
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
