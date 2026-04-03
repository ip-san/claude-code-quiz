import { ChevronDown, ChevronUp, Lightbulb, Play, Sparkles, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { Question } from '@/domain/entities/Question'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { trackRecommend } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { isElectron } from '@/lib/platformAPI'
import { useQuizStore } from '@/stores/quizStore'

type AnalysisResult = NonNullable<Awaited<ReturnType<NonNullable<typeof window.electronAPI>['analyzeUsage']>>>

interface RecommendedQuestion {
  id: string
  question: string
  category: string
  reason: string
}

/**
 * Claude Code 利用履歴からクイズをレコメンドする（Electron限定）
 */
export function UsageRecommend() {
  const { allQuestions, startSessionWithIds } = useQuizStore()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendedQuestion[]>([])
  const [unusedCategories, setUnusedCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)

  const analyze = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    haptics.light()
    const result = await window.electronAPI.analyzeUsage(1)
    if (result) {
      const { recs, unused } = computeRecommendations(result, allQuestions)
      result.recommendedIds = recs.map((r) => r.id)
      setRecommendations(recs)
      setUnusedCategories(unused)
      const topCats = Object.entries(result.categoryScores)
        .filter(([, s]) => s > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat)
      trackRecommend('analyze', topCats, recs.length)
    }
    setAnalysis(result)
    setLoading(false)
  }, [allQuestions])

  if (!isElectron) return null

  if (!analysis) {
    return (
      <button
        onClick={analyze}
        disabled={loading}
        className="tap-highlight mb-5 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left dark:border-amber-900/50 dark:bg-amber-950/30"
      >
        <Sparkles className={`h-5 w-5 text-amber-500 ${loading ? 'animate-spin' : ''}`} />
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {loading ? '解析中...' : '今日の作業からレコメンド'}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400">
            Claude Code の利用履歴を解析して復習問題を提案
          </div>
        </div>
      </button>
    )
  }

  if (analysis.sessionCount === 0) {
    return (
      <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
        <p className="text-sm text-stone-400">今日の Claude Code セッションが見つかりませんでした</p>
      </div>
    )
  }

  const topTopics = analysis.topics.slice(0, 3)
  const recCount = recommendations.length

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">今日のレコメンド</span>
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-800 dark:text-amber-200">
            {recCount}問
          </span>
        </div>
        <button
          onClick={() => setAnalysis(null)}
          className="tap-highlight rounded-full p-1 text-amber-400"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Topics */}
      {topTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {topTopics.map((t: { topic: string; hits: number }) => (
            <span
              key={t.topic}
              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
            >
              {t.topic}
            </span>
          ))}
        </div>
      )}

      {/* Unused category feedback */}
      {unusedCategories.length > 0 && (
        <div className="mx-4 mb-2 rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/30">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            <Lightbulb className="mr-1 inline h-3 w-3" />
            今日使わなかった機能
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            {unusedCategories.map((cat) => getCategoryById(cat)?.name ?? cat).join('、')}— 知ると効率が上がるかも？
          </p>
        </div>
      )}

      {/* Prompt samples */}
      {analysis.promptSamples.length > 0 && (
        <button onClick={() => setShowDetail(!showDetail)} className="tap-highlight w-full px-4 pb-1 text-left">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {showDetail ? '▾ 今日の作業内容' : '▸ 今日の作業内容を表示...'}
          </p>
        </button>
      )}
      {showDetail && (
        <div className="mx-4 mb-2 rounded-lg bg-white/60 p-2 dark:bg-stone-900/40">
          {analysis.promptSamples.map((p: string, i: number) => (
            <p key={i} className="truncate text-xs text-stone-500 dark:text-stone-400">
              {p}
            </p>
          ))}
        </div>
      )}

      {/* Question list (expandable) */}
      {recCount > 0 && (
        <button
          onClick={() => {
            if (!showQuestions) trackRecommend('view_list', [], recCount)
            setShowQuestions(!showQuestions)
          }}
          className="tap-highlight flex w-full items-center justify-between px-4 pb-1"
        >
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">問題一覧と選定理由</p>
          {showQuestions ? (
            <ChevronUp className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
          )}
        </button>
      )}
      {showQuestions && (
        <div className="mx-4 mb-2 max-h-60 overflow-y-auto rounded-lg bg-white/60 dark:bg-stone-900/40">
          {recommendations.map((rec, i) => {
            const cat = getCategoryById(rec.category)
            return (
              <div key={rec.id} className="border-b border-amber-100 px-3 py-2 last:border-0 dark:border-amber-900/30">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-xs">{cat?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug text-stone-700 dark:text-stone-300">
                      {i + 1}. {rec.question.length > 60 ? rec.question.slice(0, 60) + '...' : rec.question}
                    </p>
                    <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">{rec.reason}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Start quiz */}
      {recCount > 0 && (
        <div className="px-4 pb-3 pt-1">
          <button
            onClick={() => {
              haptics.medium()
              const topCats = [...new Set(recommendations.map((r) => r.category))].slice(0, 3)
              trackRecommend('start_quiz', topCats, recommendations.length)
              startSessionWithIds(
                recommendations.map((r) => r.id),
                '今日のレコメンド'
              )
            }}
            className="tap-highlight flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white"
          >
            <Play className="h-4 w-4 fill-white" />
            {recCount}問に挑戦
          </button>
        </div>
      )}
    </div>
  )
}

function computeRecommendations(
  analysis: AnalysisResult,
  allQuestions: Question[]
): { recs: RecommendedQuestion[]; unused: string[] } {
  const recs: RecommendedQuestion[] = []
  const used = new Set<string>()

  const sorted = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  // Top 3 used categories → 5 questions each
  for (const [cat] of sorted.slice(0, 3)) {
    const catName = getCategoryById(cat)?.name ?? cat
    const pool = allQuestions.filter((q) => q.category === cat && !used.has(q.id))
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 5)
    for (const q of sampled) {
      recs.push({ id: q.id, question: q.question, category: q.category, reason: `今日 ${catName} を使ったため` })
      used.add(q.id)
    }
  }

  // Unused categories → 3 beginner questions each (discovery)
  const unused = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s === 0)
    .map(([cat]) => cat)

  for (const cat of unused.slice(0, 2)) {
    const catName = getCategoryById(cat)?.name ?? cat
    const pool = allQuestions.filter((q) => q.category === cat && q.difficulty === 'beginner' && !used.has(q.id))
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 3)
    for (const q of sampled) {
      recs.push({
        id: q.id,
        question: q.question,
        category: q.category,
        reason: `${catName} を使っていない（発見のチャンス）`,
      })
      used.add(q.id)
    }
  }

  return { recs, unused }
}
