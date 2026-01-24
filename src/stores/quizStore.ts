import { create } from 'zustand'
import type {
  QuizItem,
  Difficulty,
  QuizSessionConfig,
  UserProgress,
} from '@/types/quiz'
import { defaultQuizData } from '@/data/defaultQuizzes'
import { validateQuizData } from '@/lib/validation'
import {
  loadProgress,
  saveProgress,
  recordAnswer,
  getWeakQuestions,
  getUnansweredQuestions,
  calculateCategoryProgress,
} from '@/lib/progressStorage'
import { APP_CONFIG, getModeById } from '@/config/quizConfig'

// ============================================================
// View State
// ============================================================

type ViewState = 'menu' | 'quiz' | 'result' | 'progress'

// ============================================================
// Store Interface
// ============================================================

interface QuizStore {
  // View state
  viewState: ViewState

  // Quiz data
  allQuizzes: QuizItem[]
  quizTitle: string
  isDefaultData: boolean

  // Session state
  sessionConfig: QuizSessionConfig
  sessionQuizzes: QuizItem[]
  currentIndex: number
  selectedAnswer: number | null
  isAnswered: boolean
  isCorrect: boolean | null
  score: number
  answeredCount: number
  isCompleted: boolean

  // Timer state
  startedAt: number | null
  timeRemaining: number | null

  // Progress state
  userProgress: UserProgress

  // Import state
  importError: string | null

  // View actions
  setViewState: (state: ViewState) => void

  // Session actions
  startSession: (config: Partial<QuizSessionConfig>) => void
  selectAnswer: (index: number) => void
  submitAnswer: () => void
  nextQuestion: () => void
  endSession: () => void

  // Timer actions
  updateTimer: () => void

  // Data actions
  importQuizzes: (jsonString: string) => boolean
  restoreDefault: () => void

  // Progress actions
  loadUserProgress: () => void
  resetUserProgress: () => void

  // Computed getters
  getCurrentQuiz: () => QuizItem | null
  getProgress: () => { current: number; total: number }
  getFilteredQuizzes: (
    categoryId: string | null,
    difficulty: Difficulty | null
  ) => QuizItem[]
  getCategoryStats: () => ReturnType<typeof calculateCategoryProgress>
}

// ============================================================
// Helper Functions
// ============================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function createDefaultSessionConfig(): QuizSessionConfig {
  const defaultMode = getModeById(APP_CONFIG.defaultMode)
  return {
    mode: APP_CONFIG.defaultMode,
    categoryFilter: null,
    difficultyFilter: null,
    questionCount: defaultMode?.questionCount ?? 20,
    timeLimit: defaultMode?.timeLimit ?? null,
    shuffleQuestions: defaultMode?.shuffleQuestions ?? true,
    shuffleOptions: defaultMode?.shuffleOptions ?? false,
  }
}

function prepareSessionQuizzes(
  allQuizzes: QuizItem[],
  config: QuizSessionConfig,
  userProgress: UserProgress
): QuizItem[] {
  let quizzes = [...allQuizzes]

  // Filter by category
  if (config.categoryFilter) {
    quizzes = quizzes.filter((q) => q.category === config.categoryFilter)
  }

  // Filter by difficulty
  if (config.difficultyFilter) {
    quizzes = quizzes.filter((q) => q.difficulty === config.difficultyFilter)
  }

  // For weak mode, prioritize: weak questions → unanswered → all (random)
  if (config.mode === 'weak') {
    const weakQuizzes = getWeakQuestions(userProgress, quizzes)
    if (weakQuizzes.length > 0) {
      quizzes = weakQuizzes
    } else {
      // Fallback 1: Try unanswered questions
      const unansweredQuizzes = getUnansweredQuestions(userProgress, quizzes)
      if (unansweredQuizzes.length > 0) {
        quizzes = unansweredQuizzes
      }
      // Fallback 2: Use all questions (will be shuffled below)
      // This is the default - quizzes already contains all matching questions
    }
  }

  // Shuffle if needed
  if (config.shuffleQuestions) {
    quizzes = shuffleArray(quizzes)
  }

  // Limit question count
  if (config.questionCount && config.questionCount < quizzes.length) {
    quizzes = quizzes.slice(0, config.questionCount)
  }

  return quizzes
}

// ============================================================
// Store
// ============================================================

export const useQuizStore = create<QuizStore>((set, get) => ({
  // Initial state
  viewState: 'menu',
  allQuizzes: defaultQuizData.quizzes,
  quizTitle: defaultQuizData.title ?? APP_CONFIG.title,
  isDefaultData: true,

  sessionConfig: createDefaultSessionConfig(),
  sessionQuizzes: [],
  currentIndex: 0,
  selectedAnswer: null,
  isAnswered: false,
  isCorrect: null,
  score: 0,
  answeredCount: 0,
  isCompleted: false,

  startedAt: null,
  timeRemaining: null,

  userProgress: loadProgress(),
  importError: null,

  // View actions
  setViewState: (state) => set({ viewState: state }),

  // Session actions
  startSession: (configOverrides) => {
    const state = get()
    const modeConfig = configOverrides.mode
      ? getModeById(configOverrides.mode)
      : null

    const config: QuizSessionConfig = {
      ...state.sessionConfig,
      ...configOverrides,
      timeLimit:
        configOverrides.timeLimit !== undefined
          ? configOverrides.timeLimit
          : modeConfig?.timeLimit ?? state.sessionConfig.timeLimit,
      questionCount:
        configOverrides.questionCount !== undefined
          ? configOverrides.questionCount
          : modeConfig?.questionCount ?? state.sessionConfig.questionCount,
      shuffleQuestions:
        modeConfig?.shuffleQuestions ?? state.sessionConfig.shuffleQuestions,
      shuffleOptions:
        modeConfig?.shuffleOptions ?? state.sessionConfig.shuffleOptions,
    }

    const sessionQuizzes = prepareSessionQuizzes(
      state.allQuizzes,
      config,
      state.userProgress
    )

    const now = Date.now()

    set({
      sessionConfig: config,
      sessionQuizzes,
      currentIndex: 0,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
      score: 0,
      answeredCount: 0,
      isCompleted: false,
      startedAt: now,
      timeRemaining: config.timeLimit ? config.timeLimit * 60 : null,
      viewState: 'quiz',
    })
  },

  selectAnswer: (index) => {
    const state = get()
    if (!state.isAnswered) {
      set({ selectedAnswer: index })
    }
  },

  submitAnswer: () => {
    const state = get()
    if (state.selectedAnswer === null || state.isAnswered) return

    const currentQuiz = state.sessionQuizzes[state.currentIndex]
    if (!currentQuiz) return

    const isCorrect = state.selectedAnswer === currentQuiz.correctIndex

    // Record progress
    const updatedProgress = recordAnswer(
      state.userProgress,
      currentQuiz.id,
      currentQuiz.category,
      isCorrect
    )
    saveProgress(updatedProgress)

    set({
      isAnswered: true,
      isCorrect,
      score: isCorrect ? state.score + 1 : state.score,
      answeredCount: state.answeredCount + 1,
      userProgress: updatedProgress,
    })
  },

  nextQuestion: () => {
    const state = get()
    const nextIndex = state.currentIndex + 1

    if (nextIndex >= state.sessionQuizzes.length) {
      set({ isCompleted: true, viewState: 'result' })
    } else {
      set({
        currentIndex: nextIndex,
        selectedAnswer: null,
        isAnswered: false,
        isCorrect: null,
      })
    }
  },

  endSession: () => {
    set({
      viewState: 'menu',
      isCompleted: false,
      sessionQuizzes: [],
      currentIndex: 0,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
      score: 0,
      answeredCount: 0,
      startedAt: null,
      timeRemaining: null,
    })
  },

  // Timer actions
  updateTimer: () => {
    const state = get()
    if (state.timeRemaining === null || state.timeRemaining <= 0) return

    const newTime = state.timeRemaining - 1

    if (newTime <= 0) {
      // Time's up - end the quiz
      set({
        timeRemaining: 0,
        isCompleted: true,
        viewState: 'result',
      })
    } else {
      set({ timeRemaining: newTime })
    }
  },

  // Data actions
  importQuizzes: (jsonString) => {
    const result = validateQuizData(jsonString)

    if (!result.success || !result.data) {
      set({
        importError: result.errors?.join('\n') ?? 'Validation failed',
      })
      return false
    }

    set({
      allQuizzes: result.data.quizzes,
      quizTitle: result.data.title ?? 'Imported Quiz',
      isDefaultData: false,
      importError: null,
      viewState: 'menu',
    })

    return true
  },

  restoreDefault: () => {
    set({
      allQuizzes: defaultQuizData.quizzes,
      quizTitle: defaultQuizData.title ?? APP_CONFIG.title,
      isDefaultData: true,
      importError: null,
      viewState: 'menu',
    })
  },

  // Progress actions
  loadUserProgress: () => {
    set({ userProgress: loadProgress() })
  },

  resetUserProgress: () => {
    const emptyProgress: UserProgress = {
      modifiedAt: Date.now(),
      questionProgress: {},
      categoryProgress: {},
      totalAttempts: 0,
      totalCorrect: 0,
      streakDays: 0,
      lastSessionAt: 0,
    }
    saveProgress(emptyProgress)
    set({ userProgress: emptyProgress })
  },

  // Getters
  getCurrentQuiz: () => {
    const state = get()
    return state.sessionQuizzes[state.currentIndex] ?? null
  },

  getProgress: () => {
    const state = get()
    return {
      current: state.currentIndex + 1,
      total: state.sessionQuizzes.length,
    }
  },

  getFilteredQuizzes: (categoryId, difficulty) => {
    const state = get()
    let quizzes = state.allQuizzes

    if (categoryId) {
      quizzes = quizzes.filter((q) => q.category === categoryId)
    }

    if (difficulty) {
      quizzes = quizzes.filter((q) => q.difficulty === difficulty)
    }

    return quizzes
  },

  getCategoryStats: () => {
    const state = get()
    return calculateCategoryProgress(state.userProgress, state.allQuizzes)
  },
}))
