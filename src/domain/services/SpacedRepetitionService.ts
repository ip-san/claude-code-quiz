/**
 * SpacedRepetitionService - 間隔反復スケジューリングサービス
 *
 * 問題の復習タイミングを管理する。
 * correctStreak に基づいて復習間隔を計算し、
 * 期限到来の問題を優先的に出題する。
 */

import type { Question } from '../entities/Question'
import type { QuestionProgress, UserProgress } from '../entities/UserProgress'
import { calculateNextReview, SRS_INTERVALS_MS } from '../valueObjects/SrsInterval'

// Re-export for backwards compatibility
export { SRS_INTERVALS_MS }

export class SpacedRepetitionService {
  /**
   * 次回復習日時を計算
   */
  static calculateNextReview(correctStreak: number, now: number): number {
    return calculateNextReview(correctStreak, now)
  }

  /**
   * 問題が復習期限に達しているかを判定
   *
   * - 未回答の問題は常に due（新しい問題として出題）
   * - nextReviewAt が未設定の回答済み問題も due
   * - nextReviewAt <= now なら due
   */
  static isDue(qp: QuestionProgress | undefined, now: number): boolean {
    if (!qp || qp.attempts === 0) return true
    if (qp.nextReviewAt === undefined) return true
    return qp.nextReviewAt <= now
  }

  /**
   * 期限到来の問題数をカウント
   */
  static getDueCount(userProgress: UserProgress, now: number): number {
    const allQp = Object.values(userProgress.questionProgress)
    return allQp.filter((qp) => this.isDue(qp, now)).length
  }

  /**
   * 問題を復習優先度順にソート（最も期限超過が大きいものを先頭に）
   */
  static sortByPriority(questions: Question[], userProgress: UserProgress, now: number): Question[] {
    return [...questions].sort((a, b) => {
      const qpA = userProgress.questionProgress[a.id]
      const qpB = userProgress.questionProgress[b.id]
      const overdueA = this.getOverdue(qpA, now)
      const overdueB = this.getOverdue(qpB, now)
      // More overdue comes first (larger overdue = higher priority)
      return overdueB - overdueA
    })
  }

  /**
   * 問題の期限超過度を算出（ミリ秒）
   * 未回答は30日分の overdue として扱う（回答済み問題より低い優先度）
   * nextReviewAt 未設定の回答済み問題は最大優先度
   */
  private static getOverdue(qp: QuestionProgress | undefined, now: number): number {
    if (!qp || qp.attempts === 0) {
      // 未回答: 最低優先度（復習が必要な問題を先に出す）
      return -1
    }
    if (qp.nextReviewAt === undefined) {
      return Number.MAX_SAFE_INTEGER
    }
    return now - qp.nextReviewAt
  }
}
