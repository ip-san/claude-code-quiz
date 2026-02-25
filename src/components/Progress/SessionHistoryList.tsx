import type { SessionRecord } from '@/domain/entities/UserProgress'

interface SessionHistoryListProps {
  sessions: readonly SessionRecord[]
  limit?: number
}

const MODE_LABELS: Record<string, string> = {
  full: '実力テスト',
  category: 'カテゴリ別',
  random: 'ランダム',
  weak: '苦手克服',
  custom: 'カスタム',
  bookmark: 'ブックマーク',
  spaced: '間隔反復',
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hour}:${min}`
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600'
  if (percentage >= 70) return 'text-blue-600'
  if (percentage >= 50) return 'text-orange-600'
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
      <div className="rounded-lg border border-stone-200 bg-white p-6 text-center">
        <p className="text-sm text-stone-400">
          まだセッション履歴がありません
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <h3 className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-claude-dark">
        セッション履歴（直近{Math.min(limit, recent.length)}件）
      </h3>
      <div className="divide-y divide-stone-100">
        {recent.map((session) => (
          <div key={session.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">
                {formatDate(session.completedAt)}
              </span>
              <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {MODE_LABELS[session.mode] ?? session.mode}
              </span>
              {session.categoryFilter && (
                <span className="text-xs text-stone-400">
                  {session.categoryFilter}
                </span>
              )}
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
        ))}
      </div>
    </div>
  )
}
