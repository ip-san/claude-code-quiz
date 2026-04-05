import { ArrowRight, BookOpen, Home, RotateCcw, Share2, Star, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { theme } from '@/config/theme'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { getOverviewRecommendation } from '@/domain/services/RecommendationService'
import { getScoreMessage } from '@/domain/services/ScoreMessageService'
import { getChapterFromTags } from '@/domain/valueObjects/OverviewChapter'
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
  } = useQuizStore()

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
        {percentage >= 80 && !noMotion && <ConfettiEffect />}

        {/* First session completion — show BEFORE score to lead with encouragement */}
        {!isReviewMode && userProgress.sessionHistory.length <= 1 && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-claude-orange/10 to-blue-500/10 p-4 text-center">
            <p className="text-lg font-bold text-claude-dark">🎉 はじめの一歩、おめでとうございます</p>
            <p className="mt-1 text-sm text-claude-gray">
              AI を学ぶ決断をしました。ここから毎日少しずつ伸びていきます。
            </p>
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
            {isPassing ? '✓ 合格' : '✗ 不合格'}
          </span>
          {hintsUsedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">💡{hintsUsedCount}</span>
          )}
        </div>

        {/* Personal best + review mode note */}
        <PersonalBest sessionHistory={userProgress.sessionHistory} currentPercentage={percentage} />
        {isReviewMode && <p className="mb-4 text-xs text-stone-500">復習モード — スコア非反映</p>}

        {/* Category breakthrough badges */}
        {showStars && !isReviewMode && sessionState && (
          <CategoryBreakthroughBadge
            questions={sessionState.questions}
            answerHistory={sessionState.answerHistory}
            userProgress={userProgress}
          />
        )}

        {/* Stars visualization - staggered pop-in */}
        <div className="mb-6 flex justify-center gap-1" role="img" aria-label={`${filledStars}つ星の評価`}>
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
              <p className="mb-2 text-xs font-semibold text-indigo-500">次のおすすめ</p>
              {recommendation.type === 'perfect' ? (
                <>
                  <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
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
                  <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
                    <span className="font-medium">
                      {recommendation.categoryIcon} {recommendation.categoryName}
                    </span>
                    で{recommendation.wrongCount}問間違えました。カテゴリ別学習で深掘りしてみましょう。
                  </p>
                  <button
                    onClick={() => recommendation.categoryId && handleStartCategorySession(recommendation.categoryId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                  >
                    {recommendation.categoryIcon} {recommendation.categoryName}を深掘り
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Skills acquired — show what they can now do */}
          {!isReviewMode && sessionState && (
            <SkillsAcquired questions={sessionState.questions} answerHistory={sessionState.answerHistory} />
          )}

          {/* Practice prompts + teaching tips moved to ProgressDashboard for cleaner result screen */}

          {/* Certificate */}
          <CertificateGenerator score={score} total={answeredCount} percentage={percentage} mode={sessionConfig.mode} />

          {/* Next recommendation */}
          {!isReviewMode && <NextRecommendation mode={sessionConfig.mode} percentage={percentage} />}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {!isReviewMode && (
              <button
                onClick={() => startSession({ mode: 'quick' })}
                className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-green-500 px-6 py-3 text-sm font-semibold text-green-600 dark:border-green-400 dark:text-green-400"
              >
                ⚡ もう3問だけ
              </button>
            )}
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
                  const stars = '⭐'.repeat(Math.ceil(percentage / 20))
                  navigator
                    .share({
                      title: theme.appName,
                      text: `${stars}\n${theme.appName}: ${score}/${answeredCount}問正解 (${percentage}%)\n${isPassing ? '✅ 合格！' : '📚 もう少し！'}\n${theme.shareHashtags}`,
                      url: window.location.href,
                    })
                    .then(() => trackShare('native'))
                    .catch(() => {
                      /* user cancelled share */
                    })
                }}
                className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-6 py-3.5 text-base font-semibold text-stone-600 dark:border-stone-600 dark:text-stone-300"
              >
                <Share2 className="h-5 w-5" />
                結果をシェア
              </button>
            )}
            <ShareImageGenerator
              score={score}
              total={answeredCount}
              percentage={percentage}
              streakDays={userProgress.streakDays}
              totalXp={userProgress.totalXp}
            />
            <button
              onClick={handleBackToMenu}
              className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-6 py-3.5 text-base font-semibold text-stone-600 dark:border-stone-600 dark:text-stone-300"
            >
              <Home className="h-5 w-5" />
              メニューに戻る
            </button>
          </div>

          {/* Next step — connect learning to action */}
          {!isReviewMode &&
            (() => {
              // For overview mode: show action item from the last completed chapter
              if (isOverviewMode && sessionState) {
                const lastQuestion = sessionState.questions[sessionState.questions.length - 1]
                const lastChapter = lastQuestion ? getChapterFromTags(lastQuestion.tags) : null
                const actionItem = lastChapter?.actionItem
                if (actionItem) {
                  return (
                    <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-4 text-left dark:border-green-500/30 dark:bg-green-500/10">
                      <p className="mb-1 text-xs font-semibold text-green-600 dark:text-green-400">明日やること</p>
                      <p className="mb-3 text-sm text-claude-dark">{actionItem}</p>
                      <p className="text-xs text-stone-500">
                        知識を行動に変えるのは、今です。小さな一歩が未来を変えます。
                      </p>
                    </div>
                  )
                }
              }

              // For other modes: general CTA
              return (
                <div className="mt-6 rounded-2xl border border-claude-orange/20 bg-claude-orange/5 p-4 text-center dark:border-claude-orange/30 dark:bg-claude-orange/10">
                  <p className="mb-1 text-xs font-semibold text-claude-orange">Next Step</p>
                  <p className="mb-3 text-sm text-claude-dark">学んだ知識を実践してみましょう</p>
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
