import { useQuizStore } from '@/stores/quizStore'

/**
 * StreakBanner - 連続学習日数とモチベーションメッセージを表示
 *
 * メニュー画面のヘッダー下に配置。
 * 継続学習を視覚的にフィードバックしてモチベーションを維持する。
 */
export function StreakBanner() {
  const { userProgress } = useQuizStore()
  const streak = userProgress.streakDays

  if (streak === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-center">
        <p className="text-sm text-stone-500">
          今日クイズに挑戦して連続学習を始めましょう！
        </p>
      </div>
    )
  }

  const getStreakEmoji = (days: number) => {
    if (days >= 100) return '👑'
    if (days >= 60) return '💎'
    if (days >= 30) return '🏆'
    if (days >= 14) return '⚡'
    if (days >= 7) return '🔥'
    if (days >= 3) return '✨'
    return '🔥'
  }

  const getStreakMessage = (days: number) => {
    if (days >= 100) return '驚異的！100日を超える学習の積み重ね'
    if (days >= 60) return '素晴らしい！2ヶ月以上の継続学習'
    if (days >= 30) return 'すごい！1ヶ月の連続学習達成'
    if (days >= 14) return '2週間連続！習慣が定着してきました'
    if (days >= 7) return '1週間連続！良い調子です'
    if (days >= 3) return '3日連続！この調子で続けましょう'
    return '連続学習中！今日も頑張りましょう'
  }

  const getBgClass = (days: number) => {
    if (days >= 30) return 'border-amber-300 bg-amber-50'
    if (days >= 7) return 'border-orange-200 bg-orange-50'
    return 'border-stone-200 bg-white'
  }

  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${getBgClass(streak)}`}>
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl">{getStreakEmoji(streak)}</span>
        <span className="text-lg font-bold text-claude-dark">{streak}日連続</span>
        <span className="text-xl">{getStreakEmoji(streak)}</span>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {getStreakMessage(streak)}
      </p>
    </div>
  )
}
