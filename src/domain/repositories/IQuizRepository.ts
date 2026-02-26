import type { QuizSet } from '../entities/QuizSet'
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
   * Get the currently active quiz set
   */
  getActiveSet(): Promise<QuizSet>

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

}
