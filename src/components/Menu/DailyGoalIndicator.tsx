import { useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { DailyGoalService } from '@/domain/services/DailyGoalService'

/**
 * DailyGoalIndicator - デイリーゴール進捗の表示と目標変更
 *
 * メニュー画面に配置。今日の回答数 / 目標を表示し、
 * 達成するとお祝いメッセージを表示する。
 */
export function DailyGoalIndicator() {
  const { userProgress, setDailyGoal } = useQuizStore()
  const [showGoalPicker, setShowGoalPicker] = useState(false)

  const today = DailyGoalService.getTodayString()
  const todayCount = userProgress.getDailyCount(today)
  const dailyGoal = userProgress.dailyGoal
  const progress = DailyGoalService.getProgress(todayCount, dailyGoal)
  const isAchieved = progress >= 1.0

  const progressPercent = Math.min(progress * 100, 100)

  const goalOptions = [5, 10, 15, 20, 30, 50]

  return (
    <div className={`animate-card-enter rounded-2xl border px-4 py-3 ${isAchieved ? 'border-green-300 bg-green-50/50 dark:border-green-500/30 dark:bg-green-500/10' : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800'}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{isAchieved ? '🎉' : '🎯'}</span>
          <span className="text-sm font-medium text-claude-dark">
            今日の目標
          </span>
        </div>
        <button
          onClick={() => setShowGoalPicker(!showGoalPicker)}
          aria-expanded={showGoalPicker}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          {showGoalPicker ? '閉じる' : '目標変更'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-1.5 h-2.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={todayCount} aria-valuemin={0} aria-valuemax={dailyGoal} aria-label="今日の目標進捗">
        <div
          className={`h-full animate-progress-fill rounded-full ${
            isAchieved ? 'progress-gradient-green' : 'progress-gradient'
          }`}
          style={{ '--tw-progress-width': `${progressPercent}%`, width: `${progressPercent}%` } as React.CSSProperties}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={isAchieved ? 'font-medium text-green-600' : 'text-stone-500'}>
          {todayCount} / {dailyGoal} 問
        </span>
        {isAchieved ? (
          <span className="font-medium text-green-600">達成！</span>
        ) : (
          <span className="text-stone-400">
            あと{dailyGoal - todayCount}問
          </span>
        )}
      </div>

      {/* Goal picker */}
      {showGoalPicker && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <p className="mb-2 text-xs text-stone-500">1日の目標問題数</p>
          <div className="flex flex-wrap gap-1.5">
            {goalOptions.map((goal) => (
              <button
                key={goal}
                onClick={() => {
                  setDailyGoal(goal)
                  setShowGoalPicker(false)
                }}
                className={`tap-highlight rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  dailyGoal === goal
                    ? 'bg-claude-orange text-white'
                    : 'border border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                {goal}問
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
