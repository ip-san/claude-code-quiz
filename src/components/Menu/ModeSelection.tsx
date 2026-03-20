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

/**
 * Mode selection menu component
 * Allows users to select quiz mode, category filter, and difficulty
 */
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

  // Memoize overview question count (tag-based)
  const overviewCount = useMemo(
    () => allQuestions.filter(q => q.tags.includes('overview')).length,
    [allQuestions]
  )

  // Memoize unanswered question count
  const unansweredCount = useMemo(
    () => allQuestions.filter(q => !userProgress.hasAttempted(q.id)).length,
    [allQuestions, userProgress]
  )

  // Memoize mode lookup to avoid re-finding on every render
  const mode = useMemo(
    () => PREDEFINED_QUIZ_MODES.find((m) => m.id === selectedMode),
    [selectedMode]
  )

  // Memoize filtered quizzes to avoid recalculation
  const availableQuizzes = useMemo(
    () => getFilteredQuestions(selectedCategory, selectedDifficulty),
    [getFilteredQuestions, selectedCategory, selectedDifficulty]
  )

  // Memoize category question counts
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

  return (
    <div className="flex min-h-screen flex-col justify-center bg-claude-cream px-3 pb-6 pt-2 sm:px-4 sm:pb-8 sm:pt-4">
      <div className="mx-auto w-full max-w-4xl">
        {/* Resume session banner */}
        <ResumeSessionBanner />

        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="mb-1 text-xl font-bold text-claude-dark sm:text-2xl">
            Claude Code マスタークイズ
          </h1>
          <p className="text-sm text-claude-gray">
            公式ドキュメントに基づいた実践的な知識をテスト
          </p>
          <p className="mt-1 text-sm text-stone-400">
            全{allQuestions.length}問 | 8カテゴリ
          </p>

        </div>

        {/* Mode Selection */}
        <div className="mb-4">
          <h2 className="mb-2 text-base font-semibold text-claude-dark">
            クイズモード
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
            {PREDEFINED_QUIZ_MODES
              .filter((m) => m.id !== 'review')
              .map((modeConfig, idx) => {
              const isDisabled =
                (modeConfig.id === 'bookmark' && bookmarkedCount === 0) ||
                (modeConfig.id === 'unanswered' && unansweredCount === 0)
              return (
                <button
                  key={modeConfig.id}
                  onClick={() => !isDisabled && setSelectedMode(modeConfig.id)}
                  disabled={isDisabled}
                  className={`animate-card-enter rounded-lg border p-3 text-left transition-all ${
                    isDisabled
                      ? 'cursor-not-allowed border-stone-200 bg-stone-50 opacity-50'
                      : selectedMode === modeConfig.id
                        ? 'border-claude-orange bg-claude-orange/5 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-lg">{modeConfig.icon}</span>
                    <span className="text-sm font-medium text-claude-dark">
                      {modeConfig.name}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {modeConfig.description}
                  </p>
                  <div className="mt-1.5 flex gap-1 text-xs text-stone-400">
                    {modeConfig.id === 'overview' ? (
                      <span>{overviewCount}問</span>
                    ) : modeConfig.id === 'bookmark' ? (
                      <span>{bookmarkedCount}問</span>
                    ) : modeConfig.id === 'unanswered' ? (
                      <span>{unansweredCount}問</span>
                    ) : (
                      <>
                        {modeConfig.questionCount && (
                          <span>{modeConfig.questionCount}問</span>
                        )}
                        {modeConfig.timeLimit && (
                          <span>{modeConfig.timeLimit}分</span>
                        )}
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Category Filter (for category mode) */}
        {(selectedMode === 'category' || selectedMode === 'custom') && (
          <div className="mb-4">
            <h2 className="mb-2 text-base font-semibold text-claude-dark">
              カテゴリ選択
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {PREDEFINED_CATEGORIES.map((category: Category, catIdx) => (
                <button
                  key={category.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )
                  }
                  className={`animate-card-enter rounded-lg border p-2 text-center transition-all ${
                    selectedCategory === category.id
                      ? 'shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                  style={{
                    animationDelay: `${catIdx * 40}ms`,
                    ...(selectedCategory === category.id
                      ? {
                          borderColor: getColorHex(category.color ?? 'gray'),
                          backgroundColor: `${getColorHex(category.color ?? 'gray')}10`,
                        }
                      : {}),
                  }}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-lg">{category.icon}</span>
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

        {/* Difficulty Filter (for custom mode) */}
        {selectedMode === 'custom' && (
          <div className="mb-4">
            <h2 className="mb-2 text-base font-semibold text-claude-dark">難易度</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDifficulty(null)}
                className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                  selectedDifficulty === null
                    ? 'border-claude-orange bg-claude-orange/5 text-claude-dark'
                    : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
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
                  className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                    selectedDifficulty === diff.id
                      ? 'border-claude-orange bg-claude-orange/5 text-claude-dark'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {diff.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary & Start Button */}
        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500">選択中のモード</p>
              <p className="text-lg font-medium text-claude-dark">
                {mode?.icon} {mode?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">出題数</p>
              <p className="text-lg font-medium text-claude-dark">
                {selectedMode === 'overview'
                  ? overviewCount
                  : selectedMode === 'unanswered'
                    ? unansweredCount
                    : (mode?.questionCount ?? availableQuizzes.length)}問
              </p>
            </div>
            {mode?.timeLimit && (
              <div className="text-right">
                <p className="text-xs text-stone-500">制限時間</p>
                <p className="text-lg font-medium text-claude-dark">
                  {mode.timeLimit}分
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={availableQuizzes.length === 0}
              className="tap-highlight flex-1 rounded-2xl bg-claude-orange px-6 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              クイズを開始
            </button>
            <button
              onClick={() => setViewState('progress')}
              className="tap-highlight rounded-2xl border border-stone-300 px-6 py-3.5 text-base font-semibold text-stone-600"
            >
              学習履歴
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
