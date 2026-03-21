/**
 * QuizSessionService - クイズセッション管理のドメインサービス
 *
 * 【ドメインサービスとは】
 * DDD において、特定のエンティティに属さないビジネスロジックを
 * カプセル化するもの。クイズセッションの管理は Question や
 * UserProgress 単体の責務ではないため、サービスとして実装。
 *
 * 【設計原則：ステートレス】
 * このサービスはすべてのメソッドが static。
 * 状態を持たず、純粋な関数として動作する。
 *
 * 【なぜ状態を持たないのか】
 * - テストが容易（モックやセットアップ不要）
 * - 予測可能（同じ入力には同じ出力）
 * - スレッドセーフ（状態の競合がない）
 *
 * 【状態管理との役割分担】
 * - QuizSessionService: ビジネスロジック（問題選定、回答判定等）
 * - quizStore (Zustand): 状態の保持と UI への通知
 *
 * 状態の変更はすべて新しいオブジェクトを返すことで行う（不変更新）。
 */

import { Question } from '../entities/Question'
import { UserProgress } from '../entities/UserProgress'
import type { QuizModeId } from '../valueObjects/QuizMode'
import type { DifficultyLevel } from '../valueObjects/Difficulty'

/**
 * セッション設定
 *
 * クイズセッションの開始時に指定されるパラメータ。
 */
export interface QuizSessionConfig {
  readonly mode: QuizModeId
  readonly categoryFilter: string | null
  readonly difficultyFilter: DifficultyLevel | null
  readonly questionCount: number | null   // null = 全問
  readonly timeLimit: number | null       // null = 時間無制限（分単位）
  readonly shuffleQuestions: boolean
  readonly shuffleOptions: boolean
}

/**
 * セッション状態
 *
 * 【不変性】
 * この状態オブジェクトは不変。
 * 状態を変更する場合は新しいオブジェクトを作成する。
 *
 * 【なぜ不変にするか】
 * - React の変更検知が確実に動作
 * - 状態の履歴を追跡可能（デバッグ時に有用）
 * - 意図しない変更を防止
 */
export interface QuizSessionState {
  readonly config: QuizSessionConfig
  readonly questions: readonly Question[]
  readonly currentIndex: number
  readonly selectedAnswer: number | null
  readonly selectedAnswers: readonly number[]  // 複数選択用
  readonly isAnswered: boolean
  readonly isCorrect: boolean | null
  readonly score: number
  readonly answeredCount: number
  readonly isCompleted: boolean
  readonly startedAt: number | null
  readonly timeRemaining: number | null   // 秒単位
  readonly isReviewMode: boolean
  readonly reviewUserAnswers: readonly number[]
  readonly reviewUserMultiAnswers: readonly (readonly number[])[]  // 複数選択の復習用
  readonly hintUsed: boolean
  readonly hintsUsedCount: number
  /** 実力テストモード: 回答後にフィードバックを表示せず即次の問題へ */
  readonly deferFeedback: boolean
  /** 各問題の回答履歴 (index → {selectedAnswer, selectedAnswers, isCorrect}) */
  readonly answerHistory: ReadonlyMap<number, AnswerRecord>
}

export interface AnswerRecord {
  readonly selectedAnswer: number | null
  readonly selectedAnswers: readonly number[]
  readonly isCorrect: boolean
}

/**
 * クイズセッション管理サービス
 */
export class QuizSessionService {
  /**
   * Fisher-Yates シャッフルアルゴリズム
   *
   * 【なぜ Fisher-Yates か】
   * - O(n) の計算量
   * - 均一な分布を保証
   * - シンプルで理解しやすい
   *
   * 【注意】
   * 元の配列を変更せず、新しい配列を返す。
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
   * セッション用の問題リストを準備
   *
   * 【処理フロー】
   * 1. カテゴリでフィルタ
   * 2. 難易度でフィルタ
   * 3. モードに応じた問題選択（苦手モードなど）
   * 4. シャッフル（設定に応じて）
   * 5. 問題数の制限
   *
   * 【苦手モード（weak）の挙動】
   * 1. まず苦手問題（正答率 < weakThreshold）を抽出
   * 2. 苦手問題がなければ未回答問題にフォールバック
   * 3. 未回答問題もなければ全問題を使用
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

    // For overview mode, filter to tagged questions and sort by order tag
    if (config.mode === 'overview') {
      questions = questions.filter(q =>
        q.tags.includes('overview')
      )
      questions.sort((a, b) => {
        const getOrder = (q: Question): number => {
          const orderTag = q.tags.find(t => t.startsWith('overview-'))
          return orderTag ? parseInt(orderTag.replace('overview-', ''), 10) : 999
        }
        return getOrder(a) - getOrder(b)
      })
    }

    // For bookmark mode, filter to bookmarked questions
    if (config.mode === 'bookmark') {
      const bookmarked = questions.filter(q =>
        userProgress.isBookmarked(q.id)
      )
      if (bookmarked.length > 0) {
        questions = bookmarked
      }
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

    // For unanswered mode, filter to unanswered questions
    if (config.mode === 'unanswered') {
      const unanswered = questions.filter(q => !userProgress.hasAttempted(q.id))
      if (unanswered.length > 0) {
        questions = unanswered
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
   * セッションの初期状態を作成
   */
  static createInitialState(
    questions: Question[],
    config: QuizSessionConfig,
    options?: {
      isReviewMode?: boolean
      reviewUserAnswers?: number[]
      reviewUserMultiAnswers?: number[][]
    }
  ): QuizSessionState {
    const isReviewMode = options?.isReviewMode ?? false
    const reviewUserAnswers = options?.reviewUserAnswers ?? []
    const reviewUserMultiAnswers = options?.reviewUserMultiAnswers ?? []

    // In review mode, pre-populate the first question's state
    const firstQuestion = questions[0]
    let firstUserAnswer: number | null = null
    let firstSelectedAnswers: readonly number[] = []
    let firstIsCorrect: boolean | null = null

    if (isReviewMode && firstQuestion) {
      if (firstQuestion.isMultiSelect) {
        firstSelectedAnswers = reviewUserMultiAnswers[0] ?? []
        firstIsCorrect = firstQuestion.isCorrectMultiAnswer([...firstSelectedAnswers])
      } else {
        firstUserAnswer = reviewUserAnswers.length > 0 ? reviewUserAnswers[0] : null
        firstIsCorrect = firstUserAnswer !== null
          ? firstQuestion.isCorrectAnswer(firstUserAnswer) : null
      }
    }

    return {
      config,
      questions: Object.freeze(questions),
      currentIndex: 0,
      selectedAnswer: firstUserAnswer,
      selectedAnswers: Object.freeze(firstSelectedAnswers as number[]),
      isAnswered: isReviewMode,
      isCorrect: firstIsCorrect,
      score: 0,
      answeredCount: 0,
      isCompleted: false,
      startedAt: Date.now(),
      timeRemaining: config.timeLimit ? config.timeLimit * 60 : null,
      isReviewMode,
      reviewUserAnswers: Object.freeze(reviewUserAnswers),
      reviewUserMultiAnswers: Object.freeze(reviewUserMultiAnswers.map(a => Object.freeze([...a]))),
      hintUsed: false,
      hintsUsedCount: 0,
      deferFeedback: config.mode === 'full',
      answerHistory: new Map(),
    }
  }

  /**
   * デフォルト設定を作成
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
   * 回答を選択（単一選択用）
   *
   * すでに回答済みの場合は何もしない。
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
   * 回答をトグル（複数選択用）
   *
   * すでに選択されていれば解除、されていなければ追加。
   * 回答済みの場合は何もしない。
   */
  static toggleAnswer(
    state: QuizSessionState,
    answerIndex: number
  ): QuizSessionState {
    if (state.isAnswered) {
      return state
    }
    const current = [...state.selectedAnswers]
    const idx = current.indexOf(answerIndex)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(answerIndex)
    }
    return {
      ...state,
      selectedAnswers: Object.freeze(current),
    }
  }

  /**
   * 回答を確定
   *
   * 【戻り値】
   * - newState: 更新された状態
   * - isCorrect: 正解だったかどうか
   *
   * 選択されていない場合や、すでに回答済みの場合は null を返す。
   */
  static submitAnswer(state: QuizSessionState): {
    newState: QuizSessionState
    isCorrect: boolean
  } | null {
    if (state.isAnswered) {
      return null
    }

    const currentQuestion = state.questions[state.currentIndex]
    if (!currentQuestion) {
      return null
    }

    let isCorrect: boolean

    if (currentQuestion.isMultiSelect) {
      if (state.selectedAnswers.length === 0) {
        return null
      }
      isCorrect = currentQuestion.isCorrectMultiAnswer([...state.selectedAnswers])
    } else {
      if (state.selectedAnswer === null) {
        return null
      }
      isCorrect = currentQuestion.isCorrectAnswer(state.selectedAnswer)
    }

    // Check if this question was previously answered (re-answer scenario)
    const previousRecord = state.answerHistory.get(state.currentIndex)
    const isReAnswer = !!previousRecord

    // Save answer to history
    const newHistory = new Map(state.answerHistory)
    newHistory.set(state.currentIndex, {
      selectedAnswer: state.selectedAnswer,
      selectedAnswers: state.selectedAnswers,
      isCorrect,
    })

    // Adjust score: subtract previous answer's contribution, add new one
    let scoreDelta = isCorrect ? 1 : 0
    if (isReAnswer && previousRecord.isCorrect) {
      scoreDelta -= 1 // remove previous correct point
    }
    // Prevent negative score
    const newScore = Math.max(0, state.score + scoreDelta)

    const newState: QuizSessionState = {
      ...state,
      isAnswered: true,
      isCorrect,
      score: newScore,
      answeredCount: isReAnswer ? state.answeredCount : state.answeredCount + 1,
      answerHistory: newHistory,
    }

    return { newState, isCorrect }
  }

  /**
   * 前の問題に戻る（回答済みの問題を振り返る）
   */
  static previousQuestion(state: QuizSessionState): QuizSessionState | null {
    if (state.currentIndex <= 0) return null

    const prevIndex = state.currentIndex - 1
    const record = state.answerHistory.get(prevIndex)

    if (!record) return null // 未回答の問題には戻れない

    return {
      ...state,
      currentIndex: prevIndex,
      selectedAnswer: record.selectedAnswer,
      selectedAnswers: record.selectedAnswers,
      isAnswered: true,
      isCorrect: record.isCorrect,
      hintUsed: false,
    }
  }

  /**
   * 次の問題へ進む
   *
   * 最後の問題だった場合は isCompleted: true を設定。
   */
  static nextQuestion(state: QuizSessionState): QuizSessionState {
    const nextIndex = state.currentIndex + 1

    if (nextIndex >= state.questions.length) {
      return {
        ...state,
        isCompleted: true,
      }
    }

    // In review mode, pre-populate the next question's answer state
    if (state.isReviewMode) {
      const nextQuestion = state.questions[nextIndex]
      if (nextQuestion?.isMultiSelect) {
        const userMultiAnswer = state.reviewUserMultiAnswers[nextIndex] ?? []
        return {
          ...state,
          currentIndex: nextIndex,
          selectedAnswer: null,
          selectedAnswers: Object.freeze([...userMultiAnswer]),
          isAnswered: true,
          isCorrect: nextQuestion.isCorrectMultiAnswer([...userMultiAnswer]),
          hintUsed: false,
        }
      }
      const userAnswer = state.reviewUserAnswers[nextIndex] ?? null
      return {
        ...state,
        currentIndex: nextIndex,
        selectedAnswer: userAnswer,
        selectedAnswers: Object.freeze([]),
        isAnswered: true,
        isCorrect: nextQuestion && userAnswer !== null
          ? nextQuestion.isCorrectAnswer(userAnswer) : null,
        hintUsed: false,
      }
    }

    return {
      ...state,
      currentIndex: nextIndex,
      selectedAnswer: null,
      selectedAnswers: Object.freeze([]),
      isAnswered: false,
      isCorrect: null,
      hintUsed: false,
    }
  }

  /**
   * タイマーを更新（1秒減算）
   *
   * 時間切れになった場合は isCompleted: true を設定。
   */
  static updateTimer(state: QuizSessionState): QuizSessionState {
    if (state.timeRemaining === null || state.timeRemaining <= 0) {
      return state
    }

    // Pause timer when reviewing a previously answered question
    if (state.answerHistory.has(state.currentIndex) && !state.isAnswered) {
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
   * 現在の問題をリトライ（回答済み状態をリセット）
   *
   * 不正解の場合にのみリトライ可能。
   * スコアは変更しないが、リトライ後に正解してもスコアに加算しない。
   */
  static retryQuestion(state: QuizSessionState): QuizSessionState {
    if (!state.isAnswered || state.isCorrect) {
      return state
    }

    // Keep answerHistory entry (so navigation knows this was answered)
    // but reset UI state to allow re-answering.
    // submitAnswer will treat this as isReAnswer and adjust score accordingly.
    return {
      ...state,
      selectedAnswer: null,
      selectedAnswers: Object.freeze([]),
      isAnswered: false,
      isCorrect: null,
      hintUsed: false,
    }
  }

  /**
   * ヒントを使用
   *
   * 回答済みまたは既にヒント使用済みの場合は何もしない。
   */
  static useHint(state: QuizSessionState): QuizSessionState {
    if (state.isAnswered || state.hintUsed) return state
    return {
      ...state,
      hintUsed: true,
      hintsUsedCount: state.hintsUsedCount + 1,
    }
  }

  /**
   * 現在の問題を取得
   */
  static getCurrentQuestion(state: QuizSessionState): Question | null {
    return state.questions[state.currentIndex] ?? null
  }

  /**
   * 進捗情報を取得
   */
  static getProgress(state: QuizSessionState): { current: number; total: number } {
    return {
      current: state.currentIndex + 1,
      total: state.questions.length,
    }
  }

  /**
   * スコアをパーセンテージで計算
   */
  static calculateScorePercentage(state: QuizSessionState): number {
    if (state.answeredCount === 0) return 0
    return Math.round((state.score / state.answeredCount) * 100)
  }

  /**
   * 合格判定
   */
  static hasPassed(state: QuizSessionState, passingScore: number = 70): boolean {
    return this.calculateScorePercentage(state) >= passingScore
  }
}
