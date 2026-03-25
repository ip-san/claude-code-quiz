import { describe, it, expect } from 'vitest'
import { getOverviewRecommendation } from './RecommendationService'
import { Question } from '../entities/Question'

function makeQuestion(id: string, category: string): Question {
  return Question.create({
    id,
    category,
    difficulty: 'beginner',
    question: 'Test question',
    options: [{ text: 'A' }, { text: 'B', wrongFeedback: 'Wrong' }],
    correctIndex: 0,
    explanation: 'Test',
    referenceUrl: 'https://code.claude.com/docs/ja/overview',
  })
}

describe('RecommendationService', () => {
  const questions = [
    makeQuestion('q1', 'memory'),
    makeQuestion('q2', 'memory'),
    makeQuestion('q3', 'tools'),
    makeQuestion('q4', 'tools'),
    makeQuestion('q5', 'commands'),
  ]

  it('returns perfect when no wrong answers', () => {
    const result = getOverviewRecommendation([], questions)
    expect(result).toEqual({ type: 'perfect' })
  })

  it('finds weakest category from wrong answers', () => {
    const wrongAnswers = [{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }]
    const result = getOverviewRecommendation(wrongAnswers, questions)
    expect(result?.type).toBe('category')
    expect(result?.categoryId).toBe('memory') // 2 wrong vs 1 for tools
    expect(result?.wrongCount).toBe(2)
  })

  it('returns null for wrong answers with no matching questions', () => {
    const wrongAnswers = [{ questionId: 'nonexistent' }]
    const result = getOverviewRecommendation(wrongAnswers, questions)
    expect(result).toBeNull()
  })

  it('handles empty questions array', () => {
    const wrongAnswers = [{ questionId: 'q1' }]
    const result = getOverviewRecommendation(wrongAnswers, [])
    expect(result).toBeNull()
  })
})
