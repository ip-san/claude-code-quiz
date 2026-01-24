import { Question } from '../entities/Question'
import { UserProgress } from '../entities/UserProgress'
import type { QuizModeId } from '../valueObjects/QuizMode'
import type { DifficultyLevel } from '../valueObjects/Difficulty'

/**
 * QuizSessionConfig - Configuration for a quiz session
 */
export interface QuizSessionConfig {
  readonly mode: QuizModeId
  readonly categoryFilter: string | null
  readonly difficultyFilter: DifficultyLevel | null
  readonly questionCount: number | null
  readonly timeLimit: number | null
  readonly shuffleQuestions: boolean
  readonly shuffleOptions: boolean
}

/**
 * QuizSessionState - Current state of a quiz session
 */
export interface QuizSessionState {
  readonly config: QuizSessionConfig
  readonly questions: readonly Question[]
  readonly currentIndex: number
  readonly selectedAnswer: number | null
  readonly isAnswered: boolean
  readonly isCorrect: boolean | null
  readonly score: number
  readonly answeredCount: number
  readonly isCompleted: boolean
  readonly startedAt: number | null
  readonly timeRemaining: number | null
}

/**
 * QuizSessionService
 * Domain service for managing quiz sessions
 */
export class QuizSessionService {
  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Prepare questions for a session based on config
   */
  static prepareSessionQuestions(
    allQuestions: Question[],
    config: QuizSessionConfig,
    userProgress: UserProgress,
    weakThreshold: number = 50,
    minAttemptsForWeak: number = 1
  ): Question[] {
    let questions = [...allQuestions]

    // Filter by category
    if (config.categoryFilter) {
      questions = questions.filter(q => q.category === config.categoryFilter)
    }

    // Filter by difficulty
    if (config.difficultyFilter) {
      questions = questions.filter(q => q.difficulty === config.difficultyFilter)
    }

    // For weak mode, prioritize weak questions
    if (config.mode === 'weak') {
      const weakQuestions = questions.filter(q =>
        userProgress.isWeakQuestion(q.id, weakThreshold, minAttemptsForWeak)
      )

      if (weakQuestions.length > 0) {
        questions = weakQuestions
      } else {
        // Fallback: try unanswered questions
        const unansweredQuestions = questions.filter(q =>
          !userProgress.hasAttempted(q.id)
        )
        if (unansweredQuestions.length > 0) {
          questions = unansweredQuestions
        }
        // Otherwise use all questions
      }
    }

    // Shuffle if needed
    if (config.shuffleQuestions) {
      questions = this.shuffleArray(questions)
    }

    // Limit question count
    if (config.questionCount && config.questionCount < questions.length) {
      questions = questions.slice(0, config.questionCount)
    }

    return questions
  }

  /**
   * Create initial session state
   */
  static createInitialState(
    questions: Question[],
    config: QuizSessionConfig
  ): QuizSessionState {
    return {
      config,
      questions: Object.freeze(questions),
      currentIndex: 0,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
      score: 0,
      answeredCount: 0,
      isCompleted: false,
      startedAt: Date.now(),
      timeRemaining: config.timeLimit ? config.timeLimit * 60 : null,
    }
  }

  /**
   * Create default session config
   */
  static createDefaultConfig(): QuizSessionConfig {
    return {
      mode: 'random',
      categoryFilter: null,
      difficultyFilter: null,
      questionCount: 20,
      timeLimit: null,
      shuffleQuestions: true,
      shuffleOptions: false,
    }
  }

  /**
   * Update session state after selecting an answer
   */
  static selectAnswer(
    state: QuizSessionState,
    answerIndex: number
  ): QuizSessionState {
    if (state.isAnswered) {
      return state
    }
    return {
      ...state,
      selectedAnswer: answerIndex,
    }
  }

  /**
   * Update session state after submitting an answer
   */
  static submitAnswer(state: QuizSessionState): {
    newState: QuizSessionState
    isCorrect: boolean
  } | null {
    if (state.selectedAnswer === null || state.isAnswered) {
      return null
    }

    const currentQuestion = state.questions[state.currentIndex]
    if (!currentQuestion) {
      return null
    }

    const isCorrect = currentQuestion.isCorrectAnswer(state.selectedAnswer)

    const newState: QuizSessionState = {
      ...state,
      isAnswered: true,
      isCorrect,
      score: isCorrect ? state.score + 1 : state.score,
      answeredCount: state.answeredCount + 1,
    }

    return { newState, isCorrect }
  }

  /**
   * Move to the next question
   */
  static nextQuestion(state: QuizSessionState): QuizSessionState {
    const nextIndex = state.currentIndex + 1

    if (nextIndex >= state.questions.length) {
      return {
        ...state,
        isCompleted: true,
      }
    }

    return {
      ...state,
      currentIndex: nextIndex,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
    }
  }

  /**
   * Update timer
   */
  static updateTimer(state: QuizSessionState): QuizSessionState {
    if (state.timeRemaining === null || state.timeRemaining <= 0) {
      return state
    }

    const newTime = state.timeRemaining - 1

    if (newTime <= 0) {
      return {
        ...state,
        timeRemaining: 0,
        isCompleted: true,
      }
    }

    return {
      ...state,
      timeRemaining: newTime,
    }
  }

  /**
   * Get current question
   */
  static getCurrentQuestion(state: QuizSessionState): Question | null {
    return state.questions[state.currentIndex] ?? null
  }

  /**
   * Get progress info
   */
  static getProgress(state: QuizSessionState): { current: number; total: number } {
    return {
      current: state.currentIndex + 1,
      total: state.questions.length,
    }
  }

  /**
   * Calculate final score percentage
   */
  static calculateScorePercentage(state: QuizSessionState): number {
    if (state.answeredCount === 0) return 0
    return Math.round((state.score / state.answeredCount) * 100)
  }

  /**
   * Check if passed (based on passing score)
   */
  static hasPassed(state: QuizSessionState, passingScore: number = 70): boolean {
    return this.calculateScorePercentage(state) >= passingScore
  }
}
