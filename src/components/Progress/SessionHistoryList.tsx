import { locale } from '@/config/locale'
import type { SessionRecord } from '@/domain/entities/UserProgress'
import { PASSING_SCORE, SCORE_COLORS } from '@/domain/valueObjects/ScoreThresholds'
import { cardStyles } from '@/lib/styles'

interface SessionHistoryListProps {
  sessions: readonly SessionRecord[]
  limit?: number
}

const MODE_LABELS = locale.sessionHistory.modes

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hour}:${min}`
}

function getScoreColor(percentage: number): string {
  if (percentage >= SCORE_COLORS.excellent) return 'text-green-600'
  if (percentage >= PASSING_SCORE) return 'text-blue-600'
  if (percentage >= SCORE_COLORS.fair) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * SessionHistoryList - セッション履歴リスト
 *
 * 直近のセッション一覧をリスト表示。
 * モード、スコア、日時を確認できる。
 */
export function SessionHistoryList({ sessions, limit = 10 }: SessionHistoryListProps) {
  const recent = sessions.slice(-limit).reverse()

  if (recent.length === 0) {
    return (
      <div className={`${cardStyles.base} p-6 text-center`}>
        <p className="text-sm text-stone-400">{locale.sessionHistory.noHistory}</p>
      </div>
    )
  }

  return (
    <div className={cardStyles.base}>
      <h3 className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-claude-dark">
        {locale.sessionHistory.historyTitle(Math.min(limit, recent.length))}
      </h3>
      <div className="divide-y divide-stone-100">
        {recent.map((session) => {
          const isToday = new Date(session.completedAt).toDateString() === new Date().toDateString()
          return (
            <div
              key={session.id}
              className={`flex items-center justify-between px-4 py-2.5 ${isToday ? 'border-l-2 border-green-400 bg-green-50/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500">{formatDate(session.completedAt)}</span>
                <span className="rounded-sm bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                  {MODE_LABELS[session.mode] ?? session.mode}
                </span>
                {session.categoryFilter && <span className="text-xs text-stone-500">{session.categoryFilter}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">
                  {session.score}/{session.totalQuestions}
                </span>
                <span className={`text-sm font-semibold ${getScoreColor(session.percentage)}`}>
                  {session.percentage}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
