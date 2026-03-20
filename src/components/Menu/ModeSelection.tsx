import { useState, useMemo } from 'react'
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

// Color mapping for categories
const COLOR_MAP: Record<string, string> = {
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  yellow: '#eab308',
  emerald: '#10b981',
  gray: '#6b7280',
}

function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName] ?? COLOR_MAP.gray
}

export function ModeSelection() {
  const {
    allQuestions,
    getFilteredQuestions,
    startSession,
    setViewState,
    getBookmarkedCount,
    userProgress,
  } = useQuizStore()

  const [selectedMode, setSelectedMode] = useState<QuizModeId>('random')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)

  const bookmarkedCount = getBookmarkedCount()

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

  const questionCount = selectedMode === 'overview'
    ? overviewCount
    : selectedMode === 'unanswered'
      ? unansweredCount
      : (mode?.questionCount ?? availableQuizzes.length)

  return (
    <div className="flex min-h-screen flex-col bg-claude-cream">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
        <div className="mx-auto w-full sm:max-w-2xl lg:max-w-4xl">
          {/* Resume session banner */}
          <ResumeSessionBanner />

          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="mb-1 text-2xl font-bold text-claude-dark">
              Claude Code Quiz
            </h1>
            <p className="text-sm text-claude-gray">
              {allQuestions.length}問 | 8カテゴリ
            </p>
          </div>

          {/* Mode Selection — horizontal scroll on mobile */}
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-stone-500">
              モード
            </h2>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_QUIZ_MODES
                .filter((m) => m.id !== 'review')
                .map((modeConfig) => {
                const isDisabled =
                  (modeConfig.id === 'bookmark' && bookmarkedCount === 0) ||
                  (modeConfig.id === 'unanswered' && unansweredCount === 0)
                return (
                  <button
                    key={modeConfig.id}
                    onClick={() => !isDisabled && setSelectedMode(modeConfig.id)}
                    disabled={isDisabled}
                    className={`tap-highlight flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                      isDisabled
                        ? 'cursor-not-allowed border-stone-200 bg-stone-50 opacity-40'
                        : selectedMode === modeConfig.id
                          ? 'border-claude-orange bg-claude-orange text-white shadow-sm'
                          : 'border-stone-200 bg-white text-claude-dark'
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
            </div>
          </div>

          {/* Category Filter */}
          {(selectedMode === 'category' || selectedMode === 'custom') && (
            <div className="mb-5">
              <h2 className="mb-2 text-sm font-semibold text-stone-500">
                カテゴリ
              </h2>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {PREDEFINED_CATEGORIES.map((category: Category) => (
                  <button
                    key={category.id}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === category.id ? null : category.id
                      )
                    }
                    className={`tap-highlight rounded-2xl border p-2.5 text-center transition-all ${
                      selectedCategory === category.id
                        ? 'shadow-sm'
                        : 'border-stone-200 bg-white'
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
                      <span className="text-[10px] text-stone-400">
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
                      : 'border-stone-200 bg-white text-stone-500'
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
                        : 'border-stone-200 bg-white text-stone-500'
                    }`}
                  >
                    {diff.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Learning history link */}
          <button
            onClick={() => setViewState('progress')}
            className="tap-highlight w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-center text-sm font-medium text-stone-600"
          >
            学習履歴を見る
          </button>
        </div>
      </div>

      {/* Fixed bottom bar — start button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-3 backdrop-blur-sm">
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
            className="tap-highlight rounded-2xl bg-claude-orange px-8 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            開始
          </button>
        </div>
      </div>
    </div>
  )
}
