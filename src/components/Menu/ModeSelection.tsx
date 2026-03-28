import { BookOpen, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { locale } from '@/config/locale'
import { useQuizStore } from '@/stores/quizStore'
import { ChapterProgressMap } from './ChapterProgressMap'
import { DailySnapshot, hasSeenSnapshotToday } from './DailySnapshot'
import { FirstTimeGuide } from './FirstTimeGuide'
import { MenuHeader } from './MenuHeader'
import { QuickActions } from './QuickActions'
import { QuizSearch } from './QuizSearch'
import { ResumeSessionBanner } from './ResumeSessionBanner'

export function ModeSelection() {
  const { allQuestions, startSession, userProgress, setViewState } = useQuizStore()

  const [snapshotDismissed, setSnapshotDismissed] = useState(() => hasSeenSnapshotToday())

  const unansweredCount = useMemo(
    () => allQuestions.filter((q) => !userProgress.hasAttempted(q.id)).length,
    [allQuestions, userProgress]
  )

  return (
    <div className="flex min-h-dvh flex-col bg-claude-cream dark:bg-stone-900">
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
        <div className="mx-auto w-full sm:max-w-2xl lg:max-w-4xl">
          {/* Resume session banner */}
          <ResumeSessionBanner />

          {/* Header */}
          <MenuHeader
            totalQuestions={allQuestions.length}
            answeredCount={allQuestions.length - unansweredCount}
            hasProgress={userProgress.totalAttempts > 0}
          />

          {/* Daily Snapshot — removes decision paralysis (includes SRS info) */}
          {userProgress.totalAttempts > 0 && !snapshotDismissed && (
            <DailySnapshot onDismiss={() => setSnapshotDismissed(true)} />
          )}

          {/* Quick actions — shown when DailySnapshot is dismissed */}
          {userProgress.totalAttempts > 0 && snapshotDismissed && (
            <QuickActions
              allQuestions={allQuestions}
              userProgress={userProgress}
              onStart={(mode) => startSession({ mode })}
            />
          )}

          {/* First-time user: simplified entry point */}
          {userProgress.totalAttempts === 0 && <FirstTimeGuide />}

          {/* Search */}
          <QuizSearch />

          {/* Explanation Reader shortcut */}
          <button
            onClick={() => setViewState('reader')}
            className="tap-highlight mb-5 flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left dark:border-stone-700 dark:bg-stone-800"
          >
            <BookOpen className="h-5 w-5 text-stone-400" />
            <div className="flex-1">
              <span className="text-sm font-medium text-claude-dark dark:text-stone-200">{locale.reader.title}</span>
              <p className="text-xs text-stone-400">
                {allQuestions.length}問の{locale.reader.subtitle}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600" />
          </button>

          {/* Chapter progress map for overview mode */}
          <ChapterProgressMap
            allQuestions={allQuestions}
            userProgress={userProgress}
            onStartChapter={(_chapterId, startIndex) => startSession({ mode: 'overview' }, { startIndex })}
          />
        </div>
      </div>
    </div>
  )
}
