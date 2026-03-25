import { Clock, X, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { theme } from '@/config/theme'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { SpacedRepetitionService } from '@/domain/services/SpacedRepetitionService'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'

const SNAPSHOT_KEY = `${theme.storagePrefix}-snapshot-dismissed`
const LEGACY_SNAPSHOT_KEY = 'snapshot-dismissed-date'

interface DailySnapshotProps {
  onDismiss: () => void
}

/**
 * デイリースナップショット
 *
 * アプリを開いた瞬間に「今日やるべきこと」を端的に伝える。
 * 決断疲れを解消し、即座にアクションに移れるようにする。
 * 1日1回表示、スキップ可能。
 */
export function DailySnapshot({ onDismiss }: DailySnapshotProps) {
  const { userProgress, allQuestions, startSession } = useQuizStore()

  const snapshot = useMemo(() => {
    const now = Date.now()
    const today = DailyGoalService.getTodayString()
    const todayCount = userProgress.getDailyCount(today)
    const dailyGoal = userProgress.dailyGoal
    const remaining = Math.max(0, dailyGoal - todayCount)

    // SRS due count
    const dueCount = allQuestions.filter((q) => {
      const qp = userProgress.questionProgress[q.id]
      return qp && qp.attempts > 0 && SpacedRepetitionService.isDue(qp, now)
    }).length

    // SRS review forecast (next 7 days)
    const forecast: { label: string; count: number }[] = []
    const dayMs = 86400000
    const dayLabels = ['明日', '明後日']
    for (let d = 1; d <= 6; d++) {
      const dayStart = now + dayMs * d
      const dayEnd = dayStart + dayMs
      const count = allQuestions.filter((q) => {
        const qp = userProgress.questionProgress[q.id]
        if (!qp || qp.attempts === 0 || qp.nextReviewAt === undefined) return false
        return qp.nextReviewAt > now && qp.nextReviewAt >= dayStart && qp.nextReviewAt < dayEnd
      }).length
      if (count > 0) {
        const label = d <= 2 ? dayLabels[d - 1] : `${d}日後`
        forecast.push({ label, count })
      }
    }

    // Last session time
    const lastSession =
      userProgress.sessionHistory.length > 0
        ? userProgress.sessionHistory[userProgress.sessionHistory.length - 1]
        : null
    const hoursSinceLastSession = lastSession ? Math.round((now - lastSession.completedAt) / 3600000) : null

    return { remaining, dueCount, hoursSinceLastSession, forecast }
  }, [userProgress, allQuestions])

  const handleQuickStart = () => {
    haptics.light()
    // SRS due があれば quick モード（3問）、なければ random
    if (snapshot.dueCount > 0) {
      startSession({ mode: 'quick', questionCount: 3 })
    } else {
      startSession({ mode: 'random' })
    }
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(SNAPSHOT_KEY, DailyGoalService.getTodayString())
    } catch {
      /* ignore */
    }
    onDismiss()
  }

  return (
    <div className="mb-5 animate-view-enter rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-500/30 dark:from-blue-500/10 dark:to-indigo-500/10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">今日のプラン</span>
        </div>
        <button onClick={handleDismiss} className="tap-highlight rounded-full p-2 text-stone-400" aria-label="閉じる">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 space-y-1.5 text-sm text-claude-dark">
        {snapshot.hoursSinceLastSession !== null && (
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-xs text-stone-500">
              前回の学習:{' '}
              {snapshot.hoursSinceLastSession < 24
                ? `${snapshot.hoursSinceLastSession}時間前`
                : `${Math.round(snapshot.hoursSinceLastSession / 24)}日前`}
            </span>
          </div>
        )}
        {snapshot.dueCount > 0 && (
          <p>
            <strong>🧠 復習: {snapshot.dueCount}問</strong>
          </p>
        )}
        {snapshot.remaining > 0 && (
          <p>
            <strong>🎯 目標: あと{snapshot.remaining}問</strong>
          </p>
        )}
        {snapshot.forecast.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-xs text-stone-400">📅 復習予定:</span>
            {snapshot.forecast.slice(0, 4).map((f) => (
              <span key={f.label} className="text-xs text-stone-500 dark:text-stone-400">
                {f.label} <strong>{f.count}問</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {snapshot.dueCount > 0 ? (
        <div className="flex gap-2">
          <button
            onClick={() => {
              haptics.light()
              startSession({ mode: 'quick', questionCount: snapshot.dueCount })
            }}
            className="tap-highlight flex-1 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white"
            aria-label={`復習期限の${snapshot.dueCount}問を全て復習する`}
          >
            🧠 {snapshot.dueCount}問を復習
          </button>
          <button
            onClick={handleQuickStart}
            className="tap-highlight rounded-xl border border-blue-300 px-4 py-2.5 text-sm font-medium text-blue-600 dark:border-blue-500/30 dark:text-blue-400"
            aria-label="3問だけ素早くチェックする"
          >
            ⚡ 3問だけ
          </button>
        </div>
      ) : (
        <button
          onClick={handleQuickStart}
          className="tap-highlight w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white"
          aria-label="ランダムに10問チャレンジする"
        >
          🎲 サクッと10問
        </button>
      )}
    </div>
  )
}

/** 今日すでにスナップショットを閉じたか確認 */
export function hasSeenSnapshotToday(): boolean {
  try {
    const today = DailyGoalService.getTodayString()
    return localStorage.getItem(SNAPSHOT_KEY) === today || localStorage.getItem(LEGACY_SNAPSHOT_KEY) === today
  } catch {
    return true
  }
}
