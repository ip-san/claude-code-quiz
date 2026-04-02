/**
 * Session Slice - Quiz session lifecycle
 *
 * Handles: startSession, startSessionWithIds, startScenarioSession,
 * submitAnswer, nextQuestion, previousQuestion, goToQuestion,
 * finishTest, endSession, retryQuestion, retrySession,
 * selectAnswer, toggleAnswer, useHint, updateTimer
 */

import { SCENARIOS } from '@/data/scenarios'
import { Question } from '@/domain/entities/Question'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { type QuizSessionConfig, QuizSessionService, type QuizSessionState } from '@/domain/services/QuizSessionService'
import { getQuizModeById } from '@/domain/valueObjects/QuizMode'
import { getProgressRepository } from '@/infrastructure'
import { getSessionRepository } from '@/infrastructure/persistence/SessionRepository'
import { trackAnswer, trackQuizQuit, trackQuizStart, trackSearch } from '@/lib/analytics'
import { APP_CONFIG, recordCompletedSession, type StoreGet, type StoreSet, saveSessionSnapshot } from '../utils'

export interface SessionSlice {
  sessionConfig: QuizSessionConfig
  sessionState: QuizSessionState | null
  sessionWrongAnswers: { questionId: string; selectedAnswer: number; selectedAnswers?: number[] }[]
  activeScenarioId: string | null
  sessionLabel: string | null

  startSession: (config: Partial<QuizSessionConfig>, options?: { startIndex?: number }) => void
  startSessionWithIds: (questionIds: string[], label?: string) => void
  startScenarioSession: (scenarioId: string) => void
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
  updateTimer: () => void
  useHint: () => void

  // Computed getters
  getCurrentQuestion: () => Question | null
  getProgress: () => { current: number; total: number }
}

export const createSessionSlice = (set: StoreSet, get: StoreGet): SessionSlice => ({
  sessionConfig: QuizSessionService.createDefaultConfig(),
  sessionState: null,
  sessionWrongAnswers: [],
  activeScenarioId: null,
  sessionLabel: null,

  startSession: (configOverrides, options?: { startIndex?: number }) => {
    const state = get()
    const modeConfig = configOverrides.mode ? getQuizModeById(configOverrides.mode) : null

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

    const sessionQuestions = QuizSessionService.prepareSessionQuestions(
      state.allQuestions,
      config,
      state.userProgress,
      APP_CONFIG.weakThreshold,
      APP_CONFIG.minAttemptsForWeak
    )

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

    trackQuizStart(config.mode, sessionQuestions.length, config.categoryFilter ?? undefined)

    if (config.mode !== 'review') {
      saveSessionSnapshot(sessionState, [], () => ({
        activeScenarioId: get().activeScenarioId,
        sessionLabel: get().sessionLabel,
      }))
    }
  },

  startSessionWithIds: (questionIds: string[], label?: string) => {
    const state = get()
    const questionMap = new Map(state.allQuestions.map((q) => [q.id, q]))
    const questions = questionIds.map((id) => questionMap.get(id)).filter((q): q is Question => q !== undefined)

    if (questions.length === 0) return
    trackSearch(questions.length)

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
      sessionLabel: label ?? null,
      viewState: 'quiz',
    })
    saveSessionSnapshot(sessionState, [], () => ({
      activeScenarioId: get().activeScenarioId,
      sessionLabel: get().sessionLabel,
    }))
  },

  startScenarioSession: (scenarioId: string) => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId)
    if (!scenario) return

    const state = get()
    const questionMap = new Map(state.allQuestions.map((q) => [q.id, q]))
    const questionIds = scenario.steps.flatMap((s) => (s.type === 'question' && s.questionId ? [s.questionId] : []))
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
    saveSessionSnapshot(sessionState, [], () => ({
      activeScenarioId: get().activeScenarioId,
      sessionLabel: get().sessionLabel,
    }))
  },

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
      saveSessionSnapshot(sessionState, [], () => ({
        activeScenarioId: get().activeScenarioId,
        sessionLabel: get().sessionLabel,
      }))
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

  submitAnswer: () => {
    const state = get()
    if (!state.sessionState) return

    const result = QuizSessionService.submitAnswer(state.sessionState)
    if (!result) return

    const { newState, isCorrect } = result
    const currentQuestion = QuizSessionService.getCurrentQuestion(state.sessionState)

    if (currentQuestion) {
      trackAnswer(currentQuestion.id, currentQuestion.category, currentQuestion.difficulty, isCorrect)

      if (state.sessionState.isReviewMode) {
        set({ sessionState: newState })
        return
      }

      const isRetry = state.sessionState.answerHistory.has(state.sessionState.currentIndex)
      const updatedProgress = state.userProgress.recordAnswer(
        currentQuestion.id,
        currentQuestion.category,
        isCorrect,
        isRetry
      )

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

      set({
        sessionState: newState,
        userProgress: updatedProgress,
        sessionWrongAnswers: newWrongAnswers,
      })

      getProgressRepository()
        .save(updatedProgress)
        .catch((error) => {
          console.error('Failed to save progress:', error)
        })

      saveSessionSnapshot(newState, newWrongAnswers, () => ({
        activeScenarioId: get().activeScenarioId,
        sessionLabel: get().sessionLabel,
      }))

      // In defer mode (実力テスト), auto-advance to next unanswered question after submission
      if (newState.deferFeedback) {
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
          saveSessionSnapshot(advancedState, newWrongAnswers, () => ({
            activeScenarioId: get().activeScenarioId,
            sessionLabel: get().sessionLabel,
          }))
        }
      }
    } else {
      set({ sessionState: newState })
    }
  },

  nextQuestion: () => {
    const state = get()
    if (!state.sessionState) return

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
        saveSessionSnapshot(newState, state.sessionWrongAnswers, () => ({
          activeScenarioId: get().activeScenarioId,
          sessionLabel: get().sessionLabel,
        }))
      }
      return
    }

    const session = state.sessionState

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
      if (!newSessionState.isReviewMode) {
        saveSessionSnapshot(newSessionState, get().sessionWrongAnswers, () => ({
          activeScenarioId: get().activeScenarioId,
          sessionLabel: get().sessionLabel,
        }))
      }
    }
  },

  previousQuestion: () => {
    const state = get()
    if (!state.sessionState) return
    const session = state.sessionState
    if (session.currentIndex <= 0) return

    const prevIdx = session.currentIndex - 1

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
      finalScore = state.sessionState.score
      finalCount = state.sessionState.answeredCount
    }

    if (finalCount === 0) {
      getSessionRepository().clear()
      set({ viewState: 'menu', sessionState: null, savedSession: null, sessionWrongAnswers: [] })
      return
    }

    getSessionRepository().clear()

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
    const state = get()
    if (state.sessionState && state.sessionConfig && !state.sessionState.isCompleted) {
      trackQuizQuit(state.sessionConfig.mode, state.sessionState.answeredCount, state.sessionState.questions.length)
    }
    getSessionRepository().clear()
    set({
      viewState: 'menu',
      sessionState: null,
      sessionWrongAnswers: [],
      activeScenarioId: null,
      sessionLabel: null,
    })
  },

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

  useHint: () => {
    const state = get()
    if (!state.sessionState) return
    // biome-ignore lint/correctness/useHookAtTopLevel: QuizSessionService.useHint is not a React Hook
    const newSessionState = QuizSessionService.useHint(state.sessionState)
    set({ sessionState: newSessionState })
  },

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
})
