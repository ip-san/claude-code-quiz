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
  readonly isAnswered: boolean
  readonly isCorrect: boolean | null
  readonly score: number
  readonly answeredCount: number
  readonly isCompleted: boolean
  readonly startedAt: number | null
  readonly timeRemaining: number | null   // 秒単位
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
   * セッションの初期状態を作成
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
   * 回答を選択
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

    return {
      ...state,
      currentIndex: nextIndex,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
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
