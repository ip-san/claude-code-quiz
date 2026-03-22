import { useEffect, useMemo, useState, useRef } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { OptionButton } from './OptionButton'
import { Feedback } from './Feedback'
import { ChapterIndicator } from './ChapterIndicator'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { getChapterFromTags, OVERVIEW_CHAPTERS } from '@/domain/valueObjects/OverviewChapter'
import { Bookmark, Lightbulb, RotateCcw } from 'lucide-react'
import { QuizText } from './QuizText'
import { haptics } from '@/lib/haptics'
import { useSwipe } from '@/lib/useSwipe'
import { CorrectOverlay } from './CorrectOverlay'
import { StreakToast } from './StreakToast'
import { EncouragementToast } from './EncouragementToast'

import { getColorHex } from '@/lib/colors'
import { useQuizKeyboard } from './useQuizKeyboard'
import { QuizBottomBar } from './QuizBottomBar'

export function QuizCard({ isModalOpen = false }: { isModalOpen?: boolean }) {
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
  } = useQuizStore()

  const quiz = getCurrentQuestion()
  const selectedAnswer = sessionState?.selectedAnswer ?? null
  const selectedAnswers = useMemo(() => sessionState?.selectedAnswers ?? [], [sessionState?.selectedAnswers])
  const isAnswered = sessionState?.isAnswered ?? false
  const isCorrect = sessionState?.isCorrect ?? null
  const isReviewMode = sessionState?.isReviewMode ?? false
  const deferFeedback = sessionState?.deferFeedback ?? false
  const hintUsed = sessionState?.hintUsed ?? false
  const isBookmarked = useQuizStore(state => quiz ? state.userProgress.isBookmarked(quiz.id) : false)
  const isMultiSelect = quiz?.isMultiSelect ?? false
  const currentIndex = sessionState?.currentIndex ?? 0
  const canGoBack = currentIndex > 0

  // Chapter indicator for overview mode
  const isOverviewMode = sessionState?.config.mode === 'overview'
  const currentChapter = useMemo(() => {
    if (!isOverviewMode || !quiz) return null
    return getChapterFromTags(quiz.tags)
  }, [isOverviewMode, quiz])
  const previousChapter = useMemo(() => {
    if (!isOverviewMode || !sessionState || sessionState.currentIndex === 0) return null
    const prevQuestion = sessionState.questions[sessionState.currentIndex - 1]
    return prevQuestion ? getChapterFromTags(prevQuestion.tags) : null
  }, [isOverviewMode, sessionState])
  const showChapterIndicator = isOverviewMode && currentChapter && currentChapter.id !== previousChapter?.id

  // Keyboard navigation (extracted to custom hook)
  useQuizKeyboard({
    quiz, selectedAnswer, selectedAnswers, isAnswered, isCorrect,
    isReviewMode, isMultiSelect, isModalOpen,
    selectAnswer, toggleAnswer, submitAnswer, nextQuestion, retryQuestion,
  })

  // Track consecutive correct/wrong answers for toasts
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0)
  const [consecutiveWrong, setConsecutiveWrong] = useState(0)
  const prevIsAnsweredRef = useRef(false)

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
        setConsecutiveCorrect(prev => prev + 1)
        setConsecutiveWrong(0)
      } else {
        haptics.error()
        setConsecutiveCorrect(0)
        setConsecutiveWrong(prev => prev + 1)
      }
    } else if (!isAnswered) {
      setShowCorrectOverlay(false)
    }
  }, [isAnswered, isCorrect, deferFeedback])

  // Slide-in animation key (changes on each question)
  const questionKey = quiz?.id ?? 'empty'

  // Swipe to navigate questions
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      haptics.light()
      nextQuestion()
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
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
          <svg
            className="h-8 w-8 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-claude-dark">クイズがありません</h3>
        <p className="mb-4 text-sm text-stone-500">
          選択した条件に一致する問題が見つかりませんでした
        </p>
        <button
          onClick={endSession}
          className="tap-highlight rounded-lg bg-claude-orange px-4 py-2 text-white"
        >
          メニューに戻る
        </button>
      </div>
    )
  }

  const category = getCategoryById(quiz.category)

  return (
    <>
      {/* Correct answer overlay — big center check */}
      {showCorrectOverlay && <CorrectOverlay />}

      {/* Consecutive correct streak toast */}
      {!deferFeedback && <StreakToast streak={consecutiveCorrect} />}

      {/* Encouragement toast on consecutive wrong answers */}
      {!deferFeedback && <EncouragementToast wrongStreak={consecutiveWrong} />}

      {/* Chapter indicator for overview mode */}
      {showChapterIndicator && currentChapter && (
        <ChapterIndicator
          chapter={currentChapter}
          totalChapters={OVERVIEW_CHAPTERS.length}
        />
      )}


      <div
        key={questionKey}
        {...swipeHandlers}
        className={`animate-slide-in-right rounded-2xl bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.06)] sm:border sm:border-stone-200 sm:p-8 ${
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
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                quiz.difficulty === 'beginner'
                  ? 'bg-green-100 text-green-700'
                  : quiz.difficulty === 'intermediate'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {quiz.difficulty === 'beginner'
                ? '初級'
                : quiz.difficulty === 'intermediate'
                  ? '中級'
                  : '上級'}
            </span>
          )}
          {isReviewMode && (
            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
              復習
            </span>
          )}
        </div>
        <button
          onClick={() => toggleBookmark(quiz.id)}
          aria-label={isBookmarked ? 'ブックマークを解除' : 'ブックマークに追加'}
          className="tap-highlight rounded-full p-2.5 transition-colors hover:bg-stone-100"
        >
          <Bookmark
            className={`h-5 w-5 ${
              isBookmarked
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-stone-400'
            }`}
          />
        </button>
      </div>

      {/* Question */}
      <h2 className="mb-3 text-base font-semibold leading-snug text-claude-dark sm:mb-6 sm:text-lg sm:leading-relaxed">
        <QuizText text={quiz.question} />
      </h2>

      {/* Hint (hidden in 実力テスト defer mode) */}
      {!isAnswered && !deferFeedback && (
        <div className="mb-2 sm:mb-4">
          {!hintUsed ? (
            <button
              onClick={useHint}
              className="tap-highlight flex items-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700"
            >
              <Lightbulb className="h-4 w-4" />
              ヒントを表示
            </button>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">ヒント</span>
              </div>
              <p className="text-sm text-amber-800">
                {quiz.hint
                  ? <QuizText text={quiz.hint} />
                  : '公式ドキュメントを確認してみましょう。回答後に参照リンクが表示されます。'}
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
          <p className="text-xs text-amber-700"><QuizText text={quiz.hint} /></p>
        </div>
      )}

      {/* Multi-select indicator */}
      {isMultiSelect && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-sm font-medium text-indigo-700">
            該当するものを全て選んでください
          </span>
        </div>
      )}

      {/* Options */}
      <div
        className="space-y-2 sm:space-y-3"
        role={isMultiSelect ? 'group' : 'listbox'}
        aria-label={isMultiSelect ? '複数選択回答' : '回答選択肢'}
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
            onClick={() => { haptics.light(); if (isMultiSelect) { toggleAnswer(index) } else { selectAnswer(index) } }}
          />
        ))}
      </div>

      {/* Feedback (shown inline after answering, skip in defer mode) */}
      {isAnswered && !deferFeedback && (
        <div className="mt-3 sm:mt-6">
          <Feedback quiz={quiz} isCorrect={isCorrect ?? false} />
          {isCorrect === false && (
            <div className="mt-4">
              <button
                onClick={() => { haptics.light(); retryQuestion() }}
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
      <div className="h-20 sm:hidden" />
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
      nextQuestion={nextQuestion}
      submitAnswer={submitAnswer}
      goToQuestion={goToQuestion}
      finishTest={finishTest}
    />
    </>
  )
}
