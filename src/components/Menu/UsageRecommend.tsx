import { ChevronDown, ChevronUp, Lightbulb, Play, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Question } from '@/domain/entities/Question'
import { getCategoryById, PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
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

      // Notify user when analysis is done (useful if they scrolled away)
      haptics.medium()
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('今日のレコメンド準備完了', {
          body: `${recs.length}問の復習問題を見つけました`,
          icon: '/icons/icon-192.png',
        })
      } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } else {
      haptics.light()
    }
    setAnalysis(result)
    setLoading(false)
  }, [allQuestions])

  // On mount, check for cached recommendations from SessionEnd hook
  useEffect(() => {
    if (!window.electronAPI?.getCachedRecommend) return
    window.electronAPI.getCachedRecommend().then((cached) => {
      if (!cached || cached.ids.length === 0) return
      // Build recommendations from cached IDs
      const recs: RecommendedQuestion[] = []
      for (const id of cached.ids) {
        const q = allQuestions.find((q) => q.id === id)
        if (!q) continue
        const topicMatch = cached.topics[0]
        const reason = topicMatch
          ? `${topicMatch.topic}に取り組んでいたようです。関連知識を確認しましょう`
          : (CATEGORY_REASONS[q.category]?.used ?? '今日の作業に関連')
        recs.push({ id: q.id, question: q.question, category: q.category, reason })
      }
      if (recs.length > 0) {
        setRecommendations(recs)
        const unused = PREDEFINED_CATEGORIES.map((c) => c.id).filter((cat) => !cached.topCategories.includes(cat))
        setUnusedCategories(unused)
        setAnalysis({
          tools: {},
          topics: cached.topics,
          categoryScores: Object.fromEntries(cached.topCategories.map((c, i) => [c, 100 - i * 10])),
          recommendedIds: cached.ids,
          sessionCount: cached.sessionCount,
          promptSamples: [],
        })
      }
    })
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
            {loading ? '解析中... しばらくお待ちください' : '今日の作業からレコメンド'}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400">
            {loading
              ? 'セッション履歴を読み込んでいます。完了したら通知します'
              : 'Claude Code の利用履歴を解析して復習問題を提案'}
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
            もっと効率的にできるかも
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            {unusedCategories
              .slice(0, 3)
              .map((cat) => {
                const reason = CATEGORY_REASONS[cat]?.unused
                const name = getCategoryById(cat)?.name ?? cat
                return reason ? `${name}: ${reason}` : name
              })
              .join(' / ')}
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

/** カテゴリごとに、今日の作業文脈から理由を生成する */
const CATEGORY_REASONS: Record<string, { used: string; unused: string }> = {
  memory: {
    used: 'CLAUDE.md やルール設定に触れていました。効果的な書き方を復習しましょう',
    unused: 'CLAUDE.md を活用すると、Claude への指示が毎回自動で伝わります',
  },
  skills: {
    used: 'スキルやワークフローを使っていました。もっと便利な使い方があるかも',
    unused: 'スキルを作ると、よく使う作業を一言で呼び出せるようになります',
  },
  tools: {
    used: 'ファイル操作やコマンド実行をたくさんしていました。ツールの使い分けを確認',
    unused: 'Read / Edit / Grep などのツールを知ると、Claude への依頼がもっと的確に',
  },
  commands: {
    used: 'コマンド操作をしていました。知っておくと便利なコマンドがまだあるかも',
    unused: '/compact や /branch など、作業効率を上げるコマンドがあります',
  },
  extensions: {
    used: 'MCP やフックなど拡張機能に触れていました。より深い使い方を学びましょう',
    unused: 'MCP サーバーやフックで、Claude Code の機能を大幅に拡張できます',
  },
  session: {
    used: 'セッション管理やコンテキストに関わる作業をしていました',
    unused: 'コンテキストウィンドウの管理を知ると、長時間作業がスムーズに',
  },
  keyboard: {
    used: 'ショートカットを活用していました。まだ知らないキーがあるかも',
    unused: 'ショートカットを覚えると、マウスなしで爆速操作ができます',
  },
  bestpractices: {
    used: 'ベストプラクティスに関わる作業をしていました。知識を固めましょう',
    unused: '効果的な使い方のコツを知ると、Claude の回答品質が上がります',
  },
}

/** トピックからより具体的な理由を生成する */
function getTopicReason(analysis: AnalysisResult, category: string): string | null {
  const topicMap: Record<string, string[]> = {
    memory: ['CLAUDE.mdの書き方'],
    extensions: ['MCP', 'Hooks', 'サブエージェント'],
    skills: ['Skills'],
    session: ['コンテキスト管理'],
    bestpractices: ['デバッグ', 'テスト'],
    commands: ['CI/CD'],
  }
  const relatedTopics = topicMap[category] ?? []
  const matched = analysis.topics.filter((t) => relatedTopics.includes(t.topic))
  if (matched.length > 0) {
    return `${matched[0].topic}に取り組んでいたようです。関連知識を確認しましょう`
  }
  return null
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
    const reason =
      getTopicReason(analysis, cat) ?? CATEGORY_REASONS[cat]?.used ?? `今日 ${cat} に関連する作業をしていました`
    const pool = allQuestions.filter((q) => q.category === cat && !used.has(q.id))
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 5)
    for (const q of sampled) {
      recs.push({ id: q.id, question: q.question, category: q.category, reason })
      used.add(q.id)
    }
  }

  // Unused categories → 3 beginner questions each (discovery)
  const unused = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s === 0)
    .map(([cat]) => cat)

  for (const cat of unused.slice(0, 2)) {
    const reason = CATEGORY_REASONS[cat]?.unused ?? `${getCategoryById(cat)?.name ?? cat} を知ると作業がもっと効率的に`
    const pool = allQuestions.filter((q) => q.category === cat && q.difficulty === 'beginner' && !used.has(q.id))
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 3)
    for (const q of sampled) {
      recs.push({ id: q.id, question: q.question, category: q.category, reason })
      used.add(q.id)
    }
  }

  return { recs, unused }
}
