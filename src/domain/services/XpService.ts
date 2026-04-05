/**
 * XpService - 経験値 (XP) とレベル計算サービス
 *
 * 回答ごとにXPを付与し、累積XPからレベルを算出する。
 * 「間違えても成長している」感覚を与えるため、不正解でもXPを付与する。
 */

/** XP付与量 */
const XP_CORRECT = 10
const XP_INCORRECT = 2
const XP_SRS_BONUS = 5 // SRS復習で正解した場合の追加ボーナス
const XP_SCENARIO_COMPLETE = 50

/** レベル定義 */
export interface XpLevel {
  readonly level: number
  readonly name: string
  readonly icon: string
  readonly minXp: number
}

const LEVELS: readonly XpLevel[] = [
  { level: 1, name: 'ビギナー', icon: '🌱', minXp: 0 },
  { level: 2, name: 'ルーキー', icon: '🌿', minXp: 50 },
  { level: 3, name: 'レギュラー', icon: '🌳', minXp: 150 },
  { level: 4, name: 'ベテラン', icon: '⭐', minXp: 400 },
  { level: 5, name: 'エキスパート', icon: '💎', minXp: 800 },
  { level: 6, name: 'マスター', icon: '👑', minXp: 1500 },
  { level: 7, name: 'グランドマスター', icon: '🏆', minXp: 3000 },
]

export class XpService {
  /**
   * 回答によるXP付与量を計算
   */
  static calculateAnswerXp(isCorrect: boolean, isSrsReview: boolean): number {
    let xp = isCorrect ? XP_CORRECT : XP_INCORRECT
    if (isCorrect && isSrsReview) {
      xp += XP_SRS_BONUS
    }
    return xp
  }

  /**
   * シナリオ完走ボーナスXP
   */
  static getScenarioCompleteXp(): number {
    return XP_SCENARIO_COMPLETE
  }

  /**
   * XPからレベル情報を取得
   */
  static getLevel(totalXp: number): XpLevel {
    let current = LEVELS[0]
    for (const level of LEVELS) {
      if (totalXp >= level.minXp) {
        current = level
      } else {
        break
      }
    }
    return current
  }

  /**
   * 次のレベルまでの進捗を計算（0-100%）
   */
  static getProgressToNextLevel(totalXp: number): { percentage: number; currentXp: number; nextXp: number } {
    const current = this.getLevel(totalXp)
    const nextIdx = LEVELS.findIndex((l) => l.level === current.level) + 1

    if (nextIdx >= LEVELS.length) {
      return { percentage: 100, currentXp: totalXp, nextXp: totalXp }
    }

    const next = LEVELS[nextIdx]
    const progressInLevel = totalXp - current.minXp
    const levelRange = next.minXp - current.minXp
    const percentage = Math.min(Math.round((progressInLevel / levelRange) * 100), 100)

    return { percentage, currentXp: totalXp, nextXp: next.minXp }
  }

  /**
   * レベルアップが発生したかを判定
   */
  static checkLevelUp(previousXp: number, newXp: number): XpLevel | null {
    const prevLevel = this.getLevel(previousXp)
    const newLevel = this.getLevel(newXp)
    if (newLevel.level > prevLevel.level) {
      return newLevel
    }
    return null
  }

  /**
   * 全レベル定義を取得
   */
  static getAllLevels(): readonly XpLevel[] {
    return LEVELS
  }
}
