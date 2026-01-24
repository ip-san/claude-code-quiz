import type { DifficultyLevel } from '../valueObjects/Difficulty'

/**
 * QuizOption Value Object
 * Represents an answer option for a question
 */
export interface QuizOption {
  readonly text: string
  readonly wrongFeedback?: string
}

/**
 * Question Entity
 * Core domain entity representing a quiz question
 */
export interface QuestionProps {
  readonly id: string
  readonly question: string
  readonly options: QuizOption[]
  readonly correctIndex: number
  readonly explanation: string
  readonly referenceUrl?: string
  readonly aiPrompt?: string
  readonly category: string
  readonly difficulty: DifficultyLevel
  readonly tags?: string[]
}

export class Question {
  readonly id: string
  readonly question: string
  readonly options: readonly QuizOption[]
  readonly correctIndex: number
  readonly explanation: string
  readonly referenceUrl?: string
  readonly aiPrompt?: string
  readonly category: string
  readonly difficulty: DifficultyLevel
  readonly tags: readonly string[]

  private constructor(props: QuestionProps) {
    this.id = props.id
    this.question = props.question
    this.options = Object.freeze([...props.options])
    this.correctIndex = props.correctIndex
    this.explanation = props.explanation
    this.referenceUrl = props.referenceUrl
    this.aiPrompt = props.aiPrompt
    this.category = props.category
    this.difficulty = props.difficulty
    this.tags = Object.freeze(props.tags ?? [])
  }

  static create(props: QuestionProps): Question {
    // Validation
    if (!props.id || props.id.trim().length === 0) {
      throw new Error('Question ID is required')
    }
    if (!props.question || props.question.trim().length === 0) {
      throw new Error('Question text is required')
    }
    if (props.options.length < 2) {
      throw new Error('At least 2 options are required')
    }
    if (props.options.length > 6) {
      throw new Error('Maximum 6 options allowed')
    }
    if (props.correctIndex < 0 || props.correctIndex >= props.options.length) {
      throw new Error('correctIndex must be within options array bounds')
    }
    if (!props.explanation || props.explanation.trim().length === 0) {
      throw new Error('Explanation is required')
    }
    if (props.referenceUrl) {
      try {
        new URL(props.referenceUrl)
      } catch {
        throw new Error('Reference URL must be a valid URL')
      }
    }

    return new Question(props)
  }

  /**
   * Create a Question from raw data (e.g., from JSON)
   * This is a factory method that doesn't throw on invalid data
   */
  static fromData(data: unknown): Question | null {
    try {
      if (!data || typeof data !== 'object') return null
      const d = data as Record<string, unknown>

      return Question.create({
        id: String(d.id ?? ''),
        question: String(d.question ?? ''),
        options: Array.isArray(d.options)
          ? d.options.map(o => ({
              text: String((o as Record<string, unknown>).text ?? ''),
              wrongFeedback: (o as Record<string, unknown>).wrongFeedback
                ? String((o as Record<string, unknown>).wrongFeedback)
                : undefined,
            }))
          : [],
        correctIndex: Number(d.correctIndex ?? 0),
        explanation: String(d.explanation ?? ''),
        referenceUrl: d.referenceUrl ? String(d.referenceUrl) : undefined,
        aiPrompt: d.aiPrompt ? String(d.aiPrompt) : undefined,
        category: String(d.category ?? ''),
        difficulty: (d.difficulty as DifficultyLevel) ?? 'beginner',
        tags: Array.isArray(d.tags) ? d.tags.map(String) : undefined,
      })
    } catch {
      return null
    }
  }

  /**
   * Check if the given answer index is correct
   */
  isCorrectAnswer(answerIndex: number): boolean {
    return answerIndex === this.correctIndex
  }

  /**
   * Get the correct answer option
   */
  getCorrectOption(): QuizOption {
    return this.options[this.correctIndex]
  }

  /**
   * Get feedback for a wrong answer
   */
  getWrongFeedback(answerIndex: number): string | undefined {
    if (answerIndex === this.correctIndex) return undefined
    return this.options[answerIndex]?.wrongFeedback
  }

  /**
   * Generate AI learning prompt
   */
  generateAIPrompt(): string {
    if (this.aiPrompt) return this.aiPrompt

    const correctAnswer = this.getCorrectOption().text
    return `Claude Codeの以下の問題について詳しく説明してください：

問題: ${this.question}
正解: ${correctAnswer}
解説: ${this.explanation}

この機能の使い方や具体例も含めて教えてください。`
  }

  /**
   * Generate Markdown format for "Ask AI" feature
   */
  toMarkdown(): string {
    const correctAnswer = this.getCorrectOption().text
    return `## Claude Code Quiz

**問題:** ${this.question}

**正解:** ${correctAnswer}

**解説:** ${this.explanation}

${this.referenceUrl ? `**参考:** ${this.referenceUrl}` : ''}

---

この問題について詳しく説明してください。具体的な使用例も含めて教えていただけると助かります。`
  }

  equals(other: Question): boolean {
    return this.id === other.id
  }

  toJSON(): QuestionProps {
    return {
      id: this.id,
      question: this.question,
      options: [...this.options],
      correctIndex: this.correctIndex,
      explanation: this.explanation,
      referenceUrl: this.referenceUrl,
      aiPrompt: this.aiPrompt,
      category: this.category,
      difficulty: this.difficulty,
      tags: [...this.tags],
    }
  }
}
