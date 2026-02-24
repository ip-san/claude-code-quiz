/**
 * UserProgress Entity - ユーザーの学習進捗を表すエンティティ
 *
 * 【このエンティティの役割】
 * - 問題ごとの回答履歴（正答率、最終回答日時等）
 * - カテゴリごとの統計情報
 * - 連続学習日数（ストリーク）の管理
 *
 * 【データ構造】
 *
 * UserProgress
 * ├── questionProgress: { [questionId]: QuestionProgress }
 * │   └── 各問題の回答履歴
 * ├── categoryProgress: { [categoryId]: CategoryProgress }
 * │   └── カテゴリ別の統計
 * ├── totalAttempts / totalCorrect
 * │   └── 全体の統計
 * └── streakDays / lastSessionAt
 *     └── 連続学習日数
 *
 * 【不変性（Immutability）】
 * Question エンティティと同様、このエンティティも不変。
 * recordAnswer() は新しい UserProgress インスタンスを返す。
 *
 * 【永続化】
 * localStorage に JSON 形式で保存される。
 * toJSON() でシリアライズ、create() でデシリアライズ。
 */

/**
 * 問題ごとの進捗情報
 *
 * 【保持するデータ】
 * - attempts: 回答回数
 * - correctCount: 正解回数
 * - lastAttemptAt: 最終回答日時（Unix timestamp）
 * - lastCorrect: 最後の回答が正解だったか
 *
 * 正答率は correctCount / attempts で計算。
 */
export interface QuestionProgress {
  readonly questionId: string
  readonly attempts: number
  readonly correctCount: number
  readonly lastAttemptAt: number
  readonly lastCorrect: boolean
}

/**
 * カテゴリごとの進捗情報
 *
 * 【注意】
 * totalQuestions は現在使用されていない（将来の拡張用）。
 * 実際の問題数は QuizSet から取得する。
 */
export interface CategoryProgress {
  readonly categoryId: string
  readonly totalQuestions: number
  readonly attemptedQuestions: number
  readonly correctAnswers: number
  readonly accuracy: number  // パーセンテージ（0-100）
}

/**
 * UserProgress のプロパティ型
 */
export interface UserProgressProps {
  readonly modifiedAt: number
  readonly questionProgress: Record<string, QuestionProgress>
  readonly categoryProgress: Record<string, CategoryProgress>
  readonly totalAttempts: number
  readonly totalCorrect: number
  readonly streakDays: number
  readonly lastSessionAt: number
  readonly bookmarkedQuestionIds?: readonly string[]
}

export class UserProgress {
  readonly modifiedAt: number
  readonly questionProgress: Readonly<Record<string, QuestionProgress>>
  readonly categoryProgress: Readonly<Record<string, CategoryProgress>>
  readonly totalAttempts: number
  readonly totalCorrect: number
  readonly streakDays: number
  readonly lastSessionAt: number
  readonly bookmarkedQuestionIds: readonly string[]

  private constructor(props: UserProgressProps) {
    this.modifiedAt = props.modifiedAt
    this.questionProgress = Object.freeze({ ...props.questionProgress })
    this.categoryProgress = Object.freeze({ ...props.categoryProgress })
    this.totalAttempts = props.totalAttempts
    this.totalCorrect = props.totalCorrect
    this.streakDays = props.streakDays
    this.lastSessionAt = props.lastSessionAt
    this.bookmarkedQuestionIds = Object.freeze([...(props.bookmarkedQuestionIds ?? [])])
  }

  /**
   * ファクトリメソッド
   *
   * 既存データからの復元、または初期状態の作成に使用。
   */
  static create(props: Partial<UserProgressProps> = {}): UserProgress {
    return new UserProgress({
      modifiedAt: props.modifiedAt ?? Date.now(),
      questionProgress: props.questionProgress ?? {},
      categoryProgress: props.categoryProgress ?? {},
      totalAttempts: props.totalAttempts ?? 0,
      totalCorrect: props.totalCorrect ?? 0,
      streakDays: props.streakDays ?? 0,
      lastSessionAt: props.lastSessionAt ?? 0,
      bookmarkedQuestionIds: props.bookmarkedQuestionIds ?? [],
    })
  }

  /**
   * 空の進捗を作成（新規ユーザー用）
   */
  static empty(): UserProgress {
    return UserProgress.create()
  }

  /**
   * 回答を記録し、更新された進捗を返す
   *
   * 【不変更新パターン】
   * 既存のオブジェクトを変更せず、新しいオブジェクトを返す。
   * これにより React の変更検知が確実に動作する。
   *
   * 【更新される項目】
   * 1. questionProgress[questionId] - 該当問題の統計
   * 2. categoryProgress[categoryId] - 該当カテゴリの統計
   * 3. totalAttempts / totalCorrect - 全体統計
   * 4. streakDays - 連続学習日数
   * 5. lastSessionAt / modifiedAt - タイムスタンプ
   */
  recordAnswer(
    questionId: string,
    categoryId: string,
    isCorrect: boolean
  ): UserProgress {
    const now = Date.now()
    const existing = this.questionProgress[questionId]

    // Update question progress
    const newQuestionProgress: QuestionProgress = {
      questionId,
      attempts: (existing?.attempts ?? 0) + 1,
      correctCount: (existing?.correctCount ?? 0) + (isCorrect ? 1 : 0),
      lastAttemptAt: now,
      lastCorrect: isCorrect,
    }

    // Update category progress
    const existingCategory = this.categoryProgress[categoryId]
    const isFirstAttempt = !existing || existing.attempts === 0
    const isFirstCorrect = isCorrect && (!existing || existing.correctCount === 0)
    const attemptedQuestions = (existingCategory?.attemptedQuestions ?? 0) + (isFirstAttempt ? 1 : 0)
    const correctAnswers = (existingCategory?.correctAnswers ?? 0) + (isFirstCorrect ? 1 : 0)

    const newCategoryProgress: CategoryProgress = {
      categoryId,
      totalQuestions: existingCategory?.totalQuestions ?? 0,
      attemptedQuestions,
      correctAnswers,
      accuracy: attemptedQuestions > 0
        ? Math.round((correctAnswers / attemptedQuestions) * 100)
        : 0,
    }

    // Calculate new streak
    const newStreakDays = this.calculateNewStreak(now)

    return new UserProgress({
      modifiedAt: now,
      questionProgress: {
        ...this.questionProgress,
        [questionId]: newQuestionProgress,
      },
      categoryProgress: {
        ...this.categoryProgress,
        [categoryId]: newCategoryProgress,
      },
      totalAttempts: this.totalAttempts + 1,
      totalCorrect: this.totalCorrect + (isCorrect ? 1 : 0),
      streakDays: newStreakDays,
      lastSessionAt: now,
    })
  }

  /**
   * 連続学習日数を計算
   *
   * 【ロジック】
   * - 初回セッション → 1日
   * - 同日の2回目以降 → 変化なし
   * - 前日からの継続 → +1日
   * - 2日以上空いた → リセット（1日に戻る）
   *
   * 【タイムゾーン】
   * UTC を使用して日付を比較する。
   * これにより、タイムゾーンの違いによる不整合を防ぐ。
   */
  private calculateNewStreak(now: number): number {
    // Convert timestamp to UTC date number (YYYYMMDD format for reliable comparison)
    const getUTCDateNumber = (timestamp: number): number => {
      const date = new Date(timestamp)
      return (
        date.getUTCFullYear() * 10000 +
        (date.getUTCMonth() + 1) * 100 + // Month is 0-indexed, add 1
        date.getUTCDate()
      )
    }

    // First session ever
    if (this.lastSessionAt === 0) {
      return 1
    }

    const lastDate = getUTCDateNumber(this.lastSessionAt)
    const today = getUTCDateNumber(now)

    // Same day - no change to streak
    if (lastDate === today) {
      return this.streakDays
    }

    // Calculate yesterday correctly (handles month/year boundaries)
    const yesterdayTimestamp = now - 86400000
    const yesterday = getUTCDateNumber(yesterdayTimestamp)

    // Consecutive day - increment streak
    if (lastDate === yesterday) {
      return this.streakDays + 1
    }

    // Gap in days - reset streak
    return 1
  }

  /**
   * 全体の正答率を取得（パーセンテージ）
   */
  getOverallAccuracy(): number {
    if (this.totalAttempts === 0) return 0
    return Math.round((this.totalCorrect / this.totalAttempts) * 100)
  }

  /**
   * 特定の問題の正答率を取得
   *
   * 未回答の場合は null を返す。
   */
  getQuestionAccuracy(questionId: string): number | null {
    const qp = this.questionProgress[questionId]
    if (!qp || qp.attempts === 0) return null
    return Math.round((qp.correctCount / qp.attempts) * 100)
  }

  /**
   * 苦手問題かどうかを判定
   *
   * 【判定条件】
   * 1. minAttempts 回以上回答している
   * 2. 正答率が threshold% 未満
   *
   * 【使用場面】
   * 「苦手克服モード」で出題する問題を選定する際に使用。
   */
  isWeakQuestion(questionId: string, threshold: number = 50, minAttempts: number = 1): boolean {
    const qp = this.questionProgress[questionId]
    if (!qp || qp.attempts < minAttempts) return false
    const accuracy = (qp.correctCount / qp.attempts) * 100
    return accuracy < threshold
  }

  /**
   * 問題に回答したことがあるかを判定
   */
  hasAttempted(questionId: string): boolean {
    const qp = this.questionProgress[questionId]
    return qp !== undefined && qp.attempts > 0
  }

  /**
   * ブックマークをトグル（追加/解除）
   *
   * 不変更新パターンで新しいインスタンスを返す。
   */
  toggleBookmark(questionId: string): UserProgress {
    const isCurrentlyBookmarked = this.bookmarkedQuestionIds.includes(questionId)
    const newBookmarks = isCurrentlyBookmarked
      ? this.bookmarkedQuestionIds.filter(id => id !== questionId)
      : [...this.bookmarkedQuestionIds, questionId]

    return UserProgress.create({
      ...this.toJSON(),
      bookmarkedQuestionIds: newBookmarks,
      modifiedAt: Date.now(),
    })
  }

  /**
   * ブックマークされているかを判定
   */
  isBookmarked(questionId: string): boolean {
    return this.bookmarkedQuestionIds.includes(questionId)
  }

  /**
   * JSON シリアライズ用
   */
  toJSON(): UserProgressProps {
    return {
      modifiedAt: this.modifiedAt,
      questionProgress: { ...this.questionProgress },
      categoryProgress: { ...this.categoryProgress },
      totalAttempts: this.totalAttempts,
      totalCorrect: this.totalCorrect,
      streakDays: this.streakDays,
      lastSessionAt: this.lastSessionAt,
      bookmarkedQuestionIds: [...this.bookmarkedQuestionIds],
    }
  }
}
