/**
 * QuizValidator - Zod を使用したデータ検証
 *
 * 【このモジュールの役割】
 * 外部から入力されるデータ（JSON ファイル等）を検証し、
 * 型安全なオブジェクトに変換する「Anti-Corruption Layer」。
 *
 * 【Anti-Corruption Layer とは】
 * DDD のパターンの一つ。外部システムからのデータが
 * ドメインモデルを汚染しないよう、境界でデータを検証・変換する。
 *
 *   外部 JSON ────▶ QuizValidator ────▶ Domain Entity
 *   (信頼できない)    (検証・変換)        (型安全)
 *
 * 【なぜ Zod を使うのか】
 * - TypeScript との統合が優れている
 * - スキーマから型を自動生成できる（z.infer）
 * - エラーメッセージがわかりやすい
 * - 軽量で依存が少ない
 *
 * 【バリデーションの流れ】
 * 1. JSON 文字列をパース
 * 2. Zod スキーマで検証
 * 3. 成功時: ValidationResult<T> で型付きデータを返す
 * 4. 失敗時: errors 配列でエラー詳細を返す
 */

import { z } from 'zod'

// ============================================================
// Zod Schemas
// ============================================================

/**
 * 難易度スキーマ
 *
 * 3段階の難易度を定義。
 * Domain Layer の DifficultyLevel と一致させる。
 */
export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])

/**
 * 選択肢スキーマ
 *
 * wrongFeedback はオプショナル。
 * 設定されていると、不正解時に「なぜ間違いか」を表示できる。
 */
export const QuizOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  wrongFeedback: z.string().optional(),
})

/**
 * 問題スキーマ
 *
 * 【検証ルール】
 * - id: 必須、1文字以上
 * - question: 必須、1文字以上
 * - options: 2〜6個の選択肢
 * - correctIndex: 0以上の整数、options の範囲内
 * - explanation: 必須（正解・不正解に関わらず表示される解説）
 * - referenceUrl: オプション、有効な URL 形式
 * - category: 必須（カテゴリ ID）
 * - difficulty: beginner / intermediate / advanced のいずれか
 *
 * 【refine による追加検証】
 * correctIndex が options.length 未満であることを確認。
 * これは単純な min/max では表現できないため refine を使用。
 */
/**
 * 問題タイプスキーマ
 * - single: 単一選択（デフォルト）
 * - multi: 複数選択（「該当するものを全て選んでください」）
 */
export const QuestionTypeSchema = z.enum(['single', 'multi']).default('single')

export const QuizItemSchema = z.object({
  id: z.string().min(1, 'Quiz ID is required'),
  question: z.string().min(1, 'Question is required'),
  options: z
    .array(QuizOptionSchema)
    .min(2, 'At least 2 options are required')
    .max(6, 'Maximum 6 options allowed'),
  correctIndex: z.number().int().min(0),
  explanation: z.string().min(1, 'Explanation is required'),
  referenceUrl: z.string().url('Must be a valid URL').refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    { message: 'URL must start with http:// or https://' }
  ).optional(),
  aiPrompt: z.string().optional(),
  hint: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  difficulty: DifficultySchema,
  tags: z.array(z.string()).optional(),
  type: QuestionTypeSchema,
  correctIndices: z.array(z.number().int().min(0)).optional(),
}).refine(
  (data) => {
    if (data.type === 'multi') {
      // multi: correctIndices must exist with at least 2 entries, all within bounds
      if (!data.correctIndices || data.correctIndices.length < 2) return false
      const unique = new Set(data.correctIndices)
      if (unique.size !== data.correctIndices.length) return false
      return data.correctIndices.every(i => i < data.options.length)
    }
    // single: correctIndex must be within bounds
    return data.correctIndex < data.options.length
  },
  {
    message: 'correctIndex/correctIndices must be within options array bounds',
  }
)

/**
 * クイズファイルスキーマ（インポート/エクスポート用）
 *
 * 【対応フォーマット】
 * 1. オブジェクト形式: { title?, description?, quizzes: [...] }
 * 2. 配列形式: [...] （validateQuizFile で自動変換）
 *
 * title, description, version はすべてオプショナル。
 * 最低限 quizzes 配列があればインポート可能。
 */
export const QuizFileSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  quizzes: z.array(QuizItemSchema).min(1, 'At least one quiz is required'),
})

/**
 * クイズセットストレージスキーマ（内部保存用）
 *
 * QuizFileSchema に加えて、メタデータ（id, type, timestamps）を持つ。
 * localStorage への保存時に使用。
 */
export const QuizSetStorageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  type: z.enum(['default', 'user']),
  quizzes: z.array(QuizItemSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
})

// ============================================================
// User Progress Schemas
// ============================================================

/**
 * 問題進捗スキーマ
 */
export const QuestionProgressSchema = z.object({
  questionId: z.string(),
  attempts: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  lastAttemptAt: z.number(),
  lastCorrect: z.boolean(),
})

/**
 * カテゴリ進捗スキーマ
 */
export const CategoryProgressSchema = z.object({
  categoryId: z.string(),
  totalQuestions: z.number().int().min(0),
  attemptedQuestions: z.number().int().min(0),
  correctAnswers: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
})

/**
 * ユーザー進捗スキーマ
 *
 * 進捗データのインポート/エクスポート時に使用。
 */
export const UserProgressSchema = z.object({
  modifiedAt: z.number(),
  questionProgress: z.record(z.string(), QuestionProgressSchema),
  categoryProgress: z.record(z.string(), CategoryProgressSchema),
  totalAttempts: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  streakDays: z.number().int().min(0),
  lastSessionAt: z.number(),
  bookmarkedQuestionIds: z.array(z.string()).optional(),
})

// ============================================================
// Type Inference
// ============================================================

/**
 * スキーマから TypeScript 型を生成
 *
 * 【z.infer の利点】
 * スキーマと型が常に同期される。
 * スキーマを変更すれば型も自動的に変わる。
 */
export type QuizItemData = z.infer<typeof QuizItemSchema>
export type QuizFileData = z.infer<typeof QuizFileSchema>
export type QuizSetStorageData = z.infer<typeof QuizSetStorageSchema>
export type UserProgressData = z.infer<typeof UserProgressSchema>

// ============================================================
// Validation Functions
// ============================================================

/**
 * バリデーション結果の型
 *
 * 【設計】
 * success: true の場合は data が必ず存在
 * success: false の場合は errors が必ず存在
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
}

/**
 * クイズファイルを検証
 *
 * 【対応フォーマット】
 * - オブジェクト形式: { quizzes: [...] }
 * - 配列形式: [...] → 自動的に { quizzes: [...] } に変換
 *
 * 【エラーハンドリング】
 * - JSON パースエラー: "Invalid JSON format"
 * - スキーマ検証エラー: パス付きのエラーメッセージ
 */
export function validateQuizFile(jsonString: string): ValidationResult<QuizFileData> {
  try {
    const parsed = JSON.parse(jsonString)

    // Support both array and object formats
    const dataToValidate = Array.isArray(parsed)
      ? { quizzes: parsed }
      : parsed

    const result = QuizFileSchema.safeParse(dataToValidate)

    if (result.success) {
      return { success: true, data: result.data }
    }

    // エラーメッセージをパス付きで整形
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.')
      return path ? `${path}: ${err.message}` : err.message
    })

    return { success: false, errors }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, errors: ['Invalid JSON format'] }
    }
    return { success: false, errors: ['Unknown validation error'] }
  }
}

/**
 * ユーザー進捗データを検証
 *
 * 進捗データのインポート時に使用。
 */
export function validateUserProgress(jsonString: string): ValidationResult<UserProgressData> {
  try {
    const parsed = JSON.parse(jsonString)
    const result = UserProgressSchema.safeParse(parsed)

    if (result.success) {
      return { success: true, data: result.data }
    }

    const errors = result.error.errors.map(err => {
      const path = err.path.join('.')
      return path ? `${path}: ${err.message}` : err.message
    })

    return { success: false, errors }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, errors: ['Invalid JSON format'] }
    }
    return { success: false, errors: ['Unknown validation error'] }
  }
}

/**
 * クイズセットストレージデータを検証
 *
 * localStorage からの読み込み時に使用。
 * JSON 文字列ではなく、パース済みオブジェクトを受け取る。
 */
export function validateQuizSetStorage(data: unknown): ValidationResult<QuizSetStorageData> {
  const result = QuizSetStorageSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })

  return { success: false, errors }
}
