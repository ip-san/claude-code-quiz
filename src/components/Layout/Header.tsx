import { useQuizStore } from '@/stores/quizStore'
import { BookOpen } from 'lucide-react'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { getProgress, score, answeredCount, isCompleted } = useQuizStore()
  const progress = getProgress()

  return (
    <header className="titlebar-no-drag">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-claude-orange/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-claude-orange" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-claude-dark">{title}</h1>
            {!isCompleted && (
              <p className="text-sm text-claude-gray">
                問題 {progress.current} / {progress.total}
              </p>
            )}
          </div>
        </div>

        {answeredCount > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-claude-orange">
              {score} / {answeredCount}
            </div>
            <p className="text-sm text-claude-gray">正解数</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isCompleted && (
        <div className="mt-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-claude-orange transition-all duration-500 ease-out"
            style={{
              width: `${((progress.current - 1) / progress.total) * 100}%`,
            }}
          />
        </div>
      )}
    </header>
  )
}
