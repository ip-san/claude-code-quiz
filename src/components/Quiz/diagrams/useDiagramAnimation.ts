import { useEffect, useRef, useState } from 'react'

interface UseDiagramAnimationOptions {
  itemCount: number
  staggerMs?: number
  initialDelayMs?: number
}

export function useDiagramAnimation({
  itemCount,
  staggerMs = 120,
  initialDelayMs = 200,
}: UseDiagramAnimationOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motionQuery.matches) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const getItemDelay = (index: number): string =>
    `${initialDelayMs + index * staggerMs}ms`

  return { containerRef, isVisible, getItemDelay, itemCount }
}
