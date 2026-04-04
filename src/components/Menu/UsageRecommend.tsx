import { ChevronDown, ChevronUp, Lightbulb, Play, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
  const [showQuestions, setShowQuestions] = useState(false)
  const [hooksInstalled, setHooksInstalled] = useState<boolean | null>(null)
  const [setupDone, setSetupDone] = useState(false)

  const [aiError, setAiError] = useState<string | null>(null)

  const analyze = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setAiError(null)
    haptics.light()

    // Run /recommend skill via Claude CLI (AI analyzes intent, not keyword match)
    const skillResult = await window.electronAPI.runRecommendSkill()

    if (skillResult.success) {
      // Skill wrote to latest-recommend.json — reload it
      const cached = await window.electronAPI.getCachedRecommend?.()
      if (cached && cached.ids.length > 0) {
        const cachedAnalysis: AnalysisResult = {
          tools: {},
          topics: cached.topics,
          categoryScores: Object.fromEntries(cached.topCategories.map((c, i) => [c, 100 - i * 10])),
          recommendedIds: cached.ids,
          sessionCount: cached.sessionCount,
          promptSamples: cached.promptSamples ?? [],
        }
        const { recs, unused } = computeRecommendations(cachedAnalysis, allQuestions)
        setRecommendations(recs)
        setUnusedCategories(unused)
        setAnalysis(cachedAnalysis)
        trackRecommend('analyze', cached.topCategories, recs.length)
        haptics.medium()
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('あなたの利用履歴を分析しました', {
            body: `${recs.length}問の復習問題を見つけました`,
            icon: '/icons/icon-192.png',
          })
        }
      }
    } else {
      const err = skillResult.error ?? '分析に失敗しました'
      // If no session data, show friendly message instead of error
      if (err.includes('ENOENT') || err.includes('not found') || err.includes('timeout')) {
        setAiError(err)
      } else {
        setAiError('分析できませんでした。Claude Code で作業をしてからもう一度お試しください')
      }
      haptics.light()
    }
    setLoading(false)
  }, [allQuestions])

  useEffect(() => {
    if (!window.electronAPI?.getCachedRecommend) return
    window.electronAPI.getCachedRecommend().then((cached) => {
      if (!cached || cached.ids.length === 0) return
      const cachedAnalysis: AnalysisResult = {
        tools: {},
        topics: cached.topics,
        categoryScores: Object.fromEntries(cached.topCategories.map((c, i) => [c, 100 - i * 10])),
        recommendedIds: cached.ids,
        sessionCount: cached.sessionCount,
        promptSamples: cached.promptSamples ?? [],
      }
      // If /recommend skill provided per-question reasons, use them
      const aiReasons = (cached as Record<string, unknown>).reasons as Record<string, string> | undefined
      if (aiReasons && Object.keys(aiReasons).length > 0) {
        const recs: RecommendedQuestion[] = cached.ids
          .map((id) => {
            const q = allQuestions.find((q) => q.id === id)
            if (!q) return null
            return { id, question: q.question, category: q.category, reason: aiReasons[id] ?? '' }
          })
          .filter(Boolean) as RecommendedQuestion[]
        setRecommendations(recs)
        setUnusedCategories([])
        setAnalysis(cachedAnalysis)
      } else {
        const { recs, unused } = computeRecommendations(cachedAnalysis, allQuestions)
        if (recs.length > 0) {
          setRecommendations(recs)
          setUnusedCategories(unused)
          setAnalysis(cachedAnalysis)
        }
      }
    })
  }, [allQuestions])

  useEffect(() => {
    if (!window.electronAPI?.checkGlobalHooks) return
    window.electronAPI.checkGlobalHooks().then(setHooksInstalled)
  }, [setupDone])

  if (!isElectron) return null

  // Setup banner
  if (hooksInstalled === false && !analysis) {
    return (
      <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-claude-orange" />
          <div className="flex-1">
            <p className="text-sm font-medium text-claude-dark dark:text-stone-200">自動レコメンドを有効にしますか？</p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Claude Code の全セッション終了時にログを収集し、その日の作業に合ったクイズを自動で提案します
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={async () => {
                  const result = await window.electronAPI?.setupGlobalHooks(false)
                  if (result?.success) {
                    setSetupDone(true)
                    haptics.medium()
                  }
                }}
                className="tap-highlight rounded-lg bg-claude-orange px-4 py-2 text-xs font-medium text-white"
                aria-label="自動レコメンドを有効にする"
              >
                有効にする
              </button>
              <button
                onClick={() => setHooksInstalled(true)}
                className="tap-highlight rounded-lg px-4 py-2 text-xs text-stone-400"
                aria-label="後で設定する"
              >
                後で
              </button>
            </div>
            {setupDone && (
              <p className="mt-2 text-xs font-medium text-claude-orange">
                設定完了。次回の Claude Code セッションから自動収集が始まります。
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Analyze button
  if (!analysis) {
    return (
      <button
        onClick={analyze}
        disabled={loading}
        aria-label="利用履歴を分析してクイズをレコメンド"
        className="tap-highlight mb-5 flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left dark:border-stone-700 dark:bg-stone-800"
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-claude-orange" />
        ) : (
          <Sparkles className="h-5 w-5 text-claude-orange" />
        )}
        <div className="flex-1">
          <div className="text-sm font-medium text-claude-dark dark:text-stone-200">
            {loading ? 'AI が利用履歴を分析中...' : 'あなたの利用履歴からレコメンド'}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {loading
              ? 'Claude が作業内容を理解して問題を選んでいます（30〜60秒）'
              : 'AI があなたの作業意図を理解し、最適な復習問題を選びます'}
          </div>
          {aiError && <p className="mt-1 text-xs text-red-500">{aiError}</p>}
        </div>
      </button>
    )
  }

  if (analysis.sessionCount === 0) {
    return (
      <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
        <p className="text-sm font-medium text-claude-dark dark:text-stone-200">
          Claude Code の利用履歴がまだありません
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Claude Code でいくつか作業をしてから、もう一度お試しください。セッション終了時に自動でログが蓄積されます。
        </p>
      </div>
    )
  }

  const topTopics = analysis.topics.slice(0, 3)
  const recCount = recommendations.length

  return (
    <div className="mb-5 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-claude-orange" />
          <span className="text-sm font-medium text-claude-dark dark:text-stone-200">あなたへのレコメンド</span>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-claude-orange dark:bg-orange-500/10">
            {recCount}問
          </span>
        </div>
        <button
          onClick={() => setAnalysis(null)}
          className="tap-highlight rounded-full p-2 text-stone-400"
          aria-label="レコメンドを閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Your prompts */}
      {analysis.promptSamples.length > 0 && (
        <div className="mx-4 mb-2 rounded-lg bg-stone-50 p-3 dark:bg-stone-900/50">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-400">
            あなたが入力したプロンプト
          </p>
          {analysis.promptSamples.slice(0, 4).map((p: string, i: number) => (
            <p
              key={i}
              className="truncate border-l-2 border-claude-orange/40 py-0.5 pl-2 text-xs text-stone-600 dark:border-claude-orange/30 dark:text-stone-300"
            >
              {p}
            </p>
          ))}
          {analysis.sessionCount > 1 && (
            <p className="mt-1.5 text-[10px] text-stone-400">{analysis.sessionCount}個のセッションから分析</p>
          )}
        </div>
      )}

      {/* Topics */}
      {topTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {topTopics.map((t: { topic: string; hits: number }) => (
            <span
              key={t.topic}
              className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600 dark:bg-stone-700 dark:text-stone-300"
            >
              {t.topic}
            </span>
          ))}
        </div>
      )}

      {/* Discovery suggestion */}
      {unusedCategories.length > 0 && (
        <div className="mx-4 mb-2 rounded-lg bg-stone-50 p-2.5 dark:bg-stone-900/50">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-300">
            <Lightbulb className="mr-1 inline h-3 w-3 text-claude-orange" />
            もっと効率的にできるかも
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
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

      {/* Question list */}
      {recCount > 0 && (
        <button
          onClick={() => {
            if (!showQuestions) trackRecommend('view_list', [], recCount)
            setShowQuestions(!showQuestions)
          }}
          className="tap-highlight flex w-full items-center justify-between px-4 py-2"
          aria-label={showQuestions ? '問題一覧を閉じる' : '問題一覧と選定理由を表示'}
          aria-expanded={showQuestions}
        >
          <p className="text-xs font-medium text-stone-600 dark:text-stone-300">問題一覧と選定理由</p>
          {showQuestions ? (
            <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          )}
        </button>
      )}
      {showQuestions && (
        <div className="mx-4 mb-2 max-h-60 overflow-y-auto rounded-lg bg-stone-50 dark:bg-stone-900/50">
          {recommendations.map((rec, i) => {
            const cat = getCategoryById(rec.category)
            return (
              <div key={rec.id} className="border-b border-stone-100 px-3 py-2 last:border-0 dark:border-stone-800">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-xs">{cat?.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">{rec.reason}</p>
                    <p className="mt-0.5 text-xs leading-snug text-stone-700 dark:text-stone-300">
                      {i + 1}. {rec.question.length > 60 ? rec.question.slice(0, 60) + '...' : rec.question}
                    </p>
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
                'あなたへのレコメンド'
              )
            }}
            className="tap-highlight flex w-full items-center justify-center gap-2 rounded-xl bg-claude-orange px-4 py-3 text-sm font-medium text-white"
            aria-label={`レコメンドされた${recCount}問のクイズを開始`}
          >
            <Play className="h-4 w-4 fill-white" />
            {recCount}問に挑戦
          </button>
        </div>
      )}
    </div>
  )
}

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

function findRelatedPrompt(prompts: string[], category: string): string | null {
  const categoryTerms: Record<string, string[]> = {
    memory: ['CLAUDE.md', 'ルール', '指示', 'メモリ', '/init', 'rules'],
    skills: ['スキル', 'skill', 'コマンド', '/batch', '/loop'],
    tools: ['ファイル', 'Read', 'Edit', 'Bash', 'Grep', '検索', '書き換え'],
    commands: ['/compact', '/clear', '/model', '/branch', 'コマンド'],
    extensions: ['MCP', 'hook', 'フック', 'プラグイン', 'サブエージェント', 'Agent'],
    session: ['コンテキスト', 'セッション', 'トークン', '圧縮', '復帰'],
    keyboard: ['ショートカット', 'Ctrl', 'Shift', 'キー'],
    bestpractices: ['テスト', 'レビュー', 'デバッグ', 'Plan', '設計', 'エラー'],
  }
  const terms = categoryTerms[category] ?? []
  for (const p of prompts) {
    if (terms.some((t) => p.toLowerCase().includes(t.toLowerCase()))) {
      return p.length > 40 ? p.slice(0, 40) + '...' : p
    }
  }
  return null
}

function computeRecommendations(
  analysis: AnalysisResult,
  allQuestions: Question[]
): { recs: RecommendedQuestion[]; unused: string[] } {
  const recs: RecommendedQuestion[] = []
  const used = new Set<string>()
  const prompts = analysis.promptSamples ?? []

  const sorted = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  for (const [cat] of sorted.slice(0, 3)) {
    const relatedPrompt = findRelatedPrompt(prompts, cat)
    const fallback = CATEGORY_REASONS[cat]?.used ?? '関連する作業をしていました'
    const reason = relatedPrompt ? `「${relatedPrompt}」に関連 — ${fallback}` : fallback
    const pool = allQuestions.filter((q) => q.category === cat && !used.has(q.id))
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 5)
    for (const q of sampled) {
      recs.push({ id: q.id, question: q.question, category: q.category, reason })
      used.add(q.id)
    }
  }

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
