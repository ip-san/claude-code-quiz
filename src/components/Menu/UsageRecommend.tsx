import { ChevronDown, ChevronUp, Play, RefreshCw, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { trackRecommend } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { isElectron } from '@/lib/platformAPI'
import { useQuizStore } from '@/stores/quizStore'
import { AnalyzeButton, EmptySession, SetupBanner } from './RecommendStates'
import { detectWorkPatterns, findRecommendedScenario, groupByCategory } from './recommendUtils'
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
    loading,
    aiError,
    regenerated,
    regenerating,
    elapsed,
    hooksInstalled,
    setupDone,
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
          <span className="text-sm font-medium text-claude-dark dark:text-stone-200">利用履歴からのレコメンド</span>
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

      {/* Status messages */}
      {regenerating && (
        <div className="mx-4 mb-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
            <div
              className="h-full rounded-full bg-claude-orange transition-[width] duration-1000 ease-linear"
              style={{ width: `${Math.min((elapsed / 120) * 100, 100)}%` }}
            />
          </div>
          <span className="flex-shrink-0 text-[10px] text-stone-500">{elapsed}秒</span>
        </div>
      )}
      {regenerated && (
        <button
          onClick={dismissRegenerated}
          className="tap-highlight mx-4 mb-1.5 flex w-[calc(100%-2rem)] animate-[fade-in_0.3s_ease-out] items-center justify-between rounded-lg bg-green-50 px-3 py-1.5 text-left text-xs text-green-700 dark:bg-green-500/10 dark:text-green-400"
        >
          <span>✓ 更新しました</span>
          <X className="h-3 w-3 flex-shrink-0 opacity-50" />
        </button>
      )}
      {aiError && <p className="mx-4 mb-2 text-xs text-red-500 dark:text-red-400">{aiError}</p>}

      {/* Insight: one key observation from work patterns */}
      {analysis &&
        (() => {
          const patterns = detectWorkPatterns(analysis.promptSamples ?? [])
          const p = patterns[0]
          if (p) {
            return (
              <div className="mx-4 mb-1.5 rounded-lg border border-claude-orange/20 bg-orange-50/50 px-3 py-2 dark:border-claude-orange/10 dark:bg-orange-500/5">
                {p.evidence && (
                  <p className="mb-0.5 truncate text-[11px] text-stone-500 dark:text-stone-400">
                    「{p.evidence.length > 30 ? p.evidence.slice(0, 30) + '...' : p.evidence}」
                  </p>
                )}
                <p className="text-xs text-stone-700 dark:text-stone-300">
                  → <span className="font-medium text-claude-orange">{p.tip}</span>
                  {p.savedMinutes > 0 && <span className="text-stone-500">（約{p.savedMinutes}分短縮）</span>}
                </p>
              </div>
            )
          }
          if (topTopics.length > 0) {
            return (
              <p className="mx-4 mb-1.5 text-xs text-stone-500 dark:text-stone-400">
                {topTopics.map((t: { topic: string }) => t.topic).join('・')}に関連する問題を選びました
              </p>
            )
          }
          return null
        })()}

      {/* Details toggle */}
      {recCount > 0 && (
        <button
          onClick={() => {
            if (!showQuestions) trackRecommend('view_list', [], recCount)
            setShowQuestions(!showQuestions)
          }}
          className="tap-highlight mx-4 mb-1.5 flex w-[calc(100%-2rem)] items-center justify-center gap-1 rounded-lg border border-stone-200 py-1.5 dark:border-stone-700"
          aria-expanded={showQuestions}
        >
          <p className="text-xs text-stone-500">{showQuestions ? '閉じる' : 'なぜこの問題？'}</p>
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
              </div>
            )
          })}
        </div>
      )}

      {/* Scenario suggestion */}
      {analysis &&
        (() => {
          const result = findRecommendedScenario(analysis.categoryScores, analysis.promptSamples)
          if (!result) return null
          return (
            <button
              onClick={() => {
                haptics.medium()
                startScenarioSession(result.scenario.id)
              }}
              className="tap-highlight mx-4 mb-1.5 flex w-[calc(100%-2rem)] items-center gap-2 rounded-lg border border-claude-orange/20 bg-orange-50/30 px-3 py-2 text-left dark:border-claude-orange/10 dark:bg-orange-500/5"
            >
              <span className="text-lg">{result.scenario.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-claude-dark dark:text-stone-200">
                  {result.scenario.title}
                  <span className="rounded-full bg-claude-orange/15 px-1.5 py-px text-[10px] font-semibold text-claude-orange dark:bg-claude-orange/20">
                    実践シナリオ
                  </span>
                </p>
                <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">{result.reason}</p>
              </div>
              <Play className="h-3.5 w-3.5 flex-shrink-0 fill-claude-orange text-claude-orange" />
            </button>
          )
        })()}

      {/* Quiz CTA */}
      {recCount > 0 && (
        <div className="px-4 pb-3 pt-1">
          <button
            onClick={() => {
              haptics.medium()
              trackRecommend('start_quiz', [...new Set(recommendations.map((r) => r.category))].slice(0, 3), recCount)
              startSessionWithIds(
                recommendations.map((r) => r.id),
                '利用履歴からのレコメンド'
              )
            }}
            className="tap-highlight flex w-full items-center justify-center gap-2 rounded-xl bg-claude-orange px-4 py-3 text-sm font-medium text-white"
          >
            <Play className="h-4 w-4 fill-white" />
            クイズで確かめる（{recCount}問）
          </button>
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
