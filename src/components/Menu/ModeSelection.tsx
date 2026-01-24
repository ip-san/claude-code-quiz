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
import { Database, Upload, Trash2 } from 'lucide-react'

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
    availableSets,
    activeSetInfo,
    switchQuizSet,
    deleteUserSet,
    importQuizzes,
    importError,
  } = useQuizStore()

  const [selectedMode, setSelectedMode] = useState<QuizModeId>('random')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)
  const [showDatasetPanel, setShowDatasetPanel] = useState(false)

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

  const handleImportQuizzes = async () => {
    console.log('handleImportQuizzes called')
    console.log('window.electronAPI:', window.electronAPI)
    try {
      if (!window.electronAPI) {
        console.error('electronAPI is not available')
        alert('electronAPI is not available - preload script may not be working')
        return
      }
      console.log('Calling importQuizFile...')
      const result = await window.electronAPI.importQuizFile()
      console.log('importQuizFile result:', result)
      if (result.success && result.data) {
        const success = await importQuizzes(result.data)
        if (!success) {
          console.error('Import validation failed')
        }
      } else if (result.error && result.error !== 'cancelled') {
        console.error('File import error:', result.error)
      }
    } catch (error) {
      console.error('Failed to import quiz file:', error)
      alert('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const getCategoryQuestionCount = (categoryId: string) => {
    return categoryQuestionCounts[categoryId] ?? 0
  }

  return (
    <div className="min-h-screen bg-claude-cream px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-claude-dark">
            Claude Code マスタークイズ
          </h1>
          <p className="text-claude-gray">
            公式ドキュメントに基づいた実践的な知識をテスト
          </p>
          <p className="mt-2 text-sm text-stone-400">
            全{allQuestions.length}問 | 8カテゴリ
          </p>

          {/* Dataset indicator */}
          {activeSetInfo && (
            <button
              onClick={() => setShowDatasetPanel(!showDatasetPanel)}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-600 hover:bg-stone-50"
            >
              <Database className="h-4 w-4" />
              {activeSetInfo.title}
              {activeSetInfo.type === 'default' && (
                <span className="rounded bg-claude-orange/10 px-1.5 py-0.5 text-xs text-claude-orange">
                  デフォルト
                </span>
              )}
            </button>
          )}
        </div>

        {/* Dataset Panel */}
        {showDatasetPanel && (
          <div className="mb-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-claude-dark">データセット管理</h3>

            <div className="mb-4 space-y-2">
              {availableSets.map((set) => (
                <div
                  key={set.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    set.isActive
                      ? 'border-claude-orange bg-claude-orange/5'
                      : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database className={`h-5 w-5 ${set.isActive ? 'text-claude-orange' : 'text-stone-400'}`} />
                    <div>
                      <p className="font-medium text-claude-dark">{set.title}</p>
                      <p className="text-sm text-stone-500">
                        {set.questionCount}問
                        {set.type === 'default' && ' (読み取り専用)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!set.isActive && (
                      <button
                        onClick={() => switchQuizSet(set.id)}
                        className="rounded bg-claude-orange px-3 py-1 text-sm text-white hover:bg-claude-orange/90"
                      >
                        使用する
                      </button>
                    )}
                    {set.type === 'user' && (
                      <button
                        onClick={() => deleteUserSet(set.id)}
                        className="rounded bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleImportQuizzes}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 py-3 text-stone-500 hover:border-stone-400 hover:bg-stone-50"
            >
              <Upload className="h-5 w-5" />
              クイズをインポート
            </button>

            {importError && (
              <p className="mt-2 text-sm text-red-500">{importError}</p>
            )}
          </div>
        )}

        {/* Mode Selection */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-claude-dark">
            クイズモード
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PREDEFINED_QUIZ_MODES.map((modeConfig) => (
              <button
                key={modeConfig.id}
                onClick={() => setSelectedMode(modeConfig.id)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  selectedMode === modeConfig.id
                    ? 'border-claude-orange bg-claude-orange/5 shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xl">{modeConfig.icon}</span>
                  <span className="font-medium text-claude-dark">
                    {modeConfig.name}
                  </span>
                </div>
                <p className="text-sm text-stone-500">
                  {modeConfig.description}
                </p>
                <div className="mt-2 flex gap-2 text-xs text-stone-400">
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
            <h2 className="mb-3 text-lg font-semibold text-claude-dark">
              カテゴリ選択
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PREDEFINED_CATEGORIES.map((category: Category) => (
                <button
                  key={category.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )
                  }
                  className={`rounded-lg border p-3 text-left transition-all ${
                    selectedCategory === category.id
                      ? 'shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300'
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
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span className="text-sm font-medium text-claude-dark">
                      {category.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
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
            <h2 className="mb-3 text-lg font-semibold text-claude-dark">難易度</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDifficulty(null)}
                className={`rounded-lg border px-4 py-2 transition-all ${
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
                  className={`rounded-lg border px-4 py-2 transition-all ${
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
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">選択中のモード</p>
              <p className="text-lg font-medium text-claude-dark">
                {mode?.icon} {mode?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-500">出題数</p>
              <p className="text-lg font-medium text-claude-dark">
                {mode?.questionCount ?? availableQuizzes.length}問
              </p>
            </div>
            {mode?.timeLimit && (
              <div className="text-right">
                <p className="text-sm text-stone-500">制限時間</p>
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
              className="flex-1 rounded-lg bg-claude-orange px-6 py-3 font-medium text-white transition-colors hover:bg-claude-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              クイズを開始
            </button>
            <button
              onClick={() => setViewState('progress')}
              className="rounded-lg border border-stone-300 px-6 py-3 text-stone-600 transition-colors hover:bg-stone-50"
            >
              学習履歴
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
