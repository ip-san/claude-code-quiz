import { useState, useMemo } from 'react'
import { Search, X, Play, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useQuizStore } from '@/stores/quizStore'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { haptics } from '@/lib/haptics'
import { QuizText } from '@/components/Quiz/QuizText'

/**
 * クイズ検索コンポーネント
 *
 * 2つの使い方を提供：
 * 1. クイズモード: 検索結果の問題に挑戦する
 * 2. リファレンスモード: 解説をその場で読む（業務中のクイックリファレンス）
 */
export function QuizSearch() {
  const { allQuestions, startSessionWithIds } = useQuizStore()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const results = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return allQuestions
      .filter(quiz =>
        quiz.question.toLowerCase().includes(q) ||
        quiz.explanation.toLowerCase().includes(q) ||
        quiz.options.some(opt => opt.text.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [allQuestions, query])

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
          onChange={(e) => { setQuery(e.target.value); setExpandedId(null) }}
          placeholder="例: CLAUDE.md, MCP, hooks"
          className="flex-1 bg-transparent text-sm text-claude-dark outline-none placeholder:text-stone-400 dark:text-stone-200"
          autoFocus
          aria-label="問題を検索"
        />
        <button
          onClick={() => { setQuery(''); setIsOpen(false); setExpandedId(null) }}
          className="tap-highlight rounded-full p-2 text-stone-400"
          aria-label="検索を閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {query.length >= 2 && (
        <div className="mt-2 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
          {results.length === 0 ? (
            <p className="p-4 text-center text-sm text-stone-400">該当する問題が見つかりません</p>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5 dark:border-stone-700">
                <span className="text-xs text-stone-400">{results.length}件</span>
                <button
                  onClick={() => {
                    haptics.light()
                    startSessionWithIds(results.map(r => r.id))
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className="tap-highlight inline-flex items-center gap-1.5 rounded-lg bg-claude-orange px-3 py-1.5 text-xs font-medium text-white"
                >
                  <Play className="h-3 w-3 fill-white" />
                  {results.length}問に挑戦
                </button>
              </div>

              {/* Results — tap to expand explanation */}
              <div className="max-h-80 overflow-y-auto">
                {results.map(r => {
                  const cat = getCategoryById(r.category)
                  const isExpanded = expandedId === r.id
                  return (
                    <div key={r.id} className="border-b border-stone-50 last:border-0 dark:border-stone-700/50">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="tap-highlight flex w-full items-start gap-2 px-4 py-2.5 text-left"
                      >
                        <span className="mt-0.5 flex-shrink-0 text-sm">{cat?.icon}</span>
                        <span className="flex-1 text-sm leading-snug text-claude-dark">
                          {r.question.length > 80 ? r.question.slice(0, 80) + '...' : r.question}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
                          : <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
                        }
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
                          {r.referenceUrl && (
                            <a
                              href={r.referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-claude-orange"
                            >
                              <ExternalLink className="h-3 w-3" />
                              公式ドキュメント
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
