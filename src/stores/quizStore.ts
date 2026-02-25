/**
 * Quiz Store - Zustand による状態管理
 *
 * 【このファイルの役割】
 * アプリケーション全体の状態（State）を管理する。
 * React コンポーネントは useQuizStore() フックを通じて状態にアクセスする。
 *
 * 【なぜ Zustand を選んだのか】
 * - Redux より軽量でボイラープレートが少ない
 * - Context API より再レンダリング制御が容易
 * - TypeScript との相性が良い
 * - 学習コストが低い
 *
 * 【アーキテクチャ：クリーンアーキテクチャとの関係】
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  Presentation Layer (React Components)                  │
 * │  └─> useQuizStore() でこのストアにアクセス              │
 * ├─────────────────────────────────────────────────────────┤
 * │  Application Layer (このファイル: quizStore.ts)         │
 * │  └─> Domain Layer と Infrastructure Layer を統合       │
 * ├─────────────────────────────────────────────────────────┤
 * │  Domain Layer (entities, services, valueObjects)        │
 * │  └─> ビジネスロジック（Question, UserProgress 等）      │
 * ├─────────────────────────────────────────────────────────┤
 * │  Infrastructure Layer (repositories, validation)        │
 * │  └─> 永続化、外部システムとの接続                       │
 * └─────────────────────────────────────────────────────────┘
 *
 * 【状態の分類】
 * 1. View State: 画面遷移の状態（menu, quiz, result, progress）
 * 2. Domain State: ビジネスデータ（questions, userProgress）
 * 3. Session State: クイズセッション中の一時的な状態
 * 4. UI State: ローディング、エラー表示など
 */

import { create } from 'zustand'

// Domain imports
import { Question } from '@/domain/entities/Question'
import { UserProgress } from '@/domain/entities/UserProgress'
import type { QuizModeId } from '@/domain/valueObjects/QuizMode'
import type { DifficultyLevel } from '@/domain/valueObjects/Difficulty'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { getQuizModeById } from '@/domain/valueObjects/QuizMode'
import {
  QuizSessionService,
  type QuizSessionConfig,
  type QuizSessionState,
} from '@/domain/services/QuizSessionService'
import { ProgressExportService } from '@/domain/services/ProgressExportService'

// Infrastructure imports
import {
  getQuizRepository,
  getProgressRepository,
} from '@/infrastructure'

// ============================================================
// View State
// ============================================================

/**
 * 画面の状態を表す型
 *
 * 【状態遷移】
 * menu ─(startSession)─> quiz ─(complete)─> result ─(endSession)─> menu
 *   │                                          │
 *   └────────────(showProgress)────────────> progress
 */
type ViewState = 'menu' | 'quiz' | 'result' | 'progress'

// ============================================================
// Store Interface
// ============================================================

/**
 * クイズセット情報
 *
 * 複数のクイズセットを管理するための情報。
 * 'default' は組み込みのクイズ、'user' はインポートされたクイズ。
 */
interface QuizSetInfo {
  id: string
  title: string
  type: 'default' | 'user'
  questionCount: number
  isActive: boolean
}

/**
 * ストアのインターフェース定義
 *
 * 【設計原則】
 * - 状態（state）と操作（action）を明確に分離
 * - getter 関数で派生状態を計算（キャッシュ化はしない）
 * - 非同期操作は Promise を返す
 */
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
  sessionWrongAnswers: { questionId: string; selectedAnswer: number; selectedAnswers?: number[] }[]

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
  toggleAnswer: (index: number) => void
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

  // Bookmark actions
  toggleBookmark: (questionId: string) => void
  getBookmarkedCount: () => number

  // Review actions
  startReviewSession: () => void

  // Daily goal actions
  setDailyGoal: (goal: number) => void

  // Hint actions
  useHint: () => void

  // Export actions
  exportProgressCsv: () => Promise<void>

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

/**
 * アプリケーション設定
 *
 * 【設計判断】
 * - ハードコードせず定数として定義
 * - 将来的に設定画面で変更可能にできる
 * - テスト時にモック可能
 */
const APP_CONFIG = {
  title: 'Claude Code マスタークイズ',
  version: '2.0.0',
  passingScore: 70,           // 合格点（%）
  weakThreshold: 50,          // 苦手判定の閾値（%）
  minAttemptsForWeak: 1,      // 苦手判定に必要な最小回答数
  defaultMode: 'random' as QuizModeId,
}

// ============================================================
// Store Implementation
// ============================================================

/**
 * Zustand ストアの実装
 *
 * 【Zustand の使い方】
 * create<Interface>((set, get) => ({...})) でストアを作成
 * - set: 状態を更新する関数
 * - get: 現在の状態を取得する関数
 *
 * 【再レンダリングの最適化】
 * Zustand は使用しているプロパティのみを監視する。
 * コンポーネントで const { viewState } = useQuizStore() とすると、
 * viewState が変わった時だけ再レンダリングされる。
 */
export const useQuizStore = create<QuizStore>((set, get) => ({
  // Initial state
  viewState: 'menu',
  allQuestions: [],
  activeSetInfo: null,
  availableSets: [],
  isDefaultData: true,
  sessionConfig: QuizSessionService.createDefaultConfig(),
  sessionState: null,
  sessionWrongAnswers: [],
  userProgress: UserProgress.empty(),
  importError: null,
  isLoading: true,

  // View actions
  setViewState: (state) => set({ viewState: state }),

  /**
   * アプリ起動時の初期化
   *
   * 【フロー】
   * 1. Repository からクイズデータをロード
   * 2. Repository から学習進捗をロード
   * 3. 状態を更新
   *
   * 【エラーハンドリング】
   * 初期化失敗時も isLoading: false にして UI をブロックしない。
   * デフォルトデータにフォールバックする。
   */
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

  /**
   * クイズセッション開始
   *
   * 【設計判断：なぜ QuizSessionService に委譲するか】
   * ビジネスロジック（問題のシャッフル、苦手問題の抽出等）を
   * ストアから分離し、テスト可能にするため。
   * ストアは状態管理に専念し、ロジックは Domain Layer に任せる。
   */
  startSession: (configOverrides) => {
    const state = get()
    const modeConfig = configOverrides.mode
      ? getQuizModeById(configOverrides.mode)
      : null

    // モード設定をマージ（ユーザー指定 > モードデフォルト > 既存設定）
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

    // QuizSessionService でセッション用の問題を準備
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
      sessionWrongAnswers: [],
      viewState: 'quiz',
    })
  },

  selectAnswer: (index) => {
    const state = get()
    if (!state.sessionState) return

    const newSessionState = QuizSessionService.selectAnswer(state.sessionState, index)
    set({ sessionState: newSessionState })
  },

  toggleAnswer: (index) => {
    const state = get()
    if (!state.sessionState) return

    const newSessionState = QuizSessionService.toggleAnswer(state.sessionState, index)
    set({ sessionState: newSessionState })
  },

  /**
   * 回答を確定する
   *
   * 【Optimistic Update パターン】
   * 1. UI をすぐに更新（ユーザー体験向上）
   * 2. バックグラウンドで永続化
   * 3. 永続化失敗時はコンソールにログ（メモリには残っているので次回保存時にリトライ）
   *
   * 【なぜ await しないのか】
   * 保存完了を待つと UI がもたつく。
   * 進捗はメモリにも保持されているので、次の保存時に含まれる。
   */
  submitAnswer: () => {
    const state = get()
    if (!state.sessionState) return

    const result = QuizSessionService.submitAnswer(state.sessionState)
    if (!result) return

    const { newState, isCorrect } = result
    const currentQuestion = QuizSessionService.getCurrentQuestion(state.sessionState)

    if (currentQuestion) {
      // Update progress (skip in review mode)
      if (state.sessionState.isReviewMode) {
        set({ sessionState: newState })
        return
      }

      const updatedProgress = state.userProgress.recordAnswer(
        currentQuestion.id,
        currentQuestion.category,
        isCorrect
      )

      // Track wrong answers for review feature
      const newWrongAnswers = isCorrect
        ? state.sessionWrongAnswers
        : [
            ...state.sessionWrongAnswers,
            {
              questionId: currentQuestion.id,
              selectedAnswer: state.sessionState.selectedAnswer ?? -1,
              selectedAnswers: currentQuestion.isMultiSelect
                ? [...state.sessionState.selectedAnswers]
                : undefined,
            },
          ]

      // Optimistic update - apply state immediately for responsive UI
      set({
        sessionState: newState,
        userProgress: updatedProgress,
        sessionWrongAnswers: newWrongAnswers,
      })

      // Save progress asynchronously with error handling
      getProgressRepository().save(updatedProgress).catch((error) => {
        console.error('Failed to save progress:', error)
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

  /**
   * クイズデータのインポート
   *
   * 【バリデーションの場所】
   * Repository 内で QuizValidator を使用してバリデーション。
   * 不正なデータは Repository で弾かれる。
   *
   * 【エラーハンドリング】
   * - バリデーションエラー: importError に設定
   * - ユーザーがキャンセル: 何もしない
   */
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

  // Bookmark actions
  toggleBookmark: (questionId) => {
    const state = get()
    const updatedProgress = state.userProgress.toggleBookmark(questionId)
    set({ userProgress: updatedProgress })
    getProgressRepository().save(updatedProgress).catch((error) => {
      console.error('Failed to save bookmark:', error)
    })
  },

  getBookmarkedCount: () => {
    return get().userProgress.bookmarkedQuestionIds.length
  },

  // Review actions
  startReviewSession: () => {
    const state = get()
    if (!state.sessionState || state.sessionWrongAnswers.length === 0) return

    const wrongQuestionIds = new Set(state.sessionWrongAnswers.map(w => w.questionId))
    const wrongQuestions = state.sessionState.questions.filter(q => wrongQuestionIds.has(q.id))
    const answerMap = new Map(state.sessionWrongAnswers.map(w => [w.questionId, w.selectedAnswer]))
    const multiAnswerMap = new Map(
      state.sessionWrongAnswers
        .filter(w => w.selectedAnswers)
        .map(w => [w.questionId, w.selectedAnswers!])
    )
    const reviewUserAnswers = wrongQuestions.map(q => answerMap.get(q.id) ?? -1)
    const reviewUserMultiAnswers = wrongQuestions.map(q => multiAnswerMap.get(q.id) ?? [])

    const config: QuizSessionConfig = {
      mode: 'review',
      categoryFilter: null,
      difficultyFilter: null,
      questionCount: null,
      timeLimit: null,
      shuffleQuestions: false,
      shuffleOptions: false,
    }

    const sessionState = QuizSessionService.createInitialState(
      [...wrongQuestions],
      config,
      { isReviewMode: true, reviewUserAnswers, reviewUserMultiAnswers }
    )

    set({
      sessionState,
      sessionConfig: config,
      viewState: 'quiz',
    })
  },

  // Daily goal actions
  setDailyGoal: (goal) => {
    const state = get()
    const updatedProgress = UserProgress.create({
      ...state.userProgress.toJSON(),
      dailyGoal: goal,
      modifiedAt: Date.now(),
    })
    set({ userProgress: updatedProgress })
    getProgressRepository().save(updatedProgress).catch((error) => {
      console.error('Failed to save daily goal:', error)
    })
  },

  // Hint actions
  useHint: () => {
    const state = get()
    if (!state.sessionState) return
    // eslint-disable-next-line react-hooks/rules-of-hooks -- QuizSessionService.useHint is not a React Hook
    const newSessionState = QuizSessionService.useHint(state.sessionState)
    set({ sessionState: newSessionState })
  },

  // Export actions
  exportProgressCsv: async () => {
    const state = get()
    const dateStr = new Date().toISOString().split('T')[0]
    const questionCsv = ProgressExportService.generateQuestionCsv(
      state.allQuestions,
      state.userProgress
    )
    const categoryCsv = ProgressExportService.generateCategoryCsv(
      state.allQuestions,
      state.userProgress
    )
    const combinedCsv = `${questionCsv}\r\n\r\n--- カテゴリ別サマリー ---\r\n${categoryCsv}`
    await window.electronAPI.exportCsv(combinedCsv, `quiz-progress-${dateStr}.csv`)
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

  // ============================================================
  // Getters（派生状態の計算）
  // ============================================================
  // 【注意】これらは毎回計算される。
  // パフォーマンスが問題になる場合は useMemo と組み合わせる。

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

// Re-export types and configs
export { APP_CONFIG }
export type { QuizSessionConfig, QuizSessionState }
