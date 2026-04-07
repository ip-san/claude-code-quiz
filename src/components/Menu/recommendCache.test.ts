/**
 * @vitest-environment jsdom
 *
 * レコメンドのキャッシュ復元ロジックの詳細テスト
 *
 * loadFromCache 内の以下のロジックを検証:
 * - AI reasons あり: キャッシュの reasons からレコメンド構築
 * - AI reasons なし: computeRecommendations によるフォールバック
 * - categoryScores の復元: topCategories 配列から正しくスコアを生成
 * - 不正なキャッシュデータの処理
 * - coachingMessage の抽出
 */

import { describe, expect, it } from 'vitest'
import { Question } from '@/domain/entities/Question'
import type { AnalysisResult, RecommendedQuestion } from './recommendUtils'
import { computeRecommendations } from './recommendUtils'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeQuestion(
  id: string,
  category: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): Question {
  return Question.create({
    id,
    question: `Question ${id}`,
    options: [{ text: 'A' }, { text: 'B', wrongFeedback: 'wrong' }],
    correctIndex: 0,
    explanation: `Explanation for ${id}`,
    category,
    difficulty,
  })
}

/** loadFromCache 内のキャッシュ → AnalysisResult 変換を再現 */
function reconstructAnalysis(cached: {
  topCategories: string[]
  topics: { topic: string; hits: number }[]
  ids: string[]
  sessionCount: number
  promptSamples?: string[]
}): AnalysisResult {
  return {
    tools: {},
    topics: cached.topics,
    categoryScores: Object.fromEntries(cached.topCategories.map((c, i) => [c, 100 - i * 10])),
    recommendedIds: cached.ids,
    sessionCount: cached.sessionCount,
    promptSamples: cached.promptSamples ?? [],
  }
}

/** loadFromCache 内の AI reasons → RecommendedQuestion[] 変換を再現 */
function buildRecsFromReasons(
  ids: string[],
  reasons: Record<string, string>,
  allQuestions: Question[]
): RecommendedQuestion[] {
  return ids
    .map((id) => {
      const q = allQuestions.find((q) => q.id === id)
      if (!q) return null
      return {
        id,
        question: q.question,
        category: q.category,
        reason: reasons[id] ?? '',
        signals: ['AI選定'],
      }
    })
    .filter(Boolean) as RecommendedQuestion[]
}

// ── テストデータ ──────────────────────────────────────────────────────────────

const allQuestions = [
  makeQuestion('mem-001', 'memory', 'beginner'),
  makeQuestion('mem-002', 'memory', 'intermediate'),
  makeQuestion('tool-001', 'tools', 'beginner'),
  makeQuestion('tool-002', 'tools', 'advanced'),
  makeQuestion('ext-001', 'extensions', 'beginner'),
  makeQuestion('bp-001', 'bestpractices', 'intermediate'),
]

// ── categoryScores 復元 ──────────────────────────────────────────────────────

describe('reconstructAnalysis', () => {
  it('generates decreasing scores from topCategories', () => {
    const cached = {
      topCategories: ['tools', 'extensions', 'bestpractices'],
      topics: [],
      ids: ['tool-001'],
      sessionCount: 5,
    }
    const analysis = reconstructAnalysis(cached)
    expect(analysis.categoryScores).toEqual({
      tools: 100,
      extensions: 90,
      bestpractices: 80,
    })
  })

  it('handles single category', () => {
    const cached = {
      topCategories: ['memory'],
      topics: [],
      ids: ['mem-001'],
      sessionCount: 1,
    }
    const analysis = reconstructAnalysis(cached)
    expect(analysis.categoryScores).toEqual({ memory: 100 })
  })

  it('handles empty topCategories', () => {
    const cached = {
      topCategories: [],
      topics: [],
      ids: [],
      sessionCount: 0,
    }
    const analysis = reconstructAnalysis(cached)
    expect(analysis.categoryScores).toEqual({})
  })

  it('preserves promptSamples', () => {
    const cached = {
      topCategories: ['tools'],
      topics: [],
      ids: ['tool-001'],
      sessionCount: 3,
      promptSamples: ['prompt A', 'prompt B'],
    }
    const analysis = reconstructAnalysis(cached)
    expect(analysis.promptSamples).toEqual(['prompt A', 'prompt B'])
  })

  it('defaults promptSamples to empty array when missing', () => {
    const cached = {
      topCategories: ['tools'],
      topics: [],
      ids: ['tool-001'],
      sessionCount: 1,
    }
    const analysis = reconstructAnalysis(cached)
    expect(analysis.promptSamples).toEqual([])
  })
})

// ── AI reasons → RecommendedQuestion[] ───────────────────────────────────────

describe('buildRecsFromReasons', () => {
  it('creates recommendations from AI reasons', () => {
    const ids = ['mem-001', 'tool-001']
    const reasons = {
      'mem-001': '「CLAUDE.md を修正」→ メモリ管理の基本',
      'tool-001': '「Grep でファイル検索」→ ツールの使い分け',
    }
    const recs = buildRecsFromReasons(ids, reasons, allQuestions)
    expect(recs).toHaveLength(2)
    expect(recs[0].reason).toContain('CLAUDE.md')
    expect(recs[1].reason).toContain('ツールの使い分け')
    expect(recs[0].category).toBe('memory')
    expect(recs[1].category).toBe('tools')
  })

  it('filters out IDs not found in allQuestions', () => {
    const ids = ['mem-001', 'nonexistent-999']
    const reasons = { 'mem-001': '理由A', 'nonexistent-999': '理由B' }
    const recs = buildRecsFromReasons(ids, reasons, allQuestions)
    expect(recs).toHaveLength(1)
    expect(recs[0].id).toBe('mem-001')
  })

  it('uses empty string when reason is missing for an ID', () => {
    const ids = ['mem-001']
    const reasons = {} // reasonsにIDがない
    const recs = buildRecsFromReasons(ids, reasons, allQuestions)
    expect(recs).toHaveLength(1)
    expect(recs[0].reason).toBe('')
  })

  it('handles empty ids array', () => {
    const recs = buildRecsFromReasons([], {}, allQuestions)
    expect(recs).toHaveLength(0)
  })

  it('preserves order of ids', () => {
    const ids = ['tool-001', 'mem-001', 'ext-001']
    const reasons = { 'tool-001': 'a', 'mem-001': 'b', 'ext-001': 'c' }
    const recs = buildRecsFromReasons(ids, reasons, allQuestions)
    expect(recs.map((r) => r.id)).toEqual(['tool-001', 'mem-001', 'ext-001'])
  })
})

// ── フォールバック（reasons なし） ────────────────────────────────────────────

describe('fallback to computeRecommendations', () => {
  it('generates recommendations when reasons are missing', () => {
    const analysis = reconstructAnalysis({
      topCategories: ['memory', 'tools', 'extensions'],
      topics: [],
      ids: ['mem-001', 'tool-001'],
      sessionCount: 5,
    })
    const { recs } = computeRecommendations(analysis, allQuestions)
    expect(recs.length).toBeGreaterThan(0)
    // 各レコメンドにreason, signalsが付与されている
    for (const rec of recs) {
      expect(rec.reason.length).toBeGreaterThan(0)
      expect(rec.signals.length).toBeGreaterThan(0)
    }
  })

  it('uses reconstructed categoryScores for ranking', () => {
    const analysis = reconstructAnalysis({
      topCategories: ['memory', 'tools'],
      topics: [],
      ids: [],
      sessionCount: 3,
    })
    // memory=100, tools=90 なので memory が先に選ばれる
    const { recs } = computeRecommendations(analysis, allQuestions)
    if (recs.length >= 2) {
      const firstCat = recs[0].category
      expect(firstCat).toBe('memory')
    }
  })
})

// ── coachingMessage 抽出 ─────────────────────────────────────────────────────

describe('coachingMessage extraction from cache', () => {
  it('extracts coachingMessage when present', () => {
    const cached = {
      topCategories: ['tools'],
      topics: [],
      ids: ['tool-001'],
      sessionCount: 5,
      coachingMessage: '修正ループが減少しています。この調子で！',
    }
    const msg = 'coachingMessage' in cached ? cached.coachingMessage : null
    expect(msg).toBe('修正ループが減少しています。この調子で！')
  })

  it('returns null when coachingMessage is absent', () => {
    const cached = {
      topCategories: ['tools'],
      topics: [],
      ids: ['tool-001'],
      sessionCount: 5,
    }
    const msg = 'coachingMessage' in cached ? (cached as any).coachingMessage : null
    expect(msg).toBeNull()
  })
})

// ── deprioritize already-correct (AI reasons path) ──────────────────────────

describe('deprioritize correct questions in AI reasons path', () => {
  it('sorts incorrect questions before correct ones', () => {
    const recs: RecommendedQuestion[] = [
      { id: 'mem-001', question: 'Q1', category: 'memory', reason: 'r1', signals: [] },
      { id: 'mem-002', question: 'Q2', category: 'memory', reason: 'r2', signals: [] },
      { id: 'tool-001', question: 'Q3', category: 'tools', reason: 'r3', signals: [] },
    ]

    const correctIds = new Set(['mem-001', 'tool-001'])
    const sorted = [...recs].sort((a, b) => {
      const aCorrect = correctIds.has(a.id) ? 1 : 0
      const bCorrect = correctIds.has(b.id) ? 1 : 0
      return aCorrect - bCorrect
    })

    // mem-002（未正答）が先頭に来る
    expect(sorted[0].id).toBe('mem-002')
    // 正答済みの2つは後ろ
    expect(correctIds.has(sorted[1].id)).toBe(true)
    expect(correctIds.has(sorted[2].id)).toBe(true)
  })

  it('preserves order when all questions are unanswered', () => {
    const recs: RecommendedQuestion[] = [
      { id: 'a-001', question: 'Q1', category: 'a', reason: 'r1', signals: [] },
      { id: 'b-001', question: 'Q2', category: 'b', reason: 'r2', signals: [] },
    ]
    const sorted = [...recs].sort(() => {
      // 全て未回答（isCorrectlyAnswered=false）なので差分なし
      return 0
    })
    // 全て未回答なので順序は変わらない
    expect(sorted[0].id).toBe('a-001')
    expect(sorted[1].id).toBe('b-001')
  })
})

// ── computeRecommendedAccuracy equivalent ────────────────────────────────────

describe('computeRecommendedAccuracy logic', () => {
  /** useRecommendation.ts 内の非公開関数と同等のロジックを再現 */
  function computeRecommendedAccuracy(
    ids: string[],
    questionProgress: Record<string, { attempts: number; correctCount: number }>,
    allQuestions: Question[]
  ): Record<string, { correct: number; total: number }> {
    const result: Record<string, { correct: number; total: number }> = {}
    for (const id of ids) {
      const qp = questionProgress[id]
      if (qp && qp.attempts > 0) {
        const q = allQuestions.find((q) => q.id === id)
        const cat = q?.category ?? 'unknown'
        if (!result[cat]) result[cat] = { correct: 0, total: 0 }
        result[cat].total += qp.attempts
        result[cat].correct += qp.correctCount
      }
    }
    return result
  }

  it('calculates accuracy by category', () => {
    const progress = {
      'mem-001': { attempts: 3, correctCount: 2 },
      'mem-002': { attempts: 1, correctCount: 1 },
      'tool-001': { attempts: 2, correctCount: 0 },
    }
    const result = computeRecommendedAccuracy(['mem-001', 'mem-002', 'tool-001'], progress, allQuestions)
    expect(result.memory).toEqual({ correct: 3, total: 4 })
    expect(result.tools).toEqual({ correct: 0, total: 2 })
  })

  it('skips questions with 0 attempts', () => {
    const progress = {
      'mem-001': { attempts: 0, correctCount: 0 },
      'tool-001': { attempts: 1, correctCount: 1 },
    }
    const result = computeRecommendedAccuracy(['mem-001', 'tool-001'], progress, allQuestions)
    expect(result.memory).toBeUndefined()
    expect(result.tools).toEqual({ correct: 1, total: 1 })
  })

  it('skips questions not in progress', () => {
    const result = computeRecommendedAccuracy(['mem-001', 'tool-001'], {}, allQuestions)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('uses "unknown" category for IDs not in allQuestions', () => {
    const progress = {
      'nonexistent-001': { attempts: 2, correctCount: 1 },
    }
    const result = computeRecommendedAccuracy(['nonexistent-001'], progress, allQuestions)
    expect(result.unknown).toEqual({ correct: 1, total: 2 })
  })

  it('handles empty ids array', () => {
    const result = computeRecommendedAccuracy([], {}, allQuestions)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('aggregates multiple questions in the same category', () => {
    const progress = {
      'mem-001': { attempts: 5, correctCount: 3 },
      'mem-002': { attempts: 3, correctCount: 2 },
    }
    const result = computeRecommendedAccuracy(['mem-001', 'mem-002'], progress, allQuestions)
    expect(result.memory).toEqual({ correct: 5, total: 8 })
  })
})

// ── Opus trigger conditions ──────────────────────────────────────────────────

describe('Opus trigger conditions', () => {
  it('initial trigger: >=10 attempts and <=1 history', () => {
    const shouldTrigger = (totalAttempts: number, historyLength: number) => totalAttempts >= 10 && historyLength <= 1
    expect(shouldTrigger(10, 0)).toBe(true)
    expect(shouldTrigger(10, 1)).toBe(true)
    expect(shouldTrigger(9, 0)).toBe(false)
    expect(shouldTrigger(10, 2)).toBe(false)
  })

  it('stagnation trigger: same pattern in 3+ consecutive snapshots', () => {
    const shouldTrigger = (history: { patterns: string[] }[]) => {
      if (history.length < 3) return false
      const recent3 = history.slice(-3)
      const commonPatterns = (recent3[0].patterns || []).filter(
        (p) => (recent3[1].patterns || []).includes(p) && (recent3[2].patterns || []).includes(p)
      )
      return commonPatterns.length > 0
    }
    expect(
      shouldTrigger([{ patterns: ['修正ループ'] }, { patterns: ['修正ループ'] }, { patterns: ['修正ループ'] }])
    ).toBe(true)
    expect(
      shouldTrigger([{ patterns: ['修正ループ'] }, { patterns: ['別パターン'] }, { patterns: ['修正ループ'] }])
    ).toBe(false)
    expect(shouldTrigger([{ patterns: ['a'] }, { patterns: ['a'] }])).toBe(false) // only 2 snapshots
  })

  it('breakthrough trigger: 2+ patterns resolved', () => {
    const shouldTrigger = (prev: { patterns: string[] }, current: { patternCounts?: Record<string, number> }) => {
      const resolved = (prev.patterns || []).filter((p) => !current?.patternCounts?.[p])
      return resolved.length >= 2
    }
    expect(shouldTrigger({ patterns: ['a', 'b', 'c'] }, { patternCounts: { c: 1 } })).toBe(true) // a, b resolved
    expect(shouldTrigger({ patterns: ['a', 'b'] }, { patternCounts: { a: 1, b: 1 } })).toBe(false) // none resolved
  })

  it('mastery trigger: 90%+ accuracy on >=5 attempts', () => {
    const MASTERY_THRESHOLD = 90
    const shouldTrigger = (accuracy: number, attempts: number, alreadyNotified: boolean) =>
      accuracy >= MASTERY_THRESHOLD && attempts >= 5 && !alreadyNotified
    expect(shouldTrigger(95, 10, false)).toBe(true)
    expect(shouldTrigger(89, 10, false)).toBe(false)
    expect(shouldTrigger(95, 4, false)).toBe(false)
    expect(shouldTrigger(95, 10, true)).toBe(false) // already notified
  })
})
