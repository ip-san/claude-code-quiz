import { useEffect, useState } from 'react'

/**
 * 正解時に画面中央に大きなチェックマークを表示するオーバーレイ
 * ポップイン → ストローク描画 → フェードアウト
 */
export function CorrectOverlay() {
  const [phase, setPhase] = useState<'enter' | 'exit' | 'done'>('enter')

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase('exit'), 600)
    const doneTimer = setTimeout(() => setPhase('done'), 1000)
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden="true"
    >
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)] ${
          phase === 'enter' ? 'correct-overlay-enter' : 'correct-overlay-exit'
        }`}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M10 25L20 35L38 14"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="correct-overlay-stroke"
          />
        </svg>
      </div>
    </div>
  )
}
