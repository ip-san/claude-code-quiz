import { describe, it, expect } from 'vitest'
import { Question } from './Question'

describe('Question Entity', () => {
  const createTestQuestion = (overrides = {}): Question => {
    return Question.create({
      id: 'test-001',
      question: 'What is Claude Code?',
      options: [
        { text: 'A CLI tool' },
        { text: 'A web app' },
        { text: 'A mobile app' },
        { text: 'A desktop app' },
      ],
      correctIndex: 0,
      explanation: 'Claude Code is an agentic coding tool from Anthropic.',
      category: 'tools',
      difficulty: 'beginner',
      ...overrides,
    })
  }

  describe('create()', () => {
    it('should create a Question with valid data', () => {
      const question = createTestQuestion()

      expect(question.id).toBe('test-001')
      expect(question.question).toBe('What is Claude Code?')
      expect(question.options).toHaveLength(4)
      expect(question.correctIndex).toBe(0)
      expect(question.category).toBe('tools')
      expect(question.difficulty).toBe('beginner')
    })

    it('should create immutable options', () => {
      const question = createTestQuestion()

      // Options should be readonly (frozen)
      expect(Object.isFrozen(question.options)).toBe(true)
    })

    it('should throw error for empty id', () => {
      expect(() => createTestQuestion({ id: '' })).toThrow('Question ID is required')
    })

    it('should throw error for empty question text', () => {
      expect(() => createTestQuestion({ question: '' })).toThrow('Question text is required')
    })

    it('should throw error for less than 2 options', () => {
      expect(() => createTestQuestion({ options: [{ text: 'Only one' }] })).toThrow('At least 2 options are required')
    })

    it('should throw error for more than 6 options', () => {
      const manyOptions = Array(7).fill(null).map((_, i) => ({ text: `Option ${i}` }))
      expect(() => createTestQuestion({ options: manyOptions })).toThrow('Maximum 6 options allowed')
    })

    it('should throw error for invalid correctIndex', () => {
      expect(() => createTestQuestion({ correctIndex: -1 })).toThrow('correctIndex must be within options array bounds')
      expect(() => createTestQuestion({ correctIndex: 10 })).toThrow('correctIndex must be within options array bounds')
    })

    it('should throw error for empty explanation', () => {
      expect(() => createTestQuestion({ explanation: '' })).toThrow('Explanation is required')
    })

    it('should throw error for invalid referenceUrl', () => {
      expect(() => createTestQuestion({ referenceUrl: 'not-a-url' })).toThrow('Reference URL must be a valid URL')
    })

    it('should accept valid referenceUrl', () => {
      const question = createTestQuestion({ referenceUrl: 'https://docs.anthropic.com' })
      expect(question.referenceUrl).toBe('https://docs.anthropic.com')
    })
  })

  describe('fromData()', () => {
    it('should create Question from valid raw data', () => {
      const rawData = {
        id: 'raw-001',
        question: 'Test question',
        options: [{ text: 'Option 1' }, { text: 'Option 2' }],
        correctIndex: 0,
        explanation: 'Test explanation',
        category: 'memory',
        difficulty: 'intermediate',
      }

      const question = Question.fromData(rawData)

      expect(question).not.toBeNull()
      expect(question?.id).toBe('raw-001')
    })

    it('should return null for invalid data', () => {
      expect(Question.fromData(null)).toBeNull()
      expect(Question.fromData(undefined)).toBeNull()
      expect(Question.fromData('string')).toBeNull()
    })

    it('should return null for data that fails validation', () => {
      const invalidData = {
        id: '',
        question: '',
        options: [],
        correctIndex: 0,
        explanation: '',
        category: '',
        difficulty: 'beginner',
      }

      expect(Question.fromData(invalidData)).toBeNull()
    })
  })

  describe('isCorrectAnswer()', () => {
    it('should return true for correct answer index', () => {
      const question = createTestQuestion()

      expect(question.isCorrectAnswer(0)).toBe(true)
    })

    it('should return false for incorrect answer index', () => {
      const question = createTestQuestion()

      expect(question.isCorrectAnswer(1)).toBe(false)
      expect(question.isCorrectAnswer(2)).toBe(false)
      expect(question.isCorrectAnswer(3)).toBe(false)
    })
  })

  describe('getCorrectOption()', () => {
    it('should return the correct option', () => {
      const question = createTestQuestion()

      const correctOption = question.getCorrectOption()

      expect(correctOption.text).toBe('A CLI tool')
    })
  })

  describe('getWrongFeedback()', () => {
    it('should return undefined for correct answer', () => {
      const question = createTestQuestion()

      expect(question.getWrongFeedback(0)).toBeUndefined()
    })

    it('should return wrongFeedback if defined', () => {
      const question = createTestQuestion({
        options: [
          { text: 'Correct answer' },
          { text: 'Wrong answer', wrongFeedback: 'This is why it\'s wrong' },
        ],
        correctIndex: 0,
      })

      expect(question.getWrongFeedback(1)).toBe('This is why it\'s wrong')
    })

    it('should return undefined if wrongFeedback not defined', () => {
      const question = createTestQuestion()

      expect(question.getWrongFeedback(1)).toBeUndefined()
    })
  })

  describe('generateAIPrompt()', () => {
    it('should return custom aiPrompt if defined', () => {
      const customPrompt = 'Custom AI prompt for learning'
      const question = createTestQuestion({ aiPrompt: customPrompt })

      expect(question.generateAIPrompt()).toBe(customPrompt)
    })

    it('should generate default prompt if aiPrompt not defined', () => {
      const question = createTestQuestion()

      const prompt = question.generateAIPrompt()

      expect(prompt).toContain('What is Claude Code?')
      expect(prompt).toContain('A CLI tool')
      expect(prompt).toContain('Claude Code is an agentic coding tool')
    })
  })

  describe('toMarkdown()', () => {
    it('should generate valid markdown format', () => {
      const question = createTestQuestion()

      const markdown = question.toMarkdown()

      expect(markdown).toContain('## Claude Code Quiz')
      expect(markdown).toContain('**問題:**')
      expect(markdown).toContain('What is Claude Code?')
      expect(markdown).toContain('**正解:**')
      expect(markdown).toContain('A CLI tool')
      expect(markdown).toContain('**解説:**')
    })

    it('should include referenceUrl if defined', () => {
      const question = createTestQuestion({ referenceUrl: 'https://docs.anthropic.com' })

      const markdown = question.toMarkdown()

      expect(markdown).toContain('**参考:**')
      expect(markdown).toContain('https://docs.anthropic.com')
    })
  })

  describe('hint', () => {
    it('should create question with hint', () => {
      const question = createTestQuestion({ hint: 'This is a hint' })
      expect(question.hint).toBe('This is a hint')
    })

    it('should create question without hint', () => {
      const question = createTestQuestion()
      expect(question.hint).toBeUndefined()
    })

    it('should include hint in toJSON', () => {
      const question = createTestQuestion({ hint: 'Test hint' })
      const json = question.toJSON()
      expect(json.hint).toBe('Test hint')
    })

    it('should restore hint from fromData', () => {
      const rawData = {
        id: 'hint-001',
        question: 'Test question',
        options: [{ text: 'Option 1' }, { text: 'Option 2' }],
        correctIndex: 0,
        explanation: 'Test explanation',
        category: 'memory',
        difficulty: 'intermediate',
        hint: 'A helpful hint',
      }

      const question = Question.fromData(rawData)
      expect(question?.hint).toBe('A helpful hint')
    })
  })

  describe('equals()', () => {
    it('should return true for same id', () => {
      const question1 = createTestQuestion()
      const question2 = createTestQuestion({ question: 'Different question text' })

      expect(question1.equals(question2)).toBe(true)
    })

    it('should return false for different id', () => {
      const question1 = createTestQuestion()
      const question2 = createTestQuestion({ id: 'test-002' })

      expect(question1.equals(question2)).toBe(false)
    })
  })

  describe('toJSON()', () => {
    it('should return serializable object', () => {
      const question = createTestQuestion()

      const json = question.toJSON()

      expect(json.id).toBe('test-001')
      expect(json.question).toBe('What is Claude Code?')
      expect(json.options).toHaveLength(4)
      expect(Array.isArray(json.options)).toBe(true)
      expect(Array.isArray(json.tags)).toBe(true)
    })
  })
})
