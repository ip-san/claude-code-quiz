import { theme } from '@/config/theme'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'

interface MasteryLevelProps {
  overallAccuracy: number
  totalAttempts: number
  categoryStats: Record<string, { accuracy: number; attemptedQuestions: number; totalQuestions: number }>
}

function getMasteryLevelIndex(
  accuracy: number,
  totalAttempts: number,
  categoryStats: MasteryLevelProps['categoryStats']
): number {
  if (totalAttempts === 0) return 0

  const totalQuestions = PREDEFINED_CATEGORIES.reduce(
    (sum, cat) => sum + (categoryStats[cat.id]?.totalQuestions ?? 0),
    0
  )
  const attemptedQuestions = PREDEFINED_CATEGORIES.reduce(
    (sum, cat) => sum + (categoryStats[cat.id]?.attemptedQuestions ?? 0),
    0
  )
  const attemptedRatio = totalQuestions > 0 ? attemptedQuestions / totalQuestions : 0
  const allCategoriesAttempted = PREDEFINED_CATEGORIES.every(
    (cat) => (categoryStats[cat.id]?.attemptedQuestions ?? 0) > 0
  )

  // Level 4: 正答率85% + 全カテゴリ習得
  if (accuracy >= 85 && allCategoriesAttempted) return 4
  // Level 3: 正答率80% + 半数以上学習
  if (accuracy >= 80 && attemptedRatio >= 0.5) return 3
  // Level 2: 正答率70%以上
  if (accuracy >= 70) return 2
  // Level 1: 正答率50%以上
  if (accuracy >= 50) return 1
  // Level 0: AI入門者
  return 0
}

export function MasteryLevel({ overallAccuracy, totalAttempts, categoryStats }: MasteryLevelProps) {
  const levels = theme.masteryLevels
  const currentIndex = getMasteryLevelIndex(overallAccuracy, totalAttempts, categoryStats)
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
