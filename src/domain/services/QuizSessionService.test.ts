import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QuizSessionService, type QuizSessionConfig } from './QuizSessionService'
import { Question } from '../entities/Question'
import { UserProgress } from '../entities/UserProgress'

describe('QuizSessionService', () => {
  let mockNow: number

  beforeEach(() => {
    mockNow = 1700000000000
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createTestQuestion = (
    id: string,
    category = 'tools',
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Question => {
    return Question.create({
      id,
      question: `Test question ${id}`,
      options: [{ text: 'Option A' }, { text: 'Option B' }, { text: 'Option C' }],
      correctIndex: 0,
      explanation: 'Test explanation',
      category,
      difficulty,
    })
  }

  const createDefaultConfig = (overrides: Partial<QuizSessionConfig> = {}): QuizSessionConfig => ({
    mode: 'random',
    categoryFilter: null,
    difficultyFilter: null,
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: false,
    shuffleOptions: false,
    ...overrides,
  })

  describe('shuffleArray()', () => {
    it('should return array with same elements', () => {
      const original = [1, 2, 3, 4, 5]

      const shuffled = QuizSessionService.shuffleArray(original)

      expect(shuffled.sort()).toEqual(original.sort())
    })

    it('should not modify original array', () => {
      const original = [1, 2, 3, 4, 5]
      const originalCopy = [...original]

      QuizSessionService.shuffleArray(original)

      expect(original).toEqual(originalCopy)
    })

    it('should handle empty array', () => {
      const empty: number[] = []

      const result = QuizSessionService.shuffleArray(empty)

      expect(result).toEqual([])
    })
  })

  describe('prepareSessionQuestions()', () => {
    it('should return all questions when no filters', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2'), createTestQuestion('q3')]
      const config = createDefaultConfig()
      const progress = UserProgress.empty()

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress)

      expect(result).toHaveLength(3)
    })

    it('should filter by category', () => {
      const questions = [
        createTestQuestion('q1', 'tools'),
        createTestQuestion('q2', 'memory'),
        createTestQuestion('q3', 'tools'),
      ]
      const config = createDefaultConfig({ categoryFilter: 'tools' })
      const progress = UserProgress.empty()

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress)

      expect(result).toHaveLength(2)
      expect(result.every(q => q.category === 'tools')).toBe(true)
    })

    it('should filter by difficulty', () => {
      const questions = [
        createTestQuestion('q1', 'tools', 'beginner'),
        createTestQuestion('q2', 'tools', 'advanced'),
        createTestQuestion('q3', 'tools', 'beginner'),
      ]
      const config = createDefaultConfig({ difficultyFilter: 'beginner' })
      const progress = UserProgress.empty()

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress)

      expect(result).toHaveLength(2)
      expect(result.every(q => q.difficulty === 'beginner')).toBe(true)
    })

    it('should limit question count', () => {
      const questions = [
        createTestQuestion('q1'),
        createTestQuestion('q2'),
        createTestQuestion('q3'),
        createTestQuestion('q4'),
        createTestQuestion('q5'),
      ]
      const config = createDefaultConfig({ questionCount: 3 })
      const progress = UserProgress.empty()

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress)

      expect(result).toHaveLength(3)
    })

    it('should prioritize weak questions in weak mode', () => {
      const questions = [
        createTestQuestion('q1'),
        createTestQuestion('q2'),
        createTestQuestion('q3'),
      ]
      const config = createDefaultConfig({ mode: 'weak' })

      // Create progress with q2 as weak (0% accuracy)
      let progress = UserProgress.empty()
      progress = progress.recordAnswer('q2', 'tools', false)
      progress = progress.recordAnswer('q2', 'tools', false)

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress, 50, 1)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('q2')
    })

    it('should fallback to unanswered questions when no weak questions', () => {
      const questions = [
        createTestQuestion('q1'),
        createTestQuestion('q2'),
        createTestQuestion('q3'),
      ]
      const config = createDefaultConfig({ mode: 'weak' })

      // Create progress where q1 has been answered correctly (not weak)
      let progress = UserProgress.empty()
      progress = progress.recordAnswer('q1', 'tools', true)

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress, 50, 1)

      // Should return unanswered questions (q2, q3)
      expect(result).toHaveLength(2)
      expect(result.map(q => q.id)).not.toContain('q1')
    })
  })

  describe('createInitialState()', () => {
    it('should create initial state with correct defaults', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2')]
      const config = createDefaultConfig()

      const state = QuizSessionService.createInitialState(questions, config)

      expect(state.config).toEqual(config)
      expect(state.questions).toHaveLength(2)
      expect(state.currentIndex).toBe(0)
      expect(state.selectedAnswer).toBeNull()
      expect(state.isAnswered).toBe(false)
      expect(state.isCorrect).toBeNull()
      expect(state.score).toBe(0)
      expect(state.answeredCount).toBe(0)
      expect(state.isCompleted).toBe(false)
      expect(state.startedAt).toBe(mockNow)
      expect(state.timeRemaining).toBeNull()
    })

    it('should set timeRemaining when timeLimit is set', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig({ timeLimit: 5 }) // 5 minutes

      const state = QuizSessionService.createInitialState(questions, config)

      expect(state.timeRemaining).toBe(300) // 5 * 60 seconds
    })

    it('should freeze questions array', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()

      const state = QuizSessionService.createInitialState(questions, config)

      expect(Object.isFrozen(state.questions)).toBe(true)
    })
  })

  describe('createDefaultConfig()', () => {
    it('should create config with default values', () => {
      const config = QuizSessionService.createDefaultConfig()

      expect(config.mode).toBe('random')
      expect(config.categoryFilter).toBeNull()
      expect(config.difficultyFilter).toBeNull()
      expect(config.questionCount).toBe(20)
      expect(config.timeLimit).toBeNull()
      expect(config.shuffleQuestions).toBe(true)
      expect(config.shuffleOptions).toBe(false)
    })
  })

  describe('selectAnswer()', () => {
    it('should update selectedAnswer', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      const state = QuizSessionService.createInitialState(questions, config)

      const newState = QuizSessionService.selectAnswer(state, 1)

      expect(newState.selectedAnswer).toBe(1)
    })

    it('should not change if already answered', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, isAnswered: true, selectedAnswer: 0 }

      const newState = QuizSessionService.selectAnswer(state, 2)

      expect(newState.selectedAnswer).toBe(0) // Unchanged
    })
  })

  describe('submitAnswer()', () => {
    it('should return null if no answer selected', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      const state = QuizSessionService.createInitialState(questions, config)

      const result = QuizSessionService.submitAnswer(state)

      expect(result).toBeNull()
    })

    it('should return null if already answered', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, selectedAnswer: 0, isAnswered: true }

      const result = QuizSessionService.submitAnswer(state)

      expect(result).toBeNull()
    })

    it('should mark correct answer and update score', () => {
      const questions = [createTestQuestion('q1')] // correctIndex is 0
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = QuizSessionService.selectAnswer(state, 0)

      const result = QuizSessionService.submitAnswer(state)

      expect(result).not.toBeNull()
      expect(result?.isCorrect).toBe(true)
      expect(result?.newState.isAnswered).toBe(true)
      expect(result?.newState.isCorrect).toBe(true)
      expect(result?.newState.score).toBe(1)
      expect(result?.newState.answeredCount).toBe(1)
    })

    it('should mark incorrect answer', () => {
      const questions = [createTestQuestion('q1')] // correctIndex is 0
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = QuizSessionService.selectAnswer(state, 1) // Wrong answer

      const result = QuizSessionService.submitAnswer(state)

      expect(result?.isCorrect).toBe(false)
      expect(result?.newState.score).toBe(0)
    })
  })

  describe('nextQuestion()', () => {
    it('should advance to next question', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, isAnswered: true, selectedAnswer: 0 }

      const newState = QuizSessionService.nextQuestion(state)

      expect(newState.currentIndex).toBe(1)
      expect(newState.selectedAnswer).toBeNull()
      expect(newState.isAnswered).toBe(false)
      expect(newState.isCorrect).toBeNull()
    })

    it('should mark as completed when no more questions', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, isAnswered: true, selectedAnswer: 0 }

      const newState = QuizSessionService.nextQuestion(state)

      expect(newState.isCompleted).toBe(true)
    })
  })

  describe('updateTimer()', () => {
    it('should decrement timeRemaining', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig({ timeLimit: 1 }) // 1 minute = 60 seconds
      const state = QuizSessionService.createInitialState(questions, config)

      const newState = QuizSessionService.updateTimer(state)

      expect(newState.timeRemaining).toBe(59)
    })

    it('should not change if no time limit', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      const state = QuizSessionService.createInitialState(questions, config)

      const newState = QuizSessionService.updateTimer(state)

      expect(newState.timeRemaining).toBeNull()
    })

    it('should mark as completed when time runs out', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig({ timeLimit: 1 })
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, timeRemaining: 1 }

      const newState = QuizSessionService.updateTimer(state)

      expect(newState.timeRemaining).toBe(0)
      expect(newState.isCompleted).toBe(true)
    })

    it('should not update if time is already 0', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig({ timeLimit: 1 })
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, timeRemaining: 0 }

      const newState = QuizSessionService.updateTimer(state)

      expect(newState).toEqual(state)
    })
  })

  describe('getCurrentQuestion()', () => {
    it('should return current question', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2')]
      const config = createDefaultConfig()
      const state = QuizSessionService.createInitialState(questions, config)

      const current = QuizSessionService.getCurrentQuestion(state)

      expect(current?.id).toBe('q1')
    })

    it('should return null for invalid index', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, currentIndex: 99 }

      const current = QuizSessionService.getCurrentQuestion(state)

      expect(current).toBeNull()
    })
  })

  describe('getProgress()', () => {
    it('should return correct progress', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2'), createTestQuestion('q3')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, currentIndex: 1 }

      const progress = QuizSessionService.getProgress(state)

      expect(progress.current).toBe(2) // 1-indexed
      expect(progress.total).toBe(3)
    })
  })

  describe('calculateScorePercentage()', () => {
    it('should return 0 when no answers', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      const state = QuizSessionService.createInitialState(questions, config)

      const percentage = QuizSessionService.calculateScorePercentage(state)

      expect(percentage).toBe(0)
    })

    it('should calculate correct percentage', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, score: 3, answeredCount: 4 }

      const percentage = QuizSessionService.calculateScorePercentage(state)

      expect(percentage).toBe(75)
    })

    it('should round percentage', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, score: 1, answeredCount: 3 }

      const percentage = QuizSessionService.calculateScorePercentage(state)

      expect(percentage).toBe(33) // 33.33% rounds to 33%
    })
  })

  describe('bookmark mode filtering', () => {
    it('should filter to bookmarked questions in bookmark mode', () => {
      const questions = [
        createTestQuestion('q1'),
        createTestQuestion('q2'),
        createTestQuestion('q3'),
      ]
      const config = createDefaultConfig({ mode: 'bookmark' })
      let progress = UserProgress.empty()
      progress = progress.toggleBookmark('q2')

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('q2')
    })

    it('should return all questions if no bookmarks in bookmark mode', () => {
      const questions = [
        createTestQuestion('q1'),
        createTestQuestion('q2'),
      ]
      const config = createDefaultConfig({ mode: 'bookmark' })
      const progress = UserProgress.empty()

      const result = QuizSessionService.prepareSessionQuestions(questions, config, progress)

      expect(result).toHaveLength(2)
    })
  })

  describe('review mode', () => {
    it('should create review mode initial state', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2')]
      const config = createDefaultConfig({ mode: 'review' })

      const state = QuizSessionService.createInitialState(questions, config, {
        isReviewMode: true,
        reviewUserAnswers: [1, 2],
      })

      expect(state.isReviewMode).toBe(true)
      expect(state.reviewUserAnswers).toEqual([1, 2])
      expect(state.isAnswered).toBe(true)
      expect(state.isCorrect).toBe(false)
    })

    it('should show pre-answered state for review mode nextQuestion', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2')]
      const config = createDefaultConfig({ mode: 'review' })

      const state = QuizSessionService.createInitialState(questions, config, {
        isReviewMode: true,
        reviewUserAnswers: [1, 2],
      })

      const nextState = QuizSessionService.nextQuestion(state)

      expect(nextState.currentIndex).toBe(1)
      expect(nextState.isAnswered).toBe(true)
      expect(nextState.selectedAnswer).toBe(2)
    })
  })

  describe('useHint()', () => {
    it('should set hintUsed to true', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      const state = QuizSessionService.createInitialState(questions, config)

      const newState = QuizSessionService.useHint(state)

      expect(newState.hintUsed).toBe(true)
      expect(newState.hintsUsedCount).toBe(1)
    })

    it('should not change if already answered', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, isAnswered: true }

      const newState = QuizSessionService.useHint(state)

      expect(newState.hintUsed).toBe(false)
    })

    it('should not change if hint already used', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = QuizSessionService.useHint(state)

      const newState = QuizSessionService.useHint(state)

      expect(newState.hintsUsedCount).toBe(1)
    })

    it('should accumulate hints across questions', () => {
      const questions = [createTestQuestion('q1'), createTestQuestion('q2')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)

      state = QuizSessionService.useHint(state)
      expect(state.hintsUsedCount).toBe(1)

      // Simulate answering and moving to next question
      state = { ...state, isAnswered: true, selectedAnswer: 0 }
      state = QuizSessionService.nextQuestion(state)

      expect(state.hintUsed).toBe(false) // Reset for new question

      state = QuizSessionService.useHint(state)
      expect(state.hintsUsedCount).toBe(2)
    })
  })

  describe('hasPassed()', () => {
    it('should return true when score >= passing score', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, score: 7, answeredCount: 10 }

      expect(QuizSessionService.hasPassed(state, 70)).toBe(true)
    })

    it('should return false when score < passing score', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, score: 6, answeredCount: 10 }

      expect(QuizSessionService.hasPassed(state, 70)).toBe(false)
    })

    it('should use default passing score of 70', () => {
      const questions = [createTestQuestion('q1')]
      const config = createDefaultConfig()
      let state = QuizSessionService.createInitialState(questions, config)
      state = { ...state, score: 70, answeredCount: 100 }

      expect(QuizSessionService.hasPassed(state)).toBe(true)
    })
  })
})
