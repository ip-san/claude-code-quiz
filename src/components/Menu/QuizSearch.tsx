import { Bookmark, ChevronDown, ChevronUp, ExternalLink, Filter, Play, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QuizText } from '@/components/Quiz/QuizText'
import { getCategoryById, PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { haptics } from '@/lib/haptics'
import { useQuizStore } from '@/stores/quizStore'

/**
 * クイズ検索コンポーネント
 *
 * 2つの使い方を提供：
 * 1. クイズモード: 検索結果の問題に挑戦する
 * 2. リファレンスモード: 解説をその場で読む（業務中のクイックリファレンス）
 *
 * カテゴリフィルタでテキスト検索を絞り込める。
 */
export function QuizSearch() {
  const { allQuestions, startSessionWithIds, toggleBookmark, userProgress } = useQuizStore()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const allResults = useMemo(() => {
    if (query.length < 2 && !categoryFilter) return []
    let results = allQuestions
    if (categoryFilter) {
      results = results.filter((quiz) => quiz.category === categoryFilter)
    }
    if (query.length >= 2) {
      const q = query.toLowerCase()
      results = results.filter(
        (quiz) =>
          quiz.question.toLowerCase().includes(q) ||
          quiz.explanation.toLowerCase().includes(q) ||
          quiz.options.some((opt) => opt.text.toLowerCase().includes(q))
      )
    }
    return results
  }, [allQuestions, query, categoryFilter])

  // Display limit for the list, but quiz launch uses ALL results
  const displayResults = allResults.slice(0, 10)

  // Full-screen view for all results
  if (showAll) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-claude-cream dark:bg-stone-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
          <div>
            <h2 className="text-sm font-bold text-claude-dark dark:text-stone-200">「{query}」の検索結果</h2>
            <p className="text-xs text-stone-500">{allResults.length}件</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptics.light()
                startSessionWithIds(
                  allResults.map((r) => r.id),
                  query
                )
                setShowAll(false)
                setIsOpen(false)
                setQuery('')
              }}
              className="tap-highlight inline-flex items-center gap-1.5 rounded-xl bg-claude-orange px-3 py-1.5 text-xs font-medium text-white"
            >
              <Play className="h-3 w-3 fill-white" />
              {allResults.length}問に挑戦
            </button>
            <button
              onClick={() => {
                setShowAll(false)
                setExpandedId(null)
              }}
              className="tap-highlight rounded-full p-2 text-stone-400"
              aria-label="戻る"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* All results */}
        <div className="flex-1 overflow-y-auto">
          {allResults.map((r) => {
            const cat = getCategoryById(r.category)
            const isExpanded = expandedId === r.id
            return (
              <div key={r.id} className="border-b border-stone-100 dark:border-stone-800">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="tap-highlight flex w-full items-start gap-2 px-4 py-3 text-left"
                >
                  <span className="mt-0.5 flex-shrink-0 text-sm">{cat?.icon}</span>
                  <span className="flex-1 text-sm leading-snug text-claude-dark dark:text-stone-200">{r.question}</span>
                  {isExpanded ? (
                    <ChevronUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
                  ) : (
                    <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
                    <p className="mb-2 text-xs font-medium text-green-600 dark:text-green-400">
                      ✓ {r.options[r.correctIndex]?.text}
                    </p>
                    <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                      <QuizText text={r.explanation} />
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      {r.referenceUrl && (
                        <a
                          href={r.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-claude-orange"
                        >
                          <ExternalLink className="h-3 w-3" />
                          公式ドキュメント
                        </a>
                      )}
                      <button
                        onClick={() => {
                          haptics.light()
                          toggleBookmark(r.id)
                        }}
                        className="inline-flex items-center gap-1 text-xs text-stone-500"
                      >
                        <Bookmark
                          className={`h-3 w-3 ${userProgress.isBookmarked(r.id) ? 'fill-yellow-500 text-yellow-500' : ''}`}
                        />
                        {userProgress.isBookmarked(r.id) ? '保存済み' : '後で学ぶ'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="tap-highlight mb-5 flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-800"
      >
        <Search className="h-4 w-4" />
        検索・リファレンス
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
          onChange={(e) => {
            setQuery(e.target.value)
            setExpandedId(null)
          }}
          placeholder="例: CLAUDE.md, MCP, hooks"
          className="flex-1 bg-transparent text-sm text-claude-dark outline-none placeholder:text-stone-400 dark:text-stone-200"
          autoFocus
          aria-label="問題を検索"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`tap-highlight rounded-full p-2 ${categoryFilter ? 'text-claude-orange' : 'text-stone-400'}`}
          aria-label="カテゴリフィルタ"
        >
          <Filter className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setQuery('')
            setCategoryFilter(null)
            setShowFilters(false)
            setIsOpen(false)
            setExpandedId(null)
          }}
          className="tap-highlight rounded-full p-2 text-stone-400"
          aria-label="検索を閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category filter pills */}
      {showFilters && (
        <div className="-mx-1 mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`tap-highlight rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === null
                ? 'bg-claude-orange text-white'
                : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
            }`}
          >
            全て
          </button>
          {PREDEFINED_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
              className={`tap-highlight rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-claude-orange text-white'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {(query.length >= 2 || categoryFilter) && (
        <div className="mt-2 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
          {allResults.length === 0 ? (
            <p className="p-4 text-center text-sm text-stone-400">該当する問題が見つかりません</p>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5 dark:border-stone-700">
                <span className="text-xs text-stone-500">{allResults.length}件</span>
                <button
                  onClick={() => {
                    haptics.light()
                    startSessionWithIds(
                      allResults.map((r) => r.id),
                      query
                    )
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className="tap-highlight inline-flex items-center gap-1.5 rounded-lg bg-claude-orange px-3 py-1.5 text-xs font-medium text-white"
                >
                  <Play className="h-3 w-3 fill-white" />
                  {allResults.length}問に挑戦
                </button>
              </div>

              {/* Results — tap to expand explanation */}
              <div className="max-h-80 overflow-y-auto">
                {displayResults.map((r) => {
                  const cat = getCategoryById(r.category)
                  const isExpanded = expandedId === r.id
                  return (
                    <div key={r.id} className="border-b border-stone-50 last:border-0 dark:border-stone-700/50">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="tap-highlight flex w-full items-start gap-2 px-4 py-2.5 text-left"
                      >
                        <span className="mt-0.5 flex-shrink-0 text-sm">{cat?.icon}</span>
                        <span className="flex-1 text-sm leading-snug text-claude-dark dark:text-stone-200">
                          {r.question.length > 80 ? r.question.slice(0, 80) + '...' : r.question}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
                        ) : (
                          <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
                        )}
                      </button>
                      {/* Expanded: answer + explanation */}
                      {isExpanded && (
                        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
                          <p className="mb-2 text-xs font-medium text-green-600 dark:text-green-400">
                            ✓ {r.options[r.correctIndex]?.text}
                          </p>
                          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                            <QuizText text={r.explanation} />
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            {r.referenceUrl && (
                              <a
                                href={r.referenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-claude-orange"
                              >
                                <ExternalLink className="h-3 w-3" />
                                公式ドキュメント
                              </a>
                            )}
                            <button
                              onClick={() => {
                                haptics.light()
                                toggleBookmark(r.id)
                              }}
                              className="inline-flex items-center gap-1 text-xs text-stone-500"
                            >
                              <Bookmark
                                className={`h-3 w-3 ${userProgress.isBookmarked(r.id) ? 'fill-yellow-500 text-yellow-500' : ''}`}
                              />
                              {userProgress.isBookmarked(r.id) ? '保存済み' : '後で学ぶ'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {allResults.length > 10 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="tap-highlight w-full border-t border-stone-100 px-4 py-2.5 text-center text-xs font-medium text-claude-orange dark:border-stone-700"
                  >
                    すべて表示（残り {allResults.length - 10}件）
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
