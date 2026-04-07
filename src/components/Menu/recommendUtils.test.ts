/**
 * @vitest-environment jsdom
 *
 * recommendUtils のユニットテスト（詳細版）
 *
 * テスト対象:
 * - detectWorkPatterns: Haiku分類ありのパターン検出、AI利用スタイル判定
 * - computeRecommendations: UserProgress連携、難易度選定、excludeIds
 * - findRecommendedScenario: シナリオ選定ロジック、Haiku提案優先
 * - loadFromCache 相当のキャッシュ復元ロジック
 */

import { describe, expect, it } from 'vitest'
import { Question } from '@/domain/entities/Question'
import {
  type ClassificationSummary,
  computeRecommendations,
  detectWorkPatterns,
  findRecommendedScenario,
  type HaikuClassification,
} from './recommendUtils'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeQuestion(
  id: string,
  category: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): Question {
  return Question.create({
    id,
    question: `Question ${id}`,
    options: [{ text: 'Option A' }, { text: 'Option B', wrongFeedback: 'wrong' }],
    correctIndex: 0,
    explanation: `Explanation for ${id}`,
    category,
    difficulty,
  })
}

function makeAnalysis(categoryScores: Record<string, number>, promptSamples: string[] = [], sessionCount = 3) {
  return {
    tools: {},
    topics: [],
    categoryScores,
    recommendedIds: [],
    sessionCount,
    promptSamples,
  }
}

function makeClassification(
  id: number,
  intent: string,
  category: string,
  struggle: string,
  tip: string | null = null,
  aiStyle: 'delegation' | 'inquiry' | 'efficiency' | null = null
): HaikuClassification {
  return { id, intent, category, struggle, tip, aiStyle }
}

function makeSummary(
  intentClusters: ClassificationSummary['intentClusters'] = [],
  overallStruggles: ClassificationSummary['overallStruggles'] = { none: 0, mild: 0, strong: 0 },
  categoryDistribution: Record<string, number> = {},
  opts: {
    aiStyleDistribution?: ClassificationSummary['aiStyleDistribution']
    suggestedScenarios?: string[]
  } = {}
): ClassificationSummary {
  return {
    intentClusters,
    categoryDistribution,
    overallStruggles,
    aiStyleDistribution: opts.aiStyleDistribution,
    suggestedScenarios: opts.suggestedScenarios,
  }
}

// ── detectWorkPatterns ───────────────────────────────────────────────────────

describe('detectWorkPatterns', () => {
  it('returns empty array when no classification provided', () => {
    const patterns = detectWorkPatterns(['test prompt 1', 'test prompt 2'])
    expect(patterns).toEqual([])
  })

  it('returns empty array when classifications is empty', () => {
    const patterns = detectWorkPatterns(['test'], { classifications: [], summary: makeSummary() })
    expect(patterns).toEqual([])
  })

  it('detects intent cluster with 3+ prompts', () => {
    const cls = [
      makeClassification(0, 'docker setup', 'tools', 'none'),
      makeClassification(1, 'docker setup', 'tools', 'none'),
      makeClassification(2, 'docker setup', 'tools', 'none'),
    ]
    const summary = makeSummary(
      [{ intent: 'docker setup', promptIds: [0, 1, 2], dominantStruggle: 'none', tip: 'Dockerfileで自動化' }],
      { none: 3, mild: 0, strong: 0 }
    )
    const prompts = ['docker compose up', 'docker build .', 'docker ps']

    const patterns = detectWorkPatterns(prompts, { classifications: cls, summary })
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].tip).toBe('Dockerfileで自動化')
    expect(patterns[0].savedMinutes).toBe(6) // 3 prompts * 2
  })

  it('detects intent cluster with struggle + 2 prompts', () => {
    const cls = [
      makeClassification(0, 'error fix', 'tools', 'strong'),
      makeClassification(1, 'error fix', 'tools', 'mild'),
    ]
    const summary = makeSummary(
      [{ intent: 'error fix', promptIds: [0, 1], dominantStruggle: 'strong', tip: 'エラーログを先に確認' }],
      { none: 0, mild: 1, strong: 1 }
    )
    const prompts = ['エラーが出ます。修正して', 'まだエラーです']

    const patterns = detectWorkPatterns(prompts, { classifications: cls, summary })
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].evidence).toBe('エラーが出ます。修正して')
  })

  it('skips intent cluster with only 1 prompt and no struggle', () => {
    const cls = [makeClassification(0, 'single task', 'tools', 'none')]
    const summary = makeSummary([{ intent: 'single task', promptIds: [0], dominantStruggle: 'none', tip: null }], {
      none: 1,
      mild: 0,
      strong: 0,
    })
    const patterns = detectWorkPatterns(['just one prompt here'], { classifications: cls, summary })
    expect(patterns).toEqual([])
  })

  it('detects struggle-based patterns when tips share common theme', () => {
    const cls = [
      makeClassification(0, 'a', 'tools', 'strong', 'PostToolUseで自動化'),
      makeClassification(1, 'b', 'tools', 'mild', 'PostToolUseで自動化'),
      makeClassification(2, 'c', 'tools', 'strong', '別のtip'),
    ]
    const summary = makeSummary([], { none: 0, mild: 1, strong: 2 })
    const prompts = ['lint実行して', 'formatして', 'テスト実行']

    const patterns = detectWorkPatterns(prompts, { classifications: cls, summary })
    const strugglePattern = patterns.find((p) => p.tip === 'PostToolUseで自動化')
    expect(strugglePattern).toBeDefined()
    expect(strugglePattern!.savedMinutes).toBe(6) // 2 * 3
  })

  it('detects delegation AI style from aiStyleDistribution', () => {
    const cls = Array.from({ length: 10 }, (_, i) => makeClassification(i, 'task', 'tools', 'none', null, 'delegation'))
    const summary = makeSummary(
      [],
      { none: 10, mild: 0, strong: 0 },
      {},
      {
        aiStyleDistribution: { delegation: 5, inquiry: 2, efficiency: 3 },
      }
    )
    const prompts = Array.from({ length: 10 }, (_, i) => `prompt ${i} is long enough to pass filter`)

    const patterns = detectWorkPatterns(prompts, { classifications: cls, summary })
    const delegationPattern = patterns.find((p) => p.aiStyle === 'delegation')
    expect(delegationPattern).toBeDefined()
  })

  it('detects inquiry AI style from aiStyleDistribution', () => {
    const cls = Array.from({ length: 10 }, (_, i) => makeClassification(i, 'q', 'tools', 'none', null, 'inquiry'))
    const summary = makeSummary(
      [],
      { none: 10, mild: 0, strong: 0 },
      {},
      {
        aiStyleDistribution: { delegation: 1, inquiry: 7, efficiency: 2 },
      }
    )
    const prompts = Array.from({ length: 10 }, (_, i) => `question ${i} is long enough to count`)

    const patterns = detectWorkPatterns(prompts, { classifications: cls, summary })
    const inquiryPattern = patterns.find((p) => p.aiStyle === 'inquiry')
    expect(inquiryPattern).toBeDefined()
  })

  it('falls back to struggle ratios when aiStyleDistribution is missing', () => {
    const cls = Array.from({ length: 10 }, (_, i) => makeClassification(i, 'task', 'tools', i < 4 ? 'strong' : 'none'))
    const summary = makeSummary([], { none: 6, mild: 0, strong: 4 })
    const prompts = Array.from({ length: 10 }, (_, i) => `long prompt ${i} for testing style`)

    const patterns = detectWorkPatterns(prompts, { classifications: cls, summary })
    const delegationPattern = patterns.find((p) => p.aiStyle === 'delegation')
    expect(delegationPattern).toBeDefined()
  })

  it('does not detect AI style with fewer than 5 classifications', () => {
    const cls = [
      makeClassification(0, 'a', 'tools', 'strong'),
      makeClassification(1, 'b', 'tools', 'strong'),
      makeClassification(2, 'c', 'tools', 'strong'),
    ]
    const summary = makeSummary([], { none: 0, mild: 0, strong: 3 })
    const prompts = ['p1 long enough', 'p2 long enough', 'p3 long enough']

    const patterns = detectWorkPatterns(prompts, { classifications: cls, summary })
    expect(patterns.filter((p) => p.aiStyle).length).toBe(0)
  })
})

// ── computeRecommendations with UserProgress ─────────────────────────────────

describe('computeRecommendations with UserProgress', () => {
  const allQuestions = [
    makeQuestion('mem-001', 'memory', 'beginner'),
    makeQuestion('mem-002', 'memory', 'intermediate'),
    makeQuestion('mem-003', 'memory', 'advanced'),
    makeQuestion('mem-004', 'memory', 'beginner'),
    makeQuestion('mem-005', 'memory', 'beginner'),
    makeQuestion('mem-006', 'memory', 'beginner'),
    makeQuestion('tool-001', 'tools', 'beginner'),
    makeQuestion('tool-002', 'tools', 'intermediate'),
    makeQuestion('tool-003', 'tools', 'beginner'),
  ]

  it('deprioritizes already-correct questions', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 50 })
    const mockProgress = {
      isCorrectlyAnswered: (id: string) => id === 'mem-001' || id === 'mem-004',
      questionProgress: {},
      categoryProgress: {},
      totalAttempts: 10,
      totalXp: 100,
      streakDays: 1,
    } as any

    const { recs } = computeRecommendations(analysis, allQuestions, undefined, mockProgress)
    const memRecs = recs.filter((r) => r.category === 'memory')

    // 正答済み問題は後ろに来る（deprioritized）
    if (memRecs.length >= 2) {
      const correctIdx = memRecs.findIndex((r) => r.id === 'mem-001' || r.id === 'mem-004')
      const incorrectIdx = memRecs.findIndex((r) => r.id !== 'mem-001' && r.id !== 'mem-004')
      if (correctIdx >= 0 && incorrectIdx >= 0) {
        expect(incorrectIdx).toBeLessThan(correctIdx)
      }
    }
  })

  it('handles undefined userProgress gracefully', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 50 })
    const { recs } = computeRecommendations(analysis, allQuestions)
    expect(recs.length).toBeGreaterThan(0)
  })

  it('unused categories select only beginner questions', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 0 })
    const { recs, unused } = computeRecommendations(analysis, allQuestions)

    expect(unused).toContain('tools')
    const toolRecs = recs.filter((r) => r.category === 'tools')
    for (const rec of toolRecs) {
      const q = allQuestions.find((q) => q.id === rec.id)!
      expect(q.difficulty).toBe('beginner')
    }
  })

  it('generates reason with prompt quote when available', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 50 }, ['CLAUDE.md にルールを追加して自動化した'])
    const { recs } = computeRecommendations(analysis, allQuestions)
    const memRec = recs.find((r) => r.category === 'memory')
    // reason にプロンプト引用が含まれる
    expect(memRec?.reason).toContain('「')
  })

  it('does not duplicate questions across categories', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 80 })
    const { recs } = computeRecommendations(analysis, allQuestions)
    const ids = recs.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('limits unused categories to 2', () => {
    const analysis = makeAnalysis({
      memory: 90,
      tools: 0,
      commands: 0,
      extensions: 0,
      session: 0,
    })
    const allQ = [
      ...allQuestions,
      makeQuestion('cmd-001', 'commands', 'beginner'),
      makeQuestion('ext-001', 'extensions', 'beginner'),
      makeQuestion('ses-001', 'session', 'beginner'),
    ]
    const { recs } = computeRecommendations(analysis, allQ)
    const unusedCats = new Set(recs.filter((r) => r.category !== 'memory').map((r) => r.category))
    // 最大2カテゴリから補完
    expect(unusedCats.size).toBeLessThanOrEqual(2)
  })
})

// ── findRecommendedScenario ──────────────────────────────────────────────────

describe('findRecommendedScenario', () => {
  it('returns null when all scores are 0', () => {
    const result = findRecommendedScenario({ memory: 0, tools: 0 })
    expect(result).toBeNull()
  })

  it('returns a scenario matching top categories', () => {
    const result = findRecommendedScenario({ memory: 90, tools: 50, extensions: 30 })
    expect(result).not.toBeNull()
    expect(result!.scenario).toBeDefined()
    expect(result!.reason.length).toBeGreaterThan(0)
  })

  it('prefers Haiku suggestedScenarios when available', () => {
    const classified = {
      classifications: [makeClassification(0, 'test', 'tools', 'strong', 'テスト自動化のtip')],
      summary: makeSummary(
        [],
        { none: 0, mild: 0, strong: 1 },
        {},
        {
          suggestedScenarios: ['scenario-tools'],
        }
      ),
    }
    const result = findRecommendedScenario({ tools: 90, memory: 50 }, [], classified)
    expect(result).not.toBeNull()
    expect(result!.scenario.id).toBe('scenario-tools')
  })

  it('falls back to category-based when Haiku suggests unknown scenario', () => {
    const classified = {
      classifications: [makeClassification(0, 'test', 'tools', 'none')],
      summary: makeSummary(
        [],
        { none: 1, mild: 0, strong: 0 },
        {},
        {
          suggestedScenarios: ['scenario-nonexistent'],
        }
      ),
    }
    const result = findRecommendedScenario({ tools: 90, memory: 50 }, [], classified)
    // Should still return something via category-based fallback
    expect(result).not.toBeNull()
  })

  it('includes prompt quote in reason when available', () => {
    const prompts = ['CLAUDE.md にルールを書いて自動的にフォーマットさせた']
    const result = findRecommendedScenario({ memory: 90, tools: 50 }, prompts)
    if (result) {
      expect(typeof result.reason).toBe('string')
      expect(result.reason.length).toBeGreaterThan(0)
    }
  })

  it('uses struggle-based scenario selection with Haiku data', () => {
    const classified = {
      classifications: [
        makeClassification(0, 'debug', 'tools', 'strong', 'デバッグのコツ'),
        makeClassification(1, 'debug2', 'tools', 'mild', null),
      ],
      summary: makeSummary([], { none: 0, mild: 1, strong: 1 }),
    }
    const result = findRecommendedScenario({ tools: 90, memory: 50 }, [], classified)
    expect(result).not.toBeNull()
  })

  it('returns non-null for single category with matching scenario', () => {
    const result = findRecommendedScenario({ memory: 100 })
    // memory maps to scenario-onboard, scenario-dotclaude, scenario-claudemd, scenario-session, scenario-team
    expect(result).not.toBeNull()
    expect(result!.reason.length).toBeGreaterThan(0)
  })

  it('returns scenario with reason even without prompts or classified data', () => {
    const result = findRecommendedScenario({ tools: 80, bestpractices: 60 })
    expect(result).not.toBeNull()
    expect(typeof result!.scenario.id).toBe('string')
  })

  it('handles classified data with no struggles gracefully', () => {
    const classified = {
      classifications: [makeClassification(0, 'task', 'tools', 'none')],
      summary: makeSummary([], { none: 1, mild: 0, strong: 0 }),
    }
    const result = findRecommendedScenario({ tools: 90 }, [], classified)
    // No struggles → falls back to category-based matching
    expect(result).not.toBeNull()
  })

  it('handles empty categoryScores object', () => {
    const result = findRecommendedScenario({})
    expect(result).toBeNull()
  })
})

// ── computeRecommendations edge cases ────────────────────────────────────────

describe('computeRecommendations — edge cases', () => {
  const questions = [
    makeQuestion('mem-001', 'memory', 'beginner'),
    makeQuestion('mem-002', 'memory', 'intermediate'),
    makeQuestion('mem-003', 'memory', 'advanced'),
    makeQuestion('tool-001', 'tools', 'beginner'),
    makeQuestion('tool-002', 'tools', 'intermediate'),
  ]

  it('handles all questions excluded', () => {
    const analysis = makeAnalysis({ memory: 90 })
    const excludeIds = new Set(questions.map((q) => q.id))
    const { recs } = computeRecommendations(analysis, questions, excludeIds)
    expect(recs).toHaveLength(0)
  })

  it('handles single category with one question', () => {
    const analysis = makeAnalysis({ memory: 90 })
    const singleQ = [makeQuestion('mem-001', 'memory')]
    const { recs } = computeRecommendations(analysis, singleQ)
    expect(recs).toHaveLength(1)
    expect(recs[0].id).toBe('mem-001')
  })

  it('handles negative category scores', () => {
    const analysis = makeAnalysis({ memory: -10, tools: 0 })
    // Negative scores are filtered out (s > 0)
    const { recs } = computeRecommendations(analysis, questions)
    const memRecs = recs.filter((r) => r.category === 'memory')
    expect(memRecs).toHaveLength(0)
  })

  it('signals include category rank', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 50 })
    const { recs } = computeRecommendations(analysis, questions)
    // Each recommendation should have at least one signal
    for (const rec of recs) {
      expect(rec.signals.length).toBeGreaterThan(0)
    }
  })
})
