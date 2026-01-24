/**
 * Question Entity - クイズ問題を表すエンティティ
 *
 * 【エンティティとは】
 * DDD におけるエンティティは、識別子（ID）によって区別されるオブジェクト。
 * 同じ内容でも ID が異なれば別の問題として扱われる。
 *
 * 【不変性（Immutability）の設計】
 * このエンティティは不変（immutable）として設計している。
 * - すべてのプロパティは readonly
 * - 配列は Object.freeze() で凍結
 * - 変更が必要な場合は新しいインスタンスを作成
 *
 * 【なぜ不変にするのか】
 * - 予期しない状態変更を防ぐ
 * - React の再レンダリング判定（===）と相性が良い
 * - デバッグが容易（状態の履歴が追跡しやすい）
 *
 * 【ファクトリパターン】
 * - private constructor: 直接 new できない
 * - Question.create(): バリデーション付きで作成
 * - Question.fromData(): 外部データから安全に作成（例外を投げない）
 */

import type { DifficultyLevel } from '../valueObjects/Difficulty'

/**
 * 選択肢の値オブジェクト
 *
 * wrongFeedback は間違った選択肢を選んだときのフィードバック。
 * なぜその選択肢が間違いなのかを説明する。
 */
export interface QuizOption {
  readonly text: string
  readonly wrongFeedback?: string
}

/**
 * Question のプロパティ型
 *
 * 外部からの入力データ型として使用される。
 * Question.create() の引数として渡される。
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

  /**
   * Private constructor - 外部から直接 new できない
   *
   * これにより、バリデーションを経ずにインスタンスを作成することを防ぐ。
   */
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

  /**
   * ファクトリメソッド - バリデーション付きで Question を作成
   *
   * 【バリデーションルール】
   * - ID: 必須、空文字不可
   * - question: 必須、空文字不可
   * - options: 2〜6個
   * - correctIndex: options の範囲内
   * - explanation: 必須
   * - referenceUrl: 指定時は有効な URL 形式
   *
   * バリデーション失敗時は例外を投げる。
   */
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
   * 外部データから安全に Question を作成
   *
   * 【fromData と create の違い】
   * - create: バリデーション失敗時に例外を投げる
   * - fromData: バリデーション失敗時に null を返す
   *
   * JSON インポート時など、データが信頼できない場合に使用。
   * 例外を投げないため、呼び出し側でエラーハンドリングしやすい。
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
   * 回答が正解かどうかを判定
   */
  isCorrectAnswer(answerIndex: number): boolean {
    return answerIndex === this.correctIndex
  }

  /**
   * 正解の選択肢を取得
   */
  getCorrectOption(): QuizOption {
    return this.options[this.correctIndex]
  }

  /**
   * 不正解時のフィードバックを取得
   */
  getWrongFeedback(answerIndex: number): string | undefined {
    if (answerIndex === this.correctIndex) return undefined
    return this.options[answerIndex]?.wrongFeedback
  }

  /**
   * AI に質問するためのプロンプトを生成
   *
   * aiPrompt が設定されていればそれを使用、
   * なければデフォルトのプロンプトを生成。
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
   * Markdown 形式でエクスポート
   *
   * 「AIに質問」機能でクリップボードにコピーする際に使用。
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

  /**
   * 等価性の判定
   *
   * エンティティは ID で等価性を判定する。
   * 内容が同じでも ID が異なれば別のエンティティ。
   */
  equals(other: Question): boolean {
    return this.id === other.id
  }

  /**
   * JSON シリアライズ用
   */
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
