import { useState, useCallback, CSSProperties } from 'react'

type ToastPhase = 'hidden' | 'enter' | 'visible' | 'exit'

/**
 * トースト表示のフェーズ管理フック
 * enter(50ms) → visible(holdMs) → exit(500ms) → hidden
 */
export function useToastPhase(holdMs = 2000) {
  const [phase, setPhase] = useState<ToastPhase>('hidden')

  const trigger = useCallback(() => {
    setPhase('enter')
    const t1 = setTimeout(() => setPhase('visible'), 50)
    const t2 = setTimeout(() => setPhase('exit'), holdMs)
    const t3 = setTimeout(() => setPhase('hidden'), holdMs + 500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [holdMs])

  const style: CSSProperties = {
    opacity: phase === 'exit' ? 0 : 1,
    transform: phase === 'enter' ? 'scale(0.8) translateY(-10px)' : 'scale(1) translateY(0)',
    transition: 'opacity 0.4s ease, transform 0.3s ease',
  }

  return { phase, trigger, style } as const
}

/**
 * トーストの外側コンテナの共通 props
 * position: fixed, 画面上部, safe-area 対応
 */
export const toastContainerProps = {
  className: 'pointer-events-none fixed left-0 right-0 z-40 flex justify-center',
  role: 'status' as const,
  'aria-live': 'polite' as const,
  style: { top: 'calc(5rem + env(safe-area-inset-top, 0px))' },
}
