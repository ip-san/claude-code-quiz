import { z } from 'zod'

/**
 * Zod Schemas for Quiz Data Validation
 * Acts as an Anti-Corruption Layer between external data and domain entities
 */

// Difficulty schema
export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])

// Quiz option schema
export const QuizOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  wrongFeedback: z.string().optional(),
})

// Quiz item schema
export const QuizItemSchema = z.object({
  id: z.string().min(1, 'Quiz ID is required'),
  question: z.string().min(1, 'Question is required'),
  options: z
    .array(QuizOptionSchema)
    .min(2, 'At least 2 options are required')
    .max(6, 'Maximum 6 options allowed'),
  correctIndex: z.number().int().min(0),
  explanation: z.string().min(1, 'Explanation is required'),
  referenceUrl: z.string().url('Must be a valid URL').optional(),
  aiPrompt: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  difficulty: DifficultySchema,
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  { message: 'correctIndex must be within options array bounds' }
)

// Quiz file schema (for import/export)
export const QuizFileSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  quizzes: z.array(QuizItemSchema).min(1, 'At least one quiz is required'),
})

// Quiz set storage schema (for electron-store)
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

// User progress schemas
export const QuestionProgressSchema = z.object({
  questionId: z.string(),
  attempts: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  lastAttemptAt: z.number(),
  lastCorrect: z.boolean(),
})

export const CategoryProgressSchema = z.object({
  categoryId: z.string(),
  totalQuestions: z.number().int().min(0),
  attemptedQuestions: z.number().int().min(0),
  correctAnswers: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
})

export const UserProgressSchema = z.object({
  modifiedAt: z.number(),
  questionProgress: z.record(z.string(), QuestionProgressSchema),
  categoryProgress: z.record(z.string(), CategoryProgressSchema),
  totalAttempts: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  streakDays: z.number().int().min(0),
  lastSessionAt: z.number(),
})

// Types derived from schemas
export type QuizItemData = z.infer<typeof QuizItemSchema>
export type QuizFileData = z.infer<typeof QuizFileSchema>
export type QuizSetStorageData = z.infer<typeof QuizSetStorageSchema>
export type UserProgressData = z.infer<typeof UserProgressSchema>

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
}

/**
 * Validate quiz file data
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
 * Validate user progress data
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
 * Validate quiz set storage data
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
