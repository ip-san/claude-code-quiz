import { useEffect } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { ModeSelection } from '@/components/Menu/ModeSelection'
import { QuizCard } from '@/components/Quiz/QuizCard'
import { QuizResult } from '@/components/Quiz/QuizResult'
import { Timer } from '@/components/Quiz/Timer'
import { ProgressDashboard } from '@/components/Progress/ProgressDashboard'
import { Loader2 } from 'lucide-react'

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
    <div className="min-h-screen bg-claude-cream">
      {/* macOS titlebar drag region */}
      <div className="h-8 titlebar-drag bg-transparent" />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Quiz Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          {timeRemaining !== null && <Timer />}
        </div>

        {/* Quiz Card */}
        <QuizCard />
      </div>
    </div>
  )
}
