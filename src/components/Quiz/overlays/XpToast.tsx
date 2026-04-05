import { Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Toast } from './Toast'
import { useToastPhase } from './useToastPhase'

interface XpToastProps {
  totalXp: number
}

/**
 * XP獲得トースト — 回答ごとにXP獲得量を表示
 * totalXp の変化を検知して表示する。
 */
export function XpToast({ totalXp }: XpToastProps) {
  const { phase, trigger, style } = useToastPhase(1200)
  const prevXpRef = useRef(totalXp)
  const gainRef = useRef(0)

  useEffect(() => {
    const gain = totalXp - prevXpRef.current
    prevXpRef.current = totalXp
    if (gain > 0) {
      gainRef.current = gain
      return trigger()
    }
  }, [totalXp, trigger])

  return (
    <Toast
      phase={phase}
      style={style}
      icon={<Sparkles className="h-4 w-4" />}
      message={`+${gainRef.current} XP`}
      gradient="from-amber-500 to-orange-500"
    />
  )
}
