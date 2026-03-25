import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useToastPhase, toastContainerProps } from './useToastPhase'

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
 * 2問連続不正解ごとに表示
 */
export function EncouragementToast({ wrongStreak }: EncouragementToastProps) {
  const { phase, trigger, style } = useToastPhase(3000)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (wrongStreak >= 2 && wrongStreak % 2 === 0) {
      setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])
      return trigger()
    }
  }, [wrongStreak, trigger])

  if (phase === 'hidden') return null

  return (
    <div {...toastContainerProps}>
      <div className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 shadow-lg" style={style}>
        <div className="flex items-center gap-2 text-white">
          <Heart className="h-4 w-4" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  )
}
