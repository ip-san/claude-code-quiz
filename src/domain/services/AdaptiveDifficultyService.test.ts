import { describe, expect, it } from 'vitest'
import { Question } from '../entities/Question'
import { UserProgress } from '../entities/UserProgress'
import { AdaptiveDifficultyService } from './AdaptiveDifficultyService'

function makeQuestion(id: string, category: string, difficulty: string): Question {
  return Question.create({
    id,
    category,
    difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
    question: `Question ${id}`,
    options: [{ text: 'A' }, { text: 'B', wrongFeedback: 'Wrong' }],
    correctIndex: 0,
    explanation: 'Explanation',
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
  })
})
