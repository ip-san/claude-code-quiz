import { useRef, useCallback } from 'react'

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Minimum horizontal distance to trigger swipe (px) */
  threshold?: number
  /** If true, swipe is disabled */
  disabled?: boolean
}

/**
 * Lightweight swipe gesture hook for touch devices.
 * Distinguishes horizontal swipe from vertical scroll by angle.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  disabled = false,
}: UseSwipeOptions) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return
      const touch = e.touches[0]
      touchStart.current = { x: touch.clientX, y: touch.clientY }
    },
    [disabled]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !touchStart.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStart.current.x
      const dy = touch.clientY - touchStart.current.y

      // Only trigger if horizontal movement is dominant (angle < 30deg from horizontal)
      if (Math.abs(dx) > threshold && Math.abs(dy) < Math.abs(dx) * 0.6) {
        if (dx < 0 && onSwipeLeft) {
          onSwipeLeft()
        } else if (dx > 0 && onSwipeRight) {
          onSwipeRight()
        }
      }

      touchStart.current = null
    },
    [disabled, threshold, onSwipeLeft, onSwipeRight]
  )

  return { onTouchStart, onTouchEnd }
}
