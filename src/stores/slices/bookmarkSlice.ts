/**
 * Bookmark Slice - Bookmark management
 */

import { getProgressRepository } from '@/infrastructure'
import type { StoreGet, StoreSet } from '../utils'

export interface BookmarkSlice {
  toggleBookmark: (questionId: string) => void
  getBookmarkedCount: () => number
}

export const createBookmarkSlice = (set: StoreSet, get: StoreGet): BookmarkSlice => ({
  toggleBookmark: (questionId) => {
    const state = get()
    const updatedProgress = state.userProgress.toggleBookmark(questionId)
    set({ userProgress: updatedProgress })
    getProgressRepository()
      .save(updatedProgress)
      .catch((error) => {
        console.error('Failed to save bookmark:', error)
      })
  },

  getBookmarkedCount: () => {
    return get().userProgress.bookmarkedQuestionIds.length
  },
})
