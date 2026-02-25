/**
 * StreakMilestoneService - ストリークマイルストーン検出サービス
 *
 * 連続学習日数のマイルストーン（3日、7日、14日等）を検出し、
 * UI での祝福表示に使用する。
 */

export interface StreakMilestone {
  readonly days: number
  readonly label: string
  readonly emoji: string
}

const MILESTONES: readonly StreakMilestone[] = [
  { days: 3,   label: '3日連続達成！',   emoji: '🌟' },
  { days: 7,   label: '1週間連続！',     emoji: '🏆' },
  { days: 14,  label: '2週間連続！',     emoji: '🔥' },
  { days: 30,  label: '1ヶ月連続！',     emoji: '💎' },
  { days: 60,  label: '2ヶ月連続！',     emoji: '👑' },
  { days: 100, label: '100日連続！',     emoji: '🚀' },
]

export class StreakMilestoneService {
  /**
   * セッション中にマイルストーンを跨いだ場合、そのマイルストーンを返す。
   * 複数跨いだ場合は最大のものを返す。
   * 跨いでいない場合は null を返す。
   */
  static getMilestone(
    currentStreak: number,
    previousStreak: number
  ): StreakMilestone | null {
    if (currentStreak <= previousStreak) return null

    let result: StreakMilestone | null = null
    for (const milestone of MILESTONES) {
      if (currentStreak >= milestone.days && previousStreak < milestone.days) {
        result = milestone
      }
    }
    return result
  }

  /**
   * ストリーク数に応じた表示用ラベルを返す
   */
  static getStreakLabel(streakDays: number): string {
    if (streakDays === 0) return ''
    if (streakDays === 1) return '今日も学習中！'
    return `${streakDays}日連続学習中！`
  }

  /**
   * 定義されているマイルストーン一覧を取得
   */
  static getAllMilestones(): readonly StreakMilestone[] {
    return MILESTONES
  }
}
