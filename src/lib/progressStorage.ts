import type { UserProgress, QuestionProgress, CategoryProgress, QuizItem } from '@/types/quiz'
import { APP_CONFIG, CATEGORIES } from '@/config/quizConfig'

const STORAGE_KEY = APP_CONFIG.storageKey

/**
 * Initialize empty progress object
 */
function createEmptyProgress(): UserProgress {
  return {
    modifiedAt: Date.now(),
    questionProgress: {},
    categoryProgress: {},
    totalAttempts: 0,
    totalCorrect: 0,
    streakDays: 0,
    lastSessionAt: 0,
  }
}

/**
 * Load progress from localStorage
 */
export function loadProgress(): UserProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return createEmptyProgress()
    }
    const parsed = JSON.parse(stored) as UserProgress
    // Ensure modifiedAt exists (migration from old format)
    if (!parsed.modifiedAt) {
      parsed.modifiedAt = Date.now()
    }
    return parsed
  } catch {
    return createEmptyProgress()
  }
}

/**
 * Save progress to localStorage
 */
export function saveProgress(progress: UserProgress): void {
  try {
    progress.modifiedAt = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('Failed to save progress:', error)
  }
}

/**
 * Record an answer attempt
 */
export function recordAnswer(
  progress: UserProgress,
  questionId: string,
  categoryId: string,
  isCorrect: boolean
): UserProgress {
  const now = Date.now()

  // Update question progress
  const existing = progress.questionProgress[questionId]
  const questionProgress: QuestionProgress = {
    questionId,
    attempts: (existing?.attempts ?? 0) + 1,
    correctCount: (existing?.correctCount ?? 0) + (isCorrect ? 1 : 0),
    lastAttemptAt: now,
    lastCorrect: isCorrect,
  }

  // Update category progress
  const existingCategory = progress.categoryProgress[categoryId]
  const isFirstAttemptOnQuestion = !existing || existing.attempts === 0
  const categoryProgress: CategoryProgress = {
    categoryId,
    totalQuestions: existingCategory?.totalQuestions ?? 0, // Will be calculated separately
    attemptedQuestions: (existingCategory?.attemptedQuestions ?? 0) + (isFirstAttemptOnQuestion ? 1 : 0),
    correctAnswers: (existingCategory?.correctAnswers ?? 0) + (isCorrect ? 1 : 0),
    accuracy: 0, // Recalculated below
  }
  // Recalculate accuracy
  categoryProgress.accuracy = categoryProgress.attemptedQuestions > 0
    ? Math.round((categoryProgress.correctAnswers / categoryProgress.attemptedQuestions) * 100)
    : 0

  // Update totals
  const newProgress: UserProgress = {
    ...progress,
    modifiedAt: now,
    questionProgress: {
      ...progress.questionProgress,
      [questionId]: questionProgress,
    },
    categoryProgress: {
      ...progress.categoryProgress,
      [categoryId]: categoryProgress,
    },
    totalAttempts: progress.totalAttempts + 1,
    totalCorrect: progress.totalCorrect + (isCorrect ? 1 : 0),
    lastSessionAt: now,
  }

  // Update streak using UTC dates to avoid timezone issues
  const getUTCDateString = (timestamp: number): string => {
    const date = new Date(timestamp)
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
  }

  const lastDateStr = getUTCDateString(progress.lastSessionAt)
  const todayStr = getUTCDateString(now)
  const yesterdayStr = getUTCDateString(now - 86400000)

  if (lastDateStr === todayStr) {
    // Same day - keep current streak
  } else if (lastDateStr === yesterdayStr) {
    // Yesterday - increment streak
    newProgress.streakDays = progress.streakDays + 1
  } else if (progress.lastSessionAt === 0) {
    // First session ever - start streak at 1
    newProgress.streakDays = 1
  } else {
    // Missed more than a day - reset streak to 1
    newProgress.streakDays = 1
  }

  return newProgress
}

/**
 * Calculate category progress from question progress
 */
export function calculateCategoryProgress(
  progress: UserProgress,
  quizzes: QuizItem[]
): Record<string, CategoryProgress> {
  const categoryProgress: Record<string, CategoryProgress> = {}

  // Initialize all categories
  for (const category of CATEGORIES) {
    const categoryQuizzes = quizzes.filter((q) => q.category === category.id)
    const attemptedQuestions = categoryQuizzes.filter(
      (q) => progress.questionProgress[q.id]?.attempts > 0
    )
    const correctAnswers = attemptedQuestions.reduce((sum, q) => {
      const qp = progress.questionProgress[q.id]
      return sum + (qp?.lastCorrect ? 1 : 0)
    }, 0)

    categoryProgress[category.id] = {
      categoryId: category.id,
      totalQuestions: categoryQuizzes.length,
      attemptedQuestions: attemptedQuestions.length,
      correctAnswers,
      accuracy: attemptedQuestions.length > 0
        ? Math.round((correctAnswers / attemptedQuestions.length) * 100)
        : 0,
    }
  }

  return categoryProgress
}

/**
 * Get weak questions (low accuracy)
 */
export function getWeakQuestions(
  progress: UserProgress,
  quizzes: QuizItem[],
  threshold: number = APP_CONFIG.weakThreshold,
  minAttempts: number = APP_CONFIG.minAttemptsForWeak
): QuizItem[] {
  return quizzes.filter((quiz) => {
    const qp = progress.questionProgress[quiz.id]
    if (!qp || qp.attempts < minAttempts) {
      return false
    }
    const accuracy = (qp.correctCount / qp.attempts) * 100
    return accuracy < threshold
  })
}

/**
 * Get unanswered questions
 */
export function getUnansweredQuestions(
  progress: UserProgress,
  quizzes: QuizItem[]
): QuizItem[] {
  return quizzes.filter((quiz) => {
    const qp = progress.questionProgress[quiz.id]
    return !qp || qp.attempts === 0
  })
}

/**
 * Get overall accuracy percentage
 */
export function getOverallAccuracy(progress: UserProgress): number {
  if (progress.totalAttempts === 0) return 0
  return Math.round((progress.totalCorrect / progress.totalAttempts) * 100)
}

/**
 * Reset all progress
 */
export function resetProgress(): UserProgress {
  const empty = createEmptyProgress()
  saveProgress(empty)
  return empty
}

/**
 * Get question accuracy
 */
export function getQuestionAccuracy(
  progress: UserProgress,
  questionId: string
): number | null {
  const qp = progress.questionProgress[questionId]
  if (!qp || qp.attempts === 0) return null
  return Math.round((qp.correctCount / qp.attempts) * 100)
}

/**
 * Export progress data as JSON string
 */
export function exportProgressToJson(progress: UserProgress): string {
  return JSON.stringify(progress, null, 2)
}

/**
 * Import progress data from JSON string
 * Returns the parsed progress or null if invalid
 */
export function importProgressFromJson(jsonString: string): UserProgress | null {
  try {
    const parsed = JSON.parse(jsonString)

    // Validate required fields
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.totalAttempts !== 'number' ||
      typeof parsed.totalCorrect !== 'number' ||
      typeof parsed.questionProgress !== 'object'
    ) {
      return null
    }

    // Ensure modifiedAt exists
    if (!parsed.modifiedAt) {
      parsed.modifiedAt = Date.now()
    }

    // Ensure categoryProgress exists
    if (!parsed.categoryProgress) {
      parsed.categoryProgress = {}
    }

    return parsed as UserProgress
  } catch {
    return null
  }
}
