import { useState } from 'react'
import { theme } from '@/config/theme'
import { getMasteryLevel } from '@/domain/services/MasteryLevelService'
import { useQuizStore } from '@/stores/quizStore'

interface CertificateGeneratorProps {
  score: number
  total: number
  percentage: number
  mode: string
}

/** Level-specific certificate design */
const LEVEL_DESIGNS = [
  // 0: 入門者 — not eligible
  { title: '', border: '', accent: '', bg: '' },
  // 1: 学習者 — blue
  { title: '基礎修了証', border: '#3B82F6', accent: '#2563EB', bg: '#EFF6FF' },
  // 2: 実践者 — green
  { title: '実践者認定証', border: '#22C55E', accent: '#16A34A', bg: '#F0FDF4' },
  // 3: 推進者 — purple
  { title: '推進者認定証', border: '#A855F7', accent: '#9333EA', bg: '#FAF5FF' },
  // 4: 牽引役 — gold
  { title: 'マスター認定証', border: '#EAB308', accent: '#CA8A04', bg: '#FEFCE8' },
]

/**
 * 合格証を Canvas で生成してダウンロード
 * AI 活用レベルに応じてデザインが変わる
 */
export function CertificateGenerator({ score, total, percentage, mode }: CertificateGeneratorProps) {
  const [name, setName] = useState('')
  const [generating, setGenerating] = useState(false)
  const { userProgress, getCategoryStats } = useQuizStore()

  // Show certificate for: 実力テスト 80%+ or 全体像モード 70%+
  const isEligible = (mode === 'full' && percentage >= 80) || (mode === 'overview' && percentage >= 70)
  if (!isEligible) return null

  const categoryStats = getCategoryStats()
  const overallAccuracy = userProgress.getOverallAccuracy()
  const mastery = getMasteryLevel(overallAccuracy, userProgress.totalAttempts, categoryStats)
  const levelIndex = Math.max(mastery.index, 1) // At least level 1 if eligible
  const design = LEVEL_DESIGNS[levelIndex]

  const handleGenerate = () => {
    setGenerating(true)
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 560
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = design.bg
    ctx.fillRect(0, 0, 800, 560)

    // Outer border
    ctx.strokeStyle = design.border
    ctx.lineWidth = 4
    ctx.strokeRect(20, 20, 760, 520)
    // Inner border
    ctx.strokeStyle = `${design.border}40`
    ctx.lineWidth = 2
    ctx.strokeRect(30, 30, 740, 500)

    // Level icon (top-left corner accent)
    ctx.font = '40px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(mastery.icon, 70, 70)

    // Certificate title (level-specific)
    ctx.fillStyle = design.accent
    ctx.font = 'bold 36px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(design.title, 400, 90)

    // Subtitle
    ctx.fillStyle = '#6B6B6B'
    ctx.font = '16px -apple-system, sans-serif'
    ctx.fillText(theme.certificateTitle, 400, 120)

    // Mastery level badge
    ctx.fillStyle = design.accent
    ctx.font = 'bold 18px -apple-system, sans-serif'
    ctx.fillText(`${mastery.icon} ${mastery.name}`, 400, 160)

    // Name
    ctx.fillStyle = '#1A1A1A'
    ctx.font = 'bold 32px -apple-system, sans-serif'
    ctx.fillText(name || 'Anonymous', 400, 220)

    // Score
    ctx.fillStyle = design.accent
    ctx.font = 'bold 48px -apple-system, sans-serif'
    ctx.fillText(`${percentage}%`, 400, 300)

    ctx.fillStyle = '#6B6B6B'
    ctx.font = '18px -apple-system, sans-serif'
    ctx.fillText(`${score} / ${total} 問正解`, 400, 330)

    // Overall accuracy
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '14px -apple-system, sans-serif'
    ctx.fillText(`総合正答率: ${overallAccuracy}%`, 400, 360)

    // Description
    ctx.fillStyle = '#1A1A1A'
    ctx.font = '16px -apple-system, sans-serif'
    const certDesc = mode === 'overview' ? theme.certificateDescOverview : theme.certificateDescFull
    ctx.fillText(certDesc, 400, 410)

    // Date
    ctx.fillStyle = '#6B6B6B'
    ctx.font = '14px -apple-system, sans-serif'
    const date = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    ctx.fillText(date, 400, 460)

    // Footer
    ctx.fillStyle = `${design.border}40`
    ctx.font = '12px -apple-system, sans-serif'
    ctx.fillText(theme.certificateFooter, 400, 520)

    // Download
    const link = document.createElement('a')
    link.download = `${theme.storagePrefix}-certificate-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    setGenerating(false)
  }

  // UI color based on level
  const uiColors = [
    '',
    'border-blue-200 from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950 dark:border-blue-800',
    'border-green-200 from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 dark:border-green-800',
    'border-purple-200 from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 dark:border-purple-800',
    'border-amber-200 from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 dark:border-amber-800',
  ]
  const buttonColors = ['', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500']
  const textColors = [
    '',
    'text-blue-800 dark:text-blue-200',
    'text-green-800 dark:text-green-200',
    'text-purple-800 dark:text-purple-200',
    'text-amber-800 dark:text-amber-200',
  ]
  const subTextColors = [
    '',
    'text-blue-600 dark:text-blue-400',
    'text-green-600 dark:text-green-400',
    'text-purple-600 dark:text-purple-400',
    'text-amber-600 dark:text-amber-400',
  ]

  return (
    <div className={`mb-4 rounded-2xl border bg-gradient-to-r p-4 text-center ${uiColors[levelIndex]}`}>
      <div className="mb-2 text-3xl">{mastery.icon}</div>
      <p className={`mb-1 text-sm font-bold ${textColors[levelIndex]}`}>{design.title}</p>
      <p className={`mb-3 text-xs ${subTextColors[levelIndex]}`}>{mastery.name}として証明書を発行できます</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="お名前を入力"
        aria-label="証明書に記載するお名前"
        className="mb-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-center text-sm text-claude-dark dark:bg-stone-800 dark:text-white dark:border-stone-600"
      />
      <button
        onClick={handleGenerate}
        disabled={generating}
        className={`tap-highlight w-full rounded-2xl py-3 text-base font-semibold text-white ${buttonColors[levelIndex]}`}
      >
        {generating ? '生成中...' : '証明書をダウンロード'}
      </button>
    </div>
  )
}
