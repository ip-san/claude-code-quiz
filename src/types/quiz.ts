import { z } from 'zod'

// ============================================================
// Category Configuration Schema
// ============================================================

export const CategoryConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  weight: z.number().min(0).max(100).optional(), // Percentage weight in full exam
})

export type CategoryConfig = z.infer<typeof CategoryConfigSchema>

// ============================================================
// Quiz Mode Configuration Schema
// ============================================================

export const QuizModeSchema = z.enum([
  'full',      // All questions (exam simulation)
  'category',  // Single category focus
  'random',    // Random selection
  'weak',      // Weak points only
  'custom',    // Custom selection
])

export type QuizMode = z.infer<typeof QuizModeSchema>

export const QuizModeConfigSchema = z.object({
  id: QuizModeSchema,
  name: z.string(),
  description: z.string(),
  questionCount: z.number().nullable(), // null = all questions
  timeLimit: z.number().nullable(), // null = no limit, value in minutes
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
})

export type QuizModeConfig = z.infer<typeof QuizModeConfigSchema>

// ============================================================
// Difficulty Schema
// ============================================================

export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])
export type Difficulty = z.infer<typeof DifficultySchema>

export const DifficultyConfigSchema = z.object({
  id: DifficultySchema,
  name: z.string(),
  color: z.string(),
})

export type DifficultyConfig = z.infer<typeof DifficultyConfigSchema>

// ============================================================
// Quiz Item Schema
// ============================================================

export const QuizOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  wrongFeedback: z.string().optional(),
})

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
  category: z.string(), // Required - links to CategoryConfig.id
  difficulty: DifficultySchema,
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  { message: 'correctIndex must be within options array bounds' }
)

export type QuizOption = z.infer<typeof QuizOptionSchema>
export type QuizItem = z.infer<typeof QuizItemSchema>

// ============================================================
// Quiz File Schema (for import/export)
// ============================================================

export const QuizFileSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  categories: z.array(CategoryConfigSchema).optional(),
  quizzes: z.array(QuizItemSchema).min(1, 'At least one quiz is required'),
})

export type QuizFile = z.infer<typeof QuizFileSchema>

// ============================================================
// Progress Tracking Types
// ============================================================

export interface QuestionProgress {
  questionId: string
  attempts: number
  correctCount: number
  lastAttemptAt: number // timestamp
  lastCorrect: boolean
}

export interface CategoryProgress {
  categoryId: string
  totalQuestions: number
  attemptedQuestions: number
  correctAnswers: number
  accuracy: number // percentage
}

export interface UserProgress {
  modifiedAt: number
  questionProgress: Record<string, QuestionProgress>
  categoryProgress: Record<string, CategoryProgress>
  totalAttempts: number
  totalCorrect: number
  streakDays: number
  lastSessionAt: number
}

// ============================================================
// Session State Types
// ============================================================

export interface QuizSessionConfig {
  mode: QuizMode
  categoryFilter: string | null // null = all categories
  difficultyFilter: Difficulty | null // null = all difficulties
  questionCount: number | null // null = all matching questions
  timeLimit: number | null // null = no limit
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

export interface QuizSessionState {
  config: QuizSessionConfig
  questions: QuizItem[]
  currentIndex: number
  selectedAnswer: number | null
  isAnswered: boolean
  isCorrect: boolean | null
  score: number
  answeredCount: number
  isCompleted: boolean
  startedAt: number | null
  timeRemaining: number | null // in seconds
}

// ============================================================
// Validation Result
// ============================================================

export interface ValidationResult {
  success: boolean
  data?: QuizFile
  errors?: string[]
}
