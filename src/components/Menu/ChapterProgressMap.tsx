import { useMemo } from 'react'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import { OVERVIEW_CHAPTERS } from '@/domain/valueObjects/OverviewChapter'
import { haptics } from '@/lib/haptics'

interface ChapterProgressMapProps {
  allQuestions: readonly Question[]
  userProgress: UserProgress
  onStartChapter: (chapterId: number) => void
}

export function ChapterProgressMap({ allQuestions, userProgress, onStartChapter }: ChapterProgressMapProps) {
  const chapters = useMemo(() => {
    return OVERVIEW_CHAPTERS.map((ch) => {
      const questions = allQuestions.filter((q) => q.tags.includes(ch.tag))
      let answered = 0
      let correct = 0
      for (const q of questions) {
        const p = userProgress.questionProgress[q.id]
        if (p && p.attempts > 0) {
          answered++
          if (p.lastCorrect) correct++
        }
      }
      const total = questions.length
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
      const isComplete = answered === total && total > 0
      return { ...ch, total, answered, correct, accuracy, isComplete }
    })
  }, [allQuestions, userProgress])

  const hasAnyProgress = chapters.some((ch) => ch.answered > 0)
  if (!hasAnyProgress) return null

  return (
    <div className="mb-5">
      <h2 className="mb-2 text-sm font-semibold text-stone-500">🗺️ 全体像モード進捗</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {chapters.map((ch) => {
          const progressPct = ch.total > 0 ? (ch.answered / ch.total) * 100 : 0
          return (
            <button
              key={ch.id}
              onClick={() => {
                haptics.light()
                onStartChapter(ch.id)
              }}
              className="tap-highlight rounded-xl border border-stone-200 bg-white p-3 text-left dark:border-stone-700 dark:bg-stone-800"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {ch.icon} Ch.{ch.id}
                </span>
                {ch.isComplete && <span className="text-xs">✅</span>}
              </div>
              <p className="mb-1.5 line-clamp-1 text-xs font-medium text-claude-dark dark:text-stone-200">{ch.name}</p>
              {/* Progress bar */}
              <div className="mb-1 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <div
                  className={`h-full rounded-full transition-all ${ch.isComplete ? 'bg-green-500' : 'progress-gradient'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>
                  {ch.answered}/{ch.total}問
                </span>
                {ch.answered > 0 && <span>{ch.accuracy}%</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
