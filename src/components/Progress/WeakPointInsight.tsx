import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import type { QuizModeId } from '@/domain/valueObjects/QuizMode'

interface CategoryStat {
  totalQuestions: number
  attemptedQuestions: number
  correctAnswers: number
}

interface WeakPointInsightProps {
  categoryStats: Record<string, CategoryStat>
  onStartSession: (config: { mode: QuizModeId; categoryFilter?: string | null }) => void
}

/**
 * 弱点パターン可視化
 *
 * カテゴリ別の不正解率を分析し、ユーザーが「漠然と苦手」ではなく
 * 「具体的に何を復習すべきか」を理解できるようにする。
 * 停滞期のユーザーに「やるべきこと」を明示して行動を促す。
 */
export function WeakPointInsight({ categoryStats, onStartSession }: WeakPointInsightProps) {
  const weakPoints = useMemo(() => {
    return PREDEFINED_CATEGORIES
      .map(cat => {
        const stats = categoryStats[cat.id]
        if (!stats || stats.attemptedQuestions < 3) return null
        const accuracy = Math.round((stats.correctAnswers / stats.attemptedQuestions) * 100)
        const wrongCount = stats.attemptedQuestions - stats.correctAnswers
        if (accuracy >= 70) return null // 70%以上は弱点とみなさない
        return { id: cat.id, name: cat.name, icon: cat.icon, accuracy, wrongCount }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.accuracy - b.accuracy) // 正答率が低い順
      .slice(0, 3) // 上位3つまで
  }, [categoryStats])

  if (weakPoints.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">伸びしろのある分野</p>
      </div>
      <div className="space-y-2">
        {weakPoints.map((wp) => (
          <div key={wp.id} className="flex items-center justify-between rounded-xl bg-white p-3 dark:bg-stone-800">
            <div className="flex items-center gap-2">
              <span>{wp.icon}</span>
              <div>
                <p className="text-sm font-medium text-claude-dark">{wp.name}</p>
                <p className="text-xs text-stone-400">{wp.wrongCount}問 間違い · 正答率 {wp.accuracy}%</p>
              </div>
            </div>
            <button
              onClick={() => onStartSession({ mode: 'category', categoryFilter: wp.id })}
              className="tap-highlight rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white"
            >
              復習
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
