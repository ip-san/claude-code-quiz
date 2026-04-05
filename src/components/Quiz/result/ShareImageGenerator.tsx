import { Image } from 'lucide-react'
import { useCallback, useState } from 'react'
import { theme } from '@/config/theme'
import { XpService } from '@/domain/services/XpService'
import { haptics } from '@/lib/haptics'

interface ShareImageGeneratorProps {
  score: number
  total: number
  percentage: number
  streakDays: number
  totalXp: number
}

/**
 * セッション結果のシェア画像をCanvas APIで生成
 */
export function ShareImageGenerator({ score, total, percentage, streakDays, totalXp }: ShareImageGeneratorProps) {
  const [generating, setGenerating] = useState(false)

  const generateImage = useCallback(async () => {
    setGenerating(true)
    haptics.light()

    try {
      const canvas = document.createElement('canvas')
      const width = 600
      const height = 315 // OGP recommended ratio
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height)
      grad.addColorStop(0, '#FAF9F5')
      grad.addColorStop(1, '#FFF5EB')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Top accent bar
      const accentGrad = ctx.createLinearGradient(0, 0, width, 0)
      accentGrad.addColorStop(0, '#E07A3A')
      accentGrad.addColorStop(1, '#F59E0B')
      ctx.fillStyle = accentGrad
      ctx.fillRect(0, 0, width, 4)

      // App name
      ctx.fillStyle = '#E07A3A'
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
      ctx.fillText(theme.appName, 30, 40)

      // Score circle
      const cx = width / 2
      const cy = 130
      const r = 55

      // Background circle
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 8
      ctx.stroke()

      // Score arc
      const angle = (percentage / 100) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + angle)
      ctx.strokeStyle = percentage >= 70 ? '#22C55E' : percentage >= 40 ? '#F59E0B' : '#EF4444'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.stroke()

      // Score text
      ctx.fillStyle = '#1C1917'
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${percentage}%`, cx, cy + 8)

      // Score detail
      ctx.font = '14px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#78716C'
      ctx.fillText(`${score} / ${total}問正解`, cx, cy + 30)

      // Stats row
      const statsY = 220
      const level = XpService.getLevel(totalXp)
      const stats = [
        { label: '連続学習', value: `${streakDays}日` },
        { label: 'レベル', value: `${level.icon} Lv.${level.level}` },
        { label: 'XP', value: `${totalXp}` },
      ]

      const statWidth = width / stats.length
      stats.forEach((stat, i) => {
        const sx = statWidth * i + statWidth / 2
        ctx.font = 'bold 20px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = '#1C1917'
        ctx.fillText(stat.value, sx, statsY)
        ctx.font = '12px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = '#A8A29E'
        ctx.fillText(stat.label, sx, statsY + 20)
      })

      // Footer
      ctx.textAlign = 'left'
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#A8A29E'
      ctx.fillText(theme.shareHashtags, 30, height - 15)

      ctx.textAlign = 'right'
      ctx.fillText(new Date().toLocaleDateString('ja-JP'), width - 30, height - 15)

      // Convert to blob and trigger download/share
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return

      if ('share' in navigator && 'canShare' in navigator) {
        const file = new File([blob], 'quiz-result.png', { type: 'image/png' })
        const shareData = { files: [file] }
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
          return
        }
      }

      // Fallback: download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quiz-result.png'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }, [score, total, percentage, streakDays, totalXp])

  return (
    <button
      onClick={generateImage}
      disabled={generating}
      className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-300 px-6 py-3.5 text-base font-semibold text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400"
    >
      {generating ? (
        <>生成中...</>
      ) : (
        <>
          <Image className="h-5 w-5" />
          画像でシェア
        </>
      )}
    </button>
  )
}
