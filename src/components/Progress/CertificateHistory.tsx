import { Award } from 'lucide-react'
import { theme } from '@/config/theme'
import type { SessionRecord } from '@/domain/entities/UserProgress'

interface CertificateHistoryProps {
  sessionHistory: readonly SessionRecord[]
}

interface EarnedCertificate {
  readonly session: SessionRecord
  readonly levelIndex: number
  readonly levelName: string
  readonly levelIcon: string
  readonly title: string
  readonly color: string
}

const CERT_TITLES = ['', '基礎修了証', '実践者認定証', '推進者認定証', 'マスター認定証']
const CERT_COLORS = ['', 'text-blue-600', 'text-green-600', 'text-purple-600', 'text-amber-600']
const CERT_BG = [
  '',
  'bg-blue-50 dark:bg-blue-950',
  'bg-green-50 dark:bg-green-950',
  'bg-purple-50 dark:bg-purple-950',
  'bg-amber-50 dark:bg-amber-950',
]

/** Estimate level from session percentage (best effort without full category data) */
function estimateLevelFromScore(percentage: number): number {
  if (percentage >= 85) return 4
  if (percentage >= 80) return 3
  if (percentage >= 70) return 2
  return 1
}

export function CertificateHistory({ sessionHistory }: CertificateHistoryProps) {
  // Filter sessions that qualify for certificates
  const earned: EarnedCertificate[] = sessionHistory
    .filter((s) => (s.mode === 'full' && s.percentage >= 80) || (s.mode === 'overview' && s.percentage >= 70))
    .map((session) => {
      const levelIndex = estimateLevelFromScore(session.percentage)
      return {
        session,
        levelIndex,
        levelName: theme.masteryLevels[levelIndex].name,
        levelIcon: theme.masteryLevels[levelIndex].icon,
        title: CERT_TITLES[levelIndex],
        color: CERT_COLORS[levelIndex],
      }
    })
    .reverse()

  if (earned.length === 0) return null

  const modeLabel = (mode: string) => (mode === 'overview' ? '全体像モード' : '実力テスト')

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <Award className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-bold text-claude-dark">獲得した修了証（{earned.length}件）</h3>
      </div>
      <div className="flex flex-col gap-2">
        {earned.map((cert) => (
          <div key={cert.session.id} className={`flex items-center gap-3 rounded-xl p-3 ${CERT_BG[cert.levelIndex]}`}>
            <span className="text-2xl">{cert.levelIcon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${cert.color}`}>{cert.title}</p>
              <p className="text-xs text-stone-500">
                {modeLabel(cert.session.mode)} — {cert.session.percentage}%（
                {cert.session.score}/{cert.session.totalQuestions}問）
              </p>
            </div>
            <p className="text-xs text-stone-400 shrink-0">
              {new Date(cert.session.completedAt).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
