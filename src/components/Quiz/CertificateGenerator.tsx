import { useState } from 'react'
import { Award } from 'lucide-react'

interface CertificateGeneratorProps {
  score: number
  total: number
  percentage: number
  mode: string
}

/**
 * 合格証を Canvas で生成してダウンロード
 * 実力テスト80%以上で表示
 */
export function CertificateGenerator({ score, total, percentage, mode }: CertificateGeneratorProps) {
  const [name, setName] = useState('')
  const [generating, setGenerating] = useState(false)

  if (percentage < 80 || mode !== 'full') return null

  const handleGenerate = () => {
    setGenerating(true)
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 500
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#FAF9F5'
    ctx.fillRect(0, 0, 800, 500)

    // Border
    ctx.strokeStyle = '#D97757'
    ctx.lineWidth = 4
    ctx.strokeRect(20, 20, 760, 460)
    ctx.strokeStyle = '#D9775740'
    ctx.lineWidth = 2
    ctx.strokeRect(30, 30, 740, 440)

    // Title
    ctx.fillStyle = '#D97757'
    ctx.font = 'bold 36px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Certificate of Achievement', 400, 80)

    // Subtitle
    ctx.fillStyle = '#6B6B6B'
    ctx.font = '16px -apple-system, sans-serif'
    ctx.fillText('Claude Code Quiz Master Certification', 400, 110)

    // Name
    ctx.fillStyle = '#1A1A1A'
    ctx.font = 'bold 32px -apple-system, sans-serif'
    ctx.fillText(name || 'Anonymous', 400, 200)

    // Score
    ctx.fillStyle = '#D97757'
    ctx.font = 'bold 48px -apple-system, sans-serif'
    ctx.fillText(`${percentage}%`, 400, 280)

    ctx.fillStyle = '#6B6B6B'
    ctx.font = '18px -apple-system, sans-serif'
    ctx.fillText(`${score} / ${total} 問正解`, 400, 310)

    // Description
    ctx.fillStyle = '#1A1A1A'
    ctx.font = '16px -apple-system, sans-serif'
    ctx.fillText('Claude Code の機能と使い方に関する実力テストに合格しました', 400, 370)

    // Date
    ctx.fillStyle = '#6B6B6B'
    ctx.font = '14px -apple-system, sans-serif'
    const date = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    ctx.fillText(date, 400, 420)

    // Footer
    ctx.fillStyle = '#D9775740'
    ctx.font = '12px -apple-system, sans-serif'
    ctx.fillText('Powered by Claude Code Quiz', 400, 460)

    // Download
    const link = document.createElement('a')
    link.download = `claude-code-quiz-certificate-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    setGenerating(false)
  }

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 text-center dark:from-amber-950 dark:to-yellow-950 dark:border-amber-800">
      <Award className="mx-auto mb-2 h-8 w-8 text-amber-600" />
      <p className="mb-2 text-sm font-bold text-amber-800 dark:text-amber-200">合格おめでとうございます！</p>
      <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">証明書を発行できます</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="お名前を入力"
        className="mb-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-center text-sm text-claude-dark dark:bg-stone-800 dark:text-white dark:border-amber-700"
      />
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="tap-highlight w-full rounded-2xl bg-amber-500 py-3 text-base font-semibold text-white"
      >
        {generating ? '生成中...' : '証明書をダウンロード'}
      </button>
    </div>
  )
}
