import { useCallback, useEffect, useRef, useState } from 'react'
import { locale } from '@/config/locale'
import { theme } from '@/config/theme'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import { type GrowthInsight, GrowthTrackingService } from '@/domain/services/GrowthTrackingService'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'
import {
  type AnalysisResult,
  computeRecommendations,
  detectWorkPatterns,
  type RecommendedQuestion,
} from './recommendUtils'

/** Send OS notification when recommend generation completes */
function notifyRecommendComplete(): void {
  window.electronAPI?.showNotification(locale.recommend.notifyTitle, locale.recommend.notifyBody)
}

/** Calculate category-level accuracy for a set of question IDs */
function computeRecommendedAccuracy(
  ids: string[],
  progress: UserProgress,
  allQuestions: Question[]
): Record<string, { correct: number; total: number }> {
  const result: Record<string, { correct: number; total: number }> = {}
  for (const id of ids) {
    const qp = progress.questionProgress[id]
    if (qp && qp.attempts > 0) {
      const q = allQuestions.find((q) => q.id === id)
      const cat = q?.category ?? 'unknown'
      if (!result[cat]) result[cat] = { correct: 0, total: 0 }
      result[cat].total += qp.attempts
      result[cat].correct += qp.correctCount
    }
  }
  return result
}

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'analyze' | 'shuffle' | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [hooksInstalled, setHooksInstalled] = useState<boolean | null>(null)
  const [setupDone, setSetupDone] = useState(false)
  const [growthInsight, setGrowthInsight] = useState<GrowthInsight | null>(null)
  const [coachingMessage, setCoachingMessage] = useState<string | null>(null)
  const [workPatterns, setWorkPatterns] = useState<ReturnType<typeof detectWorkPatterns>>([])
  const [classifiedData, setClassifiedData] =
    useState<Awaited<ReturnType<NonNullable<typeof window.electronAPI>['getClassifiedPrompts']>>>(null)
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

    const aiReasons = 'reasons' in cached ? (cached.reasons as Record<string, string> | undefined) : undefined
    if (aiReasons && Object.keys(aiReasons).length > 0) {
      const progress = useQuizStore.getState().userProgress
      const recs: RecommendedQuestion[] = cached.ids
        .map((id) => {
          const q = allQuestions.find((q) => q.id === id)
          if (!q) return null
          return {
            id,
            question: q.question,
            category: q.category,
            reason: aiReasons[id] ?? '',
            signals: [locale.recommendUtils.aiSelected],
          }
        })
        .filter(Boolean) as RecommendedQuestion[]
      // Deprioritize already-correct questions even in AI-selected recommendations
      recs.sort((a, b) => {
        const aCorrect = progress.isCorrectlyAnswered(a.id) ? 1 : 0
        const bCorrect = progress.isCorrectlyAnswered(b.id) ? 1 : 0
        return aCorrect - bCorrect
      })
      setRecommendations(recs)
      setUnusedCategories([])
      setAnalysis(cachedAnalysis)
    } else {
      // Fallback: compute recommendations locally when AI reasons are not available
      const progress = useQuizStore.getState().userProgress
      const { recs, unused } = computeRecommendations({ ...cachedAnalysis }, allQuestions, undefined, progress)
      setRecommendations(recs)
      setUnusedCategories(unused)
      setAnalysis(cachedAnalysis)
    }

    // Growth tracking: compare with previous analysis and save snapshot
    // Growth tracking with quiz correlation — use Haiku classification if available
    const prompts = cachedAnalysis.promptSamples ?? []
    const classified = await window.electronAPI?.getClassifiedPrompts?.()
    setClassifiedData(classified ?? null)
    const patterns = detectWorkPatterns(prompts, classified)
    setWorkPatterns(patterns)

    const insight = GrowthTrackingService.compareWithPrevious(patterns, prompts)
    setGrowthInsight(insight)
    GrowthTrackingService.saveSnapshot(patterns, prompts)

    // Coaching message from Sonnet (via /recommend skill output)
    const aiCoachingMessage =
      'coachingMessage' in cached ? (cached as { coachingMessage?: string }).coachingMessage : null
    setCoachingMessage(aiCoachingMessage ?? null)

    return true
  }, [allQuestions])

  // ── Initial analysis ───────────────────────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: recommendations used for export snapshot at analyze-time, not reactive
  const analyze = useCallback(async () => {
    if (!window.electronAPI) return

    // If cached results exist, show confirm dialog
    if (analysis) {
      setPendingAction('analyze')
      setShowConfirmDialog(true)
      return
    }

    setLoading(true)
    setAiError(null)
    haptics.light()
    startTimer()

    // Clear cached results so fresh analysis runs
    try {
      await window.electronAPI.clearRecommendCache?.()
    } catch {
      // Non-critical
    }

    // Export learner profile before running skill so AI can read it
    try {
      const store = useQuizStore.getState()
      const progress = store.userProgress

      // Calculate accuracy for previously recommended questions only
      const recommendedAccuracy = computeRecommendedAccuracy(
        recommendations.map((r) => r.id),
        progress,
        store.allQuestions
      )

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

    stopTimer()
    if (await loadFromCache()) {
      haptics.medium()
      notifyRecommendComplete()
      setLoading(false)

      // Opus triggers (background, non-blocking)
      triggerOpusIfNeeded().catch(() => {
        /* non-critical background task */
      })
      return
    }

    setAiError(locale.recommend.emptyDesc)
    setLoading(false)
  }, [loadFromCache, startTimer, stopTimer])

  // ── Shuffle + background regeneration ──────────────────────

  const shuffle = useCallback(() => {
    if (!analysis) return
    setPendingAction('shuffle')
    setShowConfirmDialog(true)
  }, [analysis])

  const executeReanalyze = useCallback(() => {
    setShowConfirmDialog(false)
    setPendingAction(null)
    haptics.light()

    // Clear current display and show loading state
    setAnalysis(null)
    setRecommendations([])
    setLoading(true)
    setRegenerated(false)
    setRegenerating(false)
    startTimer()
    window.electronAPI?.clearRecommendCache?.()
    window.electronAPI
      ?.runRecommendSkill?.()
      .then(async (result) => {
        stopTimer()
        setRegenerating(false)
        setLoading(false)
        if (result?.success && (await loadFromCache())) {
          setRegenerated(true)
          haptics.medium()
          notifyRecommendComplete()
        } else {
          setAiError(locale.recommend.analyzingProgress)
        }
      })
      .catch(() => {
        stopTimer()
        setRegenerating(false)
        setLoading(false)
      })
  }, [loadFromCache, startTimer, stopTimer])

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
        return
      }
    }

    // Trigger 3: Breakthrough — significant improvement detected
    if (history.length >= 2) {
      const prev = history[history.length - 2]
      const current = history[history.length - 1]
      const resolvedPatterns = (prev.patterns || []).filter((p) => !current?.patternCounts?.[p])
      if (resolvedPatterns.length >= 2) {
        const context = JSON.stringify({
          resolvedPatterns,
          previousSnapshot: prev,
          categoryProgress: progress.categoryProgress,
          totalXp: progress.totalXp,
        })
        window.electronAPI.runOpusAnalysis('breakthrough', context).catch(() => {
          /* non-critical */
        })
        return
      }
    }

    // Trigger 4: Category mastery — a category just reached 90%+ accuracy
    const MASTERY_THRESHOLD = 90
    const masteryKey = `${theme.storagePrefix}-opus-mastery-notified`
    const notifiedCats: string[] = JSON.parse(localStorage.getItem(masteryKey) ?? '[]')
    for (const [cat, cp] of Object.entries(progress.categoryProgress)) {
      if (cp.accuracy >= MASTERY_THRESHOLD && cp.attemptedQuestions >= 5 && !notifiedCats.includes(cat)) {
        const context = JSON.stringify({
          masteredCategory: cat,
          accuracy: cp.accuracy,
          attemptedQuestions: cp.attemptedQuestions,
          categoryProgress: progress.categoryProgress,
        })
        window.electronAPI.runOpusAnalysis('mastery', context).catch(() => {
          /* non-critical */
        })
        localStorage.setItem(masteryKey, JSON.stringify([...notifiedCats, cat]))
        return
      }
    }

    // Trigger 5: Monthly review — first analysis of each calendar month
    const monthlyKey = `${theme.storagePrefix}-opus-monthly`
    const lastMonthly = localStorage.getItem(monthlyKey)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    if (lastMonthly !== currentMonth && history.length >= 2) {
      const context = JSON.stringify({
        patternHistory: history,
        categoryProgress: progress.categoryProgress,
        totalAttempts: progress.totalAttempts,
        totalXp: progress.totalXp,
        streakDays: progress.streakDays,
      })
      window.electronAPI.runOpusAnalysis('monthly', context).catch(() => {
        /* non-critical */
      })
      localStorage.setItem(monthlyKey, currentMonth)
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

  const confirmReanalyze = useCallback(() => {
    setShowConfirmDialog(false)
    if (pendingAction === 'analyze') {
      // Re-call analyze with force flag (skip confirm check)
      setAnalysis(null)
      setRecommendations([])
      setLoading(true)
      setAiError(null)
      haptics.light()
      window.electronAPI?.clearRecommendCache?.().catch(() => {
        // Non-critical — cache may not exist
      })
      window.electronAPI
        ?.runRecommendSkill?.()
        .then(async (result) => {
          setLoading(false)
          if (result?.success && (await loadFromCache())) {
            haptics.medium()
            notifyRecommendComplete()
          }
        })
        .catch(() => setLoading(false))
    } else {
      executeReanalyze()
    }
    setPendingAction(null)
  }, [pendingAction, loadFromCache, executeReanalyze])

  const cancelConfirmDialog = useCallback(() => {
    setShowConfirmDialog(false)
    setPendingAction(null)
  }, [])

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
    coachingMessage,
    workPatterns,
    classifiedData,
    showConfirmDialog,
    // Actions
    analyze,
    shuffle,
    setupHooks,
    dismissSetup,
    dismissRegenerated,
    clearAnalysis,
    confirmReanalyze,
    cancelConfirmDialog,
  }
}
