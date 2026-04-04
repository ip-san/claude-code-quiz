import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Play, RefreshCw, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Progress text + dots — both pulse in color together */
function ProgressLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 animate-[text-pulse_2s_ease-in-out_infinite]">
      <span key={text} className="animate-[fade-in_0.4s_ease-out]">
        {text}
      </span>
      <span className="inline-flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-[5px] w-[5px] rounded-full bg-current animate-[pulse-dot_1.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.25; }
          40% { opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes text-pulse {
          0%, 100% { color: #a8a29e; }
          50% { color: #e17c49; }
        }
      `}</style>
    </span>
  )
}

import { SCENARIOS, type ScenarioData } from '@/data/scenarios'
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
  /** Why this specific question was chosen — multiple signals */
  signals: string[]
}

/**
 * Claude Code 利用履歴からクイズをレコメンドする（Electron限定）
 */
export function UsageRecommend() {
  const { allQuestions, startSessionWithIds, startScenarioSession } = useQuizStore()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendedQuestion[]>([])
  const [unusedCategories, setUnusedCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [hooksInstalled, setHooksInstalled] = useState<boolean | null>(null)
  const [setupDone, setSetupDone] = useState(false)

  const [aiError, setAiError] = useState<string | null>(null)
  const [regenerated, setRegenerated] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
  }, [])
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    const cached = await window.electronAPI?.getCachedRecommend?.()
    if (!cached || cached.ids.length === 0) return false
    const cachedAnalysis: AnalysisResult = {
      tools: {},
      topics: cached.topics,
      categoryScores: Object.fromEntries(cached.topCategories.map((c, i) => [c, 100 - i * 10])),
      recommendedIds: cached.ids,
      sessionCount: cached.sessionCount,
      promptSamples: cached.promptSamples ?? [],
    }
    const aiReasons = (cached as Record<string, unknown>).reasons as Record<string, string> | undefined
    if (aiReasons && Object.keys(aiReasons).length > 0) {
      const recs: RecommendedQuestion[] = cached.ids
        .map((id) => {
          const q = allQuestions.find((q) => q.id === id)
          if (!q) return null
          return { id, question: q.question, category: q.category, reason: aiReasons[id] ?? '', signals: ['AI が選定'] }
        })
        .filter(Boolean) as RecommendedQuestion[]
      setRecommendations(recs)
      setUnusedCategories([])
      setAnalysis(cachedAnalysis)
    } else {
      const { recs, unused } = computeRecommendations({ ...cachedAnalysis }, allQuestions)
      setRecommendations(recs)
      setUnusedCategories(unused)
      setAnalysis(cachedAnalysis)
    }
    return true
  }, [allQuestions])

  const analyze = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    setAiError(null)
    haptics.light()

    // 1. Collect latest session data (fast, local)
    try {
      await window.electronAPI.runRecommendSkill()
    } catch {
      // Collect might fail — continue with cache
    }

    // 2. Try loading from cache (includes rolling-7d.json prompts)
    if (await loadFromCache()) {
      haptics.medium()
      setLoading(false)
      return
    }

    // 3. No cache at all — show error
    setAiError('Claude Code の利用履歴がありません。いくつか作業をしてからお試しください')
    setLoading(false)
  }, [loadFromCache])

  // On mount, load from cache silently
  useEffect(() => {
    loadFromCache()
  }, [loadFromCache])

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check hooks status after setup completes
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
                className="tap-highlight rounded-lg px-4 py-2 text-xs text-stone-500"
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
            {loading ? '分析中...' : 'あなたの利用履歴からレコメンド'}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {loading ? (
              <ProgressLabel text="利用履歴を分析中" />
            ) : (
              'AI があなたの作業意図を理解し、最適な復習問題を選びます'
            )}
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
          <span
            key={recommendations.map((r) => r.id).join(',')}
            className="animate-[fade-in_0.3s_ease-out] rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-claude-orange dark:bg-orange-500/10"
          >
            {recCount}問
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              if (!analysis) return
              haptics.light()
              const icon = e.currentTarget.querySelector('svg')
              if (icon) {
                icon.style.transition = 'transform 0.5s ease-out'
                icon.style.transform = 'rotate(360deg)'
                setTimeout(() => {
                  icon.style.transition = 'none'
                  icon.style.transform = ''
                }, 500)
              }
              // 1. Instant shuffle for immediate feedback (0 tokens)
              const shuffledSamples = [...analysis.promptSamples].sort(() => Math.random() - 0.5)
              const newAnalysis = { ...analysis, promptSamples: shuffledSamples }
              setAnalysis(newAnalysis)
              const prevIds = new Set(recommendations.map((r) => r.id))
              const { recs, unused } = computeRecommendations(newAnalysis, allQuestions, prevIds)
              setRecommendations(recs)
              setUnusedCategories(unused)
              // 2. Background AI regeneration with Sonnet (cheap)
              setRegenerated(false)
              setRegenerating(true)
              startTimer()
              window.electronAPI?.clearRecommendCache?.()
              window.electronAPI
                ?.runRecommendSkill?.()
                .then(async (result) => {
                  stopTimer()
                  setRegenerating(false)
                  if (result?.success) {
                    await loadFromCache()
                    setRegenerated(true)
                    haptics.medium()
                  }
                })
                .catch(() => {
                  stopTimer()
                  setRegenerating(false)
                })
            }}
            className={`tap-highlight rounded-full p-1.5 ${regenerating ? 'animate-spin text-claude-orange' : 'text-stone-400 active:text-claude-orange'}`}
            aria-label={regenerating ? 'AI が再生成中...' : '問題を更新'}
            title={regenerating ? '再生成中...' : '更新'}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setAnalysis(null)}
            className="tap-highlight rounded-full p-1.5 text-stone-400"
            aria-label="レコメンドを閉じる"
            title="閉じる"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Background regeneration progress */}
      {regenerating &&
        (() => {
          const steps = [
            { at: 0, text: 'セッションログを読み込み中' },
            { at: 5, text: 'プロンプトの意図を解析中' },
            { at: 15, text: '使用パターンを分析中' },
            { at: 30, text: 'あなたに合った問題を選定中' },
            { at: 60, text: '選定理由を生成中' },
            { at: 90, text: 'もう少しで完了します' },
          ]
          const stepText =
            steps
              .slice()
              .reverse()
              .find((s) => elapsed >= s.at)?.text ?? ''
          return (
            <>
              <div className="mx-4 mb-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                  <div
                    className="h-full rounded-full bg-claude-orange transition-[width] duration-1000 ease-linear"
                    style={{ width: `${Math.min((elapsed / 120) * 100, 100)}%` }}
                  />
                </div>
                <span className="flex-shrink-0 text-[10px] text-stone-500 dark:text-stone-500">{elapsed}秒</span>
              </div>
              <p className="mx-4 mb-2 text-[11px] text-stone-500 dark:text-stone-400">
                <ProgressLabel text={stepText} />
              </p>
            </>
          )
        })()}

      {/* Regeneration success banner — tap to dismiss */}
      {regenerated && (
        <button
          onClick={() => setRegenerated(false)}
          className="tap-highlight mx-4 mb-1.5 flex w-[calc(100%-2rem)] animate-[fade-in_0.3s_ease-out] items-center justify-between rounded-lg bg-green-50 px-3 py-1.5 text-left text-xs text-green-700 dark:bg-green-500/10 dark:text-green-400"
        >
          <span>✓ 最新の利用履歴で更新しました</span>
          <X className="h-3 w-3 flex-shrink-0 opacity-50" />
        </button>
      )}

      {/* Error message */}
      {aiError && <p className="mx-4 mb-2 text-xs text-red-500 dark:text-red-400">{aiError}</p>}

      {/* ── Kolb Cycle: Experience → Reflection → Conceptualization → Experimentation ── */}

      {/* Step 1: Concrete Experience — あなたがやったこと */}
      {analysis.promptSamples.length > 0 &&
        (() => {
          // Dedupe preserving shuffled order, filter out short/command-like entries
          const seen = new Set<string>()
          const filtered: string[] = []
          for (const p of analysis.promptSamples) {
            if (p.length <= 5 || seen.has(p) || /^(docker |npm |bun |node |git )/.test(p)) continue
            seen.add(p)
            filtered.push(p)
            if (filtered.length >= 3) break
          }
          if (filtered.length === 0) return null
          return (
            <div className="mx-4 mb-1.5">
              <p className="mb-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">あなたの作業</p>
              <div className="space-y-1" key={filtered.join('|')}>
                {filtered.map((p: string, i: number) => (
                  <p
                    key={p}
                    className="animate-[fade-in_0.3s_ease-out] truncate rounded bg-stone-50 px-2.5 py-1 text-xs text-stone-600 dark:bg-stone-900/50 dark:text-stone-300"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>
          )
        })()}

      {/* Step 2: Reflective Observation — 振り返りの問いかけ */}
      {topTopics.length > 0 && (
        <div className="mx-4 mb-1.5 rounded-lg border border-claude-orange/20 bg-orange-50/50 px-3 py-2 dark:border-claude-orange/10 dark:bg-orange-500/5">
          <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
            {topTopics.map((t: { topic: string }) => t.topic).join('や')}
            に取り組んでいました。もっと効率的なやり方はなかったでしょうか？
          </p>
        </div>
      )}

      {/* Step 3: Abstract Conceptualization — 知識の穴を見せる（展開式） */}
      {recCount > 0 && (
        <button
          onClick={() => {
            if (!showQuestions) trackRecommend('view_list', [], recCount)
            setShowQuestions(!showQuestions)
          }}
          className="tap-highlight mx-4 mb-1.5 flex w-[calc(100%-2rem)] items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-1.5 dark:border-stone-700"
          aria-label={showQuestions ? '選定理由を閉じる' : '選定理由を表示'}
          aria-expanded={showQuestions}
        >
          <p className="text-xs text-stone-500 dark:text-stone-500">
            {showQuestions ? '閉じる' : '知っていればもっと早くできた？'}
          </p>
          {showQuestions ? (
            <ChevronUp className="h-3 w-3 text-stone-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-stone-400" />
          )}
        </button>
      )}
      {showQuestions && (
        <div className="mx-4 mb-1.5 space-y-1.5">
          {groupByCategory(recommendations).map(({ category, reason, questions }) => {
            const cat = getCategoryById(category)
            // Collect unique signals across questions in this category
            const allSignals = [...new Set(questions.flatMap((q) => q.signals))]
            return (
              <div key={category} className="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-900/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{cat?.icon}</span>
                  <span className="text-xs font-medium text-claude-dark dark:text-stone-200">{cat?.name}</span>
                  <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] text-stone-500 dark:bg-stone-700 dark:text-stone-400">
                    {questions.length}問
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{reason}</p>
                {allSignals.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {allSignals.slice(0, 3).map((signal) => (
                      <span
                        key={signal}
                        className="rounded bg-stone-200/60 px-1.5 py-0.5 text-[10px] text-stone-500 dark:bg-stone-700/50 dark:text-stone-400"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {/* Discovery: unused categories as learning opportunity */}
          {unusedCategories.length > 0 && (
            <div className="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-900/50">
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                <Lightbulb className="mr-1 inline h-3 w-3 text-claude-orange" />
                {unusedCategories
                  .slice(0, 2)
                  .map((cat) => {
                    const name = getCategoryById(cat)?.name ?? cat
                    const reason = CATEGORY_REASONS[cat]?.unused
                    return reason ? `${name}: ${reason}` : name
                  })
                  .join(' / ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scenario suggestion */}
      {analysis &&
        (() => {
          const result = findRecommendedScenario(analysis.categoryScores, analysis.promptSamples)
          if (!result) return null
          const { scenario, reason } = result
          return (
            <div className="mx-4 mb-1.5 rounded-lg border border-claude-orange/20 bg-orange-50/30 px-3 py-2 dark:border-claude-orange/10 dark:bg-orange-500/5">
              <p className="mb-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                <BookOpen className="mr-1 inline h-3 w-3 text-claude-orange" />
                おすすめシナリオ
              </p>
              <button
                onClick={() => {
                  haptics.medium()
                  startScenarioSession(scenario.id)
                }}
                className="tap-highlight flex w-full items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-left dark:bg-stone-800"
              >
                <span className="text-lg">{scenario.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-claude-dark dark:text-stone-200">{scenario.title}</p>
                  <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">{reason}</p>
                </div>
                <Play className="h-3.5 w-3.5 flex-shrink-0 fill-claude-orange text-claude-orange" />
              </button>
            </div>
          )
        })()}

      {/* Step 4: Active Experimentation — クイズで確かめる */}
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
            クイズで確かめる（{recCount}問）
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

export function groupByCategory(
  recs: RecommendedQuestion[]
): { category: string; reason: string; questions: RecommendedQuestion[] }[] {
  const groups = new Map<string, { reason: string; questions: RecommendedQuestion[] }>()
  for (const rec of recs) {
    const existing = groups.get(rec.category)
    if (existing) {
      existing.questions.push(rec)
    } else {
      groups.set(rec.category, { reason: rec.reason, questions: [rec] })
    }
  }
  return [...groups.entries()].map(([category, { reason, questions }]) => ({ category, reason, questions }))
}

/** Match scenarios to user's work based on category scores and topics */
const SCENARIO_CATEGORY_MAP: Record<string, string[]> = {
  'scenario-onboard': ['memory', 'bestpractices'],
  'scenario-dotclaude': ['memory'],
  'scenario-claudemd': ['memory', 'bestpractices'],
  'scenario-tools': ['tools', 'bestpractices'],
  'scenario-keyboard': ['keyboard'],
  'scenario-context': ['session'],
  'scenario-workflow': ['bestpractices', 'commands'],
  'scenario-planmode': ['commands', 'bestpractices'],
  'scenario-session': ['session', 'memory'],
  'scenario-debug': ['tools', 'bestpractices'],
  'scenario-claudemd-pruning': ['memory'],
  'scenario-skills': ['skills'],
  'scenario-mcp': ['extensions'],
  'scenario-mcp-setup': ['extensions'],
  'scenario-legacy': ['tools'],
  'scenario-cicd': ['commands', 'extensions'],
  'scenario-team': ['memory', 'bestpractices'],
  'scenario-parallel': ['session', 'tools'],
  'scenario-hidden-gems': ['keyboard', 'commands'],
  'scenario-cicd-setup': ['commands', 'extensions'],
  'scenario-security': ['extensions', 'session'],
  'scenario-extend': ['extensions', 'skills'],
}

export function findRecommendedScenario(
  categoryScores: Record<string, number>,
  promptSamples: string[] = []
): { scenario: ScenarioData; reason: string } | null {
  const topCategories = Object.entries(categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat)

  if (topCategories.length === 0) return null

  // Score each scenario by how many of its categories match user's top categories
  const scored = SCENARIOS.map((s) => {
    const cats = SCENARIO_CATEGORY_MAP[s.id] ?? []
    const matched = cats.filter((c) => topCategories.includes(c))
    return { scenario: s, score: matched.length, matched }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null

  // Pick randomly from top matches for variety
  const topScore = scored[0].score
  const topMatches = scored.filter((s) => s.score === topScore)
  const pick = topMatches[Math.floor(Math.random() * topMatches.length)]

  // Build reason from matched categories + related prompt
  const catNames = pick.matched.map((c) => getCategoryById(c)?.name ?? c).join('・')
  const relatedPrompt = pick.matched.flatMap((c) => findRelatedPrompts(promptSamples, c)).find((p) => p.length > 0)
  const reason = relatedPrompt
    ? `「${relatedPrompt.length > 30 ? relatedPrompt.slice(0, 30) + '...' : relatedPrompt}」の作業に関連`
    : `${catNames}の作業に関連したシナリオです`

  return { scenario: pick.scenario, reason }
}

const CATEGORY_TERMS: Record<string, string[]> = {
  memory: ['CLAUDE.md', 'ルール', '指示', 'メモリ', '/init', 'rules', '設定'],
  skills: ['スキル', 'skill', 'コマンド', '/batch', '/loop', 'ワークフロー'],
  tools: ['ファイル', 'Read', 'Edit', 'Bash', 'Grep', '検索', '書き換え', '変更'],
  commands: ['/compact', '/clear', '/model', '/branch', 'コマンド', 'CLI'],
  extensions: ['MCP', 'hook', 'フック', 'プラグイン', 'サブエージェント', 'Agent', '拡張'],
  session: ['コンテキスト', 'セッション', 'トークン', '圧縮', '復帰', 'モデル'],
  keyboard: ['ショートカット', 'Ctrl', 'Shift', 'キー', '操作'],
  bestpractices: ['テスト', 'レビュー', 'デバッグ', 'Plan', '設計', 'エラー', '影響', '確認'],
}

/** Find ALL matching prompts for a category, shuffled */
export function findRelatedPrompts(prompts: string[], category: string): string[] {
  const terms = CATEGORY_TERMS[category] ?? []
  return prompts
    .filter((p) => p.length > 10 && terms.some((t) => p.toLowerCase().includes(t.toLowerCase())))
    .sort(() => Math.random() - 0.5)
}

export function computeRecommendations(
  analysis: AnalysisResult,
  allQuestions: Question[],
  excludeIds?: Set<string>
): { recs: RecommendedQuestion[]; unused: string[] } {
  const recs: RecommendedQuestion[] = []
  const used = new Set<string>(excludeIds ?? [])
  const prompts = analysis.promptSamples ?? []

  const sorted = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  for (const [cat, score] of sorted.slice(0, 3)) {
    const related = findRelatedPrompts(prompts, cat)
    const quote = related[0]
    const fallback = CATEGORY_REASONS[cat]?.used ?? '関連する作業をしていました'
    const reason = quote ? `「${quote.length > 35 ? quote.slice(0, 35) + '...' : quote}」— ${fallback}` : fallback
    const catName = getCategoryById(cat)?.name ?? cat
    const rank = sorted.findIndex(([c]) => c === cat) + 1
    const pool = allQuestions.filter((q) => q.category === cat && !used.has(q.id))
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 5)
    for (const q of sampled) {
      const signals: string[] = []
      signals.push(`${catName}は作業関連度${rank}位（スコア: ${score}）`)
      if (quote) signals.push(`「${quote.length > 25 ? quote.slice(0, 25) + '...' : quote}」に関連`)
      signals.push(
        `難易度: ${q.difficulty === 'beginner' ? '入門' : q.difficulty === 'intermediate' ? '中級' : '上級'}`
      )
      recs.push({ id: q.id, question: q.question, category: q.category, reason, signals })
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
      const catName = getCategoryById(cat)?.name ?? cat
      recs.push({
        id: q.id,
        question: q.question,
        category: q.category,
        reason,
        signals: [`${catName}はまだ使っていない機能`, '入門レベルから始めましょう'],
      })
      used.add(q.id)
    }
  }

  return { recs, unused }
}
