import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getOverviewRecommendation } from '@/domain/services/RecommendationService'
import { getScoreMessage } from '@/domain/services/ScoreMessageService'
import { calculateAccuracy } from '@/domain/valueObjects/ScoreThresholds'
import { APP_CONFIG, useQuizStore } from '@/stores/quizStore'

// Star visualization constants
export const STAR_COUNT = 5
export const STAR_PERCENTAGE_DIVISOR = 20

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface UseQuizResultReturn {
  // Animation state
  displayPercent: number
  showStars: boolean
  showContent: boolean
  noMotion: boolean

  // Derived values
  percentage: number
  isPassing: boolean
  filledStars: number
  recommendation: ReturnType<typeof getOverviewRecommendation>
  result: ReturnType<typeof getScoreMessage>
  isFirstSession: boolean

  // Store state
  sessionState: ReturnType<typeof useQuizStore.getState>['sessionState']
  sessionConfig: ReturnType<typeof useQuizStore.getState>['sessionConfig']
  sessionWrongAnswers: ReturnType<typeof useQuizStore.getState>['sessionWrongAnswers']
  userProgress: ReturnType<typeof useQuizStore.getState>['userProgress']
  categoryStats: ReturnType<ReturnType<typeof useQuizStore.getState>['getCategoryStats']>
  score: number
  answeredCount: number
  totalQuestions: number
  hasUnanswered: boolean
  hintsUsedCount: number
  isReviewMode: boolean
  hasWrongAnswers: boolean
  isOverviewMode: boolean

  // Handlers
  handleRetry: () => void
  handleBackToMenu: () => void
  handleStartCategorySession: (categoryId: string) => void
  handleStartFullTest: () => void
  startReviewSession: () => void
  startSession: ReturnType<typeof useQuizStore.getState>['startSession']
}

export function useQuizResult(): UseQuizResultReturn {
  const {
    sessionState,
    endSession,
    startSession,
    retrySession,
    startReviewSession,
    sessionConfig,
    sessionWrongAnswers,
    userProgress,
    getCategoryStats,
  } = useQuizStore(
    useShallow((state) => ({
      sessionState: state.sessionState,
      endSession: state.endSession,
      startSession: state.startSession,
      retrySession: state.retrySession,
      startReviewSession: state.startReviewSession,
      sessionConfig: state.sessionConfig,
      sessionWrongAnswers: state.sessionWrongAnswers,
      userProgress: state.userProgress,
      getCategoryStats: state.getCategoryStats,
    }))
  )

  const categoryStats = useMemo(() => getCategoryStats(), [getCategoryStats])

  const score = sessionState?.score ?? 0
  const answeredCount = sessionState?.answeredCount ?? 0
  const totalQuestions = sessionState?.questions.length ?? 0
  const hasUnanswered = answeredCount < totalQuestions
  const hintsUsedCount = sessionState?.hintsUsedCount ?? 0
  const isReviewMode = sessionState?.isReviewMode ?? false
  const hasWrongAnswers = sessionWrongAnswers.length > 0
  const isOverviewMode = sessionConfig.mode === 'overview'
  const isFirstSession = userProgress.sessionHistory.length <= 1

  // Prevent NaN when no questions answered (edge case: timer expired immediately)
  const percentage = calculateAccuracy(score, answeredCount)
  const isPassing = percentage >= APP_CONFIG.passingScore

  const noMotion = prefersReducedMotion

  // Animated count-up state
  const [displayPercent, setDisplayPercent] = useState(0)
  const [showStars, setShowStars] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Count-up animation
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when noMotion preference changes
  useEffect(() => {
    if (noMotion) {
      setDisplayPercent(percentage)
      setShowStars(true)
      setShowContent(true)
      return
    }

    // Animate percentage counter (score ring handles its own animation)
    const duration = 800
    const steps = 25
    const interval = duration / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayPercent(Math.round(percentage * eased))

      if (step >= steps) {
        clearInterval(timer)
        setDisplayPercent(percentage)
        setTimeout(() => setShowStars(true), 100)
        setTimeout(() => setShowContent(true), 400)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [percentage, noMotion])

  // Recommendation for overview mode: find weakest category from wrong answers
  const recommendation = useMemo(() => {
    if (!isOverviewMode || isReviewMode) return null
    return getOverviewRecommendation(sessionWrongAnswers, sessionState?.questions ?? [])
  }, [isOverviewMode, isReviewMode, sessionWrongAnswers, sessionState?.questions])

  const result = getScoreMessage(percentage)

  const filledStars = Math.ceil(percentage / STAR_PERCENTAGE_DIVISOR)

  const handleRetry = () => {
    retrySession()
  }

  const handleBackToMenu = () => {
    endSession()
  }

  const handleStartCategorySession = (categoryId: string) => {
    startSession({
      mode: 'category',
      categoryFilter: categoryId,
      questionCount: null,
      timeLimit: null,
      shuffleQuestions: true,
      shuffleOptions: false,
    })
  }

  const handleStartFullTest = () => {
    startSession({ mode: 'full' })
  }

  return {
    // Animation state
    displayPercent,
    showStars,
    showContent,
    noMotion,

    // Derived values
    percentage,
    isPassing,
    filledStars,
    recommendation,
    result,
    isFirstSession,

    // Store state
    sessionState,
    sessionConfig,
    sessionWrongAnswers,
    userProgress,
    categoryStats,
    score,
    answeredCount,
    totalQuestions,
    hasUnanswered,
    hintsUsedCount,
    isReviewMode,
    hasWrongAnswers,
    isOverviewMode,

    // Handlers
    handleRetry,
    handleBackToMenu,
    handleStartCategorySession,
    handleStartFullTest,
    startReviewSession,
    startSession,
  }
}
