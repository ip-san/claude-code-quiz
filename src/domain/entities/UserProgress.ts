/**
 * QuestionProgress Value Object
 * Tracks progress for a single question
 */
export interface QuestionProgress {
  readonly questionId: string
  readonly attempts: number
  readonly correctCount: number
  readonly lastAttemptAt: number
  readonly lastCorrect: boolean
}

/**
 * CategoryProgress Value Object
 * Tracks progress for a category
 */
export interface CategoryProgress {
  readonly categoryId: string
  readonly totalQuestions: number
  readonly attemptedQuestions: number
  readonly correctAnswers: number
  readonly accuracy: number
}

/**
 * UserProgress Entity
 * Tracks overall user learning progress
 */
export interface UserProgressProps {
  readonly modifiedAt: number
  readonly questionProgress: Record<string, QuestionProgress>
  readonly categoryProgress: Record<string, CategoryProgress>
  readonly totalAttempts: number
  readonly totalCorrect: number
  readonly streakDays: number
  readonly lastSessionAt: number
}

export class UserProgress {
  readonly modifiedAt: number
  readonly questionProgress: Readonly<Record<string, QuestionProgress>>
  readonly categoryProgress: Readonly<Record<string, CategoryProgress>>
  readonly totalAttempts: number
  readonly totalCorrect: number
  readonly streakDays: number
  readonly lastSessionAt: number

  private constructor(props: UserProgressProps) {
    this.modifiedAt = props.modifiedAt
    this.questionProgress = Object.freeze({ ...props.questionProgress })
    this.categoryProgress = Object.freeze({ ...props.categoryProgress })
    this.totalAttempts = props.totalAttempts
    this.totalCorrect = props.totalCorrect
    this.streakDays = props.streakDays
    this.lastSessionAt = props.lastSessionAt
  }

  static create(props: Partial<UserProgressProps> = {}): UserProgress {
    return new UserProgress({
      modifiedAt: props.modifiedAt ?? Date.now(),
      questionProgress: props.questionProgress ?? {},
      categoryProgress: props.categoryProgress ?? {},
      totalAttempts: props.totalAttempts ?? 0,
      totalCorrect: props.totalCorrect ?? 0,
      streakDays: props.streakDays ?? 0,
      lastSessionAt: props.lastSessionAt ?? 0,
    })
  }

  static empty(): UserProgress {
    return UserProgress.create()
  }

  /**
   * Record an answer and return updated progress
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
    const attemptedQuestions = (existingCategory?.attemptedQuestions ?? 0) + (isFirstAttempt ? 1 : 0)
    const correctAnswers = (existingCategory?.correctAnswers ?? 0) + (isCorrect ? 1 : 0)

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
   * Calculate streak based on UTC dates
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
   * Get overall accuracy percentage
   */
  getOverallAccuracy(): number {
    if (this.totalAttempts === 0) return 0
    return Math.round((this.totalCorrect / this.totalAttempts) * 100)
  }

  /**
   * Get accuracy for a specific question
   */
  getQuestionAccuracy(questionId: string): number | null {
    const qp = this.questionProgress[questionId]
    if (!qp || qp.attempts === 0) return null
    return Math.round((qp.correctCount / qp.attempts) * 100)
  }

  /**
   * Check if a question is considered "weak"
   */
  isWeakQuestion(questionId: string, threshold: number = 50, minAttempts: number = 1): boolean {
    const qp = this.questionProgress[questionId]
    if (!qp || qp.attempts < minAttempts) return false
    const accuracy = (qp.correctCount / qp.attempts) * 100
    return accuracy < threshold
  }

  /**
   * Check if a question has been attempted
   */
  hasAttempted(questionId: string): boolean {
    const qp = this.questionProgress[questionId]
    return qp !== undefined && qp.attempts > 0
  }

  toJSON(): UserProgressProps {
    return {
      modifiedAt: this.modifiedAt,
      questionProgress: { ...this.questionProgress },
      categoryProgress: { ...this.categoryProgress },
      totalAttempts: this.totalAttempts,
      totalCorrect: this.totalCorrect,
      streakDays: this.streakDays,
      lastSessionAt: this.lastSessionAt,
    }
  }
}
