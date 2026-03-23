import { useMemo } from 'react'
import { Zap, Clock, X } from 'lucide-react'
import { useQuizStore } from '@/stores/quizStore'
import { SpacedRepetitionService } from '@/domain/services/SpacedRepetitionService'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { haptics } from '@/lib/haptics'

const SNAPSHOT_KEY = 'snapshot-dismissed-date'

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
    const dueCount = allQuestions.filter(q => {
      const qp = userProgress.questionProgress[q.id]
      return qp && qp.attempts > 0 && SpacedRepetitionService.isDue(qp, now)
    }).length

    // Last session time
    const lastSession = userProgress.sessionHistory.length > 0
      ? userProgress.sessionHistory[userProgress.sessionHistory.length - 1]
      : null
    const hoursSinceLastSession = lastSession
      ? Math.round((now - lastSession.completedAt) / 3600000)
      : null

    return { remaining, dueCount, hoursSinceLastSession }
  }, [userProgress, allQuestions])

  const handleQuickStart = () => {
    haptics.light()
    // SRS due があれば quick モード、なければ random
    if (snapshot.dueCount > 0) {
      startSession({ mode: 'quick' })
    } else {
      startSession({ mode: 'random' })
    }
  }

  const handleDismiss = () => {
    try { localStorage.setItem(SNAPSHOT_KEY, DailyGoalService.getTodayString()) } catch { /* ignore */ }
    onDismiss()
  }

  return (
    <div className="mb-5 animate-view-enter rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-500/30 dark:from-blue-500/10 dark:to-indigo-500/10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">今日のプラン</span>
        </div>
        <button onClick={handleDismiss} className="tap-highlight rounded-full p-1 text-stone-400" aria-label="閉じる">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 space-y-1.5 text-sm text-claude-dark">
        {snapshot.hoursSinceLastSession !== null && (
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-xs text-stone-500">
              前回の学習: {snapshot.hoursSinceLastSession < 24
                ? `${snapshot.hoursSinceLastSession}時間前`
                : `${Math.round(snapshot.hoursSinceLastSession / 24)}日前`}
            </span>
          </div>
        )}
        {snapshot.dueCount > 0 && (
          <p><strong>🧠 復習: {snapshot.dueCount}問</strong></p>
        )}
        {snapshot.remaining > 0 && (
          <p><strong>🎯 目標: あと{snapshot.remaining}問</strong></p>
        )}
      </div>

      {snapshot.dueCount > 0 ? (
        <div className="flex gap-2">
          <button
            onClick={() => { haptics.light(); startSession({ mode: 'quick', questionCount: snapshot.dueCount }) }}
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
    return localStorage.getItem(SNAPSHOT_KEY) === DailyGoalService.getTodayString()
  } catch { return true }
}
