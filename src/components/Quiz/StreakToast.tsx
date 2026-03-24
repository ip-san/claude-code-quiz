import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'

interface StreakToastProps {
  streak: number
}

/**
 * 連続正解時のトースト通知
 * 3, 5, 10, 15, 20 問連続正解でアニメーション表示
 * ふわっと表示 → 2秒保持 → ふわっとフェードアウト
 */
export function StreakToast({ streak }: StreakToastProps) {
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'visible' | 'exit'>('hidden')
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
      const msg = streak >= 20 ? '圧巻！'
        : streak >= 10 ? '絶好調！'
        : streak >= 5 ? 'すごい！'
        : 'いい調子！'
      setMessage(`${msg} ${streak}問連続正解`)

      // Enter → visible → exit → hidden
      setPhase('enter')
      const t1 = setTimeout(() => setPhase('visible'), 50)
      const t2 = setTimeout(() => setPhase('exit'), 2000)
      const t3 = setTimeout(() => setPhase('hidden'), 2500)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [streak, lastShown])

  if (phase === 'hidden') return null

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center"
      role="status"
      aria-live="polite"
      style={{ top: 'calc(5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div
        className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 shadow-lg"
        style={{
          opacity: phase === 'exit' ? 0 : 1,
          transform: phase === 'enter' ? 'scale(0.8) translateY(-10px)' : 'scale(1) translateY(0)',
          transition: 'opacity 0.4s ease, transform 0.3s ease',
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <Flame className="h-5 w-5" />
          <span className="text-sm font-bold">{message}</span>
          <Flame className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
