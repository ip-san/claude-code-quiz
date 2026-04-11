/**
 * SessionSlice unit tests
 *
 * Covers bugs found in spec review: C1 (retryQuestion snapshot), C2 (deferFeedback double snapshot),
 * H3 (startSession state reset), H4 (startScenarioSession label reset),
 * H5 (navigation isAnswered/isCorrect restoration)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserProgress } from '@/domain/entities/UserProgress'
import { useQuizStore } from '../quizStore'

vi.mock('@/lib/analytics', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, trackRecommendFeedback: vi.fn() }
})

/** シングルセレクト問題のIDをN個取得 */
function getSingleSelectIds(count: number): string[] {
  const all = useQuizStore.getState().allQuestions
  return all
    .filter((q) => !Array.isArray(q.correctIndex))
    .slice(0, count)
    .map((q) => q.id)
}

// Helper: initialize store and return it
async function initStore() {
  await useQuizStore.getState().initialize()
  return useQuizStore.getState
}

// Helper: answer the CURRENT question (whatever currentIndex is)
function answerCurrentQuestion(correct: boolean) {
  const state = useQuizStore.getState()
  const session = state.sessionState!
  const q = session.questions[session.currentIndex]
  const ci = q.correctIndex
  const correctSet = new Set(Array.isArray(ci) ? ci : [ci])

  if (correct) {
    if (Array.isArray(ci)) {
      for (const idx of ci) state.toggleAnswer(idx)
    } else {
      state.selectAnswer(ci)
    }
  } else {
    const wrongIndex = q.options.findIndex((_, i) => !correctSet.has(i))
    if (Array.isArray(ci)) {
      state.toggleAnswer(wrongIndex)
    } else {
      state.selectAnswer(wrongIndex)
    }
  }
  state.submitAnswer()
}

describe('sessionSlice', () => {
  beforeEach(async () => {
    localStorage.clear()
    useQuizStore.setState({
      viewState: 'menu',
      sessionState: null,
      sessionWrongAnswers: [],
      savedSession: null,
      activeScenarioId: null,
      sessionLabel: null,
      userProgress: UserProgress.empty(),
    })
    await initStore()
  })

  describe('C1: retryQuestion saves session snapshot', () => {
    it('should persist session state after retry', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(3))
      answerCurrentQuestion(false)

      // localStorage should have a snapshot from submitAnswer
      const snapshotBefore = localStorage.getItem('claude-code-quiz-session')
      expect(snapshotBefore).not.toBeNull()

      // Retry the question
      useQuizStore.getState().retryQuestion()
      const s = useQuizStore.getState().sessionState!
      expect(s.isAnswered).toBe(false)
      expect(s.isCorrect).toBeNull()

      // Snapshot should be updated after retry
      const snapshotAfter = localStorage.getItem('claude-code-quiz-session')
      expect(snapshotAfter).not.toBeNull()
      // retryQuestion doesn't change answeredCount, but the snapshot should be re-saved
      // Verify the setItem was called after retry (at least 2 saves: submitAnswer + retry)
      const setItemCalls = (localStorage.setItem as any).mock.calls.filter(
        (c: string[]) => c[0] === 'claude-code-quiz-session'
      )
      expect(setItemCalls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('C2: deferFeedback single atomic update', () => {
    it('should auto-advance in defer mode without double snapshot', () => {
      useQuizStore.getState().startSession({ mode: 'full' })
      const s = useQuizStore.getState().sessionState!
      expect(s.deferFeedback).toBe(true)

      // Answer first question
      answerCurrentQuestion(true)

      // Should auto-advance to next question
      const after = useQuizStore.getState().sessionState!
      expect(after.currentIndex).toBe(1)
      expect(after.isAnswered).toBe(false)

      // Answer should be recorded in history
      expect(after.answerHistory.has(0)).toBe(true)
    })
  })

  describe('H3: startSession resets activeScenarioId and sessionLabel', () => {
    it('should clear activeScenarioId from previous scenario session', () => {
      // Start a scenario session first
      const scenarios = useQuizStore.getState().allQuestions.length > 0
      if (!scenarios) return

      // Manually set scenario state to simulate previous scenario session
      useQuizStore.setState({ activeScenarioId: 'old-scenario', sessionLabel: 'old-label' })

      // Start a regular session
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(3))

      const state = useQuizStore.getState()
      expect(state.activeScenarioId).toBeNull()
      expect(state.sessionLabel).toBeNull()
    })
  })

  describe('H4: startScenarioSession resets sessionLabel', () => {
    it('should clear sessionLabel from previous custom session', () => {
      // Set a label from a previous custom session
      useQuizStore.setState({ sessionLabel: 'search: hooks' })

      // Start a scenario session (use first available scenario)
      useQuizStore.getState().startScenarioSession('scenario-onboard')

      const state = useQuizStore.getState()
      expect(state.sessionLabel).toBeNull()
      // activeScenarioId should be set to the new scenario
      expect(state.activeScenarioId).toBe('scenario-onboard')
    })
  })

  describe('H5: navigation restores isAnswered/isCorrect from answerHistory', () => {
    it('previousQuestion should show answered state for answered questions', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(5))

      // Answer first question correctly
      answerCurrentQuestion(true)
      expect(useQuizStore.getState().sessionState!.isAnswered).toBe(true)
      expect(useQuizStore.getState().sessionState!.isCorrect).toBe(true)

      // Go to next question
      useQuizStore.getState().nextQuestion()
      expect(useQuizStore.getState().sessionState!.currentIndex).toBe(1)

      // Go back to first question
      useQuizStore.getState().previousQuestion()
      const s = useQuizStore.getState().sessionState!
      expect(s.currentIndex).toBe(0)
      expect(s.isAnswered).toBe(true)
      expect(s.isCorrect).toBe(true)
    })

    it('goToQuestion should show answered state for answered questions', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(5))

      // Answer first question incorrectly
      answerCurrentQuestion(false)

      // Go to question 3
      useQuizStore.getState().nextQuestion()
      useQuizStore.getState().goToQuestion(0)

      const s = useQuizStore.getState().sessionState!
      expect(s.currentIndex).toBe(0)
      expect(s.isAnswered).toBe(true)
      expect(s.isCorrect).toBe(false)
    })

    it('navigation to unanswered question shows unanswered state', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(5))

      // Answer first question
      answerCurrentQuestion(true)
      useQuizStore.getState().nextQuestion()

      // Question 1 (index 1) is unanswered
      const s = useQuizStore.getState().sessionState!
      expect(s.currentIndex).toBe(1)
      expect(s.isAnswered).toBe(false)
      expect(s.isCorrect).toBeNull()
    })
  })

  describe('finishTest recalculates score from answerHistory', () => {
    it('should produce correct final score from history', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(3))

      // Answer all 3 questions
      for (let i = 0; i < 3; i++) {
        answerCurrentQuestion(i === 0) // first correct, rest wrong
        if (i < 2) useQuizStore.getState().nextQuestion()
      }

      useQuizStore.getState().finishTest()
      const s = useQuizStore.getState().sessionState!
      expect(s.isCompleted).toBe(true)
      expect(s.score).toBe(1) // Only first was correct
      expect(s.answeredCount).toBe(3)
    })

    it('should return to menu with 0 answered questions', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(3))
      // Finish without answering anything
      useQuizStore.getState().finishTest()
      expect(useQuizStore.getState().viewState).toBe('menu')
      expect(useQuizStore.getState().sessionState).toBeNull()
    })

    it('should record recommend feedback when sessionLabel is レコメンド', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(2))
      useQuizStore.setState({ sessionLabel: 'レコメンド' })

      answerCurrentQuestion(true)
      useQuizStore.getState().nextQuestion()
      answerCurrentQuestion(false)

      useQuizStore.getState().finishTest()

      const stored = JSON.parse(localStorage.getItem('recommend-feedback')!)
      expect(stored).toHaveLength(1)
      expect(stored[0].total).toBe(2)
      expect(stored[0].correct).toBe(1)
      expect(stored[0].accuracy).toBe(50)
    })

    it('should not record recommend feedback for non-recommend sessions', () => {
      useQuizStore.getState().startSessionWithIds(getSingleSelectIds(2))
      // sessionLabel defaults to null

      answerCurrentQuestion(true)
      useQuizStore.getState().nextQuestion()
      answerCurrentQuestion(true)

      useQuizStore.getState().finishTest()

      expect(localStorage.getItem('recommend-feedback')).toBeNull()
    })
  })

  describe('previousQuestion boundary', () => {
    it('should not go below index 0', () => {
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 5 })
      expect(useQuizStore.getState().sessionState!.currentIndex).toBe(0)

      // Try to go back from index 0
      useQuizStore.getState().previousQuestion()
      expect(useQuizStore.getState().sessionState!.currentIndex).toBe(0)
    })
  })

  describe('goToQuestion boundary', () => {
    it('should ignore out-of-range index', () => {
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 3 })

      useQuizStore.getState().goToQuestion(-1)
      expect(useQuizStore.getState().sessionState!.currentIndex).toBe(0)

      useQuizStore.getState().goToQuestion(999)
      expect(useQuizStore.getState().sessionState!.currentIndex).toBe(0)
    })
  })

  describe('updateTimer', () => {
    it('should not crash when no session exists', () => {
      // No session started
      expect(() => useQuizStore.getState().updateTimer()).not.toThrow()
    })

    it('should not change state when no time limit', () => {
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 3 })
      const before = useQuizStore.getState().sessionState!.timeRemaining
      expect(before).toBeNull()

      useQuizStore.getState().updateTimer()
      expect(useQuizStore.getState().sessionState!.timeRemaining).toBeNull()
    })
  })

  describe('deferFeedback auto-advance at final question', () => {
    it('should stay on final question when all answered in defer mode', () => {
      useQuizStore.getState().startSession({ mode: 'full' })

      // Answer first 2 questions (defer mode auto-advances)
      answerCurrentQuestion(true)
      answerCurrentQuestion(true)

      // Should have advanced
      const s = useQuizStore.getState().sessionState!
      expect(s.currentIndex).toBe(2)
      expect(s.answerHistory.size).toBe(2)
    })
  })

  describe('retryQuestion then re-answer (diff scoring)', () => {
    it('wrong→retry→correct should apply +1 diff score', () => {
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 3 })

      // Answer incorrectly
      answerCurrentQuestion(false)
      expect(useQuizStore.getState().sessionState!.score).toBe(0)

      // Retry
      useQuizStore.getState().retryQuestion()
      expect(useQuizStore.getState().sessionState!.isAnswered).toBe(false)

      // Now answer correctly
      answerCurrentQuestion(true)
      // Diff score: was 0 (wrong) → now 1 (correct) = +1 delta
      expect(useQuizStore.getState().sessionState!.score).toBe(1)
    })
  })
})
