import { theme } from '@/config/theme'
import { getMasteryLevel } from '@/domain/services/MasteryLevelService'

interface MasteryLevelProps {
  overallAccuracy: number
  totalAttempts: number
  categoryStats: Record<string, { accuracy: number; attemptedQuestions: number; totalQuestions: number }>
}

export function MasteryLevel({ overallAccuracy, totalAttempts, categoryStats }: MasteryLevelProps) {
  const levels = theme.masteryLevels
  const { index: currentIndex } = getMasteryLevel(overallAccuracy, totalAttempts, categoryStats)
  const current = levels[currentIndex]
  const next = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null

  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{current.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${current.color}`}>{current.name}</span>
            <div className="flex gap-1">
              {levels.map((level, i) => (
                <div
                  key={level.name}
                  className={`h-1.5 w-4 rounded-full ${i <= currentIndex ? 'bg-claude-orange' : 'bg-stone-200 dark:bg-stone-600'}`}
                />
              ))}
            </div>
          </div>
          {next && (
            <p className="mt-0.5 text-xs text-stone-500">
              次: {next.icon} {next.name}（{next.req}）
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
