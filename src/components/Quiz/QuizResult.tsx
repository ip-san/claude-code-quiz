import { useMemo, useState, useEffect } from 'react'
import { useQuizStore, APP_CONFIG } from '@/stores/quizStore'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { RotateCcw, Star, Home, BookOpen, Lightbulb, ArrowRight, Target, Share2 } from 'lucide-react'
import { ScoreRing } from './ScoreRing'
import { ConfettiEffect } from './ConfettiEffect'
import { StreakMilestoneBadge, DailyGoalBadge } from './StreakMilestoneBadge'
import { DailyGoalService } from '@/domain/services/DailyGoalService'

// Score thresholds for result messages
const SCORE_THRESHOLDS = {
  PERFECT: 100,
  EXCELLENT: 80,
  PASSING: 70,
  ALMOST: 50,
} as const

// Star visualization constants
const STAR_COUNT = 5
const STAR_PERCENTAGE_DIVISOR = 20

export function QuizResult() {
  const { sessionState, endSession, startSession, retrySession, startReviewSession, sessionConfig, sessionWrongAnswers, userProgress } = useQuizStore()

  const score = sessionState?.score ?? 0
  const answeredCount = sessionState?.answeredCount ?? 0
  const hintsUsedCount = sessionState?.hintsUsedCount ?? 0
  const isReviewMode = sessionState?.isReviewMode ?? false
  const hasWrongAnswers = sessionWrongAnswers.length > 0
  const isOverviewMode = sessionConfig.mode === 'overview'

  // Animated count-up
  const [displayPercent, setDisplayPercent] = useState(0)
  const [showStars, setShowStars] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Prevent NaN when no questions answered (edge case: timer expired immediately)
  const percentage = answeredCount > 0
    ? Math.round((score / answeredCount) * 100)
    : 0
  const isPassing = percentage >= APP_CONFIG.passingScore

  const noMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  // Count-up animation
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
  }, [score, percentage, noMotion])

  // Recommendation for overview mode: find weakest category from wrong answers
  const recommendation = useMemo(() => {
    if (!isOverviewMode || isReviewMode) return null

    if (!hasWrongAnswers) {
      return { type: 'perfect' as const }
    }

    // Count wrong answers per category
    const categoryCounts: Record<string, number> = {}
    for (const wrong of sessionWrongAnswers) {
      const question = sessionState?.questions.find(q => q.id === wrong.questionId)
      if (question) {
        categoryCounts[question.category] = (categoryCounts[question.category] ?? 0) + 1
      }
    }

    // Find the category with most wrong answers
    let weakestCategory = ''
    let maxWrong = 0
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxWrong) {
        maxWrong = count
        weakestCategory = cat
      }
    }

    if (!weakestCategory) return null

    const category = getCategoryById(weakestCategory)
    if (!category) return null

    return {
      type: 'category' as const,
      categoryId: weakestCategory,
      categoryName: category.name,
      categoryIcon: category.icon,
      wrongCount: maxWrong,
    }
  }, [isOverviewMode, isReviewMode, hasWrongAnswers, sessionWrongAnswers, sessionState?.questions])

  const getMessage = () => {
    if (percentage === SCORE_THRESHOLDS.PERFECT) {
      return {
        title: 'パーフェクト！',
        message: '全問正解です。素晴らしい理解度です！',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.EXCELLENT) {
      return {
        title: '合格！優秀です',
        message: '高い正答率です。あと少しで完璧！',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.PASSING) {
      return {
        title: '合格！',
        message: '合格ラインをクリアしました。復習で更に伸ばしましょう。',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.ALMOST) {
      return {
        title: 'もう少し！',
        message: '合格まであと少しです。苦手な分野を復習しましょう。',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      }
    }
    return {
      title: '頑張りましょう！',
      message: '間違えた問題を見直して、再チャレンジしてみてください。',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    }
  }

  const result = getMessage()

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

  const filledStars = Math.ceil(percentage / STAR_PERCENTAGE_DIVISOR)

  return (
    <div className="min-h-screen overflow-y-auto px-4 py-8 sm:flex sm:items-center sm:justify-center">
      <div
        className={`mx-auto w-full rounded-2xl border sm:max-w-md ${result.borderColor} ${result.bgColor} p-5 text-center shadow-lg sm:p-8 ${
          noMotion ? '' : 'animate-result-enter'
        }`}
      >
        {/* Confetti on perfect/excellent score */}
        {percentage >= 80 && !noMotion && <ConfettiEffect />}

        {/* Score Ring */}
        <div className={`mb-4 ${noMotion ? '' : 'animate-bounce-in'}`}>
          <ScoreRing
            percentage={percentage}
            score={score}
            total={answeredCount}
            color={result.color}
            noMotion={noMotion}
          />
        </div>

        {/* Title */}
        <h2 className={`mb-1 text-xl font-bold sm:text-2xl ${result.color}`}>
          {result.title}
        </h2>

        {/* Percentage badge */}
        <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 shadow-sm">
          <span className={`text-lg font-bold ${result.color}`}>
            {displayPercent}%
          </span>
        </div>

        {/* Pass/Fail indicator */}
        {/* Message + pass/fail */}
        <p className="mb-2 text-sm text-stone-500">{result.message}</p>
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
              isPassing
                ? 'bg-green-500/10 text-green-600'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {isPassing ? '✓' : '✗'}
            {isPassing ? '合格' : '不合格'}
            <span className="text-xs font-normal opacity-60">
              {APP_CONFIG.passingScore}%以上
            </span>
          </span>
        </div>

        {/* Hints used indicator */}
        {hintsUsedCount > 0 && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700">
            <Lightbulb className="h-4 w-4" />
            ヒント使用: {hintsUsedCount}回
          </div>
        )}

        {/* Review mode indicator */}
        {isReviewMode && (
          <p className="mb-4 text-sm text-stone-400">復習モードのため、スコアには反映されません</p>
        )}

        {/* Stars visualization - staggered pop-in */}
        <div className="mb-6 flex justify-center gap-1" role="img" aria-label={`${filledStars}つ星の評価`}>
          {[...Array(STAR_COUNT)].map((_, i) => (
            <Star
              key={i}
              className={`h-8 w-8 ${
                showStars && i < filledStars
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-stone-300'
              } ${showStars && !noMotion && i < filledStars ? 'animate-star-pop' : ''}`}
              style={showStars && !noMotion && i < filledStars ? { animationDelay: `${i * 100}ms` } : undefined}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Achievement badges */}
        {showStars && !isReviewMode && (
          <div className="mb-4 flex flex-col gap-2">
            <StreakMilestoneBadge
              currentStreak={userProgress.streakDays}
              previousStreak={sessionState?.initialStreakDays ?? 0}
            />
            <DailyGoalBadge
              previousTodayCount={Math.max(0, userProgress.getDailyCount(DailyGoalService.getTodayString()) - answeredCount)}
              currentTodayCount={userProgress.getDailyCount(DailyGoalService.getTodayString())}
              dailyGoal={userProgress.dailyGoal}
            />
          </div>
        )}

        {/* Content below stars fades in after stars */}
        <div className={noMotion || showContent ? 'opacity-100' : 'opacity-0'} style={{ transition: noMotion ? 'none' : 'opacity 0.3s ease-out' }}>
          {/* Recommendation for overview mode */}
          {recommendation && (
            <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left">
              <p className="mb-2 text-xs font-semibold text-indigo-500">次のおすすめ</p>
              {recommendation.type === 'perfect' ? (
                <>
                  <p className="mb-3 text-sm text-stone-600">
                    全体像を把握できました！実力テストで総合力を試してみましょう。
                  </p>
                  <button
                    onClick={handleStartFullTest}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                  >
                    <Target className="h-4 w-4" />
                    実力テストに挑戦
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-stone-600">
                    <span className="font-medium">{recommendation.categoryIcon} {recommendation.categoryName}</span>
                    で{recommendation.wrongCount}問間違えました。カテゴリ別学習で深掘りしてみましょう。
                  </p>
                  <button
                    onClick={() => handleStartCategorySession(recommendation.categoryId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                  >
                    {recommendation.categoryIcon} {recommendation.categoryName}を深掘り
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {hasWrongAnswers && !isReviewMode && (
              <button
                onClick={startReviewSession}
                className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-white"
              >
                <BookOpen className="h-5 w-5" />
                間違えた問題を復習（{sessionWrongAnswers.length}問）
              </button>
            )}
            <button
              onClick={handleRetry}
              className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-claude-orange px-6 py-3.5 text-base font-semibold text-white"
            >
              <RotateCcw className="h-5 w-5" />
              もう一度挑戦する
            </button>
            {'share' in navigator && (
              <button
                onClick={() => {
                  navigator.share({
                    title: 'Claude Code Quiz',
                    text: `Claude Code Quiz: ${score}/${answeredCount}問正解 (${percentage}%)`,
                    url: window.location.href,
                  }).catch(() => {})
                }}
                className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-6 py-3.5 text-base font-semibold text-stone-600"
              >
                <Share2 className="h-5 w-5" />
                結果をシェア
              </button>
            )}
            <button
              onClick={handleBackToMenu}
              className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-6 py-3.5 text-base font-semibold text-stone-600"
            >
              <Home className="h-5 w-5" />
              メニューに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
