import { useEffect, useCallback, useMemo, useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { OptionButton } from './OptionButton'
import { Feedback } from './Feedback'
import { ChapterIndicator } from './ChapterIndicator'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { getChapterFromTags, OVERVIEW_CHAPTERS } from '@/domain/valueObjects/OverviewChapter'
import { Bookmark, Lightbulb, RotateCcw, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { QuizText } from './QuizText'
import { haptics } from '@/lib/haptics'
import { useSwipe } from '@/lib/useSwipe'
import { CorrectOverlay } from './CorrectOverlay'

import { getColorHex } from '@/lib/colors'

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

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!quiz) return
      // Don't handle keys when a dialog/modal is open
      if (isModalOpen) return

      const optionCount = quiz.options.length

      // Retry shortcut (r key) - not available in review mode
      if (e.key === 'r' && isAnswered && isCorrect === false && !isReviewMode) {
        e.preventDefault()
        retryQuestion()
        return
      }

      if (isMultiSelect) {
        // Multi-select keyboard handling
        switch (e.key) {
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
            if (!isAnswered) {
              const index = parseInt(e.key) - 1
              if (index < optionCount) {
                toggleAnswer(index)
              }
            }
            break
          case 'Enter':
            e.preventDefault()
            if (!isAnswered && selectedAnswers.length > 0) {
              submitAnswer()
            } else if (isAnswered) {
              nextQuestion()
            }
            break
          case ' ':
            // Space alone does not submit in multi-select (used for toggle via number keys)
            e.preventDefault()
            if (isAnswered) {
              nextQuestion()
            }
            break
        }
      } else {
        // Single-select keyboard handling
        switch (e.key) {
          case 'ArrowUp':
          case 'ArrowLeft':
            e.preventDefault()
            if (!isAnswered) {
              const prevIndex = selectedAnswer === null
                ? optionCount - 1
                : (selectedAnswer - 1 + optionCount) % optionCount
              selectAnswer(prevIndex)
            }
            break
          case 'ArrowDown':
          case 'ArrowRight':
            e.preventDefault()
            if (!isAnswered) {
              const nextIdx = selectedAnswer === null
                ? 0
                : (selectedAnswer + 1) % optionCount
              selectAnswer(nextIdx)
            }
            break
          case 'Enter':
          case ' ':
            e.preventDefault()
            if (!isAnswered && selectedAnswer !== null) {
              submitAnswer()
            } else if (isAnswered) {
              nextQuestion()
            }
            break
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
            if (!isAnswered) {
              const index = parseInt(e.key) - 1
              if (index < optionCount) {
                selectAnswer(index)
              }
            }
            break
        }
      }
    },
    [quiz, selectedAnswer, selectedAnswers, isAnswered, isCorrect, isReviewMode, isMultiSelect, isModalOpen, selectAnswer, toggleAnswer, submitAnswer, nextQuestion, retryQuestion]
  )

  // Register keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Haptic feedback + overlay on answer result
  const [showCorrectOverlay, setShowCorrectOverlay] = useState(false)
  useEffect(() => {
    if (isAnswered && isCorrect !== null) {
      if (isCorrect) {
        haptics.success()
        if (!deferFeedback) setShowCorrectOverlay(true)
      } else {
        haptics.error()
      }
    } else {
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
          className="rounded-lg bg-claude-orange px-4 py-2 text-white hover:bg-claude-orange/90"
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

    {/* Fixed bottom bar */}
    {deferFeedback ? (
      /* 実力テスト: navigation + finish */
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 sm:relative sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:pt-0">
        {/* Question dots indicator */}
        <div className="mb-2 flex flex-wrap justify-center gap-1 sm:mb-3">
          {(sessionState?.questions ?? []).map((_, i) => {
            const answered = sessionState?.answerHistory?.has(i)
            const isCurrent = i === currentIndex
            return (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  isCurrent
                    ? 'scale-125 bg-claude-orange'
                    : answered
                      ? 'bg-green-400'
                      : 'bg-stone-300'
                }`}
                aria-label={`問題${i + 1}${answered ? '（回答済み）' : ''}`}
              />
            )
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { haptics.light(); previousQuestion() }}
            disabled={currentIndex <= 0}
            className="tap-highlight rounded-2xl border-2 border-stone-300 px-3 py-3 text-stone-500 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {(() => {
            const alreadyAnswered = sessionState?.answerHistory?.has(currentIndex)
            if (!isAnswered && !alreadyAnswered) {
              return (
                <button
                  onClick={() => { haptics.medium(); submitAnswer() }}
                  disabled={isMultiSelect ? selectedAnswers.length === 0 : selectedAnswer === null}
                  className={`flex-1 rounded-2xl py-3 text-base font-semibold ${
                    (isMultiSelect ? selectedAnswers.length > 0 : selectedAnswer !== null)
                      ? 'tap-highlight bg-claude-orange text-white'
                      : 'bg-stone-200 text-stone-400'
                  }`}
                >
                  回答する
                </button>
              )
            }
            return (
              <button
                onClick={() => finishTest()}
                className="tap-highlight flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 py-3 text-base font-semibold text-white"
              >
                <Send className="h-4 w-4" />
                テスト終了（{sessionState?.answerHistory?.size ?? 0}/{sessionState?.questions.length ?? 0}）
              </button>
            )
          })()}
          <button
            onClick={() => { haptics.light(); nextQuestion() }}
            disabled={currentIndex >= (sessionState?.questions.length ?? 0) - 1}
            className="tap-highlight rounded-2xl border-2 border-stone-300 px-3 py-3 text-stone-500 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    ) : (
      /* 通常モード: ◀ submit/next ▶ */
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 sm:relative sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:pt-0">
        <div className="flex gap-2">
          <button
            onClick={() => { haptics.light(); previousQuestion() }}
            disabled={!canGoBack}
            className="tap-highlight flex items-center justify-center rounded-2xl border-2 border-stone-300 px-3 py-3 text-stone-500 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {isAnswered ? (
            /* 回答済み: 次へボタンのみ（全幅） */
            <button
              onClick={() => { haptics.light(); nextQuestion() }}
              className="tap-highlight flex-1 rounded-2xl bg-claude-orange py-3.5 text-base font-semibold text-white sm:py-3"
            >
              次の問題へ
            </button>
          ) : (
            /* 未回答: 回答ボタン + ▶スキップ */
            <>
              <button
                onClick={() => { haptics.medium(); submitAnswer() }}
                disabled={isMultiSelect ? selectedAnswers.length === 0 : selectedAnswer === null}
                className={`flex-1 rounded-2xl py-3.5 text-base font-semibold transition-all sm:py-3 ${
                  (isMultiSelect ? selectedAnswers.length > 0 : selectedAnswer !== null)
                    ? 'tap-highlight bg-claude-orange text-white'
                    : 'cursor-not-allowed bg-stone-200 text-stone-400'
                }`}
              >
                回答する
              </button>
              <button
                onClick={() => { haptics.light(); nextQuestion() }}
                disabled={currentIndex >= (sessionState?.questions.length ?? 0) - 1}
                className="tap-highlight flex items-center justify-center rounded-2xl border-2 border-stone-300 px-3 py-3 text-stone-500 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    )}
    </>
  )
}
