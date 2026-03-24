import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'

interface EncouragementToastProps {
  wrongStreak: number
}

const MESSAGES = [
  '大丈夫。誰もが最初は間違えます',
  '間違えるほど記憶に残ります',
  'ここで諦めなければ、必ず力になります',
  '一つずつ。焦らなくて大丈夫です',
  'あなたのペースで進みましょう',
]

/**
 * 連続不正解時に表示される励ましトースト
 * 2問連続不正解ごとに表示、ふわっとフェードイン/アウト
 */
export function EncouragementToast({ wrongStreak }: EncouragementToastProps) {
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'visible' | 'exit'>('hidden')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 2問連続不正解ごとに励ましを表示
    if (wrongStreak >= 2 && wrongStreak % 2 === 0) {
      setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])
      setPhase('enter')
      const t1 = setTimeout(() => setPhase('visible'), 50)
      const t2 = setTimeout(() => setPhase('exit'), 3000)
      const t3 = setTimeout(() => setPhase('hidden'), 3500)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [wrongStreak])

  if (phase === 'hidden') return null

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center"
      role="status"
      aria-live="polite"
      style={{ top: 'calc(5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div
        className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 shadow-lg"
        style={{
          opacity: phase === 'exit' ? 0 : 1,
          transform: phase === 'enter' ? 'scale(0.8) translateY(-10px)' : 'scale(1) translateY(0)',
          transition: 'opacity 0.4s ease, transform 0.3s ease',
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <Heart className="h-4 w-4" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  )
}
