import { locale } from '@/config/locale'
import { SCENARIOS, type ScenarioData } from '@/data/scenarios'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import { getCategoryById } from '@/domain/valueObjects/Category'

// ── Types ────────────────────────────────────────────────────

export type AnalysisResult = NonNullable<Awaited<ReturnType<NonNullable<typeof window.electronAPI>['analyzeUsage']>>>

export interface RecommendedQuestion {
  id: string
  question: string
  category: string
  reason: string
  /** Why this specific question was chosen — multiple signals */
  signals: string[]
}

export interface WorkPattern {
  pattern: string
  tip: string
  category: string
  /** Estimated minutes saved per session if the user knew this */
  savedMinutes: number
  /** The user's actual prompt that triggered this detection */
  evidence?: string
  /** AI usage style detected (Anthropic research-based) */
  aiStyle?: 'delegation' | 'debug-delegation' | 'inquiry' | 'efficiency'
}

// ── Constants ────────────────────────────────────────────────

export const CATEGORY_REASONS: Record<string, { used: string; unused: string }> = locale.recommendUtils.categoryReasons

const CATEGORY_TERMS: Record<string, string[]> = locale.recommendUtils.categoryTerms

export const SCENARIO_CATEGORY_MAP: Record<string, string[]> = {
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

// PATTERN_SCENARIO_MAP removed — Haiku now handles pattern→scenario mapping via suggestedScenarios

// ── Functions ────────────────────────────────────────────────

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

/** Find ALL matching prompts for a category, shuffled */
export function findRelatedPrompts(prompts: string[], category: string): string[] {
  const terms = CATEGORY_TERMS[category] ?? []
  return prompts
    .filter((p) => p.length > 10 && terms.some((t) => p.toLowerCase().includes(t.toLowerCase())))
    .sort(() => Math.random() - 0.5)
}

/** Haiku 分類結果の型 */
export interface HaikuClassification {
  id: number
  intent: string
  category: string
  struggle: string
  tip: string | null
  aiStyle?: 'delegation' | 'inquiry' | 'efficiency' | null
}

/** Haiku 分類結果のサマリ型 */
export interface ClassificationSummary {
  intentClusters: { intent: string; promptIds: number[]; dominantStruggle: string; tip: string | null }[]
  categoryDistribution: Record<string, number>
  overallStruggles: { none: number; mild: number; strong: number }
  /** Haiku が判定した開発者ロール */
  developerRole?: string | null | undefined
  /** Haiku が提案するシナリオID */
  suggestedScenarios?: string[] | undefined
  /** Haiku 分類に基づく AI 利用スタイル分布 */
  aiStyleDistribution?: { delegation: number; inquiry: number; efficiency: number } | undefined
}

/**
 * Detect inefficiency patterns from prompts.
 *
 * When Haiku classification results are available, uses intent clusters
 * and struggle signals for accurate pattern detection. Falls back to
 * regex-based heuristics when classification is unavailable.
 */
export function detectWorkPatterns(
  prompts: string[],
  classified?: { classifications: HaikuClassification[]; summary: ClassificationSummary } | null
): WorkPattern[] {
  // Use Haiku-powered detection if classification is available
  if (classified && classified.classifications.length > 0) {
    return detectFromClassification(prompts, classified)
  }
  // No Haiku classification available — return empty rather than making
  // crude regex-based judgments. Pattern detection requires AI understanding.
  return []
}

/** Haiku 分類結果を活用したパターン検出 */
function detectFromClassification(
  prompts: string[],
  classified: { classifications: HaikuClassification[]; summary: ClassificationSummary }
): WorkPattern[] {
  const patterns: WorkPattern[] = []
  const cls = classified.classifications
  const summary = classified.summary

  // 1. Intent clusters with Haiku-generated tips
  // Haiku already determined the tip based on actual prompt content — use it directly
  for (const cluster of summary.intentClusters) {
    if (cluster.promptIds.length >= 3 || (cluster.dominantStruggle !== 'none' && cluster.promptIds.length >= 2)) {
      const sample = prompts[cluster.promptIds[0]] ?? ''
      const clusterCats = cluster.promptIds.map((id) => cls.find((c) => c.id === id)?.category).filter(Boolean)
      const dominantCat = mode(clusterCats as string[]) ?? 'memory'
      // Use Haiku's tip if available, fall back to CATEGORY_REASONS only as last resort
      const tip = cluster.tip ?? CATEGORY_REASONS[dominantCat]?.used ?? locale.recommendUtils.fallbackReason
      patterns.push({
        pattern: locale.recommendUtils.repeatPattern(cluster.intent),
        tip,
        category: dominantCat,
        savedMinutes: cluster.promptIds.length * 2,
        evidence: sample,
      })
      break // Only report the top cluster
    }
  }

  // 2. Struggle-based patterns: use individual Haiku tips
  const struggles_with_tips = cls.filter((c) => c.struggle !== 'none' && c.tip)
  if (struggles_with_tips.length >= 2) {
    // Group by tip to find the most common suggestion
    const tipCounts = new Map<string, { count: number; category: string; example: string }>()
    for (const c of struggles_with_tips) {
      const tipKey = c.tip ?? ''
      const existing = tipCounts.get(tipKey)
      if (existing) {
        existing.count++
      } else {
        tipCounts.set(tipKey, { count: 1, category: c.category, example: prompts[c.id] ?? '' })
      }
    }
    // Pick the most frequently suggested tip
    const topTip = [...tipCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0]
    if (topTip) {
      patterns.push({
        pattern: topTip[1].count >= 3 ? locale.recommendUtils.strugglePattern : locale.recommendUtils.efficiencyPattern,
        tip: topTip[0], // Haiku's tip, not script's
        category: topTip[1].category,
        savedMinutes: topTip[1].count * 3,
        evidence: topTip[1].example,
      })
    }
  }

  // 3. AI Usage Style Detection — prefer Haiku's pre-computed distribution
  const totalClassified = cls.length
  if (totalClassified >= 5) {
    const dist = summary.aiStyleDistribution
    if (dist) {
      // Use Haiku's per-classification aiStyle distribution
      if (dist.delegation > totalClassified * 0.3) {
        patterns.push({
          pattern: locale.recommendUtils.delegationPattern,
          tip: locale.recommendUtils.delegationTip,
          category: 'bestpractices',
          savedMinutes: 0,
          aiStyle: 'delegation',
        })
      } else if (dist.inquiry > totalClassified * 0.5) {
        patterns.push({
          pattern: locale.recommendUtils.inquiryPattern,
          tip: locale.recommendUtils.inquiryTip,
          category: 'bestpractices',
          savedMinutes: 0,
          aiStyle: 'inquiry',
        })
      }
    } else {
      // Fallback: infer from struggle ratios when aiStyleDistribution is unavailable
      const overallStruggles = summary.overallStruggles
      const strongRatio = (overallStruggles.strong ?? 0) / totalClassified
      const noneRatio = (overallStruggles.none ?? 0) / totalClassified
      if (strongRatio > 0.3) {
        patterns.push({
          pattern: locale.recommendUtils.delegationPattern,
          tip: locale.recommendUtils.delegationTip,
          category: 'bestpractices',
          savedMinutes: 0,
          aiStyle: 'delegation',
        })
      } else if (noneRatio > 0.7) {
        patterns.push({
          pattern: locale.recommendUtils.inquiryPattern,
          tip: locale.recommendUtils.inquiryTip,
          category: 'bestpractices',
          savedMinutes: 0,
          aiStyle: 'inquiry',
        })
      }
    }
  }

  return patterns
}

/** Find the most frequent value in an array */
function mode(arr: string[]): string | undefined {
  const counts = new Map<string, number>()
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1)
  let max = 0
  let result: string | undefined
  for (const [k, c] of counts) {
    if (c > max) {
      max = c
      result = k
    }
  }
  return result
}

export function findRecommendedScenario(
  categoryScores: Record<string, number>,
  promptSamples: string[] = [],
  classified?: { classifications: HaikuClassification[]; summary: ClassificationSummary } | null
): { scenario: ScenarioData; reason: string } | null {
  const topCategories = Object.entries(categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat)

  if (topCategories.length === 0) return null

  // Prefer Haiku's scenario suggestions when available
  if (classified?.summary?.suggestedScenarios?.length) {
    for (const scenarioId of classified.summary.suggestedScenarios) {
      const scenario = SCENARIOS.find((s) => s.id === scenarioId)
      if (scenario) {
        const tip = classified.classifications.find((c) => c.struggle !== 'none')?.tip
        const reason = tip
          ? `${tip}${locale.recommendUtils.scenarioLearnSuffix}`
          : locale.recommendUtils.workRelatedScenario(
              topCategories.map((c) => getCategoryById(c)?.name ?? c).join('・')
            )
        return { scenario, reason }
      }
    }
  }

  const scored = SCENARIOS.map((s) => {
    const cats = SCENARIO_CATEGORY_MAP[s.id] ?? []
    const matched = cats.filter((c) => topCategories.includes(c))
    return { scenario: s, score: matched.length, matched }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null

  // Use Haiku classification to match scenarios by struggle patterns
  if (classified && classified.classifications.length > 0) {
    const struggles = classified.classifications.filter((c) => c.struggle !== 'none')
    if (struggles.length > 0) {
      // Find the dominant struggle category
      const struggleCats = struggles.map((c) => c.category)
      const dominantCat = mode(struggleCats)
      // Match scenarios to the struggle category
      const candidates: { scenario: ScenarioData; reason: string }[] = []
      for (const { scenario } of scored) {
        const cats = SCENARIO_CATEGORY_MAP[scenario.id] ?? []
        if (dominantCat && cats.includes(dominantCat)) {
          // Use Haiku's tip as the reason (specific to user's actual work)
          const relevantTip = struggles.find((c) => c.category === dominantCat)?.tip
          const reason = relevantTip
            ? `${relevantTip}${locale.recommendUtils.scenarioLearnSuffix}`
            : locale.recommendUtils.workRelatedScenario(getCategoryById(dominantCat)?.name ?? dominantCat)
          candidates.push({ scenario, reason })
        }
      }
      if (candidates.length > 0) {
        const lastShownId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('last-scenario-id') : null
        const filtered = candidates.filter((c) => c.scenario.id !== lastShownId)
        const pool = filtered.length > 0 ? filtered : candidates
        const pick = pool[Math.floor(Math.random() * pool.length)]
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('last-scenario-id', pick.scenario.id)
        return pick
      }
    }
  }

  // Fallback: category-based matching
  if (scored.length === 0) return null
  const topScore = scored[0].score
  const topMatches = scored.filter((s) => s.score === topScore)
  const pick = topMatches[Math.floor(Math.random() * topMatches.length)]

  const catNames = pick.matched.map((c) => getCategoryById(c)?.name ?? c).join('・')
  const relatedPrompt = pick.matched.flatMap((c) => findRelatedPrompts(promptSamples, c)).find((p) => p.length > 0)
  const reason = relatedPrompt
    ? locale.recommendUtils.workRelated(relatedPrompt.length > 30 ? relatedPrompt.slice(0, 30) + '...' : relatedPrompt)
    : locale.recommendUtils.workRelatedScenario(catNames)

  return { scenario: pick.scenario, reason }
}

export function computeRecommendations(
  analysis: AnalysisResult,
  allQuestions: Question[],
  excludeIds?: Set<string>,
  userProgress?: UserProgress
): { recs: RecommendedQuestion[]; unused: string[] } {
  const recs: RecommendedQuestion[] = []
  const used = new Set<string>(excludeIds ?? [])
  const prompts = analysis.promptSamples ?? []

  const sorted = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  const workPatterns = detectWorkPatterns(prompts)
  const patternsByCategory = new Map<string, string>()
  for (const wp of workPatterns) {
    if (!patternsByCategory.has(wp.category)) {
      patternsByCategory.set(wp.category, `💡 ${wp.tip}`)
    }
  }

  // AI usage style affects difficulty selection
  const aiStyle = workPatterns.find((wp) => wp.aiStyle)?.aiStyle
  const preferDifficulty: string | null =
    aiStyle === 'delegation'
      ? 'beginner'
      : // 丸投げ型 → 基礎を固める
        aiStyle === 'debug-delegation'
        ? 'intermediate'
        : // デバッグ委任 → 中級のなぜ問題
          aiStyle === 'inquiry'
          ? 'advanced'
          : // 質問型 → 高度な問題に誘導
            null

  for (const [cat] of sorted.slice(0, 3)) {
    const related = findRelatedPrompts(prompts, cat)
    const quote = related[0]
    const fallback = CATEGORY_REASONS[cat]?.used ?? locale.recommendUtils.fallbackReason
    const reason = quote ? `「${quote.length > 35 ? quote.slice(0, 35) + '...' : quote}」— ${fallback}` : fallback
    const catName = getCategoryById(cat)?.name ?? cat
    const rank = sorted.findIndex(([c]) => c === cat) + 1
    const pool = allQuestions.filter((q) => q.category === cat && !used.has(q.id))
    // Sort: unanswered/incorrect first, then difficulty match, then random
    const sorted2 = [...pool].sort((a, b) => {
      // Deprioritize already-correct questions so users get fresh challenges
      const aCorrect = userProgress?.isCorrectlyAnswered(a.id) ? 1 : 0
      const bCorrect = userProgress?.isCorrectlyAnswered(b.id) ? 1 : 0
      if (aCorrect !== bCorrect) return aCorrect - bCorrect
      // Then prefer difficulty match if specified
      if (preferDifficulty) {
        const aMatch = a.difficulty === preferDifficulty ? 0 : 1
        const bMatch = b.difficulty === preferDifficulty ? 0 : 1
        if (aMatch !== bMatch) return aMatch - bMatch
      }
      return Math.random() - 0.5
    })
    const sampled = sorted2.slice(0, 5)
    for (const q of sampled) {
      const signals: string[] = []
      const patternTip = patternsByCategory.get(cat)
      if (patternTip) signals.push(patternTip)
      if (aiStyle === 'delegation') signals.push(locale.recommendUtils.basicQuestions)
      else if (aiStyle === 'inquiry') signals.push(locale.recommendUtils.advancedChallenge)
      else signals.push(locale.recommendUtils.categoryRank(catName, rank))
      if (quote)
        signals.push(locale.recommendUtils.relatedQuote(quote.length > 25 ? quote.slice(0, 25) + '...' : quote))
      recs.push({ id: q.id, question: q.question, category: q.category, reason, signals })
      used.add(q.id)
    }
  }

  const unused = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s === 0)
    .map(([cat]) => cat)

  for (const cat of unused.slice(0, 2)) {
    const reason =
      CATEGORY_REASONS[cat]?.unused ?? locale.recommendUtils.unusedCategoryReason(getCategoryById(cat)?.name ?? cat)
    const pool = allQuestions.filter((q) => q.category === cat && q.difficulty === 'beginner' && !used.has(q.id))
    const sampled = [...pool]
      .sort((a, b) => {
        const aCorrect = userProgress?.isCorrectlyAnswered(a.id) ? 1 : 0
        const bCorrect = userProgress?.isCorrectlyAnswered(b.id) ? 1 : 0
        return aCorrect - bCorrect || Math.random() - 0.5
      })
      .slice(0, 3)
    for (const q of sampled) {
      const catName = getCategoryById(cat)?.name ?? cat
      recs.push({
        id: q.id,
        question: q.question,
        category: q.category,
        reason,
        signals: [locale.recommendUtils.unusedFeature(catName), locale.recommendUtils.beginnerStart],
      })
      used.add(q.id)
    }
  }

  return { recs, unused }
}
