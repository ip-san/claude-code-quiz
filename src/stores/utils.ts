/**
 * Store utilities - Helper functions and shared types for quiz store slices
 */

import { theme } from '@/config/theme'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import { type QuizSessionConfig, type QuizSessionState } from '@/domain/services/QuizSessionService'
import type { QuizModeId } from '@/domain/valueObjects/QuizMode'
import { getProgressRepository } from '@/infrastructure'
import {
  getSessionRepository,
  type SavedAnswerRecord,
  type SavedSessionData,
} from '@/infrastructure/persistence/SessionRepository'
import { setUserProperties, trackQuizComplete } from '@/lib/analytics'

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
export type ViewState =
  | 'menu'
  | 'quiz'
  | 'result'
  | 'progress'
  | 'reader'
  | 'scenarioSelect'
  | 'studyFirst'
  | 'tutorial'

// ============================================================
// App Configuration
// ============================================================

/**
 * アプリケーション設定
 */
export const APP_CONFIG = {
  title: `${theme.appName} マスタークイズ`,
  version: '2.0.0',
  passingScore: 70,
  weakThreshold: 50,
  minAttemptsForWeak: 1,
  defaultMode: 'random' as QuizModeId,
}

// ============================================================
// Store Interface
// ============================================================

import type { DifficultyLevel } from '@/domain/valueObjects/Difficulty'

/**
 * ストアのインターフェース定義
 */
export interface QuizStore {
  // View state
  viewState: ViewState
  readerInitialFilter: string | null

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
  openReaderWithFilter: (filter: string) => void

  // Initialization
  initialize: () => Promise<void>

  // Session actions
  startSession: (config: Partial<QuizSessionConfig>, options?: { startIndex?: number }) => void
  startSessionWithIds: (questionIds: string[], label?: string) => void
  startScenarioSession: (scenarioId: string) => void
  activeScenarioId: string | null
  /** 検索キーワードなど、カスタムセッションのラベル */
  sessionLabel: string | null
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
// Slice Creator Type
// ============================================================

export type StoreSet = (partial: Partial<QuizStore> | ((state: QuizStore) => Partial<QuizStore>)) => void
export type StoreGet = () => QuizStore

// ============================================================
// Helper Functions
// ============================================================

/**
 * セッション状態のスナップショットを保存（途中再開用）
 */
export function saveSessionSnapshot(
  sessionState: QuizSessionState,
  wrongAnswers: { questionId: string; selectedAnswer: number; selectedAnswers?: number[] }[],
  getStoreValues: () => { activeScenarioId: string | null; sessionLabel: string | null }
): void {
  const answerRecords: SavedAnswerRecord[] = []
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
    scenarioId: getStoreValues().activeScenarioId ?? undefined,
    sessionLabel: getStoreValues().sessionLabel ?? undefined,
  }
  getSessionRepository().save(data)
}

/**
 * Record completed session in history and save progress
 */
export function recordCompletedSession(
  sessionState: QuizSessionState,
  getCurrentProgress: () => UserProgress,
  updateStore: (progress: UserProgress) => void
): void {
  if (sessionState.isReviewMode) return

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

  const accuracy =
    sessionState.answeredCount > 0 ? Math.round((sessionState.score / sessionState.answeredCount) * 100) : 0
  const durationSec = sessionState.startedAt ? Math.round((Date.now() - sessionState.startedAt) / 1000) : 0
  trackQuizComplete(sessionState.config.mode, sessionState.score, sessionState.answeredCount, accuracy, durationSec)

  // ユーザープロパティを更新（セグメント分析用）
  setUserProperties({
    total_quizzes: updatedProgress.sessionHistory.length,
  })
}
