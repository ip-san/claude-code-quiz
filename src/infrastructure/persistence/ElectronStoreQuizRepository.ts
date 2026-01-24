import type { IQuizRepository } from '../../domain/repositories/IQuizRepository'
import { QuizSet, type QuizSetType } from '../../domain/entities/QuizSet'
import { Question } from '../../domain/entities/Question'
import { validateQuizFile, type QuizFileData } from '../validation/QuizValidator'

// Import default quiz data
import defaultQuizData from '../../data/quizzes.json'

const STORAGE_KEY_ACTIVE_SET = 'claude-code-quiz-active-set'
const STORAGE_KEY_USER_SETS = 'claude-code-quiz-user-sets'

/**
 * ElectronStoreQuizRepository
 * Implementation of IQuizRepository using localStorage for now
 * Can be migrated to electron-store when needed for main process access
 */
export class ElectronStoreQuizRepository implements IQuizRepository {
  private defaultSet: QuizSet | null = null
  private userSets: Map<string, QuizSet> = new Map()
  private activeSetId: string = 'default'

  constructor() {
    try {
      this.initializeDefaultSet()
    } catch (error) {
      console.error('Critical: Failed to initialize default quiz set:', error)
      // Create minimal fallback set to prevent null access
      this.defaultSet = null
    }
    this.loadUserSets()
    this.loadActiveSetId()
  }

  /**
   * Initialize the default quiz set from bundled JSON
   */
  private initializeDefaultSet(): void {
    try {
      this.defaultSet = QuizSet.createDefault(defaultQuizData as QuizFileData)
    } catch (error) {
      console.error('Failed to create default quiz set from bundled data:', error)
      throw error // Re-throw to signal initialization failure
    }
  }

  /**
   * Load user sets from localStorage
   */
  private loadUserSets(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER_SETS)
      if (!stored) return

      const data = JSON.parse(stored) as Array<{
        id: string
        title: string
        description?: string
        version?: string
        quizzes: unknown[]
        createdAt: number
        updatedAt: number
      }>

      for (const setData of data) {
        try {
          const questions = setData.quizzes
            .map(q => Question.fromData(q))
            .filter((q): q is Question => q !== null)

          if (questions.length > 0) {
            const set = QuizSet.create({
              id: setData.id,
              title: setData.title,
              description: setData.description,
              version: setData.version,
              type: 'user',
              questions,
              createdAt: setData.createdAt,
              updatedAt: setData.updatedAt,
            })
            this.userSets.set(set.id, set)
          }
        } catch (error) {
          console.warn('Failed to load user set:', setData.id, error)
        }
      }
    } catch (error) {
      console.error('Failed to load user sets:', error)
    }
  }

  /**
   * Save user sets to localStorage
   */
  private saveUserSets(): void {
    try {
      const data = Array.from(this.userSets.values()).map(set => set.toJSON())
      localStorage.setItem(STORAGE_KEY_USER_SETS, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save user sets:', error)
    }
  }

  /**
   * Load active set ID from localStorage
   */
  private loadActiveSetId(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_SET)
      if (stored) {
        this.activeSetId = stored
      }
    } catch (error) {
      console.error('Failed to load active set ID:', error)
    }
  }

  /**
   * Save active set ID to localStorage
   */
  private saveActiveSetId(): void {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SET, this.activeSetId)
    } catch (error) {
      console.error('Failed to save active set ID:', error)
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
   * Get all user-imported quiz sets
   */
  async getUserSets(): Promise<QuizSet[]> {
    return Array.from(this.userSets.values())
  }

  /**
   * Get a specific quiz set by ID
   */
  async getSetById(id: string): Promise<QuizSet | null> {
    if (id === 'default') {
      return this.getDefaultSet()
    }
    return this.userSets.get(id) ?? null
  }

  /**
   * Get the currently active quiz set
   */
  async getActiveSet(): Promise<QuizSet> {
    const set = await this.getSetById(this.activeSetId)
    if (set) {
      return set
    }
    // Fallback to default
    this.activeSetId = 'default'
    this.saveActiveSetId()
    return this.getDefaultSet()
  }

  /**
   * Set the active quiz set by ID
   */
  async setActiveSet(id: string): Promise<void> {
    const set = await this.getSetById(id)
    if (set) {
      this.activeSetId = id
      this.saveActiveSetId()
    } else {
      throw new Error(`Quiz set not found: ${id}`)
    }
  }

  /**
   * Save a user quiz set
   */
  async saveUserSet(set: QuizSet): Promise<void> {
    if (set.type !== 'user') {
      throw new Error('Cannot save non-user quiz set')
    }
    this.userSets.set(set.id, set)
    this.saveUserSets()
  }

  /**
   * Delete a user quiz set
   */
  async deleteUserSet(id: string): Promise<void> {
    const set = this.userSets.get(id)
    if (!set) {
      throw new Error(`User set not found: ${id}`)
    }
    if (set.type !== 'user') {
      throw new Error('Cannot delete non-user quiz set')
    }

    this.userSets.delete(id)
    this.saveUserSets()

    // If this was the active set, switch to default
    if (this.activeSetId === id) {
      this.activeSetId = 'default'
      this.saveActiveSetId()
    }
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

  /**
   * Check if a set is the active set
   */
  async isActiveSet(id: string): Promise<boolean> {
    return this.activeSetId === id
  }

  /**
   * Get the type of a quiz set
   */
  async getSetType(id: string): Promise<QuizSetType | null> {
    const set = await this.getSetById(id)
    return set?.type ?? null
  }

  /**
   * Import quiz data from JSON string
   * Returns the created QuizSet or throws an error with details if validation fails
   */
  async importFromJson(jsonString: string): Promise<QuizSet | null> {
    const result = validateQuizFile(jsonString)
    if (!result.success || !result.data) {
      const errorMessage = result.errors?.join(', ') ?? 'Unknown validation error'
      console.error('Import validation failed:', errorMessage)
      throw new Error(`バリデーションエラー: ${errorMessage}`)
    }

    const set = QuizSet.createFromImport(result.data)
    await this.saveUserSet(set)
    return set
  }

  /**
   * Restore to default set
   */
  async restoreToDefault(): Promise<void> {
    this.activeSetId = 'default'
    this.saveActiveSetId()
  }

  /**
   * Get info about all available sets
   */
  async getAllSetsInfo(): Promise<Array<{
    id: string
    title: string
    type: QuizSetType
    questionCount: number
    isActive: boolean
  }>> {
    const defaultSet = await this.getDefaultSet()
    const userSets = await this.getUserSets()

    const result = [
      {
        id: defaultSet.id,
        title: defaultSet.title,
        type: defaultSet.type,
        questionCount: defaultSet.getQuestionCount(),
        isActive: this.activeSetId === defaultSet.id,
      },
      ...userSets.map(set => ({
        id: set.id,
        title: set.title,
        type: set.type,
        questionCount: set.getQuestionCount(),
        isActive: this.activeSetId === set.id,
      })),
    ]

    return result
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
