/**
 * AdaptiveDifficultyService - カテゴリ別正答率に応じた難易度調整
 *
 * 正答率が高いカテゴリでは上級問題を優先、低いカテゴリでは初級を多めにする。
 */

import type { Question } from '../entities/Question'
import type { UserProgress } from '../entities/UserProgress'
import { getCategoryById } from '../valueObjects/Category'

const HIGH_ACCURACY_THRESHOLD = 80
const LOW_ACCURACY_THRESHOLD = 50
const MIN_ATTEMPTS_FOR_ADAPTIVE = 5

export class AdaptiveDifficultyService {
  /**
   * カテゴリ別正答率に基づいて問題をスコアリングし並べ替え
   *
   * - 正答率 80%超のカテゴリ → advanced を優先（intermediate > beginner）
   * - 正答率 50%未満のカテゴリ → beginner を優先（intermediate > advanced）
   * - それ以外 → intermediate を優先
   */
  static reorderByAdaptiveDifficulty(questions: Question[], userProgress: UserProgress): Question[] {
    const categoryAccuracy = this.getCategoryAccuracies(questions, userProgress)

    // Sort key: 難易度スコア(主) → 価値スコア(従, tie-break) → 元index(shuffle 温存)
    // 価値(コスパ)は難易度順序を一切上書きせず、同難易度スコア内でのみ高価値問題を前に出す。
    // これにより「未マスター優先(タイパ)」「アダプティブ難易度」を壊さず価値を弱く効かせる。
    const indexed = questions.map((q, i) => ({
      q,
      i,
      score: this.getDifficultyScore(q, categoryAccuracy),
      value: this.getValueScore(q),
    }))
    indexed.sort((a, b) => b.score - a.score || b.value - a.value || a.i - b.i)
    return indexed.map((x) => x.q)
  }

  /**
   * 適応的な難易度調整が有効か（十分なデータがあるか）
   */
  static isAdaptiveReady(userProgress: UserProgress): boolean {
    return userProgress.totalAttempts >= MIN_ATTEMPTS_FOR_ADAPTIVE
  }

  private static getCategoryAccuracies(questions: Question[], userProgress: UserProgress): Map<string, number | null> {
    const categories = new Set(questions.map((q) => q.category))
    const result = new Map<string, number | null>()

    for (const cat of categories) {
      const cp = userProgress.categoryProgress[cat]
      if (cp && cp.attemptedQuestions >= 3) {
        result.set(cat, cp.accuracy)
      } else {
        result.set(cat, null)
      }
    }

    return result
  }

  /**
   * 実務価値スコア（同難易度内の tie-break 用）
   * カテゴリ weight（実務頻度×インパクトのプロキシ 5/10/15）を主に、
   * practical/trivia タグで微調整する。タグ未付与時は weight のみで決まる。
   */
  private static getValueScore(question: Question): number {
    const weight = getCategoryById(question.category)?.weight ?? 10
    let score = weight
    if (question.tags.includes('practical')) score += 6
    else if (question.tags.includes('trivia')) score -= 4
    return score
  }

  private static getDifficultyScore(question: Question, categoryAccuracy: Map<string, number | null>): number {
    const accuracy = categoryAccuracy.get(question.category)

    // No data yet — use default ordering
    if (accuracy === null || accuracy === undefined) return 0

    const difficultyMap: Record<string, number> = {
      beginner: 0,
      intermediate: 1,
      advanced: 2,
    }
    const diffLevel = difficultyMap[question.difficulty] ?? 1

    if (accuracy >= HIGH_ACCURACY_THRESHOLD) {
      // User is strong → prioritize harder questions
      return diffLevel // advanced=2, intermediate=1, beginner=0
    }
    if (accuracy < LOW_ACCURACY_THRESHOLD) {
      // User is weak → prioritize easier questions
      return 2 - diffLevel // beginner=2, intermediate=1, advanced=0
    }
    // Middle ground → prioritize intermediate
    return diffLevel === 1 ? 2 : 1 // intermediate=2, others=1
  }
}
