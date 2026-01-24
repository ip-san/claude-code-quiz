import { useEffect, useCallback } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { OptionButton } from './OptionButton'
import { Feedback } from './Feedback'
import { CATEGORIES, getColorHex } from '@/config/quizConfig'

export function QuizCard() {
  const {
    getCurrentQuiz,
    selectedAnswer,
    isAnswered,
    isCorrect,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    endSession,
  } = useQuizStore()

  const quiz = getCurrentQuiz()

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

  if (!quiz) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
        <p className="text-slate-400">クイズデータがありません</p>
        <button
          onClick={endSession}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          メニューに戻る
        </button>
      </div>
    )
  }

  const category = CATEGORIES.find((c) => c.id === quiz.category)

  return (
    <div
      className={`rounded-2xl border border-slate-700 bg-slate-800/50 p-8 ${
        isAnswered && !isCorrect ? 'animate-shake' : ''
      } ${isAnswered && isCorrect ? 'animate-pulse-success' : ''}`}
    >
      {/* Category & Difficulty badges */}
      <div className="mb-4 flex gap-2">
        {category && (
          <span
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${getColorHex(category.color ?? 'gray')}20`,
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
                ? 'bg-green-500/20 text-green-400'
                : quiz.difficulty === 'intermediate'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
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
      <h2 className="mb-6 text-lg font-semibold leading-relaxed text-white">
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
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-slate-700 text-slate-500'
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
              className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
            >
              次の問題へ
            </button>
          </>
        )}
      </div>
    </div>
  )
}
