import { useEffect, useCallback } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { OptionButton } from './OptionButton'
import { Feedback } from './Feedback'
import { getCategoryById } from '@/domain/valueObjects/Category'

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
    submitAnswer,
    nextQuestion,
    endSession,
  } = useQuizStore()

  const quiz = getCurrentQuestion()
  const selectedAnswer = sessionState?.selectedAnswer ?? null
  const isAnswered = sessionState?.isAnswered ?? false
  const isCorrect = sessionState?.isCorrect ?? null

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!quiz) return

      const optionCount = quiz.options.length

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
            const nextIndex = selectedAnswer === null
              ? 0
              : (selectedAnswer + 1) % optionCount
            selectAnswer(nextIndex)
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
    },
    [quiz, selectedAnswer, isAnswered, selectAnswer, submitAnswer, nextQuestion]
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
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-8 shadow-sm ${
        isAnswered && !isCorrect ? 'animate-shake' : ''
      } ${isAnswered && isCorrect ? 'animate-pulse-success' : ''}`}
    >
      {/* Category & Difficulty badges */}
      <div className="mb-4 flex gap-2">
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
      </div>

      {/* Question */}
      <h2 className="mb-6 text-lg font-semibold leading-relaxed text-claude-dark">
        {quiz.question}
      </h2>

      {/* Options */}
      <div
        className="space-y-3"
        role="listbox"
        aria-label="回答選択肢"
        aria-activedescendant={selectedAnswer !== null ? `option-${selectedAnswer}` : undefined}
      >
        {quiz.options.map((option, index) => (
          <OptionButton
            key={index}
            index={index}
            text={option.text}
            isSelected={selectedAnswer === index}
            isCorrect={index === quiz.correctIndex}
            isAnswered={isAnswered}
            onClick={() => selectAnswer(index)}
          />
        ))}
      </div>

      {/* Submit / Next button */}
      <div className="mt-6">
        {!isAnswered ? (
          <button
            onClick={submitAnswer}
            disabled={selectedAnswer === null}
            aria-disabled={selectedAnswer === null}
            aria-label={selectedAnswer === null ? '選択肢を選んでください' : '回答を確定する'}
            className={`w-full rounded-lg py-3 font-medium transition-all ${
              selectedAnswer !== null
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
              aria-label="次の問題へ進む"
              className="mt-4 w-full rounded-lg bg-claude-orange py-3 font-medium text-white hover:bg-claude-orange/90"
            >
              次の問題へ
            </button>
          </>
        )}
      </div>
    </div>
  )
}
