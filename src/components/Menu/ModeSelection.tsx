import { useState, useMemo } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import {
  QUIZ_MODES,
  CATEGORIES,
  DIFFICULTIES,
  getColorHex,
} from '@/config/quizConfig'
import type { CategoryConfig } from '@/types/quiz'

/**
 * Mode selection menu component
 * Allows users to select quiz mode, category filter, and difficulty
 */
export function ModeSelection() {
  const { allQuizzes, getFilteredQuizzes, startSession, setViewState } =
    useQuizStore()

  const [selectedMode, setSelectedMode] = useState<string>('random')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  )

  // Memoize mode lookup to avoid re-finding on every render
  const mode = useMemo(
    () => QUIZ_MODES.find((m) => m.id === selectedMode),
    [selectedMode]
  )

  // Memoize filtered quizzes to avoid recalculation
  const availableQuizzes = useMemo(
    () =>
      getFilteredQuizzes(
        selectedCategory,
        selectedDifficulty as 'beginner' | 'intermediate' | 'advanced' | null
      ),
    [getFilteredQuizzes, selectedCategory, selectedDifficulty]
  )

  // Memoize category question counts
  const categoryQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const category of CATEGORIES) {
      counts[category.id] = allQuizzes.filter(
        (q) => q.category === category.id
      ).length
    }
    return counts
  }, [allQuizzes])

  const handleStart = () => {
    startSession({
      mode: selectedMode as
        | 'full'
        | 'category'
        | 'random'
        | 'weak'
        | 'custom',
      categoryFilter: selectedCategory,
      difficultyFilter: selectedDifficulty as
        | 'beginner'
        | 'intermediate'
        | 'advanced'
        | null,
    })
  }

  const getCategoryQuestionCount = (categoryId: string) => {
    return categoryQuestionCounts[categoryId] ?? 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">
            Claude Code マスタークイズ
          </h1>
          <p className="text-slate-400">
            公式ドキュメントに基づいた実践的な知識をテスト
          </p>
          <p className="mt-2 text-sm text-slate-500">
            全{allQuizzes.length}問 | 8カテゴリ
          </p>
        </div>

        {/* Mode Selection */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-white">
            クイズモード
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUIZ_MODES.map((modeConfig) => (
              <button
                key={modeConfig.id}
                onClick={() => setSelectedMode(modeConfig.id)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  selectedMode === modeConfig.id
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xl">{modeConfig.icon}</span>
                  <span className="font-medium text-white">
                    {modeConfig.name}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {modeConfig.description}
                </p>
                <div className="mt-2 flex gap-2 text-xs text-slate-500">
                  {modeConfig.questionCount && (
                    <span>{modeConfig.questionCount}問</span>
                  )}
                  {modeConfig.timeLimit && (
                    <span>{modeConfig.timeLimit}分制限</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter (for category mode) */}
        {(selectedMode === 'category' || selectedMode === 'custom') && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-white">
              カテゴリ選択
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((category: CategoryConfig) => (
                <button
                  key={category.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )
                  }
                  className={`rounded-lg border p-3 text-left transition-all ${
                    selectedCategory === category.id
                      ? `border-${category.color}-500 bg-${category.color}-500/20`
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                  style={
                    selectedCategory === category.id
                      ? {
                          borderColor: getColorHex(category.color ?? 'gray'),
                          backgroundColor: `${getColorHex(category.color ?? 'gray')}20`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span className="text-sm font-medium text-white">
                      {category.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {getCategoryQuestionCount(category.id)}問
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty Filter (for custom mode) */}
        {selectedMode === 'custom' && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-white">難易度</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDifficulty(null)}
                className={`rounded-lg border px-4 py-2 transition-all ${
                  selectedDifficulty === null
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                すべて
              </button>
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff.id}
                  onClick={() =>
                    setSelectedDifficulty(
                      selectedDifficulty === diff.id ? null : diff.id
                    )
                  }
                  className={`rounded-lg border px-4 py-2 transition-all ${
                    selectedDifficulty === diff.id
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {diff.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary & Start Button */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">選択中のモード</p>
              <p className="text-lg font-medium text-white">
                {mode?.icon} {mode?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">出題数</p>
              <p className="text-lg font-medium text-white">
                {mode?.questionCount ?? availableQuizzes.length}問
              </p>
            </div>
            {mode?.timeLimit && (
              <div className="text-right">
                <p className="text-sm text-slate-400">制限時間</p>
                <p className="text-lg font-medium text-white">
                  {mode.timeLimit}分
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={availableQuizzes.length === 0}
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              クイズを開始
            </button>
            <button
              onClick={() => setViewState('progress')}
              className="rounded-lg border border-slate-600 px-6 py-3 text-slate-300 transition-colors hover:bg-slate-700"
            >
              学習履歴
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
