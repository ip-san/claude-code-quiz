import { useCallback, useEffect, useRef, useState } from 'react'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'
import { type AnalysisResult, computeRecommendations, type RecommendedQuestion } from './recommendUtils'

/**
 * Custom hook for recommendation state and logic.
 * Separates stateful behavior from the UI component.
 */
export function useRecommendation() {
  const allQuestions = useQuizStore((s) => s.allQuestions)

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendedQuestion[]>([])
  const [unusedCategories, setUnusedCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [regenerated, setRegenerated] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [hooksInstalled, setHooksInstalled] = useState<boolean | null>(null)
  const [setupDone, setSetupDone] = useState(false)

  // Timer for regeneration progress
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  // ── Cache loading ──────────────────────────────────────────

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    const cached = await window.electronAPI?.getCachedRecommend?.()
    if (!cached || cached.ids.length === 0) return false

    const cachedAnalysis: AnalysisResult = {
      tools: {},
      topics: cached.topics,
      categoryScores: Object.fromEntries(cached.topCategories.map((c, i) => [c, 100 - i * 10])),
      recommendedIds: cached.ids,
      sessionCount: cached.sessionCount,
      promptSamples: cached.promptSamples ?? [],
    }

    const aiReasons = (cached as Record<string, unknown>).reasons as Record<string, string> | undefined
    if (aiReasons && Object.keys(aiReasons).length > 0) {
      const recs: RecommendedQuestion[] = cached.ids
        .map((id) => {
          const q = allQuestions.find((q) => q.id === id)
          if (!q) return null
          return { id, question: q.question, category: q.category, reason: aiReasons[id] ?? '', signals: ['AI が選定'] }
        })
        .filter(Boolean) as RecommendedQuestion[]
      setRecommendations(recs)
      setUnusedCategories([])
      setAnalysis(cachedAnalysis)
    } else {
      const { recs, unused } = computeRecommendations({ ...cachedAnalysis }, allQuestions)
      setRecommendations(recs)
      setUnusedCategories(unused)
      setAnalysis(cachedAnalysis)
    }
    return true
  }, [allQuestions])

  // ── Initial analysis ───────────────────────────────────────

  const analyze = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setAiError(null)
    haptics.light()

    try {
      await window.electronAPI.runRecommendSkill()
    } catch {
      // Collect might fail — continue with cache
    }

    if (await loadFromCache()) {
      haptics.medium()
      setLoading(false)
      return
    }

    setAiError('Claude Code の利用履歴がありません。いくつか作業をしてからお試しください')
    setLoading(false)
  }, [loadFromCache])

  // ── Shuffle + background regeneration ──────────────────────

  const shuffle = useCallback(() => {
    if (!analysis) return
    haptics.light()

    const shuffledSamples = [...analysis.promptSamples].sort(() => Math.random() - 0.5)
    const newAnalysis = { ...analysis, promptSamples: shuffledSamples }
    setAnalysis(newAnalysis)
    const prevIds = new Set(recommendations.map((r) => r.id))
    const { recs, unused } = computeRecommendations(newAnalysis, allQuestions, prevIds)
    setRecommendations(recs)
    setUnusedCategories(unused)

    // Background AI regeneration
    setRegenerated(false)
    setRegenerating(true)
    startTimer()
    window.electronAPI?.clearRecommendCache?.()
    window.electronAPI
      ?.runRecommendSkill?.()
      .then(async (result) => {
        stopTimer()
        setRegenerating(false)
        if (result?.success) {
          await loadFromCache()
          setRegenerated(true)
          haptics.medium()
        }
      })
      .catch(() => {
        stopTimer()
        setRegenerating(false)
      })
  }, [analysis, allQuestions, recommendations, loadFromCache, startTimer, stopTimer])

  // ── Setup hooks check ──────────────────────────────────────

  const setupHooks = useCallback(async () => {
    const result = await window.electronAPI?.setupGlobalHooks(false)
    if (result?.success) {
      setSetupDone(true)
      haptics.medium()
    }
  }, [])

  const dismissSetup = useCallback(() => setHooksInstalled(true), [])
  const dismissRegenerated = useCallback(() => setRegenerated(false), [])
  const clearAnalysis = useCallback(() => setAnalysis(null), [])

  // ── Mount effects ──────────────────────────────────────────

  useEffect(() => {
    loadFromCache()
  }, [loadFromCache])

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check after setup
  useEffect(() => {
    if (!window.electronAPI?.checkGlobalHooks) return
    window.electronAPI.checkGlobalHooks().then(setHooksInstalled)
  }, [setupDone])

  return {
    // State
    analysis,
    recommendations,
    unusedCategories,
    loading,
    aiError,
    regenerated,
    regenerating,
    elapsed,
    hooksInstalled,
    setupDone,
    allQuestions,
    // Actions
    analyze,
    shuffle,
    setupHooks,
    dismissSetup,
    dismissRegenerated,
    clearAnalysis,
  }
}
