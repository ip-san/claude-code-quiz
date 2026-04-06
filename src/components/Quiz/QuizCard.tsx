import { Bookmark, ExternalLink, Lightbulb, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { locale } from '@/config/locale'
import { AdaptiveDifficultyService } from '@/domain/services/AdaptiveDifficultyService'
import { QuizSessionService } from '@/domain/services/QuizSessionService'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { getChapterFromTags, OVERVIEW_CHAPTERS } from '@/domain/valueObjects/OverviewChapter'
import { getDifficultyLabel, getDifficultyStyle } from '@/lib/badgeStyles'
import { getColorHex } from '@/lib/colors'
import { haptics } from '@/lib/haptics'
import { useSwipe } from '@/lib/useSwipe'
import { useQuizStore } from '@/stores/quizStore'
import { ChapterComplete } from './chapter/ChapterComplete'
import { ChapterIndicator } from './chapter/ChapterIndicator'
import { ChapterIntro } from './chapter/ChapterIntro'
import { Feedback } from './Feedback'
import { useQuizKeyboard } from './hooks/useQuizKeyboard'
import { OptionButton } from './OptionButton'
import { CorrectOverlay } from './overlays/CorrectOverlay'
import { EncouragementToast } from './overlays/EncouragementToast'
import { StreakToast } from './overlays/StreakToast'
import { XpToast } from './overlays/XpToast'
import { QuizBottomBar } from './QuizBottomBar'
import { QuizText } from './QuizText'
import { RelatedQuestions } from './result/RelatedQuestions'

export function QuizCard({
  isModalOpen = false,
  onLastQuestionNext,
}: {
  isModalOpen?: boolean
  /** シナリオモードで最後の問題の後にエピローグを表示するためのコールバック */
  onLastQuestionNext?: () => void
}) {
  const {
    getCurrentQuestion,
    sessionState,
    selectAnswer,
    toggleAnswer,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    finishTest,
    retryQuestion,
    endSession,
    toggleBookmark,
    useHint,
    dismissChapterIntro,
    dismissChapterComplete,
  } = useQuizStore()

  const quiz = getCurrentQuestion()
  const selectedAnswer = sessionState?.selectedAnswer ?? null
  const selectedAnswers = sessionState?.selectedAnswers ?? []
  const isAnswered = sessionState?.isAnswered ?? false
  const isCorrect = sessionState?.isCorrect ?? null
  const isReviewMode = sessionState?.isReviewMode ?? false
  const deferFeedback = sessionState?.deferFeedback ?? false
  const hintUsed = sessionState?.hintUsed ?? false
  const isBookmarked = useQuizStore((state) => (quiz ? state.userProgress.isBookmarked(quiz.id) : false))
  const isAdaptive = useQuizStore((state) => {
    const mode = state.sessionConfig.mode
    return (mode === 'random' || mode === 'category') && AdaptiveDifficultyService.isAdaptiveReady(state.userProgress)
  })
  const totalXp = useQuizStore((state) => state.userProgress.totalXp)
  const isMultiSelect = quiz?.isMultiSelect ?? false
  const currentIndex = sessionState?.currentIndex ?? 0
  const canGoBack = currentIndex > 0

  // Chapter state from domain layer (overview mode only)
  const isOverviewMode = sessionState?.config.mode === 'overview'
  const chapterState = sessionState?.overviewChapterState ?? null
  const currentChapter = useMemo(() => {
    if (!chapterState) return null
    return OVERVIEW_CHAPTERS.find((c) => c.id === chapterState.currentChapterId) ?? null
  }, [chapterState])
  const showChapterIntro = chapterState?.chapterPhase === 'intro' && currentChapter
  const showChapterComplete = chapterState?.chapterPhase === 'complete' && currentChapter
  const chapterScore = useMemo(() => {
    if (!showChapterComplete || !sessionState || !currentChapter) return { score: 0, total: 0 }
    return QuizSessionService.getChapterScore(sessionState, currentChapter.id)
  }, [showChapterComplete, sessionState, currentChapter])

  // Chapter indicator: show "Ch.N" badge when chapter changes
  const previousChapter = useMemo(() => {
    if (!isOverviewMode || !sessionState || sessionState.currentIndex === 0) return null
    const prevQuestion = sessionState.questions[sessionState.currentIndex - 1]
    return prevQuestion ? getChapterFromTags(prevQuestion.tags) : null
  }, [isOverviewMode, sessionState])
  const showChapterIndicator =
    isOverviewMode && currentChapter && currentChapter.id !== previousChapter?.id && !showChapterIntro

  // Keyboard navigation (extracted to custom hook)
  useQuizKeyboard({
    quiz,
    selectedAnswer,
    selectedAnswers,
    isAnswered,
    isCorrect,
    isReviewMode,
    isMultiSelect,
    isModalOpen,
    selectAnswer,
    toggleAnswer,
    submitAnswer,
    nextQuestion,
    retryQuestion,
  })

  // Track consecutive correct/wrong answers for toasts
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0)
  const [consecutiveWrong, setConsecutiveWrong] = useState(0)
  const prevIsAnsweredRef = useRef(false)

  // Scroll to top on question change
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex change is the intentional trigger
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentIndex])

  // Reset streak on new session (questions array identity changes)
  const questionsRef = useRef(sessionState?.questions)
  useEffect(() => {
    if (sessionState?.questions !== questionsRef.current) {
      questionsRef.current = sessionState?.questions
      setConsecutiveCorrect(0)
      setConsecutiveWrong(0)
    }
  }, [sessionState?.questions])

  // Haptic feedback + overlay on answer result
  const [showCorrectOverlay, setShowCorrectOverlay] = useState(false)
  useEffect(() => {
    // Only trigger on fresh answer submission (isAnswered: false → true)
    const isNewSubmission = isAnswered && !prevIsAnsweredRef.current
    prevIsAnsweredRef.current = isAnswered

    if (isNewSubmission && isCorrect !== null) {
      if (isCorrect) {
        haptics.success()
        if (!deferFeedback) setShowCorrectOverlay(true)
        setConsecutiveCorrect((prev) => prev + 1)
        setConsecutiveWrong(0)
      } else {
        haptics.error()
        setConsecutiveCorrect(0)
        setConsecutiveWrong((prev) => prev + 1)
      }
    } else if (!isAnswered) {
      setShowCorrectOverlay(false)
    }
  }, [isAnswered, isCorrect, deferFeedback])

  // Slide-in animation key (changes on each question)
  const questionKey = quiz?.id ?? 'empty'

  // Swipe to navigate questions (respects chapter boundary and scenario epilogue)
  // Swipe/next: domain layer handles chapter boundaries via overviewChapterState
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      haptics.light()
      if (onLastQuestionNext) {
        onLastQuestionNext()
      } else {
        nextQuestion()
      }
    },
    onSwipeRight: () => {
      if (canGoBack) {
        haptics.light()
        previousQuestion()
      }
    },
  })

  // Empty state when no quiz data
  if (!quiz) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-stone-50 to-stone-100 p-8 text-center dark:from-stone-800 dark:to-stone-900">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-claude-orange/10">
          <span className="text-3xl">🔍</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-claude-dark">該当する問題がありません</h3>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">別のカテゴリや難易度を試してみてください</p>
        <button
          onClick={endSession}
          className="tap-highlight rounded-2xl bg-claude-orange px-6 py-3 text-sm font-semibold text-white"
        >
          メニューに戻る
        </button>
      </div>
    )
  }

  const category = getCategoryById(quiz.category)

  // Show full-page chapter intro before quiz content
  if (showChapterIntro && currentChapter) {
    return (
      <ChapterIntro
        chapter={currentChapter}
        onStart={() => {
          dismissChapterIntro()
          window.scrollTo(0, 0)
        }}
      />
    )
  }

  // Show chapter complete overlay (triggered by domain layer after answering last chapter question)
  if (showChapterComplete && currentChapter) {
    return (
      <ChapterComplete
        chapter={currentChapter}
        score={chapterScore.score}
        total={chapterScore.total}
        isLastChapter={currentChapter.id === OVERVIEW_CHAPTERS[OVERVIEW_CHAPTERS.length - 1]?.id}
        onContinue={() => {
          dismissChapterComplete()
          window.scrollTo(0, 0)
        }}
        onQuit={endSession}
      />
    )
  }

  return (
    <>
      {/* Correct answer overlay — big center check */}
      {showCorrectOverlay && <CorrectOverlay />}

      {/* XP gain toast (hidden in review/defer modes) */}
      {!deferFeedback && !isReviewMode && <XpToast totalXp={totalXp} />}

      {/* Consecutive correct streak toast (hidden in scenario mode) */}
      {!deferFeedback && sessionState?.config.mode !== 'scenario' && <StreakToast streak={consecutiveCorrect} />}

      {/* Encouragement toast on consecutive wrong answers (hidden in scenario mode) */}
      {!deferFeedback && sessionState?.config.mode !== 'scenario' && (
        <EncouragementToast wrongStreak={consecutiveWrong} />
      )}

      {/* Compact chapter indicator (shown after intro was dismissed) */}
      {showChapterIndicator && currentChapter && (
        <ChapterIndicator chapter={currentChapter} totalChapters={OVERVIEW_CHAPTERS.length} />
      )}

      <div
        key={questionKey}
        {...swipeHandlers}
        className={`animate-slide-in-right rounded-2xl bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:bg-stone-800 dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)] sm:border sm:border-stone-200 sm:p-8 ${
          isAnswered && isCorrect === false ? 'animate-shake flash-wrong' : ''
        } ${isAnswered && isCorrect === true ? 'glow-correct' : ''}`}
      >
        {/* Category & Difficulty badges + Bookmark */}
        <div className="mb-2 flex items-center justify-between sm:mb-4">
          <div className="flex gap-2">
            {category && (
              <span
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${getColorHex(category.color ?? 'gray')}15`,
                  color: getColorHex(category.color ?? 'gray'),
                }}
              >
                <span>{category.icon}</span>
                {category.name}
              </span>
            )}
            {quiz.difficulty && (
              <span className={`rounded px-2 py-1 text-xs font-medium ${getDifficultyStyle(quiz.difficulty)}`}>
                {getDifficultyLabel(quiz.difficulty)}
              </span>
            )}
            {isAdaptive && currentIndex === 0 && (
              <span
                className="rounded bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-500"
                title="カテゴリ別の正答率に応じて、得意分野は上級、苦手分野は初級を優先出題しています"
              >
                正答率に合わせて出題
              </span>
            )}
            {isReviewMode && (
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">復習</span>
            )}
          </div>
          <button
            onClick={() => toggleBookmark(quiz.id)}
            aria-label={isBookmarked ? locale.quizCard.unbookmark : locale.quizCard.bookmark}
            className="tap-highlight rounded-full p-3 transition-colors hover:bg-stone-100 dark:hover:bg-stone-700"
          >
            <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : 'text-stone-400'}`} />
          </button>
        </div>

        {/* Question */}
        <h2 className="mb-3 max-w-prose text-lg font-semibold leading-snug text-claude-dark sm:mb-6 sm:text-xl sm:leading-relaxed">
          <QuizText text={quiz.question} />
        </h2>

        {/* Hint (hidden in 実力テスト defer mode) */}
        {!isAnswered && !deferFeedback && (
          <div className="mb-2 sm:mb-4">
            {!hintUsed ? (
              <button
                onClick={useHint}
                className="tap-highlight flex items-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
              >
                <Lightbulb className="h-4 w-4" />
                ヒントを表示
              </button>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-500/10">
                <div className="mb-1 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">ヒント</span>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {quiz.hint ? <QuizText text={quiz.hint} /> : locale.quizCard.defaultHint}
                </p>
              </div>
            )}
          </div>
        )}
        {isAnswered && hintUsed && quiz.hint && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">使用したヒント</span>
            </div>
            <p className="text-xs text-amber-700">
              <QuizText text={quiz.hint} />
            </p>
          </div>
        )}

        {/* Reference link — shown only after using hint (not a freebie) */}
        {!isAnswered && !deferFeedback && hintUsed && quiz.referenceUrl && (
          <div className="mb-3">
            <a
              href={quiz.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-claude-orange"
            >
              <ExternalLink className="h-3 w-3" />
              公式ドキュメントで詳しく調べる
            </a>
          </div>
        )}

        {/* Multi-select indicator */}
        {isMultiSelect && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
            <span className="text-sm font-medium text-indigo-700">該当するものを全て選んでください</span>
          </div>
        )}

        {/* Options */}
        <div
          className="space-y-2 sm:space-y-3"
          role={isMultiSelect ? 'group' : 'listbox'}
          aria-label={isMultiSelect ? locale.quizCard.multiSelectGroup : locale.quizCard.singleSelectGroup}
          aria-activedescendant={!isMultiSelect && selectedAnswer !== null ? `option-${selectedAnswer}` : undefined}
        >
          {quiz.options.map((option, index) => (
            <OptionButton
              key={index}
              index={index}
              text={option.text}
              isSelected={isMultiSelect ? selectedAnswers.includes(index) : selectedAnswer === index}
              isCorrect={quiz.isCorrectIndex(index)}
              isAnswered={isAnswered}
              isMultiSelect={isMultiSelect}
              onClick={() => {
                haptics.light()
                if (isMultiSelect) {
                  toggleAnswer(index)
                } else {
                  selectAnswer(index)
                }
              }}
            />
          ))}
        </div>

        {/* Feedback (shown inline after answering, skip in defer mode) */}
        {isAnswered && !deferFeedback && (
          <div className="mt-3 sm:mt-6">
            <Feedback quiz={quiz} isCorrect={isCorrect ?? false} />
            {/* Related questions for deeper learning (correct answers only, not in scenario mode) */}
            {isCorrect === true && !isReviewMode && sessionState?.config.mode !== 'scenario' && (
              <RelatedQuestions currentQuestion={quiz} allQuestions={useQuizStore.getState().allQuestions} />
            )}
            {isCorrect === false && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    haptics.light()
                    retryQuestion()
                  }}
                  aria-label="この問題をもう一度挑戦する (R)"
                  className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-claude-orange py-3.5 text-base font-semibold text-claude-orange sm:py-3"
                >
                  <RotateCcw className="h-4 w-4" />
                  もう一度挑戦 <span className="text-xs opacity-60">(R)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Spacer for fixed bottom bar on mobile */}
        <div className="h-16 sm:hidden" />
      </div>

      <QuizBottomBar
        sessionState={sessionState}
        currentIndex={currentIndex}
        isAnswered={isAnswered}
        isMultiSelect={isMultiSelect}
        selectedAnswer={selectedAnswer}
        selectedAnswers={selectedAnswers}
        deferFeedback={deferFeedback}
        canGoBack={canGoBack}
        previousQuestion={previousQuestion}
        nextQuestion={onLastQuestionNext ?? nextQuestion}
        submitAnswer={submitAnswer}
        goToQuestion={goToQuestion}
        finishTest={finishTest}
      />
    </>
  )
}
