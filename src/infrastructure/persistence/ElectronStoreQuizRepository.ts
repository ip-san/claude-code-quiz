import type { IQuizRepository } from '../../domain/repositories/IQuizRepository'
import { QuizSet } from '../../domain/entities/QuizSet'
import { Question } from '../../domain/entities/Question'
import { type QuizFileData } from '../validation/QuizValidator'

// Import default quiz data
import defaultQuizData from '../../data/quizzes.json'

/**
 * ElectronStoreQuizRepository
 * Implementation of IQuizRepository using the bundled default quiz data
 */
export class ElectronStoreQuizRepository implements IQuizRepository {
  private defaultSet: QuizSet | null = null

  constructor() {
    try {
      this.initializeDefaultSet()
    } catch (error) {
      console.error('Critical: Failed to initialize default quiz set:', error)
      this.defaultSet = null
    }
  }

  /**
   * Initialize the default quiz set from bundled JSON
   */
  private initializeDefaultSet(): void {
    try {
      this.defaultSet = QuizSet.createDefault(defaultQuizData as QuizFileData)
    } catch (error) {
      console.error('Failed to create default quiz set from bundled data:', error)
      throw error
    }
  }

  /**
   * Get the default (read-only) quiz set
   */
  async getDefaultSet(): Promise<QuizSet> {
    if (!this.defaultSet) {
      try {
        this.initializeDefaultSet()
      } catch (_error) {
        throw new Error('Failed to load default quiz set. The application may need to be reinstalled.')
      }
    }
    if (!this.defaultSet) {
      throw new Error('Default quiz set is unavailable.')
    }
    return this.defaultSet
  }

  /**
   * Get the currently active quiz set (always the default set)
   */
  async getActiveSet(): Promise<QuizSet> {
    return this.getDefaultSet()
  }

  /**
   * Get all questions from the active set
   */
  async getAllQuestions(): Promise<Question[]> {
    const activeSet = await this.getActiveSet()
    return [...activeSet.questions]
  }

  /**
   * Get questions filtered by category
   */
  async getQuestionsByCategory(categoryId: string): Promise<Question[]> {
    const activeSet = await this.getActiveSet()
    return activeSet.getQuestionsByCategory(categoryId)
  }

  /**
   * Get questions filtered by difficulty
   */
  async getQuestionsByDifficulty(difficulty: string): Promise<Question[]> {
    const activeSet = await this.getActiveSet()
    return activeSet.getQuestionsByDifficulty(difficulty)
  }

}

// Singleton instance
let quizRepositoryInstance: ElectronStoreQuizRepository | null = null

export function getQuizRepository(): ElectronStoreQuizRepository {
  if (!quizRepositoryInstance) {
    quizRepositoryInstance = new ElectronStoreQuizRepository()
  }
  return quizRepositoryInstance
}
