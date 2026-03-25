import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { useToastPhase, toastContainerProps } from './useToastPhase'

interface StreakToastProps {
  streak: number
}

/**
 * 連続正解時のトースト通知
 * 3, 5, 10, 15, 20 問連続正解でアニメーション表示
 */
export function StreakToast({ streak }: StreakToastProps) {
  const { phase, trigger, style } = useToastPhase(2000)
  const [lastShown, setLastShown] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (streak === 0) {
      setLastShown(0)
      return
    }
    const milestones = [3, 5, 10, 15, 20]
    if (milestones.includes(streak) && streak !== lastShown) {
      setLastShown(streak)
      const msg = streak >= 20 ? '圧巻！' : streak >= 10 ? '絶好調！' : streak >= 5 ? 'すごい！' : 'いい調子！'
      setMessage(`${msg} ${streak}問連続正解`)
      return trigger()
    }
  }, [streak, lastShown, trigger])

  if (phase === 'hidden') return null

  return (
    <div {...toastContainerProps}>
      <div className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 shadow-lg" style={style}>
        <div className="flex items-center gap-2 text-white">
          <Flame className="h-5 w-5" />
          <span className="text-sm font-bold">{message}</span>
        </div>
      </div>
    </div>
  )
}
