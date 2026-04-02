import { beforeEach, describe, expect, it } from 'vitest'
import { useQuizStore } from './quizStore'

describe('quizStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useQuizStore.setState({
      viewState: 'menu',
      sessionState: null,
      sessionWrongAnswers: [],
      savedSession: null,
    })
  })

  describe('initialize', () => {
    it('should load questions and set isLoading to false', async () => {
      const store = useQuizStore.getState()
      await store.initialize()

      const state = useQuizStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.allQuestions.length).toBeGreaterThan(0)
    })

    it('should load 732 questions', async () => {
      await useQuizStore.getState().initialize()
      expect(useQuizStore.getState().allQuestions.length).toBe(732)
    })
  })

  describe('startSession', () => {
    beforeEach(async () => {
      await useQuizStore.getState().initialize()
    })

    it('should start a random session with 20 questions', () => {
      useQuizStore.getState().startSession({ mode: 'random' })
      const state = useQuizStore.getState()
      expect(state.viewState).toBe('quiz')
      expect(state.sessionState).not.toBeNull()
      expect(state.sessionState!.questions.length).toBe(20)
    })

    it('should start an overview session', () => {
      useQuizStore.getState().startSession({ mode: 'overview' })
      const state = useQuizStore.getState()
      expect(state.viewState).toBe('quiz')
      expect(state.sessionState!.questions.length).toBeGreaterThan(0)
    })

    it('should start a quick session with 3 questions', () => {
      useQuizStore.getState().startSession({ mode: 'quick' })
      const state = useQuizStore.getState()
      expect(state.viewState).toBe('quiz')
      // Quick mode defaults to 3 questions (or fewer if no SRS due)
      expect(state.sessionState!.questions.length).toBeLessThanOrEqual(3)
    })

    it('should not start session with 0 questions', () => {
      useQuizStore.getState().startSession({
        mode: 'category',
        categoryFilter: 'nonexistent-category',
      })
      // Should stay on menu
      expect(useQuizStore.getState().viewState).toBe('menu')
      expect(useQuizStore.getState().sessionState).toBeNull()
    })

    it('should override questionCount', () => {
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 5 })
      expect(useQuizStore.getState().sessionState!.questions.length).toBe(5)
    })
  })

  describe('startSessionWithIds', () => {
    beforeEach(async () => {
      await useQuizStore.getState().initialize()
    })

    it('should start session with specific question IDs', () => {
      const questions = useQuizStore.getState().allQuestions.slice(0, 5)
      const ids = questions.map((q) => q.id)
      useQuizStore.getState().startSessionWithIds(ids)

      const state = useQuizStore.getState()
      expect(state.viewState).toBe('quiz')
      expect(state.sessionState!.questions.length).toBe(5)
      expect(state.sessionState!.questions.map((q) => q.id)).toEqual(ids)
    })

    it('should not start with empty IDs', () => {
      useQuizStore.getState().startSessionWithIds([])
      expect(useQuizStore.getState().viewState).toBe('menu')
    })

    it('should filter out invalid IDs', () => {
      const validId = useQuizStore.getState().allQuestions[0].id
      useQuizStore.getState().startSessionWithIds([validId, 'invalid-id'])
      expect(useQuizStore.getState().sessionState!.questions.length).toBe(1)
    })
  })

  describe('submitAnswer', () => {
    beforeEach(async () => {
      await useQuizStore.getState().initialize()
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 3 })
    })

    it('should record answer and update score', () => {
      const state = useQuizStore.getState()
      // Find a single-select question to avoid multi-select complexity
      const q = state.sessionState!.questions[0]
      const ci = q.correctIndex

      // Select correct answer (handle both single and multi-select)
      state.selectAnswer(Array.isArray(ci) ? ci : ci)
      state.submitAnswer()

      const updated = useQuizStore.getState()
      expect(updated.sessionState!.isAnswered).toBe(true)
      expect(updated.sessionState!.isCorrect).toBe(true)
      expect(updated.sessionState!.score).toBe(1)
    })

    it('should handle wrong answer', () => {
      const state = useQuizStore.getState()
      const q = state.sessionState!.questions[0]
      const ci = q.correctIndex
      // Pick an index that is definitely wrong
      const correctSet = new Set(Array.isArray(ci) ? ci : [ci])
      const wrongIndex = q.options.findIndex((_, i) => !correctSet.has(i))

      state.selectAnswer(wrongIndex)
      state.submitAnswer()

      const updated = useQuizStore.getState()
      expect(updated.sessionState!.isCorrect).toBe(false)
      expect(updated.sessionState!.score).toBe(0)
    })
  })

  describe('endSession', () => {
    beforeEach(async () => {
      await useQuizStore.getState().initialize()
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 1 })
    })

    it('should return to menu and clear session', () => {
      useQuizStore.getState().endSession()
      const state = useQuizStore.getState()
      expect(state.viewState).toBe('menu')
      expect(state.sessionState).toBeNull()
      expect(state.sessionWrongAnswers).toEqual([])
    })
  })

  describe('navigation', () => {
    beforeEach(async () => {
      await useQuizStore.getState().initialize()
      useQuizStore.getState().startSession({ mode: 'random', questionCount: 5 })
    })

    it('nextQuestion advances currentIndex', () => {
      const state = useQuizStore.getState()
      // Answer first question
      state.selectAnswer(0)
      state.submitAnswer()

      // Go to next
      useQuizStore.getState().nextQuestion()
      expect(useQuizStore.getState().sessionState!.currentIndex).toBe(1)
    })

    it('previousQuestion goes back', () => {
      const state = useQuizStore.getState()
      state.selectAnswer(0)
      state.submitAnswer()
      useQuizStore.getState().nextQuestion()

      // Go back
      useQuizStore.getState().previousQuestion()
      expect(useQuizStore.getState().sessionState!.currentIndex).toBe(0)
    })
  })
})
