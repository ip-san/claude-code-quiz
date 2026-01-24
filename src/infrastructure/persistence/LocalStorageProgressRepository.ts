import type { IProgressRepository } from '../../domain/repositories/IProgressRepository'
import { UserProgress } from '../../domain/entities/UserProgress'
import { validateUserProgress } from '../validation/QuizValidator'

const STORAGE_KEY = 'claude-code-quiz-progress'

/**
 * LocalStorageProgressRepository
 * Implementation of IProgressRepository using localStorage
 */
export class LocalStorageProgressRepository implements IProgressRepository {
  /**
   * Load user progress from localStorage
   */
  async load(): Promise<UserProgress> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return UserProgress.empty()
      }

      const result = validateUserProgress(stored)
      if (!result.success || !result.data) {
        console.warn('Invalid progress data, resetting:', result.errors)
        return UserProgress.empty()
      }

      return UserProgress.create(result.data)
    } catch (error) {
      console.error('Failed to load progress:', error)
      return UserProgress.empty()
    }
  }

  /**
   * Save user progress to localStorage
   * @throws Error if save fails (e.g., quota exceeded)
   */
  async save(progress: UserProgress): Promise<void> {
    try {
      const data = {
        ...progress.toJSON(),
        modifiedAt: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save progress:', error)
      // Re-throw so callers can handle (e.g., show user notification)
      throw error
    }
  }

  /**
   * Reset all progress
   */
  async reset(): Promise<void> {
    const emptyProgress = UserProgress.empty()
    await this.save(emptyProgress)
  }

  /**
   * Export progress as JSON string
   */
  async export(): Promise<string> {
    const progress = await this.load()
    return JSON.stringify(progress.toJSON(), null, 2)
  }

  /**
   * Import progress from JSON string
   */
  async import(jsonString: string): Promise<boolean> {
    try {
      const result = validateUserProgress(jsonString)
      if (!result.success || !result.data) {
        console.error('Import validation failed:', result.errors)
        return false
      }

      const progress = UserProgress.create(result.data)
      await this.save(progress)
      return true
    } catch (error) {
      console.error('Failed to import progress:', error)
      return false
    }
  }
}

// Singleton instance
let progressRepositoryInstance: LocalStorageProgressRepository | null = null

export function getProgressRepository(): LocalStorageProgressRepository {
  if (!progressRepositoryInstance) {
    progressRepositoryInstance = new LocalStorageProgressRepository()
  }
  return progressRepositoryInstance
}
