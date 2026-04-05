import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { locale } from '@/config/locale'
import { SpacedRepetitionService } from '@/domain/services/SpacedRepetitionService'
import { haptics } from '@/lib/haptics'
import { NotificationService } from '@/lib/notifications'
import { isElectron } from '@/lib/platformAPI'
import { useQuizStore } from '@/stores/quizStore'
import { ChapterProgressMap } from './ChapterProgressMap'
import { DailySnapshot, hasSeenSnapshotToday } from './DailySnapshot'
import { FirstTimeGuide } from './FirstTimeGuide'
import { MenuHeader } from './MenuHeader'
import { NotificationOptIn } from './NotificationOptIn'
import { QuickActions } from './QuickActions'
import { QuizSearch } from './QuizSearch'
import { ResumeSessionBanner } from './ResumeSessionBanner'
import { UsageRecommend } from './UsageRecommend'

export function ModeSelection() {
  const { allQuestions, startSession, userProgress } = useQuizStore()

  const [snapshotDismissed, setSnapshotDismissed] = useState(() => hasSeenSnapshotToday())
  const [openMenuWithModes, setOpenMenuWithModes] = useState(false)

  const unansweredCount = useMemo(
    () => allQuestions.filter((q) => !userProgress.hasAttempted(q.id)).length,
    [allQuestions, userProgress]
  )

  // Schedule evening review reminder if notifications are permitted
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only on mount
  useEffect(() => {
    if (!isElectron && userProgress.totalAttempts > 0) {
      const now = Date.now()
      const dueCount = allQuestions.filter((q) => {
        const qp = userProgress.questionProgress[q.id]
        return qp && qp.attempts > 0 && SpacedRepetitionService.isDue(qp, now)
      }).length
      NotificationService.scheduleEveningReminder(dueCount)
    }
  }, [])

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

          {/* Notification opt-in — shown once for PWA users with progress */}
          {!isElectron && userProgress.totalAttempts > 0 && <NotificationOptIn />}

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

          {/* First-time user: simplified entry point (hidden when recommendation is showing) */}
          {userProgress.totalAttempts === 0 && !isElectron && (
            <FirstTimeGuide onOpenModes={() => setOpenMenuWithModes(true)} />
          )}

          {/* Quiz mode launcher — for returning users */}
          {userProgress.totalAttempts > 0 && (
            <button
              onClick={() => {
                haptics.light()
                setOpenMenuWithModes(true)
              }}
              className="tap-highlight mb-5 flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left dark:border-stone-700 dark:bg-stone-800"
            >
              <span className="text-xl">🎮</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-claude-dark dark:text-stone-200">
                  {locale.menuHeader.quizModesButton}
                </span>
                <p className="text-xs text-stone-500">{locale.menuHeader.quizModesDesc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600" />
            </button>
          )}

          {/* Usage-based recommendation (Electron only) */}
          <UsageRecommend />

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
