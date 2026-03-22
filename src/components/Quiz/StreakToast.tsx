import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'

interface StreakToastProps {
  streak: number
}

/**
 * 連続正解時のトースト通知
 * 3, 5, 10 問連続正解でアニメーション表示
 */
export function StreakToast({ streak }: StreakToastProps) {
  const [visible, setVisible] = useState(false)
  const [lastShown, setLastShown] = useState(0)

  useEffect(() => {
    if (streak === 0) {
      setLastShown(0)
      return
    }
    const milestones = [3, 5, 10, 15, 20]
    if (milestones.includes(streak) && streak !== lastShown) {
      setLastShown(streak)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [streak, lastShown])

  if (!visible) return null

  const getMessage = () => {
    if (streak >= 20) return '圧巻！'
    if (streak >= 10) return '絶好調！'
    if (streak >= 5) return 'すごい！'
    return 'いい調子！'
  }

  return (
    <div className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center" style={{ top: 'calc(5rem + env(safe-area-inset-top, 0px))' }}>
      <div className="animate-bounce-in rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 shadow-lg">
        <div className="flex items-center gap-2 text-white">
          <Flame className="h-5 w-5" />
          <span className="text-sm font-bold">{getMessage()} {streak}問連続正解</span>
          <Flame className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
