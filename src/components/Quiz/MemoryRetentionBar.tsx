import type { QuestionProgress } from '@/domain/entities/UserProgress'
import { SRS_INTERVALS_MS } from '@/domain/valueObjects/SrsInterval'

interface MemoryRetentionBarProps {
  questionProgress: QuestionProgress | undefined
}

/** SRSストリークに基づく記憶定着度を可視化 */
export function MemoryRetentionBar({ questionProgress }: MemoryRetentionBarProps) {
  if (!questionProgress || questionProgress.attempts === 0) return null

  const streak = questionProgress.correctStreak ?? 0
  const maxStreak = SRS_INTERVALS_MS.length // 9段階
  const percentage = Math.min(Math.round((streak / maxStreak) * 100), 100)
  const remaining = Math.max(0, maxStreak - streak)

  const getLabel = (): string => {
    if (streak === 0) return '短期記憶'
    if (streak <= 2) return '定着中'
    if (streak <= 4) return '定着してきた'
    if (streak <= 6) return 'ほぼ定着'
    return '長期記憶化'
  }

  const getColor = (): string => {
    if (streak === 0) return 'bg-red-400'
    if (streak <= 2) return 'bg-amber-400'
    if (streak <= 4) return 'bg-yellow-400'
    if (streak <= 6) return 'bg-green-400'
    return 'bg-emerald-500'
  }

  return (
    <div className="mt-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400">記憶定着度</span>
        <span className="text-[10px] text-stone-500">
          {getLabel()}
          {remaining > 0 && ` — あと${remaining}回正解で長期記憶`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getColor()}`}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        />
      </div>
    </div>
  )
}
