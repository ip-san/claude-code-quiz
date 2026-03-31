import { Download } from 'lucide-react'
import { useState } from 'react'
import { theme } from '@/config/theme'
import { getMasteryLevel } from '@/domain/services/MasteryLevelService'
import { generateCertificate, LEVEL_DESIGNS } from '@/lib/certificateCanvas'
import { useCertificateName } from '@/lib/useCertificateName'

interface MasteryLevelProps {
  overallAccuracy: number
  totalAttempts: number
  categoryStats: Record<string, { accuracy: number; attemptedQuestions: number; totalQuestions: number }>
}

export function MasteryLevel({ overallAccuracy, totalAttempts, categoryStats }: MasteryLevelProps) {
  const levels = theme.masteryLevels
  const mastery = getMasteryLevel(overallAccuracy, totalAttempts, categoryStats)
  const currentIndex = mastery.index
  const current = levels[currentIndex]
  const next = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null
  const canDownload = currentIndex >= 1

  const [name, setName] = useCertificateName()
  const [showDownload, setShowDownload] = useState(false)

  const handleDownload = () => {
    generateCertificate({
      levelIndex: currentIndex,
      levelIcon: mastery.icon,
      levelName: mastery.name,
      name,
      scoreLine: `総合正答率 ${overallAccuracy}%`,
      description: `${mastery.name}レベル到達`,
    })
  }

  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{current.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${current.color}`}>{current.name}</span>
            <div className="flex gap-1">
              {levels.map((level, i) => (
                <div
                  key={level.name}
                  className={`h-1.5 w-4 rounded-full ${i <= currentIndex ? 'bg-claude-orange' : 'bg-stone-200 dark:bg-stone-600'}`}
                />
              ))}
            </div>
          </div>
          {next && (
            <p className="mt-0.5 text-xs text-stone-500">
              次: {next.icon} {next.name}（{next.req}）
            </p>
          )}
        </div>
        {canDownload && (
          <button
            onClick={() => setShowDownload((v) => !v)}
            className="tap-highlight rounded-full p-2 text-stone-400 hover:text-claude-orange"
            aria-label="修了証をダウンロード"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
      {showDownload && canDownload && (
        <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-700">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前を入力"
            aria-label="証明書に記載するお名前"
            className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-center text-sm dark:bg-stone-700 dark:border-stone-600 dark:text-white"
          />
          <button
            onClick={handleDownload}
            className="tap-highlight w-full rounded-xl bg-claude-orange py-2 text-sm font-semibold text-white"
          >
            {LEVEL_DESIGNS[currentIndex].title}をダウンロード
          </button>
        </div>
      )}
    </div>
  )
}
