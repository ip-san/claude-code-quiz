/**
 * @vitest-environment jsdom
 *
 * UsageRecommend コンポーネントおよびモジュールスコープ関数のユニットテスト
 *
 * テスト対象:
 * - UsageRecommend: isElectron が false の場合は null を返す（PWA では非表示）
 * - computeRecommendations: カテゴリスコア上位から問題を選定し unused カテゴリも補完
 * - groupByCategory: 同カテゴリの問題をグループ化
 * - findRelatedPrompts: カテゴリキーワードに合致するプロンプトを返す
 */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Question } from '@/domain/entities/Question'
import { computeRecommendations, findRelatedPrompts, groupByCategory, UsageRecommend } from './UsageRecommend'

// ── helpers ──────────────────────────────────────────────────────────────────

/** テスト用 Question を最小限のプロパティで生成する */
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

/** 最小限の AnalysisResult を生成する */
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

// ── isElectron が false の場合 ───────────────────────────────────────────────

// platformAPI モジュール全体をモックして isElectron を制御する
vi.mock('@/lib/platformAPI', () => ({
  isElectron: false,
  platformAPI: {
    openExternal: vi.fn(),
    copyToClipboard: vi.fn(),
    exportProgress: vi.fn(),
    importProgress: vi.fn(),
    exportCsv: vi.fn(),
  },
}))

// quizStore のモック（コンポーネントが要求する最小限）
vi.mock('@/stores/quizStore', () => ({
  useQuizStore: vi.fn(() => ({
    allQuestions: [],
    startSessionWithIds: vi.fn(),
  })),
}))

describe('UsageRecommend component', () => {
  it('renders nothing when isElectron is false (PWA environment)', () => {
    const { container } = render(<UsageRecommend />)
    // isElectron === false → return null → コンテナは空
    expect(container.firstChild).toBeNull()
  })
})

// ── computeRecommendations ────────────────────────────────────────────────────

describe('computeRecommendations', () => {
  const categories = ['memory', 'tools', 'commands', 'extensions', 'session'] as const

  // 各カテゴリに beginner 問題を 6 問ずつ用意
  const allQuestions: Question[] = categories.flatMap((cat, catIdx) =>
    Array.from({ length: 6 }, (_, i) =>
      makeQuestion(`${cat}-${String(catIdx * 10 + i).padStart(3, '0')}`, cat, 'beginner')
    )
  )

  it('selects questions from top 3 scoring categories', () => {
    const analysis = makeAnalysis({
      memory: 90,
      tools: 70,
      commands: 50,
      extensions: 0,
      session: 0,
    })

    const { recs } = computeRecommendations(analysis, allQuestions)

    const categories = [...new Set(recs.map((r) => r.category))]
    // 上位 3 カテゴリ（memory, tools, commands）から選ばれているはず
    expect(categories).toContain('memory')
    expect(categories).toContain('tools')
    expect(categories).toContain('commands')
    // スコア 0 のカテゴリは unused として別枠扱いなので上位 3 には含まれない
    expect(recs.filter((r) => r.category === 'memory').length).toBeGreaterThan(0)
  })

  it('each top category contributes up to 5 questions', () => {
    const analysis = makeAnalysis({
      memory: 100,
      tools: 80,
      commands: 60,
      extensions: 0,
      session: 0,
    })

    const { recs } = computeRecommendations(analysis, allQuestions)

    // 上位 3 カテゴリはそれぞれ最大 5 問
    const countByCat = (cat: string) => recs.filter((r) => r.category === cat).length
    expect(countByCat('memory')).toBeLessThanOrEqual(5)
    expect(countByCat('tools')).toBeLessThanOrEqual(5)
    expect(countByCat('commands')).toBeLessThanOrEqual(5)
  })

  it('excludes questions specified in excludeIds', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 70, commands: 50, extensions: 0, session: 0 })

    // memory カテゴリの全問 ID を除外
    const memoryIds = allQuestions.filter((q) => q.category === 'memory').map((q) => q.id)
    const excludeIds = new Set(memoryIds)

    const { recs } = computeRecommendations(analysis, allQuestions, excludeIds)

    // memory カテゴリは除外されているので 0 問
    const memoryRecs = recs.filter((r) => r.category === 'memory')
    expect(memoryRecs.length).toBe(0)
  })

  it('includes unused categories (score 0) as supplementary questions', () => {
    const analysis = makeAnalysis({
      memory: 80,
      tools: 60,
      commands: 40,
      extensions: 0, // unused
      session: 0, // unused
    })

    const { recs, unused } = computeRecommendations(analysis, allQuestions)

    // unused 配列にスコア 0 のカテゴリが含まれる
    expect(unused).toContain('extensions')
    expect(unused).toContain('session')

    // unused カテゴリからも beginner 問題が選ばれる
    const unusedRecs = recs.filter((r) => r.category === 'extensions' || r.category === 'session')
    expect(unusedRecs.length).toBeGreaterThan(0)
  })

  it('returns empty recs when allQuestions is empty', () => {
    const analysis = makeAnalysis({ memory: 100 })
    const { recs } = computeRecommendations(analysis, [])
    expect(recs).toHaveLength(0)
  })

  it('returns empty recs when categoryScores is empty', () => {
    const analysis = makeAnalysis({})
    const { recs } = computeRecommendations(analysis, allQuestions)
    expect(recs).toHaveLength(0)
  })

  it('assigns a reason string to each recommendation', () => {
    const analysis = makeAnalysis({ memory: 90, tools: 70, commands: 50, extensions: 0, session: 0 })
    const { recs } = computeRecommendations(analysis, allQuestions)
    for (const rec of recs) {
      expect(typeof rec.reason).toBe('string')
      expect(rec.reason.length).toBeGreaterThan(0)
    }
  })
})

// ── groupByCategory ───────────────────────────────────────────────────────────

describe('groupByCategory', () => {
  it('groups questions with the same category together', () => {
    const recs = [
      { id: 'mem-001', question: 'Q1', category: 'memory', reason: 'reason A' },
      { id: 'mem-002', question: 'Q2', category: 'memory', reason: 'reason B' },
      { id: 'tool-001', question: 'Q3', category: 'tools', reason: 'reason C' },
    ]

    const groups = groupByCategory(recs)

    expect(groups).toHaveLength(2)

    const memGroup = groups.find((g) => g.category === 'memory')
    expect(memGroup).toBeDefined()
    expect(memGroup!.questions).toHaveLength(2)
    expect(memGroup!.questions.map((q) => q.id)).toContain('mem-001')
    expect(memGroup!.questions.map((q) => q.id)).toContain('mem-002')

    const toolGroup = groups.find((g) => g.category === 'tools')
    expect(toolGroup).toBeDefined()
    expect(toolGroup!.questions).toHaveLength(1)
  })

  it('uses the reason of the first question in each group', () => {
    const recs = [
      { id: 'mem-001', question: 'Q1', category: 'memory', reason: 'first reason' },
      { id: 'mem-002', question: 'Q2', category: 'memory', reason: 'second reason' },
    ]

    const groups = groupByCategory(recs)
    const memGroup = groups.find((g) => g.category === 'memory')
    // Map に最初に追加されたエントリの reason が保持される
    expect(memGroup!.reason).toBe('first reason')
  })

  it('returns empty array for empty input', () => {
    const groups = groupByCategory([])
    expect(groups).toHaveLength(0)
  })

  it('preserves insertion order of categories', () => {
    const recs = [
      { id: 'a-1', question: 'Q1', category: 'tools', reason: 'r1' },
      { id: 'b-1', question: 'Q2', category: 'memory', reason: 'r2' },
      { id: 'a-2', question: 'Q3', category: 'tools', reason: 'r3' },
    ]

    const groups = groupByCategory(recs)
    expect(groups[0].category).toBe('tools')
    expect(groups[1].category).toBe('memory')
  })
})

// ── findRelatedPrompts ────────────────────────────────────────────────────────

describe('findRelatedPrompts', () => {
  it('returns prompts matching category keywords', () => {
    const prompts = ['CLAUDE.md にルールを書いた', 'Grep でファイルを検索した', '今日の天気について話した']

    const memoryMatches = findRelatedPrompts(prompts, 'memory')
    expect(memoryMatches.length).toBeGreaterThan(0)
    // memory のキーワード CLAUDE.md を含むプロンプトが返る
    expect(memoryMatches.some((p) => p.includes('CLAUDE.md'))).toBe(true)
  })

  it('filters out prompts with 10 or fewer characters', () => {
    const prompts = [
      'short', // 5 文字 → 除外
      '1234567890', // 10 文字 → 除外（条件: length > 10）
      'CLAUDE.md の設定を変更した', // 長い → 対象
    ]

    const results = findRelatedPrompts(prompts, 'memory')
    // 短いプロンプトは含まれない
    expect(results).not.toContain('short')
    expect(results).not.toContain('1234567890')
  })

  it('returns empty array when no prompts match', () => {
    const prompts = ['全く関係のない内容です。クイズアプリに関係ありません。']
    const results = findRelatedPrompts(prompts, 'keyboard')
    expect(results).toHaveLength(0)
  })

  it('returns empty array for unknown category', () => {
    const prompts = ['これは非常に長いプロンプトの例です。テスト用に使います。']
    const results = findRelatedPrompts(prompts, 'unknown-category')
    expect(results).toHaveLength(0)
  })

  it('matches tools category keywords (Read, Edit, Bash, Grep)', () => {
    const prompts = ['Read ツールでファイルを読み込んだ', 'Grep で文字列を検索した', '全く関係のないプロンプトです']

    const results = findRelatedPrompts(prompts, 'tools')
    expect(results.some((p) => p.includes('Read') || p.includes('Grep'))).toBe(true)
  })

  it('matches extensions category keywords (MCP, hook, フック)', () => {
    const prompts = ['MCP サーバーを設定した', 'フックを使って自動化した', '別の作業をしていました']

    const results = findRelatedPrompts(prompts, 'extensions')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((p) => p.includes('MCP') || p.includes('フック'))).toBe(true)
  })

  it('is case-insensitive for keyword matching', () => {
    const prompts = ['claude.md のルールを追加した']
    const results = findRelatedPrompts(prompts, 'memory')
    // 大文字小文字を区別しないので claude.md も CLAUDE.md キーワードにマッチする
    expect(results).toContain('claude.md のルールを追加した')
  })
})
