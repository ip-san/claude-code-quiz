import { Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { locale } from '@/config/locale'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import { getOverviewQuestionsOrdered, OVERVIEW_CHAPTERS } from '@/domain/valueObjects/OverviewChapter'
import { haptics } from '@/lib/haptics'

interface ChapterProgressMapProps {
  allQuestions: readonly Question[]
  userProgress: UserProgress
  onStartChapter: (chapterId: number, startIndex: number) => void
  /** 「続きから」用: 未正解の問題IDだけでセッション開始 */
  onResumeChapter: (questionIds: string[], chapterName: string) => void
}

export function ChapterProgressMap({
  allQuestions,
  userProgress,
  onStartChapter,
  onResumeChapter,
}: ChapterProgressMapProps) {
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)

  const overviewQuestions = useMemo(() => getOverviewQuestionsOrdered(allQuestions), [allQuestions])

  const chapters = useMemo(() => {
    return OVERVIEW_CHAPTERS.map((ch) => {
      const chapterQuestions = overviewQuestions.filter((q) => q.tags.includes(ch.tag))
      const firstQuestion = chapterQuestions[0]
      const startIndex = firstQuestion ? overviewQuestions.indexOf(firstQuestion) : 0

      let answered = 0
      let correct = 0
      for (const q of chapterQuestions) {
        const p = userProgress.questionProgress[q.id]
        if (p && p.attempts > 0) {
          answered++
          if (p.lastCorrect) correct++
        }
      }
      const total = chapterQuestions.length
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
      const isComplete = answered === total && total > 0
      const correctPct = total > 0 ? Math.round((correct / total) * 100) : 0

      // "続きから" は最初の未正解問題から開始（不正解 or 未回答）
      let resumeIndex = startIndex
      if (answered > 0 && correct < total) {
        const firstIncomplete = chapterQuestions.find((q) => {
          const p = userProgress.questionProgress[q.id]
          return !p || p.attempts === 0 || !p.lastCorrect
        })
        if (firstIncomplete) {
          resumeIndex = overviewQuestions.indexOf(firstIncomplete)
        }
      }

      // 「続きから」用: 未正解の問題IDリスト
      const incompleteIds = chapterQuestions
        .filter((q) => {
          const p = userProgress.questionProgress[q.id]
          return !p || p.attempts === 0 || !p.lastCorrect
        })
        .map((q) => q.id)

      return {
        ...ch,
        total,
        answered,
        correct,
        accuracy,
        isComplete,
        correctPct,
        startIndex: resumeIndex,
        incompleteIds,
      }
    })
  }, [overviewQuestions, userProgress])

  const hasAnyProgress = chapters.some((ch) => ch.answered > 0)
  if (!hasAnyProgress) return null

  const selected = selectedChapter !== null ? chapters.find((ch) => ch.id === selectedChapter) : null

  return (
    <div className="mb-5">
      <h2 className="mb-2 text-sm font-semibold text-stone-500">🗺️ 全体像モード進捗</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {chapters.map((ch) => {
          const progressPct = ch.total > 0 ? (ch.correct / ch.total) * 100 : 0
          const isSelected = selectedChapter === ch.id
          return (
            <button
              key={ch.id}
              onClick={() => setSelectedChapter(isSelected ? null : ch.id)}
              className={`tap-highlight rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-claude-orange bg-claude-orange/5 shadow-sm dark:bg-claude-orange/10'
                  : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {ch.icon} Ch.{ch.id}
                </span>
                {ch.correctPct === 100 && <span className="text-xs">✅</span>}
              </div>
              <p className="mb-1.5 line-clamp-1 text-xs font-medium text-claude-dark dark:text-stone-200">{ch.name}</p>
              <div className="mb-1 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <div
                  className={`h-full rounded-full transition-all ${ch.correctPct === 100 ? 'bg-green-500' : 'progress-gradient'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>
                  {ch.correct}/{ch.total}問正解
                </span>
                {ch.correctPct === 100 ? (
                  <span className="text-green-600">✓</span>
                ) : ch.correct > 0 || ch.answered > 0 ? (
                  <span>あと{ch.total - ch.correct}問</span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected chapter detail + start button */}
      {selected && (
        <div className="mt-2 animate-card-enter rounded-xl border border-claude-orange/30 bg-claude-orange/5 p-4 dark:bg-claude-orange/10">
          <div className="mb-2 flex items-center gap-2">
            <span>{selected.icon}</span>
            <span className="text-sm font-semibold text-claude-dark dark:text-stone-200">
              Ch.{selected.id}: {selected.name}
            </span>
          </div>
          <p className="mb-3 text-xs text-stone-500">{selected.subtitle}</p>
          <button
            onClick={() => {
              haptics.light()
              if (selected.answered > 0 && selected.correctPct < 100 && selected.incompleteIds.length > 0) {
                // 「続きから」: 未正解の問題だけで出題
                onResumeChapter(selected.incompleteIds, `Ch.${selected.id} ${selected.name}`)
              } else {
                // 「始める」or「もう一度」: チャプター全問を順番に
                onStartChapter(selected.id, selected.startIndex)
              }
            }}
            className="tap-highlight inline-flex items-center gap-2 rounded-xl bg-claude-orange px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            {selected.correctPct === 100
              ? locale.chapterProgress.retryChapter
              : selected.answered > 0
                ? locale.chapterProgress.continueChapter
                : locale.chapterProgress.startChapter}
          </button>
        </div>
      )}
    </div>
  )
}
