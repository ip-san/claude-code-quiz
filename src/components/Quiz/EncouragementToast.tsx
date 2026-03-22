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
 * 2問連続不正解で表示
 */
export function EncouragementToast({ wrongStreak }: EncouragementToastProps) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (wrongStreak >= 2 && wrongStreak % 2 === 0) {
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
      setMessage(msg)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [wrongStreak])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center" style={{ top: 'calc(5rem + env(safe-area-inset-top, 0px))' }}>
      <div className="animate-bounce-in rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 shadow-lg">
        <div className="flex items-center gap-2 text-white">
          <Heart className="h-4 w-4" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  )
}
