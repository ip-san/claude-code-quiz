import { Eye, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { DiagramRenderer } from '@/components/Quiz/diagrams/DiagramRenderer'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { type FlashCardRating, flashCardRatingToScore } from '@/domain/valueObjects/FlashCardRating'
import { useQuizStore } from '@/stores/quizStore'

export function FlashCard({ isModalOpen }: { isModalOpen: boolean }) {
  const { getCurrentQuestion, sessionState, nextQuestion, userProgress } = useQuizStore()
  const [isRevealed, setIsRevealed] = useState(false)
  const [rated, setRated] = useState(false)

  const question = getCurrentQuestion()
  if (!question || !sessionState) return null

  const category = PREDEFINED_CATEGORIES.find((c) => c.id === question.category)
  const correctOption = question.options[question.correctIndex]

  const handleReveal = () => {
    if (!isModalOpen) setIsRevealed(true)
  }

  const handleRate = (rating: FlashCardRating) => {
    if (rated) return
    setRated(true)
    const { isCorrect } = flashCardRatingToScore(rating)

    // Use store's selectAnswer + submitAnswer to record progress
    // Select the correct answer for "knew"/"unsure", wrong for "didnt_know"
    const store = useQuizStore.getState()
    if (isCorrect) {
      store.selectAnswer(question.correctIndex)
    } else {
      // Select a wrong answer
      const wrongIndex = question.correctIndex === 0 ? 1 : 0
      store.selectAnswer(wrongIndex)
    }
    store.submitAnswer()

    // Auto-advance after brief delay
    setTimeout(() => {
      setIsRevealed(false)
      setRated(false)
      nextQuestion()
    }, 300)
  }

  const qp = userProgress.questionProgress[question.id]
  const accuracy = qp && qp.attempts > 0 ? Math.round((qp.correctCount / qp.attempts) * 100) : null

  return (
    <div className="mx-auto max-w-2xl">
      {/* Question card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-800">
        {/* Meta */}
        <div className="mb-3 flex items-center gap-2">
          {category && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-300">
              {category.icon} {category.name}
            </span>
          )}
          {accuracy !== null && <span className="text-xs text-stone-400">正答率 {accuracy}%</span>}
        </div>

        {/* Question text */}
        <h2 className="mb-4 text-lg font-bold leading-relaxed text-claude-dark">{question.question}</h2>

        {!isRevealed ? (
          /* Front: tap to reveal */
          <button
            onClick={handleReveal}
            className="tap-highlight flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 py-10 transition-colors hover:border-claude-orange hover:bg-orange-50 dark:border-stone-600 dark:bg-stone-700/50 dark:hover:border-claude-orange"
          >
            <Eye className="h-8 w-8 text-stone-400" />
            <span className="text-base font-medium text-stone-500 dark:text-stone-400">タップして正解を確認</span>
          </button>
        ) : (
          /* Back: answer + explanation + rating */
          <div className="space-y-4">
            {/* Correct answer */}
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
              <div className="mb-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">正解</div>
              <div className="text-base font-semibold text-emerald-800 dark:text-emerald-200">{correctOption.text}</div>
            </div>

            {/* Explanation */}
            <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-700/50">
              <div className="mb-1 text-xs font-medium text-stone-500">解説</div>
              <div className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{question.explanation}</div>
            </div>

            {/* Diagram */}
            {question.diagram && <DiagramRenderer diagram={question.diagram} />}

            {/* Self-rating buttons */}
            {!rated && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleRate('knew')}
                  className="tap-highlight flex-1 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
                >
                  知ってた
                </button>
                <button
                  onClick={() => handleRate('unsure')}
                  className="tap-highlight flex-1 rounded-xl bg-amber-500 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
                >
                  あやしい
                </button>
                <button
                  onClick={() => handleRate('didnt_know')}
                  className="tap-highlight flex-1 rounded-xl bg-red-500 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
                >
                  知らなかった
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skip hint */}
      {!isRevealed && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-400">
          <RotateCcw className="h-3 w-3" />
          <span>スワイプで次の問題へスキップ</span>
        </div>
      )}
    </div>
  )
}
