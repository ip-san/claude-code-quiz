/**
 * FlashCard の自己評価値
 *
 * SRS への影響:
 * - knew: 正解扱い、correctStreak を維持（通常の SRS 間隔）
 * - unsure: 正解扱い、correctStreak を 1 にリセット（短い復習間隔）
 * - didnt_know: 不正解扱い、correctStreak を 0 にリセット
 */
export type FlashCardRating = 'knew' | 'unsure' | 'didnt_know'

export function flashCardRatingToScore(rating: FlashCardRating): { isCorrect: boolean; streakOverride: number | null } {
  switch (rating) {
    case 'knew':
      return { isCorrect: true, streakOverride: null }
    case 'unsure':
      return { isCorrect: true, streakOverride: 1 }
    case 'didnt_know':
      return { isCorrect: false, streakOverride: null }
  }
}
