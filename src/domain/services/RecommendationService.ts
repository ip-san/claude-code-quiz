import type { Question } from '../entities/Question'
import { getCategoryById } from '../valueObjects/Category'

export interface OverviewRecommendation {
  readonly type: 'perfect' | 'category'
  readonly categoryId?: string
  readonly categoryName?: string
  readonly categoryIcon?: string
  readonly wrongCount?: number
}

interface WrongAnswer {
  readonly questionId: string
}

/**
 * 全体像モード完了後の推奨カテゴリを判定
 * 間違いが最も多いカテゴリを特定し、深掘りを提案する
 */
export function getOverviewRecommendation(
  wrongAnswers: readonly WrongAnswer[],
  questions: readonly Question[],
): OverviewRecommendation | null {
  if (wrongAnswers.length === 0) {
    return { type: 'perfect' }
  }

  // カテゴリ別の間違い数をカウント
  const categoryCounts: Record<string, number> = {}
  for (const wrong of wrongAnswers) {
    const question = questions.find(q => q.id === wrong.questionId)
    if (question) {
      categoryCounts[question.category] = (categoryCounts[question.category] ?? 0) + 1
    }
  }

  // 最も間違いが多いカテゴリを特定
  let weakestCategory = ''
  let maxWrong = 0
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > maxWrong) {
      maxWrong = count
      weakestCategory = cat
    }
  }

  if (!weakestCategory) return null

  const category = getCategoryById(weakestCategory)
  if (!category) return null

  return {
    type: 'category',
    categoryId: weakestCategory,
    categoryName: category.name,
    categoryIcon: category.icon,
    wrongCount: maxWrong,
  }
}
