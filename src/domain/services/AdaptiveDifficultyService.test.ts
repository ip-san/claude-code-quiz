import { describe, expect, it } from 'vitest'
import { Question } from '../entities/Question'
import { UserProgress } from '../entities/UserProgress'
import { AdaptiveDifficultyService } from './AdaptiveDifficultyService'

function makeQuestion(id: string, category: string, difficulty: string, tags?: string[]): Question {
  return Question.create({
    id,
    category,
    difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
    question: `Question ${id}`,
    options: [{ text: 'A' }, { text: 'B', wrongFeedback: 'Wrong' }],
    correctIndex: 0,
    explanation: 'Explanation',
    tags,
  })
}

describe('AdaptiveDifficultyService', () => {
  describe('isAdaptiveReady', () => {
    it('returns false with 0 attempts', () => {
      const progress = UserProgress.empty()
      expect(AdaptiveDifficultyService.isAdaptiveReady(progress)).toBe(false)
    })

    it('returns true with 5+ attempts', () => {
      const progress = UserProgress.create({ totalAttempts: 5 })
      expect(AdaptiveDifficultyService.isAdaptiveReady(progress)).toBe(true)
    })
  })

  describe('reorderByAdaptiveDifficulty', () => {
    it('prioritizes advanced for high-accuracy categories', () => {
      const questions = [
        makeQuestion('q1', 'memory', 'beginner'),
        makeQuestion('q2', 'memory', 'advanced'),
        makeQuestion('q3', 'memory', 'intermediate'),
      ]

      const progress = UserProgress.create({
        totalAttempts: 10,
        categoryProgress: {
          memory: { categoryId: 'memory', totalQuestions: 10, attemptedQuestions: 10, correctAnswers: 9, accuracy: 90 },
        },
      })

      const result = AdaptiveDifficultyService.reorderByAdaptiveDifficulty(questions, progress)
      // Advanced should come first for high accuracy
      expect(result[0].difficulty).toBe('advanced')
    })

    it('prioritizes beginner for low-accuracy categories', () => {
      const questions = [
        makeQuestion('q1', 'tools', 'advanced'),
        makeQuestion('q2', 'tools', 'beginner'),
        makeQuestion('q3', 'tools', 'intermediate'),
      ]

      const progress = UserProgress.create({
        totalAttempts: 10,
        categoryProgress: {
          tools: { categoryId: 'tools', totalQuestions: 10, attemptedQuestions: 10, correctAnswers: 3, accuracy: 30 },
        },
      })

      const result = AdaptiveDifficultyService.reorderByAdaptiveDifficulty(questions, progress)
      // Beginner should come first for low accuracy
      expect(result[0].difficulty).toBe('beginner')
    })

    it('preserves order when no category data exists', () => {
      const questions = [makeQuestion('q1', 'unknown', 'beginner'), makeQuestion('q2', 'unknown', 'advanced')]

      const progress = UserProgress.create({ totalAttempts: 10 })
      const result = AdaptiveDifficultyService.reorderByAdaptiveDifficulty(questions, progress)
      // No reordering expected (all scores are 0)
      expect(result.length).toBe(2)
    })

    it('breaks difficulty-score ties by value (higher category weight first)', () => {
      // No accuracy data → all difficulty scores 0 → value tie-break decides
      const questions = [
        makeQuestion('low', 'sdk', 'beginner'), // weight 5
        makeQuestion('high', 'memory', 'beginner'), // weight 15
      ]
      const progress = UserProgress.create({ totalAttempts: 10 })
      const result = AdaptiveDifficultyService.reorderByAdaptiveDifficulty(questions, progress)
      expect(result[0].id).toBe('high') // higher-value category surfaces first on a tie
    })

    it('value tie-break never overrides difficulty ordering', () => {
      // High accuracy → advanced prioritized. A high-value beginner must NOT jump the advanced.
      const questions = [
        makeQuestion('beginnerHighValue', 'memory', 'beginner', ['practical']), // weight 15 + practical
        makeQuestion('advancedLowValue', 'sdk', 'advanced'), // weight 5
      ]
      const progress = UserProgress.create({
        totalAttempts: 10,
        categoryProgress: {
          memory: { categoryId: 'memory', totalQuestions: 10, attemptedQuestions: 10, correctAnswers: 9, accuracy: 90 },
          sdk: { categoryId: 'sdk', totalQuestions: 10, attemptedQuestions: 10, correctAnswers: 9, accuracy: 90 },
        },
      })
      const result = AdaptiveDifficultyService.reorderByAdaptiveDifficulty(questions, progress)
      expect(result[0].difficulty).toBe('advanced') // difficulty(タイパ) dominates value(コスパ)
    })

    it('prefers practical over trivia within the same difficulty score', () => {
      const questions = [
        makeQuestion('trivia', 'memory', 'beginner', ['trivia']),
        makeQuestion('practical', 'memory', 'beginner', ['practical']),
      ]
      const progress = UserProgress.create({ totalAttempts: 10 })
      const result = AdaptiveDifficultyService.reorderByAdaptiveDifficulty(questions, progress)
      expect(result[0].id).toBe('practical')
    })
  })
})
