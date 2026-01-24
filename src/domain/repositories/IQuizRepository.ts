import type { QuizSet, QuizSetType } from '../entities/QuizSet'
import type { Question } from '../entities/Question'

/**
 * IQuizRepository Interface
 * Defines the contract for quiz data persistence
 * Following DDD, this interface is in the domain layer
 * but implementation is in the infrastructure layer
 */
export interface IQuizRepository {
  /**
   * Get the default (read-only) quiz set
   */
  getDefaultSet(): Promise<QuizSet>

  /**
   * Get all user-imported quiz sets
   */
  getUserSets(): Promise<QuizSet[]>

  /**
   * Get a specific quiz set by ID
   */
  getSetById(id: string): Promise<QuizSet | null>

  /**
   * Get the currently active quiz set
   */
  getActiveSet(): Promise<QuizSet>

  /**
   * Set the active quiz set by ID
   */
  setActiveSet(id: string): Promise<void>

  /**
   * Save a user quiz set (only for user type)
   */
  saveUserSet(set: QuizSet): Promise<void>

  /**
   * Delete a user quiz set (only for user type)
   */
  deleteUserSet(id: string): Promise<void>

  /**
   * Get all questions from the active set
   */
  getAllQuestions(): Promise<Question[]>

  /**
   * Get questions filtered by category
   */
  getQuestionsByCategory(categoryId: string): Promise<Question[]>

  /**
   * Get questions filtered by difficulty
   */
  getQuestionsByDifficulty(difficulty: string): Promise<Question[]>

  /**
   * Check if a set is the active set
   */
  isActiveSet(id: string): Promise<boolean>

  /**
   * Get the type of a quiz set
   */
  getSetType(id: string): Promise<QuizSetType | null>

  /**
   * Import quiz data from JSON string
   * Returns the created QuizSet or throws an error if validation fails
   */
  importFromJson(jsonString: string): Promise<QuizSet | null>

  /**
   * Restore to default quiz set
   */
  restoreToDefault(): Promise<void>

  /**
   * Get info about all available sets (for UI display)
   */
  getAllSetsInfo(): Promise<Array<{
    id: string
    title: string
    type: QuizSetType
    questionCount: number
    isActive: boolean
  }>>
}
