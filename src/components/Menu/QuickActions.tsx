import { useMemo } from 'react'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import { SpacedRepetitionService } from '@/domain/services/SpacedRepetitionService'
import type { QuizModeId } from '@/domain/valueObjects/QuizMode'
import { haptics } from '@/lib/haptics'

interface QuickActionsProps {
  allQuestions: readonly Question[]
  userProgress: UserProgress
  onStart: (mode: QuizModeId) => void
}

interface QuickAction {
  mode: QuizModeId
  icon: string
  label: string
  sublabel: string
  priority: number
}

export function QuickActions({ allQuestions, userProgress, onStart }: QuickActionsProps) {
  const actions = useMemo(() => {
    const now = Date.now()
    const candidates: QuickAction[] = []

    // SRS due count
    const dueCount = allQuestions.filter((q) => {
      const qp = userProgress.questionProgress[q.id]
      return qp && qp.attempts > 0 && SpacedRepetitionService.isDue(qp, now)
    }).length

    // Weak question count
    const weakCount = allQuestions.filter((q) => userProgress.isWeakQuestion(q.id, 50, 2)).length

    // Unanswered count
    const unansweredCount = allQuestions.filter((q) => !userProgress.hasAttempted(q.id)).length

    // Bookmarked count
    const bookmarkedCount = userProgress.bookmarkedQuestionIds.length

    // SRS review — highest priority when due
    if (dueCount > 0) {
      candidates.push({
        mode: 'quick',
        icon: '⚡',
        label: '復習チェック',
        sublabel: `${dueCount}問が期限到来`,
        priority: 100,
      })
    }

    // Random — always available, good default
    candidates.push({
      mode: 'random',
      icon: '🎲',
      label: 'ランダム20問',
      sublabel: 'まずはサクッと',
      priority: 50,
    })

    // Weak mode — when user has weak questions
    if (weakCount > 0) {
      candidates.push({
        mode: 'weak',
        icon: '🔥',
        label: '苦手克服',
        sublabel: `${weakCount}問が苦手`,
        priority: 80,
      })
    }

    // Unanswered — when many questions remain
    if (unansweredCount > 0 && unansweredCount < allQuestions.length) {
      candidates.push({
        mode: 'unanswered',
        icon: '🆕',
        label: '未解答',
        sublabel: `残り${unansweredCount}問`,
        priority: unansweredCount > allQuestions.length * 0.5 ? 60 : 40,
      })
    }

    // Bookmarked
    if (bookmarkedCount > 0) {
      candidates.push({
        mode: 'bookmark',
        icon: '📌',
        label: '後で学ぶ',
        sublabel: `${bookmarkedCount}問`,
        priority: 45,
      })
    }

    // Full test — for experienced users
    if (userProgress.totalAttempts >= 50) {
      candidates.push({
        mode: 'full',
        icon: '🎯',
        label: '実力テスト',
        sublabel: '100問 / 60分',
        priority: 30,
      })
    }

    // Sort by priority and take top 3
    return candidates.sort((a, b) => b.priority - a.priority).slice(0, 3)
  }, [allQuestions, userProgress])

  if (actions.length === 0) return null

  return (
    <div className="mb-5">
      <div className={`grid gap-2 ${actions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {actions.map((action) => (
          <button
            key={action.mode}
            onClick={() => {
              haptics.light()
              onStart(action.mode)
            }}
            className="tap-highlight flex flex-col items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-3 text-center dark:border-stone-700 dark:bg-stone-800"
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-xs font-semibold text-claude-dark dark:text-stone-200">{action.label}</span>
            <span className="text-[10px] text-stone-400">{action.sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
