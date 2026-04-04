import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Play, RefreshCw, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { trackRecommend } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { isElectron } from '@/lib/platformAPI'
import { useQuizStore } from '@/stores/quizStore'
import { ProgressLabel } from './ProgressLabel'
import { AnalyzeButton, EmptySession, SetupBanner } from './RecommendStates'
import {
  CATEGORY_REASONS,
  detectDeveloperRole,
  detectWorkPatterns,
  findRecommendedScenario,
  groupByCategory,
} from './recommendUtils'
import { useRecommendation } from './useRecommendation'

/**
 * Claude Code 利用履歴からクイズをレコメンドする（Electron限定）
 */
export function UsageRecommend() {
  const startSessionWithIds = useQuizStore((s) => s.startSessionWithIds)
  const startScenarioSession = useQuizStore((s) => s.startScenarioSession)
  const [showQuestions, setShowQuestions] = useState(false)

  const {
    analysis,
    recommendations,
    unusedCategories,
    loading,
    aiError,
    regenerated,
    regenerating,
    elapsed,
    hooksInstalled,
    setupDone,
    allQuestions,
    analyze,
    shuffle,
    setupHooks,
    dismissSetup,
    dismissRegenerated,
    clearAnalysis,
  } = useRecommendation()

  if (!isElectron) return null

  if (hooksInstalled === false && !analysis)
    return <SetupBanner setupDone={setupDone} onSetup={setupHooks} onDismiss={dismissSetup} />

  if (!analysis) return <AnalyzeButton loading={loading} aiError={aiError} onAnalyze={analyze} />

  if (analysis.sessionCount === 0) return <EmptySession />

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
              const icon = e.currentTarget.querySelector('svg')
              if (icon) {
                icon.style.transition = 'transform 0.5s ease-out'
                icon.style.transform = 'rotate(360deg)'
                setTimeout(() => {
                  icon.style.transition = 'none'
                  icon.style.transform = ''
                }, 500)
              }
              shuffle()
            }}
            className={`tap-highlight rounded-full p-1.5 ${regenerating ? 'animate-spin text-claude-orange' : 'text-stone-400 active:text-claude-orange'}`}
            aria-label={regenerating ? 'AI が再生成中...' : '問題を更新'}
            title={regenerating ? '再生成中...' : '更新'}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={clearAnalysis}
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
          onClick={dismissRegenerated}
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

      {/* Step 2: Reflective Observation — Netflix "Because you watched" style chain */}
      {analysis &&
        (() => {
          const patterns = detectWorkPatterns(analysis.promptSamples ?? [])
          const totalSaved = patterns.reduce((sum, p) => sum + p.savedMinutes, 0)
          if (patterns.length > 0) {
            const p = patterns[0]
            return (
              <div className="mx-4 mb-1.5 space-y-1.5">
                {/* AI usage style insight (Anthropic research) */}
                {patterns.find((wp) => wp.aiStyle) &&
                  (() => {
                    const aiPattern = patterns.find((wp) => wp.aiStyle)!
                    const colors =
                      aiPattern.aiStyle === 'inquiry'
                        ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    const icon =
                      aiPattern.aiStyle === 'inquiry' ? '🌟' : aiPattern.aiStyle === 'delegation' ? '🪞' : '🔍'
                    return (
                      <div className={`flex items-start gap-2 rounded-lg px-3 py-1.5 ${colors}`}>
                        <span className="text-base">{icon}</span>
                        <div>
                          <p className="text-xs font-medium">{aiPattern.pattern}</p>
                          <p className="text-[11px] opacity-80">{aiPattern.tip}</p>
                        </div>
                      </div>
                    )
                  })()}
                {/* Time savings banner */}
                {totalSaved > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-claude-orange/10 px-3 py-1.5 dark:bg-claude-orange/5">
                    <span className="text-base">⏱️</span>
                    <p className="text-xs font-medium text-claude-orange">この知識があれば約{totalSaved}分短縮できた</p>
                  </div>
                )}
                {/* Evidence chain: prompt → gap → tip */}
                <div className="rounded-lg border border-claude-orange/20 bg-orange-50/50 px-3 py-2 dark:border-claude-orange/10 dark:bg-orange-500/5">
                  {p.evidence && (
                    <p className="mb-1 truncate text-[11px] text-stone-500 dark:text-stone-400">
                      「{p.evidence.length > 35 ? p.evidence.slice(0, 35) + '...' : p.evidence}」と聞いていた
                    </p>
                  )}
                  <p className="text-xs text-stone-700 dark:text-stone-300">
                    → {p.pattern}。<span className="font-medium text-claude-orange">{p.tip}</span>
                  </p>
                </div>
              </div>
            )
          }
          if (topTopics.length > 0) {
            return (
              <div className="mx-4 mb-1.5 rounded-lg border border-claude-orange/20 bg-orange-50/50 px-3 py-2 dark:border-claude-orange/10 dark:bg-orange-500/5">
                <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                  {topTopics.map((t: { topic: string }) => t.topic).join('や')}
                  に取り組んでいました。もっと効率的なやり方はなかったでしょうか？
                </p>
              </div>
            )
          }
          return null
        })()}

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

      {/* Skill proficiency profile */}
      {analysis &&
        (() => {
          const scores = Object.entries(analysis.categoryScores).filter(([, s]) => s > 0)
          if (scores.length === 0) return null
          const maxScore = Math.max(...scores.map(([, s]) => s))
          const role = detectDeveloperRole(analysis.categoryScores)
          return (
            <div className="mx-4 mb-1.5 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-900/50">
              <p className="mb-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                あなたの活用プロフィール{role && <span className="ml-1 text-claude-orange">— {role}</span>}
              </p>
              <div className="space-y-1">
                {scores
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([cat, score]) => {
                    const catInfo = getCategoryById(cat)
                    const pct = Math.round((score / maxScore) * 100)
                    const level = pct > 70 ? '上級' : pct > 30 ? '中級' : '入門'
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="w-16 truncate text-[10px] text-stone-500 dark:text-stone-400">
                          {catInfo?.name ?? cat}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                          <div
                            className="h-full rounded-full bg-claude-orange transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-[10px] text-stone-500 dark:text-stone-400">{level}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })()}

      {/* Progressive disclosure nudge — untried categories */}
      {analysis &&
        unusedCategories.length > 0 &&
        (() => {
          const nudgeCat = unusedCategories[0]
          const catInfo = getCategoryById(nudgeCat)
          const nudgeReason = CATEGORY_REASONS[nudgeCat]?.unused
          // Find one beginner question from this category
          const nudgeQ = allQuestions.find((q) => q.category === nudgeCat && q.difficulty === 'beginner')
          if (!nudgeQ || !catInfo) return null
          return (
            <div className="mx-4 mb-1.5 rounded-lg border border-dashed border-claude-orange/30 bg-orange-50/30 px-3 py-2 dark:border-claude-orange/15 dark:bg-orange-500/5">
              <p className="text-[11px] text-stone-600 dark:text-stone-300">
                まだ <span className="font-medium">{catInfo.name}</span> を試していません。
                {nudgeReason && <span className="text-stone-500 dark:text-stone-400"> {nudgeReason}</span>}
              </p>
              <button
                onClick={() => {
                  haptics.light()
                  startSessionWithIds([nudgeQ.id], `${catInfo.name} を1問だけ`)
                }}
                className="tap-highlight mt-1.5 flex items-center gap-1 rounded-md bg-claude-orange/10 px-2.5 py-1 text-[11px] font-medium text-claude-orange"
              >
                <Play className="h-3 w-3 fill-claude-orange" />
                1問だけ試してみる
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
          {/* Growth expectation message */}
          {analysis &&
            (() => {
              const patterns = detectWorkPatterns(analysis.promptSamples ?? [])
              if (patterns.length === 0) return null
              const topPattern = patterns[0]
              return (
                <p className="mt-1.5 text-center text-[10px] text-stone-500 dark:text-stone-400">
                  このクイズを解くと「{topPattern.pattern}」を改善するヒントが得られます
                </p>
              )
            })()}
        </div>
      )}
    </div>
  )
}

// Re-export utils for backward compatibility (tests import from this file)
export {
  computeRecommendations,
  detectDeveloperRole,
  detectWorkPatterns,
  findRecommendedScenario,
  findRelatedPrompts,
  groupByCategory,
  type RecommendedQuestion,
  type WorkPattern,
} from './recommendUtils'
