import { useEffect, useState } from 'react'

const PARTICLES = 12
const EMOJIS = ['🎉', '✨', '🌟', '💫', '⭐']

/**
 * 正解時の紙吹雪エフェクト
 * 軽量なCSS-onlyアニメーションで実装（外部ライブラリ不要）
 */
export function ConfettiEffect() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: PARTICLES }).map((_, i) => {
        const left = 20 + Math.random() * 60
        const delay = Math.random() * 300
        const duration = 600 + Math.random() * 400
        const emoji = EMOJIS[i % EMOJIS.length]
        return (
          <div
            key={i}
            className="absolute text-2xl"
            style={{
              left: `${left}%`,
              top: '45%',
              animation: `confetti ${duration}ms ease-out ${delay}ms forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          >
            {emoji}
          </div>
        )
      })}
    </div>
  )
}
