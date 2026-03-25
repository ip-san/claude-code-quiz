import { Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type Category, PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { type DifficultyLevel, PREDEFINED_DIFFICULTIES } from '@/domain/valueObjects/Difficulty'
import { PREDEFINED_QUIZ_MODES, type QuizModeId } from '@/domain/valueObjects/QuizMode'
import { getColorHex } from '@/lib/colors'
import { haptics } from '@/lib/haptics'
import { isElectron } from '@/lib/platformAPI'
import { bottomBarStyles } from '@/lib/styles'
import { useQuizStore } from '@/stores/quizStore'
import { ChapterProgressMap } from './ChapterProgressMap'
import { CustomQuizBanner } from './CustomQuizBanner'
import { DailySnapshot, hasSeenSnapshotToday } from './DailySnapshot'
import { FirstTimeGuide } from './FirstTimeGuide'
import { MenuHeader } from './MenuHeader'
import { QuizSearch } from './QuizSearch'
import { ResumeSessionBanner } from './ResumeSessionBanner'

export function ModeSelection() {
  const { allQuestions, getFilteredQuestions, startSession, getBookmarkedCount, userProgress } = useQuizStore()

  const [selectedMode, setSelectedMode] = useState<QuizModeId>('random')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)
  const [snapshotDismissed, setSnapshotDismissed] = useState(() => hasSeenSnapshotToday())
  const [showAllModes, setShowAllModes] = useState(false)

  const bookmarkedCount = getBookmarkedCount()

  const overviewCount = useMemo(() => allQuestions.filter((q) => q.tags.includes('overview')).length, [allQuestions])

  const unansweredCount = useMemo(
    () => allQuestions.filter((q) => !userProgress.hasAttempted(q.id)).length,
    [allQuestions, userProgress]
  )

  const mode = useMemo(() => PREDEFINED_QUIZ_MODES.find((m) => m.id === selectedMode), [selectedMode])

  const availableQuizzes = useMemo(
    () => getFilteredQuestions(selectedCategory, selectedDifficulty),
    [getFilteredQuestions, selectedCategory, selectedDifficulty]
  )

  const categoryQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const category of PREDEFINED_CATEGORIES) {
      counts[category.id] = allQuestions.filter((q) => q.category === category.id).length
    }
    return counts
  }, [allQuestions])

  const handleStart = () => {
    startSession({
      mode: selectedMode,
      categoryFilter: selectedCategory,
      difficultyFilter: selectedDifficulty,
    })
  }

  const getCategoryQuestionCount = (categoryId: string) => {
    return categoryQuestionCounts[categoryId] ?? 0
  }

  /** 選択中モードの出題数を取得 */
  const getQuestionCount = (): number => {
    switch (selectedMode) {
      case 'overview':
        return overviewCount
      case 'unanswered':
        return unansweredCount
      case 'bookmark':
        return bookmarkedCount
      default:
        return mode?.questionCount ?? availableQuizzes.length
    }
  }
  const questionCount = getQuestionCount()

  return (
    <div className="flex min-h-screen flex-col bg-claude-cream">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
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

          {/* First-time user: simplified entry point */}
          {userProgress.totalAttempts === 0 && <FirstTimeGuide />}

          {/* Search */}
          <QuizSearch />

          {/* Chapter progress map for overview mode */}
          <ChapterProgressMap
            allQuestions={allQuestions}
            userProgress={userProgress}
            onStartChapter={() => startSession({ mode: 'overview' })}
          />

          {/* Mode Selection — primary modes always visible, rest collapsible */}
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-stone-500">モード</h2>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_QUIZ_MODES.filter((m) => m.id !== 'review')
                .filter((m) => {
                  // Primary modes always shown; others visible when expanded or selected
                  const primaryModes = ['overview', 'random', 'category', 'quick']
                  return showAllModes || primaryModes.includes(m.id) || m.id === selectedMode
                })
                .map((modeConfig) => {
                  const isDisabled =
                    (modeConfig.id === 'bookmark' && bookmarkedCount === 0) ||
                    (modeConfig.id === 'unanswered' && unansweredCount === 0)
                  return (
                    <button
                      key={modeConfig.id}
                      onClick={() => {
                        if (isDisabled) return
                        haptics.light()
                        setSelectedMode(modeConfig.id)
                        // Reset filters when switching away from category/custom mode
                        if (modeConfig.id !== 'category' && modeConfig.id !== 'custom') {
                          setSelectedCategory(null)
                          setSelectedDifficulty(null)
                        }
                      }}
                      disabled={isDisabled}
                      aria-disabled={isDisabled || undefined}
                      className={`tap-highlight flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                        isDisabled
                          ? 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-50 dark:border-stone-700 dark:bg-stone-800'
                          : selectedMode === modeConfig.id
                            ? 'border-claude-orange bg-claude-orange text-white shadow-sm'
                            : 'border-stone-200 bg-white text-claude-dark dark:border-stone-700 dark:bg-stone-800'
                      }`}
                    >
                      <span>{modeConfig.icon}</span>
                      <span>{modeConfig.name}</span>
                      {(() => {
                        const count =
                          modeConfig.id === 'overview'
                            ? overviewCount
                            : modeConfig.id === 'bookmark'
                              ? bookmarkedCount
                              : modeConfig.id === 'unanswered'
                                ? unansweredCount
                                : modeConfig.questionCount
                        return count ? (
                          <span
                            className={`text-xs ${selectedMode === modeConfig.id ? 'text-white/70' : 'text-stone-400'}`}
                          >
                            {count}
                          </span>
                        ) : null
                      })()}
                    </button>
                  )
                })}
              {!showAllModes && (
                <button
                  onClick={() => setShowAllModes(true)}
                  className="tap-highlight flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3.5 py-2 text-sm text-stone-400 dark:border-stone-600 dark:text-stone-500"
                >
                  <span>その他</span>
                  <span className="text-xs">+5</span>
                </button>
              )}
              {showAllModes && (
                <button
                  onClick={() => setShowAllModes(false)}
                  className="tap-highlight flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3.5 py-2 text-sm text-stone-400 dark:border-stone-600 dark:text-stone-500"
                >
                  閉じる
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          {(selectedMode === 'category' || selectedMode === 'custom') && (
            <div className="mb-5">
              <h2 className="mb-2 text-sm font-semibold text-stone-500">カテゴリ</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {PREDEFINED_CATEGORIES.map((category: Category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      haptics.light()
                      setSelectedCategory(selectedCategory === category.id ? null : category.id)
                    }}
                    aria-pressed={selectedCategory === category.id}
                    className={`tap-highlight rounded-2xl border p-2.5 text-center transition-all ${
                      selectedCategory === category.id
                        ? 'shadow-sm'
                        : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800'
                    }`}
                    style={
                      selectedCategory === category.id
                        ? {
                            borderColor: getColorHex(category.color ?? 'gray'),
                            backgroundColor: `${getColorHex(category.color ?? 'gray')}10`,
                          }
                        : {}
                    }
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xl">{category.icon}</span>
                      <span className="text-xs font-medium text-claude-dark">{category.name}</span>
                      <span className="text-xs text-stone-400">{getCategoryQuestionCount(category.id)}問</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Filter */}
          {selectedMode === 'custom' && (
            <div className="mb-5">
              <h2 className="mb-2 text-sm font-semibold text-stone-500">難易度</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDifficulty(null)}
                  className={`tap-highlight rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                    selectedDifficulty === null
                      ? 'border-claude-orange bg-claude-orange text-white'
                      : 'border-stone-200 bg-white text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400'
                  }`}
                >
                  すべて
                </button>
                {PREDEFINED_DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => setSelectedDifficulty(selectedDifficulty === diff.id ? null : diff.id)}
                    className={`tap-highlight rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                      selectedDifficulty === diff.id
                        ? 'border-claude-orange bg-claude-orange text-white'
                        : 'border-stone-200 bg-white text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {diff.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom quiz CTA — only show for power users (Electron/developer context) */}
          {isElectron && <CustomQuizBanner />}
        </div>
      </div>

      {/* Fixed bottom bar — start button (hidden for first-time users who use inline CTAs) */}
      <div className={`${bottomBarStyles.fixed} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-3`}>
        <div className="mx-auto flex items-center gap-4 sm:max-w-2xl lg:max-w-4xl">
          <div className="flex-1">
            <p className="text-xs text-stone-500">
              {mode?.icon} {mode?.name}
            </p>
            <p className="text-sm font-semibold text-claude-dark">
              {questionCount}問{mode?.timeLimit ? ` / ${mode.timeLimit}分` : ''}
            </p>
          </div>
          <button
            onClick={handleStart}
            disabled={availableQuizzes.length === 0}
            className="tap-highlight inline-flex items-center gap-2 rounded-2xl bg-claude-orange px-8 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-white" />
            開始
          </button>
        </div>
      </div>
    </div>
  )
}
