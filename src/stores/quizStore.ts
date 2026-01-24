import { create } from 'zustand'

// Domain imports
import { Question } from '@/domain/entities/Question'
import { UserProgress } from '@/domain/entities/UserProgress'
import type { QuizModeId } from '@/domain/valueObjects/QuizMode'
import type { DifficultyLevel } from '@/domain/valueObjects/Difficulty'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { PREDEFINED_QUIZ_MODES, getQuizModeById } from '@/domain/valueObjects/QuizMode'
import {
  QuizSessionService,
  type QuizSessionConfig,
  type QuizSessionState,
} from '@/domain/services/QuizSessionService'

// Infrastructure imports
import {
  getQuizRepository,
  getProgressRepository,
} from '@/infrastructure'

// ============================================================
// View State
// ============================================================

type ViewState = 'menu' | 'quiz' | 'result' | 'progress'

// ============================================================
// Store Interface
// ============================================================

interface QuizSetInfo {
  id: string
  title: string
  type: 'default' | 'user'
  questionCount: number
  isActive: boolean
}

interface QuizStore {
  // View state
  viewState: ViewState

  // Quiz data (using domain entities)
  allQuestions: Question[]
  activeSetInfo: QuizSetInfo | null
  availableSets: QuizSetInfo[]
  isDefaultData: boolean

  // Session state
  sessionConfig: QuizSessionConfig
  sessionState: QuizSessionState | null

  // Progress state (using domain entity)
  userProgress: UserProgress

  // Import state
  importError: string | null
  isLoading: boolean

  // View actions
  setViewState: (state: ViewState) => void

  // Initialization
  initialize: () => Promise<void>

  // Session actions
  startSession: (config: Partial<QuizSessionConfig>) => void
  selectAnswer: (index: number) => void
  submitAnswer: () => void
  nextQuestion: () => void
  endSession: () => void

  // Timer actions
  updateTimer: () => void

  // Data actions
  importQuizzes: (jsonString: string) => Promise<boolean>
  restoreDefault: () => Promise<void>
  switchQuizSet: (setId: string) => Promise<void>
  deleteUserSet: (setId: string) => Promise<void>

  // Progress actions
  loadUserProgress: () => Promise<void>
  resetUserProgress: () => Promise<void>

  // Computed getters
  getCurrentQuestion: () => Question | null
  getProgress: () => { current: number; total: number }
  getFilteredQuestions: (categoryId: string | null, difficulty: DifficultyLevel | null) => Question[]
  getCategoryStats: () => Record<string, {
    categoryId: string
    totalQuestions: number
    attemptedQuestions: number
    correctAnswers: number
    accuracy: number
  }>
}

// ============================================================
// App Configuration
// ============================================================

const APP_CONFIG = {
  title: 'Claude Code マスタークイズ',
  version: '2.0.0',
  passingScore: 70,
  weakThreshold: 50,
  minAttemptsForWeak: 1,
  defaultMode: 'random' as QuizModeId,
}

// ============================================================
// Store Implementation
// ============================================================

export const useQuizStore = create<QuizStore>((set, get) => ({
  // Initial state
  viewState: 'menu',
  allQuestions: [],
  activeSetInfo: null,
  availableSets: [],
  isDefaultData: true,
  sessionConfig: QuizSessionService.createDefaultConfig(),
  sessionState: null,
  userProgress: UserProgress.empty(),
  importError: null,
  isLoading: true,

  // View actions
  setViewState: (state) => set({ viewState: state }),

  // Initialization
  initialize: async () => {
    set({ isLoading: true })

    try {
      const quizRepo = getQuizRepository()
      const progressRepo = getProgressRepository()

      // Load quiz data
      const activeSet = await quizRepo.getActiveSet()
      const allSetsInfo = await quizRepo.getAllSetsInfo()
      const questions = [...activeSet.questions]

      // Load progress
      const progress = await progressRepo.load()

      set({
        allQuestions: questions,
        activeSetInfo: allSetsInfo.find(s => s.isActive) ?? null,
        availableSets: allSetsInfo,
        isDefaultData: activeSet.type === 'default',
        userProgress: progress,
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to initialize:', error)
      set({ isLoading: false })
    }
  },

  // Session actions
  startSession: (configOverrides) => {
    const state = get()
    const modeConfig = configOverrides.mode
      ? getQuizModeById(configOverrides.mode)
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

    const sessionQuestions = QuizSessionService.prepareSessionQuestions(
      state.allQuestions,
      config,
      state.userProgress,
      APP_CONFIG.weakThreshold,
      APP_CONFIG.minAttemptsForWeak
    )

    const sessionState = QuizSessionService.createInitialState(
      sessionQuestions,
      config
    )

    set({
      sessionConfig: config,
      sessionState,
      viewState: 'quiz',
    })
  },

  selectAnswer: (index) => {
    const state = get()
    if (!state.sessionState) return

    const newSessionState = QuizSessionService.selectAnswer(state.sessionState, index)
    set({ sessionState: newSessionState })
  },

  submitAnswer: () => {
    const state = get()
    if (!state.sessionState) return

    const result = QuizSessionService.submitAnswer(state.sessionState)
    if (!result) return

    const { newState, isCorrect } = result
    const currentQuestion = QuizSessionService.getCurrentQuestion(state.sessionState)

    if (currentQuestion) {
      // Update progress
      const updatedProgress = state.userProgress.recordAnswer(
        currentQuestion.id,
        currentQuestion.category,
        isCorrect
      )

      // Optimistic update - apply state immediately for responsive UI
      set({
        sessionState: newState,
        userProgress: updatedProgress,
      })

      // Save progress asynchronously with error handling
      getProgressRepository().save(updatedProgress).catch((error) => {
        console.error('Failed to save progress:', error)
        // Progress is saved in memory, will be retried on next save
      })
    } else {
      set({ sessionState: newState })
    }
  },

  nextQuestion: () => {
    const state = get()
    if (!state.sessionState) return

    const newSessionState = QuizSessionService.nextQuestion(state.sessionState)

    if (newSessionState.isCompleted) {
      set({
        sessionState: newSessionState,
        viewState: 'result',
      })
    } else {
      set({ sessionState: newSessionState })
    }
  },

  endSession: () => {
    set({
      viewState: 'menu',
      sessionState: null,
    })
  },

  // Timer actions
  updateTimer: () => {
    const state = get()
    if (!state.sessionState) return

    const newSessionState = QuizSessionService.updateTimer(state.sessionState)

    if (newSessionState.isCompleted && !state.sessionState.isCompleted) {
      set({
        sessionState: newSessionState,
        viewState: 'result',
      })
    } else {
      set({ sessionState: newSessionState })
    }
  },

  // Data actions
  importQuizzes: async (jsonString) => {
    try {
      // Clear previous error
      set({ importError: null })

      const quizRepo = getQuizRepository()
      const importedSet = await quizRepo.importFromJson(jsonString)

      if (!importedSet) {
        set({ importError: 'クイズデータの形式が無効です。JSONファイルの構造を確認してください。' })
        return false
      }

      // Switch to the imported set
      await quizRepo.setActiveSet(importedSet.id)

      // Refresh data
      const allSetsInfo = await quizRepo.getAllSetsInfo()

      set({
        allQuestions: [...importedSet.questions],
        activeSetInfo: allSetsInfo.find(s => s.isActive) ?? null,
        availableSets: allSetsInfo,
        isDefaultData: false,
        importError: null,
        viewState: 'menu',
      })

      return true
    } catch (error) {
      set({
        importError: error instanceof Error ? error.message : 'Import failed',
      })
      return false
    }
  },

  restoreDefault: async () => {
    try {
      const quizRepo = getQuizRepository()
      await quizRepo.restoreToDefault()

      const activeSet = await quizRepo.getActiveSet()
      const allSetsInfo = await quizRepo.getAllSetsInfo()

      set({
        allQuestions: [...activeSet.questions],
        activeSetInfo: allSetsInfo.find(s => s.isActive) ?? null,
        availableSets: allSetsInfo,
        isDefaultData: true,
        importError: null,
        viewState: 'menu',
      })
    } catch (error) {
      console.error('Failed to restore default:', error)
    }
  },

  switchQuizSet: async (setId) => {
    try {
      const quizRepo = getQuizRepository()
      await quizRepo.setActiveSet(setId)

      const activeSet = await quizRepo.getActiveSet()
      const allSetsInfo = await quizRepo.getAllSetsInfo()

      set({
        allQuestions: [...activeSet.questions],
        activeSetInfo: allSetsInfo.find(s => s.isActive) ?? null,
        availableSets: allSetsInfo,
        isDefaultData: activeSet.type === 'default',
      })
    } catch (error) {
      console.error('Failed to switch quiz set:', error)
    }
  },

  deleteUserSet: async (setId) => {
    try {
      const quizRepo = getQuizRepository()
      await quizRepo.deleteUserSet(setId)

      const activeSet = await quizRepo.getActiveSet()
      const allSetsInfo = await quizRepo.getAllSetsInfo()

      set({
        allQuestions: [...activeSet.questions],
        activeSetInfo: allSetsInfo.find(s => s.isActive) ?? null,
        availableSets: allSetsInfo,
        isDefaultData: activeSet.type === 'default',
      })
    } catch (error) {
      console.error('Failed to delete user set:', error)
    }
  },

  // Progress actions
  loadUserProgress: async () => {
    const progress = await getProgressRepository().load()
    set({ userProgress: progress })
  },

  resetUserProgress: async () => {
    await getProgressRepository().reset()
    set({ userProgress: UserProgress.empty() })
  },

  // Getters
  getCurrentQuestion: () => {
    const state = get()
    if (!state.sessionState) return null
    return QuizSessionService.getCurrentQuestion(state.sessionState)
  },

  getProgress: () => {
    const state = get()
    if (!state.sessionState) {
      return { current: 0, total: 0 }
    }
    return QuizSessionService.getProgress(state.sessionState)
  },

  getFilteredQuestions: (categoryId, difficulty) => {
    const state = get()
    let questions = state.allQuestions

    if (categoryId) {
      questions = questions.filter(q => q.category === categoryId)
    }

    if (difficulty) {
      questions = questions.filter(q => q.difficulty === difficulty)
    }

    return questions
  },

  getCategoryStats: () => {
    const state = get()
    const stats: Record<string, {
      categoryId: string
      totalQuestions: number
      attemptedQuestions: number
      correctAnswers: number
      accuracy: number
    }> = {}

    for (const category of PREDEFINED_CATEGORIES) {
      const categoryQuestions = state.allQuestions.filter(
        q => q.category === category.id
      )
      const attemptedQuestions = categoryQuestions.filter(
        q => state.userProgress.hasAttempted(q.id)
      )
      const correctAnswers = attemptedQuestions.filter(
        q => state.userProgress.questionProgress[q.id]?.lastCorrect
      ).length

      stats[category.id] = {
        categoryId: category.id,
        totalQuestions: categoryQuestions.length,
        attemptedQuestions: attemptedQuestions.length,
        correctAnswers,
        accuracy: attemptedQuestions.length > 0
          ? Math.round((correctAnswers / attemptedQuestions.length) * 100)
          : 0,
      }
    }

    return stats
  },
}))

// Re-export types and configs for backward compatibility
export { PREDEFINED_CATEGORIES as CATEGORIES }
export { PREDEFINED_QUIZ_MODES as QUIZ_MODES }
export { APP_CONFIG }
export type { QuizSessionConfig, QuizSessionState }
