import { useCallback, useEffect, useRef, useState } from 'react'
import { type GrowthInsight, GrowthTrackingService } from '@/domain/services/GrowthTrackingService'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'
import {
  type AnalysisResult,
  computeRecommendations,
  detectWorkPatterns,
  type RecommendedQuestion,
} from './recommendUtils'

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
  const [growthInsight, setGrowthInsight] = useState<GrowthInsight | null>(null)

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

    // Growth tracking: compare with previous analysis and save snapshot
    // Growth tracking with quiz correlation
    const prompts = cachedAnalysis.promptSamples ?? []
    const patterns = detectWorkPatterns(prompts)

    // Calculate recommended accuracy for learning impact analysis
    const store = useQuizStore.getState()
    const progress = store.userProgress
    const recAccuracy: Record<string, { correct: number; total: number }> = {}
    for (const id of cachedAnalysis.recommendedIds ?? []) {
      const qp = progress.questionProgress[id]
      if (qp && qp.attempts > 0) {
        const q = allQuestions.find((q) => q.id === id)
        const cat = q?.category ?? 'unknown'
        if (!recAccuracy[cat]) recAccuracy[cat] = { correct: 0, total: 0 }
        recAccuracy[cat].total += qp.attempts
        recAccuracy[cat].correct += qp.correctCount
      }
    }

    const insight = GrowthTrackingService.compareWithPrevious(patterns, prompts, recAccuracy)
    setGrowthInsight(insight)
    GrowthTrackingService.saveSnapshot(patterns, prompts)

    return true
  }, [allQuestions])

  // ── Initial analysis ───────────────────────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: recommendations used for export snapshot at analyze-time, not reactive
  const analyze = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setAiError(null)
    haptics.light()

    // Export learner profile before running skill so AI can read it
    try {
      const store = useQuizStore.getState()
      const progress = store.userProgress

      // Calculate accuracy for previously recommended questions only
      const prevRecommendedIds = recommendations.map((r) => r.id)
      const recommendedAccuracy: Record<string, { correct: number; total: number }> = {}
      for (const id of prevRecommendedIds) {
        const qp = progress.questionProgress[id]
        if (qp && qp.attempts > 0) {
          const q = store.allQuestions.find((q) => q.id === id)
          const cat = q?.category ?? 'unknown'
          if (!recommendedAccuracy[cat]) recommendedAccuracy[cat] = { correct: 0, total: 0 }
          recommendedAccuracy[cat].total += qp.attempts
          recommendedAccuracy[cat].correct += qp.correctCount
        }
      }

      await window.electronAPI.exportLearnerProfile?.({
        patternHistory: GrowthTrackingService.loadHistory(),
        categoryProgress: Object.fromEntries(
          Object.entries(progress.categoryProgress).map(([k, v]) => [
            k,
            { accuracy: v.accuracy, attemptedQuestions: v.attemptedQuestions },
          ])
        ),
        recommendedAccuracy,
        totalAttempts: progress.totalAttempts,
        totalXp: progress.totalXp,
        streakDays: progress.streakDays,
      })
    } catch {
      // Non-critical
    }

    try {
      await window.electronAPI.runRecommendSkill()
    } catch {
      // Collect might fail — continue with cache
    }

    if (await loadFromCache()) {
      haptics.medium()
      setLoading(false)

      // Opus triggers (background, non-blocking)
      triggerOpusIfNeeded().catch(() => {
        /* non-critical background task */
      })
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

  // ── Opus triggers (background, non-blocking) ──────────────

  const triggerOpusIfNeeded = useCallback(async () => {
    if (!window.electronAPI?.runOpusAnalysis) return

    const store = useQuizStore.getState()
    const progress = store.userProgress
    const history = GrowthTrackingService.loadHistory()

    // Trigger 1: Initial profiling — enough quiz data but no pattern history yet
    if (progress.totalAttempts >= 10 && history.length <= 1) {
      const context = JSON.stringify({
        categoryProgress: progress.categoryProgress,
        totalAttempts: progress.totalAttempts,
        totalXp: progress.totalXp,
      })
      window.electronAPI.runOpusAnalysis('initial', context).catch(() => {
        /* non-critical */
      })
      return
    }

    // Trigger 2: Stagnation — same pattern in 3+ consecutive snapshots
    if (history.length >= 3) {
      const recent3 = history.slice(-3)
      const commonPatterns = (recent3[0].patterns || []).filter(
        (p) => (recent3[1].patterns || []).includes(p) && (recent3[2].patterns || []).includes(p)
      )
      if (commonPatterns.length > 0) {
        const context = JSON.stringify({
          stagnantPatterns: commonPatterns,
          recentHistory: recent3,
          categoryProgress: progress.categoryProgress,
        })
        window.electronAPI.runOpusAnalysis('stagnation', context).catch(() => {
          /* non-critical */
        })
      }
    }
  }, [])

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
    growthInsight,
    // Actions
    analyze,
    shuffle,
    setupHooks,
    dismissSetup,
    dismissRegenerated,
    clearAnalysis,
  }
}
