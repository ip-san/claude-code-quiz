import { ArrowRight, BookOpen, ChevronDown, Home, RotateCcw, Share2, Star, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { locale } from '@/config/locale'
import { theme } from '@/config/theme'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { getMasteryLevel } from '@/domain/services/MasteryLevelService'
import { getOverviewRecommendation } from '@/domain/services/RecommendationService'
import { getScoreMessage } from '@/domain/services/ScoreMessageService'
import { getChapterFromTags } from '@/domain/valueObjects/OverviewChapter'
import { CERTIFICATE_THRESHOLDS } from '@/domain/valueObjects/ScoreThresholds'
import { trackShare } from '@/lib/analytics'
import { APP_CONFIG, useQuizStore } from '@/stores/quizStore'
import { CategoryBreakthroughBadge } from './overlays/CategoryBreakthroughBadge'
import { ConfettiEffect } from './overlays/ConfettiEffect'
import { LevelUpBadge } from './overlays/LevelUpBadge'
import { DailyGoalBadge, StreakMilestoneBadge } from './overlays/StreakMilestoneBadge'
import { CertificateGenerator } from './result/CertificateGenerator'
import { NextRecommendation } from './result/NextRecommendation'
import { PersonalBest } from './result/PersonalBest'
import { ScoreRing } from './result/ScoreRing'
import { ShareImageGenerator } from './result/ShareImageGenerator'
import { SkillsAcquired } from './result/SkillsAcquired'
import { TeamShareGuide } from './result/TeamShareGuide'

// Star visualization constants
const STAR_COUNT = 5
const STAR_PERCENTAGE_DIVISOR = 20
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function QuizResult() {
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
  } = useQuizStore()

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

  // Animated count-up
  const [displayPercent, setDisplayPercent] = useState(0)
  const [showStars, setShowStars] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Prevent NaN when no questions answered (edge case: timer expired immediately)
  const percentage = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0
  const isPassing = percentage >= APP_CONFIG.passingScore

  const noMotion = prefersReducedMotion

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
    <div className="min-h-dvh overflow-y-auto px-4 py-8 sm:flex sm:items-center sm:justify-center">
      <div
        className={`mx-auto w-full rounded-2xl border sm:max-w-md ${result.borderColor} ${result.bgColor} p-5 text-center shadow-lg sm:p-8 ${
          noMotion ? '' : 'animate-result-enter'
        }`}
      >
        {/* Confetti on perfect/excellent score */}
        {percentage >= CERTIFICATE_THRESHOLDS.full && !noMotion && <ConfettiEffect />}

        {/* First session completion — show BEFORE score to lead with encouragement */}
        {!isReviewMode && userProgress.sessionHistory.length <= 1 && (
          <div className="mb-4 rounded-2xl bg-linear-to-r from-claude-orange/10 to-blue-500/10 p-4 text-center">
            <p className="text-lg font-bold text-claude-dark">{`🎉 ${locale.result.firstCongrats}`}</p>
            <p className="mt-1 text-sm text-claude-gray">{locale.result.firstMessage}</p>
          </div>
        )}

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

        {/* Title + percentage + pass/fail — compact header */}
        <h2 className={`mb-1 text-xl font-bold sm:text-2xl ${result.color}`}>{result.title}</h2>
        <p className="mb-1 text-sm text-stone-500">{result.message}</p>
        <div className="mb-4 inline-flex flex-wrap items-center justify-center gap-2">
          <span className={`text-lg font-bold ${result.color}`}>{displayPercent}%</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isPassing ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
            }`}
          >
            {isPassing ? locale.result.passing : locale.result.notPassing}
          </span>
          {hintsUsedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">💡{hintsUsedCount}</span>
          )}
        </div>

        {/* Unanswered note (timer expired) */}
        {hasUnanswered && (
          <p className="mb-2 text-xs text-stone-500">
            {locale.result.answerProgress(answeredCount, totalQuestions, totalQuestions - answeredCount)}
          </p>
        )}

        {/* Personal best + review mode note */}
        <PersonalBest sessionHistory={userProgress.sessionHistory} currentPercentage={percentage} />
        {isReviewMode && <p className="mb-4 text-xs text-stone-500">{locale.result.reviewNote}</p>}

        {/* Category breakthrough badges */}
        {showStars && !isReviewMode && sessionState && (
          <CategoryBreakthroughBadge
            questions={sessionState.questions}
            answerHistory={sessionState.answerHistory}
            userProgress={userProgress}
          />
        )}

        {/* Stars visualization - staggered pop-in */}
        <div
          className="mb-6 flex justify-center gap-1"
          role="img"
          aria-label={`${filledStars}${locale.result.starRating}`}
        >
          {[...Array(STAR_COUNT)].map((_, i) => (
            <Star
              key={i}
              className={`h-8 w-8 ${
                showStars && i < filledStars ? 'fill-yellow-500 text-yellow-500' : 'text-stone-300'
              } ${showStars && !noMotion && i < filledStars ? 'animate-star-pop' : ''}`}
              style={showStars && !noMotion && i < filledStars ? { animationDelay: `${i * 100}ms` } : undefined}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Achievement badges */}
        {showStars && !isReviewMode && (
          <>
            <LevelUpBadge previousXp={sessionState?.initialXp ?? 0} currentXp={userProgress.totalXp} />
            <StreakMilestoneBadge
              currentStreak={userProgress.streakDays}
              previousStreak={sessionState?.initialStreakDays ?? 0}
            />
            <DailyGoalBadge
              previousTodayCount={sessionState?.initialTodayCount ?? 0}
              currentTodayCount={userProgress.getDailyCount(DailyGoalService.getTodayString())}
              dailyGoal={userProgress.dailyGoal}
            />
          </>
        )}

        {/* Content below stars fades in after stars */}
        <div
          className={noMotion || showContent ? 'opacity-100' : 'opacity-0'}
          style={{ transition: noMotion ? 'none' : 'opacity 0.3s ease-out' }}
        >
          {/* Recommendation for overview mode */}
          {recommendation && (
            <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left">
              <p className="mb-2 text-xs font-semibold text-indigo-500">{locale.result.nextRecommendation}</p>
              {recommendation.type === 'perfect' ? (
                <>
                  <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
                    {locale.result.overviewCompleteDesc}
                  </p>
                  <button
                    onClick={handleStartFullTest}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                  >
                    <Target className="h-4 w-4" />
                    {locale.nextRecommend.fullTest}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
                    {locale.result.categoryMistake(
                      recommendation.categoryIcon ?? '',
                      recommendation.categoryName ?? '',
                      recommendation.wrongCount ?? 0
                    )}
                  </p>
                  <button
                    onClick={() => recommendation.categoryId && handleStartCategorySession(recommendation.categoryId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                  >
                    {locale.result.deepDive(recommendation.categoryIcon ?? '', recommendation.categoryName ?? '')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Skills acquired — hidden on first session to keep it simple */}
          {!isReviewMode && !isFirstSession && sessionState && (
            <SkillsAcquired questions={sessionState.questions} answerHistory={sessionState.answerHistory} />
          )}

          {/* Certificate — hidden on first session */}
          {!isFirstSession && (
            <CertificateGenerator
              score={score}
              total={answeredCount}
              percentage={percentage}
              mode={sessionConfig.mode}
            />
          )}

          {/* Next recommendation — hidden on first session */}
          {!isReviewMode && !isFirstSession && <NextRecommendation mode={sessionConfig.mode} percentage={percentage} />}

          {/* Action buttons — primary CTAs first, share collapsed */}
          <div className="flex flex-col gap-3">
            {hasWrongAnswers && !isReviewMode && (
              <button
                onClick={startReviewSession}
                className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-white"
              >
                <BookOpen className="h-5 w-5" />
                {locale.result.reviewWrong(sessionWrongAnswers.length)}
              </button>
            )}
            <button
              onClick={handleRetry}
              className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-claude-orange px-6 py-3.5 text-base font-semibold text-white"
            >
              <RotateCcw className="h-5 w-5" />
              {locale.result.retryAgain}
            </button>
            {!isReviewMode && (
              <button
                onClick={() => startSession({ mode: 'quick' })}
                className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-green-500 px-6 py-3 text-sm font-semibold text-green-600 dark:border-green-400 dark:text-green-400"
              >
                {`⚡ ${locale.result.quickThree}`}
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleBackToMenu}
                className="tap-highlight inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 dark:border-stone-600 dark:text-stone-300"
              >
                <Home className="h-4 w-4" />
                {locale.common.menu}
              </button>
              <ShareSection
                score={score}
                answeredCount={answeredCount}
                percentage={percentage}
                isPassing={isPassing}
                userProgress={userProgress}
                categoryStats={categoryStats}
              />
            </div>
          </div>

          {/* Next step — connect learning to action (hidden on first session) */}
          {!isReviewMode &&
            !isFirstSession &&
            (() => {
              // For overview mode: show action item from the last completed chapter
              if (isOverviewMode && sessionState) {
                const lastQuestion = sessionState.questions[sessionState.questions.length - 1]
                const lastChapter = lastQuestion ? getChapterFromTags(lastQuestion.tags) : null
                const actionItem = lastChapter?.actionItem
                if (actionItem) {
                  return (
                    <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-4 text-left dark:border-green-500/30 dark:bg-green-500/10">
                      <p className="mb-1 text-xs font-semibold text-green-600 dark:text-green-400">
                        {locale.result.tomorrowAction}
                      </p>
                      <p className="mb-3 text-sm text-claude-dark">{actionItem}</p>
                      <p className="text-xs text-stone-500">{locale.result.tomorrowMessage}</p>
                    </div>
                  )
                }
              }

              // For other modes: general CTA
              return (
                <div className="mt-6 rounded-2xl border border-claude-orange/20 bg-claude-orange/5 p-4 text-center dark:border-claude-orange/30 dark:bg-claude-orange/10">
                  <p className="mb-1 text-xs font-semibold text-claude-orange">Next Step</p>
                  <p className="mb-3 text-sm text-claude-dark">{locale.result.learnedAction}</p>
                  <a
                    href={theme.officialDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap-highlight inline-flex items-center gap-1.5 rounded-xl bg-claude-orange/10 px-4 py-2 text-sm font-medium text-claude-orange dark:bg-claude-orange/20"
                  >
                    {theme.officialDocsLabel}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              )
            })()}

          {/* Team sharing guide — individual learning → team transformation */}
          {!isReviewMode && <TeamShareGuide percentage={percentage} mode={sessionConfig.mode} />}
        </div>
      </div>
    </div>
  )
}

/** シェア機能を折りたたみにまとめたセクション */
function ShareSection({
  score,
  answeredCount,
  percentage,
  isPassing,
  userProgress,
  categoryStats,
}: {
  score: number
  answeredCount: number
  percentage: number
  isPassing: boolean
  userProgress: { streakDays: number; totalXp: number; totalAttempts: number; getOverallAccuracy: () => number }
  categoryStats: Record<string, { accuracy: number; attemptedQuestions: number; totalQuestions: number }>
}) {
  const [open, setOpen] = useState(false)
  const mastery = getMasteryLevel(userProgress.getOverallAccuracy(), userProgress.totalAttempts, categoryStats)

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen(!open)}
        className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 dark:border-stone-600 dark:text-stone-300"
      >
        <Share2 className="h-4 w-4" />
        シェア
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {'share' in navigator && (
            <button
              onClick={() => {
                const stars = '⭐'.repeat(Math.ceil(percentage / 20))
                navigator
                  .share({
                    title: theme.appName,
                    text: `${stars}\n${theme.appName}: ${score}/${answeredCount}${locale.common.questionSuffix} (${percentage}%)\n${isPassing ? locale.result.passing : locale.result.notPassing}\n${mastery.icon} ${mastery.name} | ${userProgress.totalXp} XP\n${theme.shareHashtags}`,
                    url: window.location.href,
                  })
                  .then(() => trackShare('native'))
                  .catch(() => {
                    /* user cancelled share */
                  })
              }}
              className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300"
            >
              <Share2 className="h-4 w-4" />
              テキストでシェア
            </button>
          )}
          <ShareImageGenerator
            score={score}
            total={answeredCount}
            percentage={percentage}
            streakDays={userProgress.streakDays}
            totalXp={userProgress.totalXp}
            masteryName={mastery.name}
            masteryIcon={mastery.icon}
          />
        </div>
      )}
    </div>
  )
}
