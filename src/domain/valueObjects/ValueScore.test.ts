import { describe, expect, it } from 'vitest'
import { Question } from '../entities/Question'
import { additiveValueScore, categoryWeight, DEFAULT_CATEGORY_WEIGHT, VALUE_TAG_BONUS } from './ValueScore'

function q(category: string, tags?: string[]): Question {
  return Question.create({
    id: 'q',
    question: 'q',
    options: [{ text: 'A' }, { text: 'B' }],
    correctIndex: 0,
    explanation: 'e',
    category,
    difficulty: 'beginner',
    tags,
  })
}

describe('ValueScore', () => {
  it('returns the category weight from theme', () => {
    expect(categoryWeight('tools')).toBe(15)
    expect(categoryWeight('sdk')).toBe(5)
  })

  it('falls back to DEFAULT_CATEGORY_WEIGHT for unknown categories', () => {
    expect(categoryWeight('does-not-exist')).toBe(DEFAULT_CATEGORY_WEIGHT)
  })

  it('additiveValueScore = weight + tag bonus', () => {
    expect(additiveValueScore(q('tools'))).toBe(15) // no tag
    expect(additiveValueScore(q('tools', ['practical']))).toBe(15 + VALUE_TAG_BONUS.practical)
    expect(additiveValueScore(q('tools', ['trivia']))).toBe(15 + VALUE_TAG_BONUS.trivia)
    expect(additiveValueScore(q('sdk', ['trivia']))).toBe(5 + VALUE_TAG_BONUS.trivia)
  })

  it('practical outranks neutral outranks trivia at equal weight', () => {
    const practical = additiveValueScore(q('tools', ['practical']))
    const neutral = additiveValueScore(q('tools'))
    const trivia = additiveValueScore(q('tools', ['trivia']))
    expect(practical).toBeGreaterThan(neutral)
    expect(neutral).toBeGreaterThan(trivia)
  })
})
