import { useState, useMemo } from 'react'
import { Search, X, Play } from 'lucide-react'
import { useQuizStore } from '@/stores/quizStore'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { haptics } from '@/lib/haptics'

/**
 * クイズ検索コンポーネント
 * 630問からキーワードで問題を検索し、選んだカテゴリでセッション開始できる
 */
export function QuizSearch() {
  const { allQuestions, startSession } = useQuizStore()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const results = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return allQuestions
      .filter(quiz =>
        quiz.question.toLowerCase().includes(q) ||
        quiz.explanation.toLowerCase().includes(q) ||
        quiz.options.some(opt => opt.text.toLowerCase().includes(q))
      )
      .slice(0, 10) // 最大10件
  }, [allQuestions, query])

  // 検索結果からカテゴリ別に集計
  const categoryHits = useMemo(() => {
    const counts = new Map<string, number>()
    results.forEach(r => counts.set(r.category, (counts.get(r.category) ?? 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([catId, count]) => ({ category: getCategoryById(catId), count }))
      .filter(c => c.category)
  }, [results])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="tap-highlight mb-5 flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-800"
      >
        <Search className="h-4 w-4" />
        問題を検索...
      </button>
    )
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 rounded-2xl border border-claude-orange bg-white px-4 py-2.5 dark:bg-stone-800">
        <Search className="h-4 w-4 text-claude-orange" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="キーワードで検索（例: CLAUDE.md, MCP, hooks）"
          className="flex-1 bg-transparent text-sm text-claude-dark outline-none placeholder:text-stone-400 dark:text-stone-200"
          autoFocus
          aria-label="問題を検索"
        />
        <button
          onClick={() => { setQuery(''); setIsOpen(false) }}
          className="tap-highlight rounded-full p-1 text-stone-400"
          aria-label="検索を閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Results */}
      {query.length >= 2 && (
        <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-800">
          {results.length === 0 ? (
            <p className="text-center text-sm text-stone-400">該当する問題が見つかりません</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-stone-400">{results.length}件の問題が見つかりました</p>
              {/* Category summary with start buttons */}
              {categoryHits.map(({ category, count }) => (
                <button
                  key={category!.id}
                  onClick={() => {
                    haptics.light()
                    startSession({ mode: 'category', categoryFilter: category!.id })
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className="tap-highlight mb-1.5 flex w-full items-center justify-between rounded-xl border border-stone-100 px-3 py-2 text-left dark:border-stone-700"
                >
                  <div className="flex items-center gap-2">
                    <span>{category!.icon}</span>
                    <span className="text-sm font-medium text-claude-dark">{category!.name}</span>
                    <span className="text-xs text-stone-400">{count}件</span>
                  </div>
                  <Play className="h-3.5 w-3.5 text-claude-orange" />
                </button>
              ))}
              {/* Sample questions */}
              <div className="mt-2 border-t border-stone-100 pt-2 dark:border-stone-700">
                {results.slice(0, 3).map(r => (
                  <p key={r.id} className="mb-1 truncate text-xs text-stone-500 dark:text-stone-400">
                    {r.question}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
