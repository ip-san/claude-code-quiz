import { useEffect, useCallback, useMemo } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { OptionButton } from './OptionButton'
import { Feedback } from './Feedback'
import { ChapterIndicator } from './ChapterIndicator'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { getChapterFromTags, OVERVIEW_CHAPTERS } from '@/domain/valueObjects/OverviewChapter'
import { Bookmark, Lightbulb } from 'lucide-react'

// Color mapping for categories
const COLOR_MAP: Record<string, string> = {
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  yellow: '#eab308',
  emerald: '#10b981',
  gray: '#6b7280',
}

function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName] ?? COLOR_MAP.gray
}

export function QuizCard() {
  const {
    getCurrentQuestion,
    sessionState,
    selectAnswer,
    toggleAnswer,
    submitAnswer,
    nextQuestion,
    endSession,
    toggleBookmark,
    useHint,
  } = useQuizStore()

  const quiz = getCurrentQuestion()
  const selectedAnswer = sessionState?.selectedAnswer ?? null
  const selectedAnswers = sessionState?.selectedAnswers ?? []
  const isAnswered = sessionState?.isAnswered ?? false
  const isCorrect = sessionState?.isCorrect ?? null
  const isReviewMode = sessionState?.isReviewMode ?? false
  const hintUsed = sessionState?.hintUsed ?? false
  const isBookmarked = quiz ? useQuizStore.getState().userProgress.isBookmarked(quiz.id) : false
  const isMultiSelect = quiz?.isMultiSelect ?? false

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

      const optionCount = quiz.options.length

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
    [quiz, selectedAnswer, selectedAnswers, isAnswered, isMultiSelect, selectAnswer, toggleAnswer, submitAnswer, nextQuestion]
  )

  // Register keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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
      {/* Chapter indicator for overview mode */}
      {showChapterIndicator && currentChapter && (
        <ChapterIndicator
          chapter={currentChapter}
          totalChapters={OVERVIEW_CHAPTERS.length}
        />
      )}

      <div
        className={`rounded-2xl border border-stone-200 bg-white p-8 shadow-sm ${
          isAnswered && !isCorrect ? 'animate-shake' : ''
        } ${isAnswered && isCorrect ? 'animate-pulse-success' : ''}`}
      >
        {/* Category & Difficulty badges + Bookmark */}
      <div className="mb-4 flex items-center justify-between">
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
          className="rounded-lg p-1.5 transition-colors hover:bg-stone-100"
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
      <h2 className="mb-6 text-lg font-semibold leading-relaxed text-claude-dark">
        {quiz.question}
      </h2>

      {/* Hint */}
      {quiz.hint && !isAnswered && !isReviewMode && (
        <div className="mb-4">
          {!hintUsed ? (
            <button
              onClick={useHint}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-100"
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
              <p className="text-sm text-amber-800">{quiz.hint}</p>
            </div>
          )}
        </div>
      )}
      {quiz.hint && isAnswered && hintUsed && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">使用したヒント</span>
          </div>
          <p className="text-xs text-amber-700">{quiz.hint}</p>
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
        className="space-y-3"
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
            onClick={() => isMultiSelect ? toggleAnswer(index) : selectAnswer(index)}
          />
        ))}
      </div>

      {/* Submit / Next button */}
      <div className="mt-6">
        {!isAnswered && !isReviewMode ? (
          <button
            onClick={submitAnswer}
            disabled={isMultiSelect ? selectedAnswers.length === 0 : selectedAnswer === null}
            aria-disabled={isMultiSelect ? selectedAnswers.length === 0 : selectedAnswer === null}
            aria-label={
              (isMultiSelect ? selectedAnswers.length === 0 : selectedAnswer === null)
                ? '選択肢を選んでください'
                : '回答を確定する'
            }
            className={`w-full rounded-lg py-3 font-medium transition-all ${
              (isMultiSelect ? selectedAnswers.length > 0 : selectedAnswer !== null)
                ? 'bg-claude-orange text-white hover:bg-claude-orange/90'
                : 'cursor-not-allowed bg-stone-200 text-stone-400'
            }`}
          >
            回答する
          </button>
        ) : (
          <>
            <Feedback quiz={quiz} isCorrect={isCorrect!} />
            <button
              onClick={nextQuestion}
              aria-label={isReviewMode ? '次の問題を確認する' : '次の問題へ進む'}
              className="mt-4 w-full rounded-lg bg-claude-orange py-3 font-medium text-white hover:bg-claude-orange/90"
            >
              {isReviewMode ? '次の問題を確認' : '次の問題へ'}
            </button>
          </>
        )}
      </div>
    </div>
    </>
  )
}
