/**
 * SpacedRepetitionService - 間隔反復スケジューリングサービス
 *
 * 問題の復習タイミングを管理する。
 * correctStreak に基づいて復習間隔を計算し、
 * 期限到来の問題を優先的に出題する。
 */

import type { QuestionProgress } from '../entities/UserProgress'
import type { Question } from '../entities/Question'
import type { UserProgress } from '../entities/UserProgress'

/** 間隔反復の復習間隔テーブル（ミリ秒） */
const SRS_INTERVALS_MS: readonly number[] = [
  1 * 86400000,   // 0: 1日
  1 * 86400000,   // 1: 1日
  3 * 86400000,   // 2: 3日
  7 * 86400000,   // 3: 7日
  14 * 86400000,  // 4: 14日
  30 * 86400000,  // 5+: 30日
]

export class SpacedRepetitionService {
  /**
   * 次回復習日時を計算
   */
  static calculateNextReview(correctStreak: number, now: number): number {
    const index = Math.min(correctStreak, SRS_INTERVALS_MS.length - 1)
    return now + SRS_INTERVALS_MS[index]
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
    return allQp.filter(qp => this.isDue(qp, now)).length
  }

  /**
   * 問題を復習優先度順にソート（最も期限超過が大きいものを先頭に）
   */
  static sortByPriority(
    questions: Question[],
    userProgress: UserProgress,
    now: number
  ): Question[] {
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
   * 未回答や nextReviewAt 未設定は最大優先度
   */
  private static getOverdue(qp: QuestionProgress | undefined, now: number): number {
    if (!qp || qp.attempts === 0 || qp.nextReviewAt === undefined) {
      return Number.MAX_SAFE_INTEGER
    }
    return now - qp.nextReviewAt
  }
}
