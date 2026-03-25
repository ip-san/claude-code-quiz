import { Compass, RefreshCw, TrendingUp, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import type { QuizModeId } from '@/domain/valueObjects/QuizMode'

interface CategoryStat {
  totalQuestions: number
  attemptedQuestions: number
  correctAnswers: number
}

interface LearningRecommendationProps {
  categoryStats: Record<string, CategoryStat>
  totalAttempts: number
  onStartSession: (config: { mode: QuizModeId; categoryFilter?: string | null }) => void
}

/**
 * 学習レコメンドエンジン
 * ユーザーの進捗からパーソナライズされた「次にやるべきこと」を提案
 */
export function LearningRecommendation({ categoryStats, totalAttempts, onStartSession }: LearningRecommendationProps) {
  const recommendation = useMemo(() => {
    if (totalAttempts === 0) return null

    // Find weakest category (lowest accuracy with at least 1 attempt)
    let weakestCat: { id: string; name: string; icon: string; accuracy: number } | null = null
    let strongestCat: { id: string; name: string; accuracy: number } | null = null
    const untouchedCategories: { id: string; name: string; icon: string }[] = []
    let allMastered = true

    for (const category of PREDEFINED_CATEGORIES) {
      const stats = categoryStats[category.id]
      if (!stats || stats.attemptedQuestions === 0) {
        untouchedCategories.push({ id: category.id, name: category.name, icon: category.icon })
        allMastered = false
        continue
      }

      const accuracy = Math.round((stats.correctAnswers / Math.max(stats.attemptedQuestions, 1)) * 100)

      if (accuracy < 70) allMastered = false

      if (!weakestCat || accuracy < weakestCat.accuracy) {
        weakestCat = { id: category.id, name: category.name, icon: category.icon, accuracy }
      }
      if (!strongestCat || accuracy > strongestCat.accuracy) {
        strongestCat = { id: category.id, name: category.name, accuracy }
      }
    }

    // Priority 1: Untouched categories exist → explore new territory
    if (untouchedCategories.length > 0) {
      const next = untouchedCategories[0]
      return {
        type: 'explore' as const,
        icon: <Compass className="h-5 w-5 text-blue-500" />,
        title: '新しい分野に挑戦',
        message: `${next.icon} ${next.name} をまだ学習していません。新しい知識を広げましょう。`,
        action: `${next.name} を学ぶ`,
        onAction: () => onStartSession({ mode: 'category', categoryFilter: next.id }),
      }
    }

    // Priority 2: All mastered
    if (allMastered) {
      return {
        type: 'mastered' as const,
        icon: <Trophy className="h-5 w-5 text-yellow-500" />,
        title: '全カテゴリ習得！',
        message: '素晴らしい成果です。実力テストで総合力を試してみましょう。',
        action: '実力テストに挑戦',
        onAction: () => onStartSession({ mode: 'full' }),
      }
    }

    // Priority 3: Weakest category → focused improvement
    if (weakestCat && weakestCat.accuracy < 70) {
      return {
        type: 'improve' as const,
        icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
        title: '伸びしろのある分野',
        message: `${weakestCat.icon} ${weakestCat.name}（正答率 ${weakestCat.accuracy}%）を重点的に復習すると、大きく成長できます。`,
        action: `${weakestCat.name} を復習`,
        onAction: () => onStartSession({ mode: 'category', categoryFilter: weakestCat.id }),
      }
    }

    // Priority 4: Advanced mastery push (70-90% range → push to 90%+)
    if (weakestCat && weakestCat.accuracy >= 70 && weakestCat.accuracy < 90) {
      return {
        type: 'mastery-push' as const,
        icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
        title: 'エキスパートを目指す',
        message: `${weakestCat.icon} ${weakestCat.name}（正答率 ${weakestCat.accuracy}%）を90%以上にすると🏆マスター認定です。`,
        action: `${weakestCat.name} を極める`,
        onAction: () => onStartSession({ mode: 'category', categoryFilter: weakestCat.id }),
      }
    }

    // Priority 5: General reinforcement
    return {
      type: 'reinforce' as const,
      icon: <RefreshCw className="h-5 w-5 text-green-500" />,
      title: '知識の定着',
      message: '苦手な問題を中心に復習して、知識を確実なものにしましょう。',
      action: '苦手克服モード',
      onAction: () => onStartSession({ mode: 'weak' }),
    }
  }, [categoryStats, totalAttempts, onStartSession])

  if (!recommendation) return null

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-stone-800">
          {recommendation.icon}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">おすすめの学習</p>
          <p className="mt-0.5 text-sm font-semibold text-claude-dark">{recommendation.title}</p>
          <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{recommendation.message}</p>
          <button
            onClick={recommendation.onAction}
            className="tap-highlight mt-3 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white"
          >
            {recommendation.action}
          </button>
        </div>
      </div>
    </div>
  )
}
