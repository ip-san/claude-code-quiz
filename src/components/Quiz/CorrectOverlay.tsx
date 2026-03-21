import { useEffect, useState } from 'react'

/**
 * 正解時に画面中央に筆跡風のチェックマークを描画するオーバーレイ
 * 緑の太い筆ストロークが描かれるように現れ、フェードアウトする
 */
export function CorrectOverlay() {
  const [phase, setPhase] = useState<'draw' | 'hold' | 'exit' | 'done'>('draw')

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 500)
    const exitTimer = setTimeout(() => setPhase('exit'), 800)
    const doneTimer = setTimeout(() => setPhase('done'), 1200)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      {/* Subtle backdrop */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`} style={{ backgroundColor: 'rgba(34, 197, 94, 0.06)' }} />

      {/* Brush stroke check mark */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        className={`relative ${phase === 'exit' ? 'scale-110' : 'scale-100'} transition-transform duration-300`}
      >
        {/* Shadow/glow layer */}
        <path
          d="M25 62 L48 85 L95 35"
          stroke="rgba(34, 197, 94, 0.2)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="brush-check-glow"
        />
        {/* Main brush stroke */}
        <path
          d="M25 62 L48 85 L95 35"
          stroke="#22c55e"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="brush-check-stroke"
        />
        {/* Thin highlight overlay for brush texture */}
        <path
          d="M27 60 L48 83 L93 37"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="brush-check-highlight"
        />
      </svg>
    </div>
  )
}
