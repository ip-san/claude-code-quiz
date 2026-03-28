import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'

interface CategoryPickerProps {
  onClose: () => void
}

/**
 * カテゴリ選択ダイアログ（ボトムシート）
 * ハンバーガーメニューのカテゴリ別学習から表示される
 */
export function CategoryPicker({ onClose }: CategoryPickerProps) {
  const { startSession, getCategoryStats } = useQuizStore()
  const categoryStats = getCategoryStats()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="カテゴリを選択"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative mx-2 mb-2 w-full max-w-sm animate-slide-down rounded-2xl bg-white p-5 shadow-2xl dark:bg-stone-800 sm:mx-4 sm:mb-0 sm:animate-none">
        <h3 className="mb-4 text-center text-lg font-semibold text-claude-dark">カテゴリを選択</h3>
        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {PREDEFINED_CATEGORIES.map((cat) => {
            const catStats = categoryStats[cat.id]
            const accuracy = catStats?.accuracy ?? 0
            const attempted = (catStats?.attemptedQuestions ?? 0) > 0
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onClose()
                  haptics.light()
                  startSession({ mode: 'category', categoryFilter: cat.id })
                }}
                className="tap-highlight flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-stone-50 active:bg-stone-100 dark:hover:bg-stone-700 dark:active:bg-stone-600"
              >
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-claude-dark">{cat.name}</span>
                </div>
                {attempted && (
                  <span
                    className={`text-xs font-medium ${accuracy >= 80 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}
                  >
                    {accuracy}%
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          className="tap-highlight mt-3 w-full rounded-xl py-3 text-sm font-medium text-stone-500"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
