import { useQuizStore } from '@/stores/quizStore'
import { ModeSelection } from '@/components/Menu/ModeSelection'
import { QuizCard } from '@/components/Quiz/QuizCard'
import { QuizResult } from '@/components/Quiz/QuizResult'
import { Timer } from '@/components/Quiz/Timer'
import { ProgressDashboard } from '@/components/Progress/ProgressDashboard'

export default function App() {
  const { viewState, getProgress, timeRemaining } = useQuizStore()

  // Render based on view state
  if (viewState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* macOS titlebar drag region */}
        <div className="h-8 titlebar-drag bg-transparent" />
        <ModeSelection />
      </div>
    )
  }

  if (viewState === 'progress') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* macOS titlebar drag region */}
        <div className="h-8 titlebar-drag bg-transparent" />
        <ProgressDashboard />
      </div>
    )
  }

  if (viewState === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* macOS titlebar drag region */}
        <div className="h-8 titlebar-drag bg-transparent" />
        <QuizResult />
      </div>
    )
  }

  // Quiz view
  const progress = getProgress()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* macOS titlebar drag region */}
      <div className="h-8 titlebar-drag bg-transparent" />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Quiz Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              問題 {progress.current} / {progress.total}
            </span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
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
