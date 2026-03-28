import { useMemo, useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { ChapterProgressMap } from './ChapterProgressMap'
import { DailySnapshot, hasSeenSnapshotToday } from './DailySnapshot'
import { FirstTimeGuide } from './FirstTimeGuide'
import { MenuHeader } from './MenuHeader'
import { QuickActions } from './QuickActions'
import { QuizSearch } from './QuizSearch'
import { ResumeSessionBanner } from './ResumeSessionBanner'

export function ModeSelection() {
  const { allQuestions, startSession, userProgress } = useQuizStore()

  const [snapshotDismissed, setSnapshotDismissed] = useState(() => hasSeenSnapshotToday())
  const [openMenuWithModes, setOpenMenuWithModes] = useState(false)

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
            openWithModes={openMenuWithModes}
            onMenuOpened={() => setOpenMenuWithModes(false)}
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
          {userProgress.totalAttempts === 0 && <FirstTimeGuide onOpenModes={() => setOpenMenuWithModes(true)} />}

          {/* Search */}
          <QuizSearch />

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
