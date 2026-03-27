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
import { theme } from '@/config/theme'
import { SCENARIOS } from '@/data/scenarios'
// Domain imports
import { Question } from '@/domain/entities/Question'
import { UserProgress } from '@/domain/entities/UserProgress'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { ProgressExportService } from '@/domain/services/ProgressExportService'
import { type QuizSessionConfig, QuizSessionService, type QuizSessionState } from '@/domain/services/QuizSessionService'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import type { DifficultyLevel } from '@/domain/valueObjects/Difficulty'
import type { QuizModeId } from '@/domain/valueObjects/QuizMode'
import { getQuizModeById } from '@/domain/valueObjects/QuizMode'
// Infrastructure imports
import { getProgressRepository, getQuizRepository } from '@/infrastructure'
import { getSessionRepository, type SavedSessionData } from '@/infrastructure/persistence/SessionRepository'
import { platformAPI } from '@/lib/platformAPI'

// ============================================================
// View State
// ============================================================

/**
 * 画面の状態を表す型
 *
 * 【状態遷移】
 * menu ─(startSession)─> quiz ─(complete)─> result ─(endSession)─> menu
 *   │                                          │
 *   ├────────────(showProgress)────────────> progress
 *   └────────────(setViewState)────────────> reader
 */
type ViewState = 'menu' | 'quiz' | 'result' | 'progress' | 'reader' | 'scenarioSelect'

// ============================================================
// Store Interface
// ============================================================

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

  // Session state
  sessionConfig: QuizSessionConfig
  sessionState: QuizSessionState | null
  sessionWrongAnswers: { questionId: string; selectedAnswer: number; selectedAnswers?: number[] }[]

  // Progress state (using domain entity)
  userProgress: UserProgress

  // Saved session state (for resume)
  savedSession: SavedSessionData | null

  isLoading: boolean

  // View actions
  setViewState: (state: ViewState) => void

  // Initialization
  initialize: () => Promise<void>

  // Session actions
  startSession: (config: Partial<QuizSessionConfig>, options?: { startIndex?: number }) => void
  startSessionWithIds: (questionIds: string[]) => void
  startScenarioSession: (scenarioId: string) => void
  activeScenarioId: string | null
  retrySession: () => void
  retryQuestion: () => void
  selectAnswer: (index: number) => void
  toggleAnswer: (index: number) => void
  submitAnswer: () => void
  nextQuestion: () => void
  previousQuestion: () => void
  goToQuestion: (index: number) => void
  finishTest: () => void
  endSession: () => void

  // Timer actions
  updateTimer: () => void

  // Bookmark actions
  toggleBookmark: (questionId: string) => void
  getBookmarkedCount: () => number

  // Resume actions
  suspendSession: () => void
  resumeSession: () => void
  discardSavedSession: () => void

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
  getCategoryStats: () => Record<
    string,
    {
      categoryId: string
      totalQuestions: number
      attemptedQuestions: number
      correctAnswers: number
      accuracy: number
    }
  >
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
  title: `${theme.appName} マスタークイズ`,
  version: '2.0.0',
  passingScore: 70, // 合格点（%）
  weakThreshold: 50, // 苦手判定の閾値（%）
  minAttemptsForWeak: 1, // 苦手判定に必要な最小回答数
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
/**
 * セッション状態のスナップショットを保存（途中再開用）
 */
function saveSessionSnapshot(
  sessionState: QuizSessionState,
  wrongAnswers: { questionId: string; selectedAnswer: number; selectedAnswers?: number[] }[]
): void {
  // Serialize answerHistory Map to array
  const answerRecords: import('@/infrastructure/persistence/SessionRepository').SavedAnswerRecord[] = []
  sessionState.answerHistory.forEach((record, index) => {
    answerRecords.push({
      questionIndex: index,
      selectedAnswer: record.selectedAnswer,
      selectedAnswers: [...record.selectedAnswers],
      isCorrect: record.isCorrect,
    })
  })

  const data: SavedSessionData = {
    sessionConfig: sessionState.config,
    questionIds: sessionState.questions.map((q) => q.id),
    currentIndex: sessionState.currentIndex,
    score: sessionState.score,
    answeredCount: sessionState.answeredCount,
    startedAt: sessionState.startedAt ?? Date.now(),
    wrongAnswers: [...wrongAnswers],
    hintsUsedCount: sessionState.hintsUsedCount,
    hintUsedOnCurrent: sessionState.hintUsed,
    savedAt: Date.now(),
    answerRecords,
    scenarioId: useQuizStore.getState().activeScenarioId ?? undefined,
  }
  getSessionRepository().save(data)
}

/**
 * Record completed session in history and save progress
 */
function recordCompletedSession(
  sessionState: QuizSessionState,
  getCurrentProgress: () => UserProgress,
  updateStore: (progress: UserProgress) => void
): void {
  if (sessionState.isReviewMode) return

  // Compute per-category breakdown from answerHistory
  const categoryBreakdown: Record<string, { correct: number; total: number }> = {}
  for (const [idx, record] of sessionState.answerHistory) {
    const question = sessionState.questions[idx]
    if (!question) continue
    const cat = question.category
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { correct: 0, total: 0 }
    }
    categoryBreakdown[cat].total++
    if (record.isCorrect) {
      categoryBreakdown[cat].correct++
    }
  }

  const updatedProgress = getCurrentProgress().recordSession(
    sessionState.config.mode,
    sessionState.config.categoryFilter ?? null,
    sessionState.score,
    sessionState.answeredCount,
    categoryBreakdown
  )
  updateStore(updatedProgress)
  getProgressRepository().save(updatedProgress).catch(console.error)
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  // Initial state
  viewState: 'menu',
  allQuestions: [],
  sessionConfig: QuizSessionService.createDefaultConfig(),
  sessionState: null,
  sessionWrongAnswers: [],
  userProgress: UserProgress.empty(),
  savedSession: null,
  activeScenarioId: null,
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
      const questions = [...activeSet.questions]

      // Load progress
      const progress = await progressRepo.load()

      // Load saved session (for resume)
      const savedSession = getSessionRepository().load()

      set({
        allQuestions: questions,
        userProgress: progress,
        savedSession,
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
  startSession: (configOverrides, options?: { startIndex?: number }) => {
    const state = get()
    const modeConfig = configOverrides.mode ? getQuizModeById(configOverrides.mode) : null

    // モード設定をマージ（ユーザー指定 > モードデフォルト > 既存設定）
    const config: QuizSessionConfig = {
      ...state.sessionConfig,
      ...configOverrides,
      timeLimit:
        configOverrides.timeLimit !== undefined
          ? configOverrides.timeLimit
          : (modeConfig?.timeLimit ?? state.sessionConfig.timeLimit),
      questionCount:
        configOverrides.questionCount !== undefined
          ? configOverrides.questionCount
          : modeConfig
            ? modeConfig.questionCount
            : state.sessionConfig.questionCount,
      shuffleQuestions: modeConfig?.shuffleQuestions ?? state.sessionConfig.shuffleQuestions,
      shuffleOptions: modeConfig?.shuffleOptions ?? state.sessionConfig.shuffleOptions,
    }

    // QuizSessionService でセッション用の問題を準備
    const sessionQuestions = QuizSessionService.prepareSessionQuestions(
      state.allQuestions,
      config,
      state.userProgress,
      APP_CONFIG.weakThreshold,
      APP_CONFIG.minAttemptsForWeak
    )

    // Guard: no questions available for this config
    if (sessionQuestions.length === 0) return

    const initialState = QuizSessionService.createInitialState(sessionQuestions, config)
    const startIndex = options?.startIndex ? Math.min(options.startIndex, sessionQuestions.length - 1) : 0
    const sessionState = {
      ...initialState,
      currentIndex: startIndex,
      initialStreakDays: state.userProgress.streakDays,
      initialTodayCount: state.userProgress.getDailyCount(DailyGoalService.getTodayString()),
    }

    set({
      sessionConfig: config,
      sessionState,
      sessionWrongAnswers: [],
      savedSession: null,
      viewState: 'quiz',
    })

    // Save initial session snapshot for resume (skip review mode)
    if (config.mode !== 'review') {
      saveSessionSnapshot(sessionState, [])
    }
  },

  /**
   * 指定した問題IDのみでセッションを開始（検索結果からの起動用）
   */
  startSessionWithIds: (questionIds: string[]) => {
    const state = get()
    const questionMap = new Map(state.allQuestions.map((q) => [q.id, q]))
    const questions = questionIds.map((id) => questionMap.get(id)).filter((q): q is Question => q !== undefined)

    if (questions.length === 0) return

    const config: QuizSessionConfig = {
      mode: 'custom',
      categoryFilter: null,
      difficultyFilter: null,
      questionCount: null,
      timeLimit: null,
      shuffleQuestions: false,
      shuffleOptions: false,
    }

    const sessionState = {
      ...QuizSessionService.createInitialState(questions, config),
      initialStreakDays: state.userProgress.streakDays,
      initialTodayCount: state.userProgress.getDailyCount(DailyGoalService.getTodayString()),
    }

    set({
      sessionConfig: config,
      sessionState,
      sessionWrongAnswers: [],
      savedSession: null,
      viewState: 'quiz',
    })
    saveSessionSnapshot(sessionState, [])
  },

  startScenarioSession: (scenarioId: string) => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId)
    if (!scenario) return

    const state = get()
    const questionMap = new Map(state.allQuestions.map((q) => [q.id, q]))
    const questionIds = scenario.steps.filter((s) => s.type === 'question').map((s) => s.questionId!)
    const questions = questionIds.map((id) => questionMap.get(id)).filter((q): q is Question => q !== undefined)

    if (questions.length === 0) return

    const config: QuizSessionConfig = {
      mode: 'scenario',
      categoryFilter: null,
      difficultyFilter: null,
      questionCount: null,
      timeLimit: null,
      shuffleQuestions: false,
      shuffleOptions: false,
    }

    const sessionState = {
      ...QuizSessionService.createInitialState(questions, config),
      initialStreakDays: state.userProgress.streakDays,
      initialTodayCount: state.userProgress.getDailyCount(DailyGoalService.getTodayString()),
    }

    set({
      sessionConfig: config,
      sessionState,
      sessionWrongAnswers: [],
      savedSession: null,
      activeScenarioId: scenarioId,
      viewState: 'quiz',
    })
    saveSessionSnapshot(sessionState, [])
  },

  /**
   * 同じ問題セットでセッションをやり直す
   *
   * startSession と異なり、問題の再選出を行わず、
   * 直前のセッションと同じ問題セットを使用する。
   * shuffleQuestions が有効なら順序だけ再シャッフルする。
   */
  retrySession: () => {
    const state = get()
    if (!state.sessionState) return

    const config = state.sessionConfig
    let questions = [...state.sessionState.questions]

    if (config.shuffleQuestions) {
      questions = QuizSessionService.shuffleArray(questions)
    }

    const sessionState = {
      ...QuizSessionService.createInitialState(questions, config),
      initialStreakDays: state.userProgress.streakDays,
      initialTodayCount: state.userProgress.getDailyCount(DailyGoalService.getTodayString()),
    }

    set({
      sessionConfig: config,
      sessionState,
      sessionWrongAnswers: [],
      savedSession: null,
      viewState: 'quiz',
    })

    if (config.mode !== 'review') {
      saveSessionSnapshot(sessionState, [])
    }
  },

  retryQuestion: () => {
    const state = get()
    if (!state.sessionState) return

    const newSessionState = QuizSessionService.retryQuestion(state.sessionState)
    set({ sessionState: newSessionState })
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

      const updatedProgress = state.userProgress.recordAnswer(currentQuestion.id, currentQuestion.category, isCorrect)

      // Track wrong answers for review feature
      // Remove previous entry for this question (re-answer case)
      const filteredWrongAnswers = state.sessionWrongAnswers.filter((w) => w.questionId !== currentQuestion.id)
      const newWrongAnswers = isCorrect
        ? filteredWrongAnswers
        : [
            ...filteredWrongAnswers,
            {
              questionId: currentQuestion.id,
              selectedAnswer: state.sessionState.selectedAnswer ?? -1,
              selectedAnswers: currentQuestion.isMultiSelect ? [...state.sessionState.selectedAnswers] : undefined,
            },
          ]

      // Optimistic update - apply state immediately for responsive UI
      set({
        sessionState: newState,
        userProgress: updatedProgress,
        sessionWrongAnswers: newWrongAnswers,
      })

      // Save progress asynchronously with error handling
      getProgressRepository()
        .save(updatedProgress)
        .catch((error) => {
          console.error('Failed to save progress:', error)
        })

      // Save session snapshot so resume picks up the updated score/answeredCount
      saveSessionSnapshot(newState, newWrongAnswers)

      // In defer feedback mode (実力テスト), auto-advance to next unanswered question
      if (newState.deferFeedback) {
        // Find next unanswered question
        let nextIdx = newState.currentIndex + 1
        while (nextIdx < newState.questions.length && newState.answerHistory.has(nextIdx)) {
          nextIdx++
        }
        if (nextIdx < newState.questions.length) {
          const advancedState: typeof newState = {
            ...newState,
            currentIndex: nextIdx,
            selectedAnswer: null,
            selectedAnswers: Object.freeze([]),
            isAnswered: false,
            isCorrect: null,
            hintUsed: false,
          }
          set({ sessionState: advancedState })
          saveSessionSnapshot(advancedState, newWrongAnswers)
        }
        // If all answered, stay on current (user can submit test)
      }
    } else {
      set({ sessionState: newState })
    }
  },

  nextQuestion: () => {
    const state = get()
    if (!state.sessionState) return

    // In deferFeedback mode, don't auto-complete — user must use finishTest
    if (state.sessionState.deferFeedback) {
      const session = state.sessionState
      if (session.currentIndex < session.questions.length - 1) {
        const nextIdx = session.currentIndex + 1
        const record = session.answerHistory.get(nextIdx)
        const newState = {
          ...session,
          currentIndex: nextIdx,
          selectedAnswer: record?.selectedAnswer ?? null,
          selectedAnswers: record?.selectedAnswers ?? Object.freeze([]),
          isAnswered: false,
          isCorrect: null,
          hintUsed: false,
        }
        set({ sessionState: newState })
        saveSessionSnapshot(newState, state.sessionWrongAnswers)
      }
      return
    }

    const session = state.sessionState

    // If at last question and not answered, don't go to results
    if (session.currentIndex >= session.questions.length - 1 && !session.isAnswered) {
      return
    }

    const newSessionState = QuizSessionService.nextQuestion(session)

    if (newSessionState.isCompleted) {
      getSessionRepository().clear()
      recordCompletedSession(
        newSessionState,
        () => get().userProgress,
        (p) => set({ userProgress: p })
      )
      set({
        sessionState: newSessionState,
        viewState: 'result',
      })
    } else {
      set({ sessionState: newSessionState })
      // Save session for resume (skip review mode)
      if (!newSessionState.isReviewMode) {
        saveSessionSnapshot(newSessionState, get().sessionWrongAnswers)
      }
    }
  },

  previousQuestion: () => {
    const state = get()
    if (!state.sessionState) return
    const session = state.sessionState
    if (session.currentIndex <= 0) return

    const prevIdx = session.currentIndex - 1

    // Review mode: restore full answered state (with feedback)
    if (session.isReviewMode) {
      const question = session.questions[prevIdx]
      if (question?.isMultiSelect) {
        const userMultiAnswer = session.reviewUserMultiAnswers[prevIdx] ?? []
        set({
          sessionState: {
            ...session,
            currentIndex: prevIdx,
            selectedAnswer: null,
            selectedAnswers: Object.freeze([...userMultiAnswer]),
            isAnswered: true,
            isCorrect: question.isCorrectMultiAnswer([...userMultiAnswer]),
            hintUsed: false,
          },
        })
      } else {
        const userAnswer = session.reviewUserAnswers[prevIdx] ?? null
        set({
          sessionState: {
            ...session,
            currentIndex: prevIdx,
            selectedAnswer: userAnswer,
            selectedAnswers: Object.freeze([]),
            isAnswered: true,
            isCorrect: question && userAnswer !== null ? question.isCorrectAnswer(userAnswer) : null,
            hintUsed: false,
          },
        })
      }
      return
    }

    const record = session.answerHistory.get(prevIdx)

    // Normal mode: restore selection but hide feedback
    set({
      sessionState: {
        ...session,
        currentIndex: prevIdx,
        selectedAnswer: record?.selectedAnswer ?? null,
        selectedAnswers: record?.selectedAnswers ?? Object.freeze([]),
        isAnswered: false,
        isCorrect: null,
        hintUsed: false,
      },
    })
  },

  goToQuestion: (index: number) => {
    const state = get()
    if (!state.sessionState) return
    const session = state.sessionState
    if (index < 0 || index >= session.questions.length) return

    const record = session.answerHistory.get(index)

    // Restore selection but allow re-answering (isAnswered: false)
    set({
      sessionState: {
        ...session,
        currentIndex: index,
        selectedAnswer: record?.selectedAnswer ?? null,
        selectedAnswers: record?.selectedAnswers ?? Object.freeze([]),
        isAnswered: false,
        isCorrect: null,
        hintUsed: false,
      },
    })
  },

  finishTest: () => {
    const state = get()
    if (!state.sessionState) return

    const historySize = state.sessionState.answerHistory.size

    // Recalculate score from answerHistory if available, otherwise use session state
    let finalScore: number
    let finalCount: number
    if (historySize > 0) {
      let correctCount = 0
      state.sessionState.answerHistory.forEach((record) => {
        if (record.isCorrect) correctCount++
      })
      finalScore = correctCount
      finalCount = historySize
    } else {
      // Fallback for old saved sessions without answerRecords
      finalScore = state.sessionState.score
      finalCount = state.sessionState.answeredCount
    }

    // Guard: no answers recorded
    if (finalCount === 0) {
      getSessionRepository().clear()
      set({ viewState: 'menu', sessionState: null, savedSession: null, sessionWrongAnswers: [] })
      return
    }

    getSessionRepository().clear()

    // Record session in history
    const completedState = {
      ...state.sessionState,
      score: finalScore,
      answeredCount: finalCount,
      isCompleted: true,
    }
    recordCompletedSession(
      completedState,
      () => state.userProgress,
      (p) => set({ userProgress: p })
    )
    set({
      sessionState: completedState,
      viewState: 'result',
    })
  },

  endSession: () => {
    getSessionRepository().clear()
    set({
      viewState: 'menu',
      sessionState: null,
      sessionWrongAnswers: [],
      activeScenarioId: null,
    })
  },

  // Timer actions
  updateTimer: () => {
    const state = get()
    if (!state.sessionState) return

    const newSessionState = QuizSessionService.updateTimer(state.sessionState)

    if (newSessionState.isCompleted && !state.sessionState.isCompleted) {
      getSessionRepository().clear()
      recordCompletedSession(
        newSessionState,
        () => state.userProgress,
        (p) => set({ userProgress: p })
      )
      set({
        sessionState: newSessionState,
        viewState: 'result',
      })
    } else {
      set({ sessionState: newSessionState })
    }
  },

  // Bookmark actions
  toggleBookmark: (questionId) => {
    const state = get()
    const updatedProgress = state.userProgress.toggleBookmark(questionId)
    set({ userProgress: updatedProgress })
    getProgressRepository()
      .save(updatedProgress)
      .catch((error) => {
        console.error('Failed to save bookmark:', error)
      })
  },

  getBookmarkedCount: () => {
    return get().userProgress.bookmarkedQuestionIds.length
  },

  // Resume actions
  suspendSession: () => {
    const state = get()
    if (state.sessionState && !state.sessionState.isCompleted) {
      saveSessionSnapshot(state.sessionState, state.sessionWrongAnswers)
      const saved = getSessionRepository().load()
      set({
        viewState: 'menu',
        sessionState: null,
        savedSession: saved,
      })
    } else {
      set({
        viewState: 'menu',
        sessionState: null,
      })
    }
  },

  resumeSession: () => {
    const state = get()
    const saved = state.savedSession
    if (!saved) return

    // Reconstruct questions from IDs
    const questionMap = new Map(state.allQuestions.map((q) => [q.id, q]))
    const questions = saved.questionIds.map((id) => questionMap.get(id)).filter((q): q is Question => q !== undefined)

    if (questions.length === 0) {
      getSessionRepository().clear()
      set({ savedSession: null })
      return
    }

    // Reconstruct session state starting from the saved currentIndex
    // The question at currentIndex has not been answered yet
    // Reconstruct answerHistory from saved records
    const answerHistory = new Map<number, import('@/domain/services/QuizSessionService').AnswerRecord>()
    if (saved.answerRecords) {
      for (const r of saved.answerRecords) {
        answerHistory.set(r.questionIndex, {
          selectedAnswer: r.selectedAnswer,
          selectedAnswers: Object.freeze([...r.selectedAnswers]),
          isCorrect: r.isCorrect,
        })
      }
    }

    const sessionState = QuizSessionService.createInitialState(questions, saved.sessionConfig)

    // Clamp currentIndex to valid bounds (questions may have been removed)
    const safeCurrentIndex = Math.min(saved.currentIndex, questions.length - 1)

    // Restore current question's selection from answerHistory
    const currentRecord = answerHistory.get(safeCurrentIndex)

    const resumedState: QuizSessionState = {
      ...sessionState,
      currentIndex: safeCurrentIndex,
      score: saved.score,
      answeredCount: saved.answeredCount,
      startedAt: saved.startedAt,
      hintsUsedCount: saved.hintsUsedCount,
      hintUsed: saved.hintUsedOnCurrent ?? false,
      answerHistory,
      selectedAnswer: currentRecord?.selectedAnswer ?? null,
      selectedAnswers: currentRecord?.selectedAnswers ?? Object.freeze([]),
    }

    set({
      sessionConfig: saved.sessionConfig,
      sessionState: resumedState,
      sessionWrongAnswers: [...saved.wrongAnswers],
      savedSession: null,
      activeScenarioId: saved.scenarioId ?? null,
      viewState: 'quiz',
    })
  },

  discardSavedSession: () => {
    getSessionRepository().clear()
    set({ savedSession: null })
  },

  // Review actions
  startReviewSession: () => {
    const state = get()
    if (!state.sessionState || state.sessionWrongAnswers.length === 0) return

    const wrongQuestionIds = new Set(state.sessionWrongAnswers.map((w) => w.questionId))
    const wrongQuestions = state.sessionState.questions.filter((q) => wrongQuestionIds.has(q.id))
    const answerMap = new Map(state.sessionWrongAnswers.map((w) => [w.questionId, w.selectedAnswer]))
    const multiAnswerMap = new Map(
      state.sessionWrongAnswers.filter((w) => w.selectedAnswers).map((w) => [w.questionId, w.selectedAnswers ?? []])
    )
    const reviewUserAnswers = wrongQuestions.map((q) => answerMap.get(q.id) ?? -1)
    const reviewUserMultiAnswers = wrongQuestions.map((q) => multiAnswerMap.get(q.id) ?? [])

    const config: QuizSessionConfig = {
      mode: 'review',
      categoryFilter: null,
      difficultyFilter: null,
      questionCount: null,
      timeLimit: null,
      shuffleQuestions: false,
      shuffleOptions: false,
    }

    const sessionState = QuizSessionService.createInitialState([...wrongQuestions], config, {
      isReviewMode: true,
      reviewUserAnswers,
      reviewUserMultiAnswers,
    })

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
    getProgressRepository()
      .save(updatedProgress)
      .catch((error) => {
        console.error('Failed to save daily goal:', error)
      })
  },

  // Hint actions
  useHint: () => {
    const state = get()
    if (!state.sessionState) return
    // biome-ignore lint/correctness/useHookAtTopLevel: QuizSessionService.useHint is not a React Hook
    const newSessionState = QuizSessionService.useHint(state.sessionState)
    set({ sessionState: newSessionState })
  },

  // Export actions
  exportProgressCsv: async () => {
    const state = get()
    const dateStr = new Date().toISOString().split('T')[0]
    const questionCsv = ProgressExportService.generateQuestionCsv(state.allQuestions, state.userProgress)
    const categoryCsv = ProgressExportService.generateCategoryCsv(state.allQuestions, state.userProgress)
    const combinedCsv = `${questionCsv}\r\n\r\n--- カテゴリ別サマリー ---\r\n${categoryCsv}`
    await platformAPI.exportCsv(combinedCsv, `quiz-progress-${dateStr}.csv`)
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
      questions = questions.filter((q) => q.category === categoryId)
    }

    if (difficulty) {
      questions = questions.filter((q) => q.difficulty === difficulty)
    }

    return questions
  },

  getCategoryStats: () => {
    const state = get()
    const stats: Record<
      string,
      {
        categoryId: string
        totalQuestions: number
        attemptedQuestions: number
        correctAnswers: number
        accuracy: number
      }
    > = {}

    for (const category of PREDEFINED_CATEGORIES) {
      const categoryQuestions = state.allQuestions.filter((q) => q.category === category.id)
      const attemptedQuestions = categoryQuestions.filter((q) => state.userProgress.hasAttempted(q.id))
      const correctAnswers = attemptedQuestions.filter(
        (q) => state.userProgress.questionProgress[q.id]?.lastCorrect
      ).length

      stats[category.id] = {
        categoryId: category.id,
        totalQuestions: categoryQuestions.length,
        attemptedQuestions: attemptedQuestions.length,
        correctAnswers,
        accuracy: attemptedQuestions.length > 0 ? Math.round((correctAnswers / attemptedQuestions.length) * 100) : 0,
      }
    }

    return stats
  },
}))

export type { QuizSessionConfig, QuizSessionState }
// Re-export types and configs
export { APP_CONFIG }
