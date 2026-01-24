import { useEffect, useRef, useCallback } from 'react'
import { useQuizStore } from '@/stores/quizStore'

// Time thresholds (in seconds) - extracted as constants for maintainability
const LOW_TIME_THRESHOLD = 300 // 5 minutes warning
const CRITICAL_TIME_THRESHOLD = 60 // 1 minute critical

/**
 * Timer component for timed quiz modes
 * Displays remaining time and triggers auto-completion when time is up
 */
export function Timer() {
  const timeRemaining = useQuizStore((state) => state.timeRemaining)
  const updateTimer = useQuizStore((state) => state.updateTimer)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Stable callback for timer update
  const tick = useCallback(() => {
    updateTimer()
  }, [updateTimer])

  // Set up interval only once when timer starts
  useEffect(() => {
    // Don't run if no time limit or already finished
    if (timeRemaining === null || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Only create interval if one doesn't exist
    if (!intervalRef.current) {
      intervalRef.current = setInterval(tick, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timeRemaining === null || timeRemaining <= 0, tick])

  if (timeRemaining === null) return null

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  const isLowTime = timeRemaining <= LOW_TIME_THRESHOLD
  const isCriticalTime = timeRemaining <= CRITICAL_TIME_THRESHOLD

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-bold ${
        isCriticalTime
          ? 'animate-pulse bg-red-500/20 text-red-400'
          : isLowTime
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-slate-700/50 text-white'
      }`}
      role="timer"
      aria-live="polite"
      aria-label={`残り時間 ${minutes}分${seconds}秒`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}
