import { useState, useMemo, useEffect } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import {
  PREDEFINED_QUIZ_MODES,
  type QuizModeId,
} from '@/domain/valueObjects/QuizMode'
import {
  PREDEFINED_CATEGORIES,
  type Category,
} from '@/domain/valueObjects/Category'
import {
  PREDEFINED_DIFFICULTIES,
  type DifficultyLevel,
} from '@/domain/valueObjects/Difficulty'
import { ResumeSessionBanner } from './ResumeSessionBanner'
import { CustomQuizBanner } from './CustomQuizBanner'
import { StreakBanner } from './StreakBanner'
import { DailyGoalIndicator } from './DailyGoalIndicator'
import { RefreshCw, Check, Play, Moon, Sun, HelpCircle, BarChart3 } from 'lucide-react'
import { isElectron } from '@/lib/platformAPI'
import { getStoredTheme, setStoredTheme, applyTheme, type Theme } from '@/lib/theme'

import { getColorHex } from '@/lib/colors'
import { AnimatedCounter } from './AnimatedCounter'
import { KeyboardShortcutHelp } from '@/components/Layout/KeyboardShortcutHelp'
import { haptics } from '@/lib/haptics'
import { MasteryRoadmap } from './MasteryRoadmap'
import { DailySnapshot, hasSeenSnapshotToday } from './DailySnapshot'
import { QuizSearch } from './QuizSearch'

export function ModeSelection() {
  const {
    allQuestions,
    getFilteredQuestions,
    startSession,
    setViewState,
    getBookmarkedCount,
    userProgress,
    getCategoryStats,
  } = useQuizStore()

  const [selectedMode, setSelectedMode] = useState<QuizModeId>('random')
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [snapshotDismissed, setSnapshotDismissed] = useState(() => hasSeenSnapshotToday())
  const [showAllModes, setShowAllModes] = useState(false)

  const bookmarkedCount = getBookmarkedCount()

  // ? key opens keyboard shortcut help (skip when typing in input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.matches('input, textarea, [contenteditable]')) return
        setShowShortcuts(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Memoize category stats for mastery display
  const masteryStats = useMemo(() => getCategoryStats(), [getCategoryStats])

  const overviewCount = useMemo(
    () => allQuestions.filter(q => q.tags.includes('overview')).length,
    [allQuestions]
  )

  const unansweredCount = useMemo(
    () => allQuestions.filter(q => !userProgress.hasAttempted(q.id)).length,
    [allQuestions, userProgress]
  )

  const mode = useMemo(
    () => PREDEFINED_QUIZ_MODES.find((m) => m.id === selectedMode),
    [selectedMode]
  )

  const availableQuizzes = useMemo(
    () => getFilteredQuestions(selectedCategory, selectedDifficulty),
    [getFilteredQuestions, selectedCategory, selectedDifficulty]
  )

  const categoryQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const category of PREDEFINED_CATEGORIES) {
      counts[category.id] = allQuestions.filter(
        (q) => q.category === category.id
      ).length
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
      case 'overview': return overviewCount
      case 'unanswered': return unansweredCount
      case 'bookmark': return bookmarkedCount
      default: return mode?.questionCount ?? availableQuizzes.length
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
          <div className="mb-5 text-center">
            <div className="mb-2 flex items-center justify-end gap-1">
              {userProgress.totalAttempts > 0 && (
                <button
                  onClick={() => setViewState('progress')}
                  className="tap-highlight rounded-full p-2 text-stone-500"
                  aria-label="学習履歴"
                >
                  <BarChart3 className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setShowShortcuts(true)}
                className="tap-highlight hidden rounded-full p-2 text-stone-500 sm:block"
                aria-label="キーボードショートカット"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const current = getStoredTheme()
                  const next: Theme = current === 'dark' ? 'light' : 'dark'
                  setStoredTheme(next)
                  applyTheme(next)
                }}
                className="tap-highlight rounded-full p-2 text-stone-500"
                aria-label="テーマ切替"
              >
                {getStoredTheme() === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
            <h1 className="mb-1 text-2xl font-bold">
              <span className="bg-gradient-to-r from-claude-orange to-orange-400 bg-clip-text text-transparent">
                Claude Code Quiz
              </span>
            </h1>
            <p className="text-sm text-claude-gray">
              {userProgress.totalAttempts > 0 ? (
                <>
                  <AnimatedCounter target={allQuestions.length} suffix="問" /> |{' '}
                  {allQuestions.length - unansweredCount}問 解答済み
                </>
              ) : (
                <>
                  <AnimatedCounter target={allQuestions.length} suffix="問" /> | 8カテゴリ
                </>
              )}
            </p>
          </div>

          {/* Engagement — compact single section */}
          <div className="mb-5 flex flex-col gap-2">
            <StreakBanner />
            {userProgress.totalAttempts > 0 && <DailyGoalIndicator />}
          </div>

          {/* Daily Snapshot — removes decision paralysis (includes SRS info) */}
          {userProgress.totalAttempts > 0 && !snapshotDismissed && (
            <DailySnapshot onDismiss={() => setSnapshotDismissed(true)} />
          )}

          {/* First-time user: simplified entry point */}
          {userProgress.totalAttempts === 0 && (
            <div className="mb-5 space-y-3">
              <div className="rounded-2xl border-2 border-claude-orange/30 bg-gradient-to-r from-claude-orange/5 to-transparent p-4">
                <p className="mb-1 text-xs font-semibold text-claude-orange">はじめての方へ</p>
                <p className="mb-3 text-sm text-claude-dark">
                  AI の知識は問いません。全体像モードで基礎から順番にガイドします。完了すると修了証が発行されます。
                </p>
                <button
                  onClick={() => {
                    haptics.light()
                    startSession({ mode: 'overview' })
                  }}
                  className="tap-highlight inline-flex items-center gap-2 rounded-2xl bg-claude-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  🗺️ 全体像モードで始める
                </button>
              </div>
              <button
                onClick={() => {
                  haptics.light()
                  startSession({ mode: 'random' })
                }}
                className="tap-highlight w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                🎲 まずは気軽にチャレンジ
              </button>
            </div>
          )}

          {/* Search */}
          <QuizSearch />

          {/* Mode Selection — primary modes always visible, rest collapsible */}
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-stone-500">モード</h2>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_QUIZ_MODES
                .filter((m) => m.id !== 'review')
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
                      const count = modeConfig.id === 'overview' ? overviewCount
                        : modeConfig.id === 'bookmark' ? bookmarkedCount
                        : modeConfig.id === 'unanswered' ? unansweredCount
                        : modeConfig.questionCount
                      return count ? (
                        <span className={`text-xs ${selectedMode === modeConfig.id ? 'text-white/70' : 'text-stone-400'}`}>
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
                  className="tap-highlight flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3.5 py-2 text-sm text-stone-400"
                >
                  <span>その他</span>
                  <span className="text-xs">+5</span>
                </button>
              )}
              {showAllModes && (
                <button
                  onClick={() => setShowAllModes(false)}
                  className="tap-highlight flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3.5 py-2 text-sm text-stone-400"
                >
                  閉じる
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          {(selectedMode === 'category' || selectedMode === 'custom') && (
            <div className="mb-5">
              <h2 className="mb-2 text-sm font-semibold text-stone-500">
                カテゴリ
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {PREDEFINED_CATEGORIES.map((category: Category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      haptics.light()
                      setSelectedCategory(
                        selectedCategory === category.id ? null : category.id
                      )
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
                      <span className="text-xs font-medium text-claude-dark">
                        {category.name}
                      </span>
                      <span className="text-xs text-stone-400">
                        {getCategoryQuestionCount(category.id)}問
                      </span>
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
                    onClick={() =>
                      setSelectedDifficulty(
                        selectedDifficulty === diff.id ? null : diff.id
                      )
                    }
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

          {/* AI Mastery Roadmap — 5段階の成長ロードマップ */}
          {userProgress.totalAttempts > 0 && (
            <MasteryRoadmap
              totalCorrect={userProgress.totalCorrect}
              totalAttempts={userProgress.totalAttempts}
              totalQuestions={allQuestions.length}
              unansweredCount={unansweredCount}
              categoryStats={masteryStats}
            />
          )}

          {/* Category mastery overview — moved to ProgressDashboard for cleaner menu */}

          {/* Custom quiz CTA — only show for power users (Electron/developer context) */}
          {isElectron && <CustomQuizBanner />}

          {/* Update check (PWA only) */}
          {!isElectron && (
            <div className="text-center">
              <button
                onClick={async () => {
                  setUpdateStatus(null)
                  const reg = await navigator.serviceWorker?.getRegistration()
                  if (reg) {
                    await reg.update()
                    // Wait briefly for new SW to install
                    await new Promise(r => setTimeout(r, 1000))
                    if (reg.waiting) {
                      // New version found — reload to apply
                      window.location.reload()
                    } else {
                      setUpdateStatus('最新版です')
                      setTimeout(() => setUpdateStatus(null), 2000)
                    }
                  }
                }}
                className="tap-highlight inline-flex items-center gap-1.5 text-xs text-stone-400"
                aria-label="更新を確認"
              >
                {updateStatus ? <Check className="h-3.5 w-3.5 text-green-500" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {updateStatus ?? '更新を確認'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcut help (desktop) */}
      <KeyboardShortcutHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Fixed bottom bar — start button (hidden for first-time users who use inline CTAs) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-3 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95">
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
