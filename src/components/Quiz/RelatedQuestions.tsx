import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Question } from '@/domain/entities/Question'
import { useQuizStore } from '@/stores/quizStore'
import { haptics } from '@/lib/haptics'
import { getDifficultyLabel } from '@/lib/badgeStyles'

interface RelatedQuestionsProps {
  currentQuestion: Question
  allQuestions: readonly Question[]
}

/**
 * 回答後に表示する「関連する問題」
 * 同じカテゴリでまだ解いていない問題を2件提案し、
 * 理解を段階的に深める導線を作る。
 */
export function RelatedQuestions({ currentQuestion, allQuestions }: RelatedQuestionsProps) {
  const { userProgress, startSessionWithIds } = useQuizStore()

  const related = useMemo(() => {
    // 同じカテゴリで未回答 or 不正解の問題を優先
    return allQuestions
      .filter(q =>
        q.id !== currentQuestion.id &&
        q.category === currentQuestion.category &&
        (userProgress.getQuestionAccuracy(q.id) ?? 0) < 100
      )
      // より高い難易度を優先
      .sort((a, b) => {
        const order = { beginner: 0, intermediate: 1, advanced: 2 }
        return (order[a.difficulty] ?? 0) - (order[b.difficulty] ?? 0)
      })
      .slice(0, 2)
  }, [currentQuestion, allQuestions, userProgress])

  if (related.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
      <p className="mb-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
        この分野をもっと深く
      </p>
      <div className="space-y-1.5">
        {related.map(q => (
          <button
            key={q.id}
            onClick={() => {
              haptics.light()
              startSessionWithIds([q.id])
            }}
            className="tap-highlight flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-700"
          >
            <span className="mt-0.5 flex-shrink-0 text-xs text-stone-400">
              {getDifficultyLabel(q.difficulty)}
            </span>
            <span className="flex-1 text-xs leading-snug text-claude-dark dark:text-stone-200">
              {q.question.length > 60 ? q.question.slice(0, 60) + '...' : q.question}
            </span>
            <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-stone-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
