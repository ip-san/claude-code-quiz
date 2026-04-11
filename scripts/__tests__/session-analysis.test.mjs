import { describe, expect, it } from 'vitest'
import {
  analyzeTranscriptContent,
  backfillDailyData,
  buildRollingCacheData,
  generateRecommendIds,
  mergeDailySessions,
  parseJsonlContent,
  scoreCategories,
} from '../session-analysis.mjs'

// ── parseJsonlContent ──────────────────────────────────────

describe('parseJsonlContent', () => {
  it('extracts user prompts from text content', () => {
    const content = JSON.stringify({ type: 'user', message: { content: 'CLAUDE.md を編集して' } })
    const { prompts } = parseJsonlContent(content)
    expect(prompts).toEqual(['CLAUDE.md を編集して'])
  })

  it('extracts user prompts from array content', () => {
    const content = JSON.stringify({
      type: 'user',
      message: { content: [{ type: 'text', text: 'MCP を設定したい' }] },
    })
    const { prompts } = parseJsonlContent(content)
    expect(prompts).toEqual(['MCP を設定したい'])
  })

  it('skips short prompts (≤5 chars)', () => {
    const content = JSON.stringify({ type: 'user', message: { content: 'はい' } })
    const { prompts } = parseJsonlContent(content)
    expect(prompts).toHaveLength(0)
  })

  it('extracts tool usage from assistant messages', () => {
    const content = JSON.stringify({
      message: {
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'Read', input: {} },
          { type: 'tool_use', name: 'Edit', input: {} },
          { type: 'tool_use', name: 'Read', input: {} },
        ],
      },
    })
    const { tools } = parseJsonlContent(content)
    expect(tools).toEqual({ Read: 2, Edit: 1 })
  })

  it('records tool commands as prompts', () => {
    const content = JSON.stringify({
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }],
      },
    })
    const { prompts } = parseJsonlContent(content)
    expect(prompts).toContain('npm test')
  })

  it('builds conversation flow with seq numbers', () => {
    const lines = [
      JSON.stringify({ type: 'user', message: { content: 'フックの使い方を教えて' } }),
      JSON.stringify({
        message: { role: 'assistant', content: [{ type: 'text', text: 'フックは...' }] },
      }),
    ].join('\n')
    const { conversations } = parseJsonlContent(lines)
    expect(conversations).toHaveLength(2)
    expect(conversations[0]).toMatchObject({ seq: 1, role: 'user' })
    expect(conversations[1]).toMatchObject({ seq: 1, role: 'assistant' })
  })

  it('propagates errors from tool results', () => {
    const lines = [
      JSON.stringify({
        message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] },
      }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
    ].join('\n')
    const { conversations } = parseJsonlContent(lines)
    expect(conversations[0].hasError).toBe(true)
  })

  it('skips malformed JSON lines', () => {
    const content = 'not json\n' + JSON.stringify({ type: 'user', message: { content: 'valid prompt here' } })
    const { prompts } = parseJsonlContent(content)
    expect(prompts).toEqual(['valid prompt here'])
  })

  it('returns empty results for empty content', () => {
    const { tools, prompts, conversations } = parseJsonlContent('')
    expect(tools).toEqual({})
    expect(prompts).toHaveLength(0)
    expect(conversations).toHaveLength(0)
  })
})

// ── scoreCategories ────────────────────────────────────────

describe('scoreCategories', () => {
  it('scores memory keywords', () => {
    const scores = scoreCategories(['CLAUDE.md の書き方', 'memory について', '/init を実行'])
    expect(scores.memory).toBeGreaterThan(0)
  })

  it('scores multiple categories', () => {
    const scores = scoreCategories(['MCP を設定して hook を追加', 'Ctrl+C で停止'])
    expect(scores.extensions).toBeGreaterThan(0)
    expect(scores.keyboard).toBeGreaterThan(0)
  })

  it('returns zero for unmatched categories', () => {
    const scores = scoreCategories(['全く関係ない文章'])
    expect(scores.memory).toBe(0)
    expect(scores.tools).toBe(0)
  })

  it('handles empty prompts', () => {
    const scores = scoreCategories([])
    expect(Object.values(scores).every((s) => s === 0)).toBe(true)
  })
})

// ── analyzeTranscriptContent ───────────────────────────────

describe('analyzeTranscriptContent', () => {
  const makeContent = (prompts) =>
    prompts.map((p) => JSON.stringify({ type: 'user', message: { content: p } })).join('\n')

  it('produces full analysis result', () => {
    const content = makeContent(['CLAUDE.md にルールを追加したい', 'hook の設定方法は？'])
    const result = analyzeTranscriptContent(content)
    expect(result).toHaveProperty('tools')
    expect(result).toHaveProperty('categoryScores')
    expect(result).toHaveProperty('topics')
    expect(result).toHaveProperty('promptSamples')
    expect(result).toHaveProperty('promptCount')
    expect(result).toHaveProperty('conversations')
    expect(result).toHaveProperty('struggleSignals')
  })

  it('filters command-like prompts from samples', () => {
    const content = makeContent(['git status', 'node server.js', 'CLAUDE.md を確認したい'])
    const result = analyzeTranscriptContent(content)
    expect(result.promptSamples).not.toContain('git status')
    expect(result.promptSamples).toContain('CLAUDE.md を確認したい')
  })

  it('detects topics from prompts', () => {
    const content = makeContent(['MCP のツール連携について', 'Hooks のフック設定'])
    const result = analyzeTranscriptContent(content)
    const topicNames = result.topics.map((t) => t.topic)
    expect(topicNames).toContain('MCP')
    expect(topicNames).toContain('Hooks')
  })

  it('calculates struggle signals', () => {
    const short = 'short msg here!'
    const long = 'a'.repeat(80) + ' very long prompt'
    const content = makeContent([short, short, long, long, long, long])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.promptCount).toBeGreaterThan(0)
    expect(result.struggleSignals.lengthRatio).not.toBe(1)
  })

  it('detects repeated prompts (same text 3+ times)', () => {
    const repeated = 'この操作がうまくいきません'
    const content = makeContent([repeated, repeated, repeated, 'MCP の設定を確認'])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.repeatedPrompts).toBe(1)
  })

  it('does not count repeated prompts below threshold', () => {
    const content = makeContent(['プロンプトA テスト用', 'プロンプトA テスト用', 'プロンプトB テスト用'])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.repeatedPrompts).toBe(0)
  })

  it('detects consecutive errors from tool results', () => {
    const lines = [
      JSON.stringify({ type: 'user', message: { content: 'ファイルを修正して' } }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
    ].join('\n')
    const result = analyzeTranscriptContent(lines)
    expect(result.struggleSignals.consecutiveErrors).toBe(3)
  })

  it('resets consecutive error count on user message', () => {
    const lines = [
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
      JSON.stringify({ type: 'user', message: { content: '別のアプローチで試して' } }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
    ].join('\n')
    const result = analyzeTranscriptContent(lines)
    expect(result.struggleSignals.consecutiveErrors).toBe(1)
  })

  it('detects frustration keywords in Japanese', () => {
    const content = makeContent([
      'エラーが出て動かないです テスト用',
      'おかしいですね失敗した',
      '正常なプロンプト テスト用',
    ])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.frustrationHits).toBe(2)
  })

  it('detects frustration keywords in English', () => {
    const content = makeContent(["it doesn't work at all", 'the build is broken now', '正常なプロンプト テスト用'])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.frustrationHits).toBe(2)
  })

  it('counts reset signals from /clear, /compact, /rewind', () => {
    const lines = [
      JSON.stringify({ type: 'user', message: { content: '/clear' } }),
      JSON.stringify({ type: 'user', message: { content: '/compact' } }),
      JSON.stringify({ type: 'user', message: { content: '/rewind to checkpoint' } }),
      JSON.stringify({ type: 'user', message: { content: 'CLAUDE.md を確認したい テスト用' } }),
    ].join('\n')
    const result = analyzeTranscriptContent(lines)
    expect(result.struggleSignals.resetSignals).toBe(3)
  })

  it('level=strong when repeatedPrompts >= 1', () => {
    const repeated = 'この問題が何度も出ます テスト'
    const content = makeContent([repeated, repeated, repeated])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.level).toBe('strong')
  })

  it('level=strong when frustrationHits >= 3', () => {
    const content = makeContent([
      'エラーが出た テスト用テスト',
      '動かない テストです テスト',
      '失敗した テスト テスト用',
    ])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.frustrationHits).toBeGreaterThanOrEqual(3)
    expect(result.struggleSignals.level).toBe('strong')
  })

  it('level=mild when frustrationHits == 1', () => {
    const content = makeContent(['エラーが出ました テスト用テスト', '正常なプロンプトです テスト用'])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.frustrationHits).toBe(1)
    expect(result.struggleSignals.level).toBe('mild')
  })

  it('level=mild when resetSignals >= 2', () => {
    const lines = [
      JSON.stringify({ type: 'user', message: { content: '/clear' } }),
      JSON.stringify({ type: 'user', message: { content: '/compact' } }),
      JSON.stringify({ type: 'user', message: { content: 'CLAUDE.md を確認したい テスト用' } }),
    ].join('\n')
    const result = analyzeTranscriptContent(lines)
    expect(result.struggleSignals.resetSignals).toBe(2)
    expect(result.struggleSignals.level).toBe('mild')
  })

  it('level=none when no struggle signals', () => {
    const content = makeContent(['CLAUDE.md にルールを追加したい テスト', 'hook の設定方法は？ テスト用テスト'])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.level).toBe('none')
  })

  it('level=mild when lengthRatio is exactly 1.8', () => {
    // Front half: short prompts (~15 chars each)
    // Back half: long prompts (~27 chars each) → ratio = 27/15 = 1.8
    const short = 'short message!!'
    const long = 'a much longer prompt message'
    const content = makeContent([short, short, long, long])
    const result = analyzeTranscriptContent(content)
    expect(result.struggleSignals.lengthRatio).toBeGreaterThanOrEqual(1.8)
    expect(result.struggleSignals.repeatedPrompts).toBe(0)
    expect(result.struggleSignals.consecutiveErrors).toBe(0)
    expect(result.struggleSignals.frustrationHits).toBe(0)
    expect(result.struggleSignals.level).toBe('mild')
  })

  it('level=strong when consecutiveErrors is exactly 3', () => {
    const lines = [
      JSON.stringify({ type: 'user', message: { content: 'ファイルの内容を確認して テスト' } }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] } }),
      JSON.stringify({ type: 'tool_result', is_error: true }),
    ].join('\n')
    const result = analyzeTranscriptContent(lines)
    expect(result.struggleSignals.consecutiveErrors).toBe(3)
    expect(result.struggleSignals.repeatedPrompts).toBe(0)
    expect(result.struggleSignals.frustrationHits).toBe(0)
    expect(result.struggleSignals.level).toBe('strong')
  })
})

// ── mergeDailySessions ─────────────────────────────────────

describe('mergeDailySessions', () => {
  const session1 = {
    tools: { Read: 5, Edit: 2 },
    categoryScores: { memory: 10, tools: 5 },
    topics: [{ topic: 'MCP', hits: 3 }],
    promptSamples: ['prompt 1', 'prompt 2'],
    struggleSignals: {
      promptCount: 5,
      lengthRatio: 1.2,
      repeatedPrompts: 0,
      consecutiveErrors: 1,
      frustrationHits: 1,
      resetSignals: 0,
      level: 'mild',
    },
  }
  const session2 = {
    tools: { Read: 3, Bash: 1 },
    categoryScores: { memory: 5, extensions: 8 },
    topics: [
      { topic: 'MCP', hits: 5 },
      { topic: 'Hooks', hits: 2 },
    ],
    promptSamples: ['prompt 3'],
    struggleSignals: {
      promptCount: 3,
      lengthRatio: 0.8,
      repeatedPrompts: 1,
      consecutiveErrors: 2,
      frustrationHits: 0,
      resetSignals: 1,
      level: 'strong',
    },
  }

  it('merges tools counts', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.tools).toEqual({ Read: 8, Edit: 2, Bash: 1 })
  })

  it('sums category scores', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.categoryScores.memory).toBe(15)
    expect(merged.categoryScores.tools).toBe(5)
    expect(merged.categoryScores.extensions).toBe(8)
  })

  it('takes max topic hits', () => {
    const merged = mergeDailySessions([session1, session2])
    const mcp = merged.topics.find((t) => t.topic === 'MCP')
    expect(mcp.hits).toBe(5)
  })

  it('collects prompt samples', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.promptSamples).toContain('prompt 1')
    expect(merged.promptSamples).toContain('prompt 3')
  })

  it('aggregates struggle signals', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.struggleSignals.promptCount).toBe(8)
    expect(merged.struggleSignals.lengthRatio).toBe(1)
  })

  it('sums repeatedPrompts across sessions', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.struggleSignals.repeatedPrompts).toBe(1) // 0 + 1
  })

  it('takes max consecutiveErrors', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.struggleSignals.consecutiveErrors).toBe(2) // max(1, 2)
  })

  it('sums frustrationHits', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.struggleSignals.frustrationHits).toBe(1) // 1 + 0
  })

  it('sums resetSignals', () => {
    const merged = mergeDailySessions([session1, session2])
    expect(merged.struggleSignals.resetSignals).toBe(1) // 0 + 1
  })

  it('recomputes level from merged values', () => {
    const merged = mergeDailySessions([session1, session2])
    // repeatedPrompts=1 → strong
    expect(merged.struggleSignals.level).toBe('strong')
  })

  it('computes level=none when all signals are zero', () => {
    const calm = {
      tools: {},
      categoryScores: {},
      topics: [],
      promptSamples: [],
      struggleSignals: {
        promptCount: 2,
        lengthRatio: 1,
        repeatedPrompts: 0,
        consecutiveErrors: 0,
        frustrationHits: 0,
        resetSignals: 0,
        level: 'none',
      },
    }
    const merged = mergeDailySessions([calm, calm])
    expect(merged.struggleSignals.level).toBe('none')
  })

  it('handles empty sessions', () => {
    const merged = mergeDailySessions([])
    expect(merged.tools).toEqual({})
    expect(merged.categoryScores).toEqual({})
    expect(merged.topics).toHaveLength(0)
    expect(merged.promptSamples).toHaveLength(0)
  })
})

// ── buildRollingCacheData ──────────────────────────────────

describe('buildRollingCacheData', () => {
  const makeEntry = (dateStr, dayIndex, sessions = []) => ({
    dateStr,
    dayIndex,
    dayData: {
      sessions,
      merged: {
        categoryScores: { memory: 10, tools: 5 },
        topics: [{ topic: 'MCP', hits: 3 }],
        struggleSignals: { promptCount: 5, lengthRatio: 1.1 },
      },
    },
  })

  it('collects days and session counts', () => {
    const entries = [
      makeEntry('2026-04-08', 0, [{ id: 's1', promptSamples: ['long prompt sample'] }]),
      makeEntry('2026-04-07', 1, [{ id: 's2', promptSamples: [] }]),
    ]
    const result = buildRollingCacheData(entries)
    expect(result.days).toEqual(['2026-04-08', '2026-04-07'])
    expect(result.sessionCount).toBe(2)
  })

  it('applies weight to category scores', () => {
    const entries = [makeEntry('2026-04-08', 0), makeEntry('2026-04-07', 1)]
    const result = buildRollingCacheData(entries)
    // day0: weight=1.0 → memory=10, day1: weight=0.62 → memory=6
    expect(result.categoryScores.memory).toBe(16)
  })

  it('uses today struggle signals', () => {
    const entries = [makeEntry('2026-04-08', 0)]
    const result = buildRollingCacheData(entries)
    expect(result.struggleSignals.promptCount).toBe(5)
  })

  it('handles empty entries', () => {
    const result = buildRollingCacheData([])
    expect(result.days).toHaveLength(0)
    expect(result.sessionCount).toBe(0)
  })

  it('filters command-like prompts', () => {
    const entries = [
      makeEntry('2026-04-08', 0, [{ id: 's1', promptSamples: ['docker compose up', 'CLAUDE.md の説明が欲しい'] }]),
    ]
    const result = buildRollingCacheData(entries)
    expect(result.prompts).not.toContain('docker compose up')
    expect(result.prompts).toContain('CLAUDE.md の説明が欲しい')
  })
})

// ── backfillDailyData ──────────────────────────────────────

describe('backfillDailyData', () => {
  it('skips backfill when enough prompts exist', () => {
    const daily = {
      categoryScores: { memory: 10 },
      topics: [],
      promptSamples: ['a', 'b', 'c', 'd', 'e'],
    }
    const result = backfillDailyData(daily, [])
    expect(result).toBe(daily) // same reference = no-op
  })

  it('backfills category scores at 0.5 weight', () => {
    const daily = { categoryScores: { memory: 2 }, topics: [], promptSamples: ['a'] }
    const past = [{ merged: { categoryScores: { memory: 10, tools: 6 }, topics: [], promptSamples: ['b', 'c'] } }]
    const result = backfillDailyData(daily, past)
    expect(result.categoryScores.memory).toBe(7) // 2 + round(10*0.5)
    expect(result.categoryScores.tools).toBe(3) // round(6*0.5)
  })

  it('backfills topics', () => {
    const daily = { categoryScores: {}, topics: [{ topic: 'MCP', hits: 2 }], promptSamples: [] }
    const past = [
      {
        merged: {
          categoryScores: {},
          topics: [
            { topic: 'MCP', hits: 8 },
            { topic: 'Hooks', hits: 4 },
          ],
          promptSamples: [],
        },
      },
    ]
    const result = backfillDailyData(daily, past)
    const mcp = result.topics.find((t) => t.topic === 'MCP')
    expect(mcp.hits).toBe(4) // max(2, round(8*0.5))
    expect(result.topics.find((t) => t.topic === 'Hooks')).toBeTruthy()
  })

  it('stops backfilling after enough prompts', () => {
    const daily = { categoryScores: {}, topics: [], promptSamples: ['a'] }
    const past = [
      { merged: { categoryScores: {}, topics: [], promptSamples: ['b', 'c', 'd', 'e', 'f'] } },
      { merged: { categoryScores: {}, topics: [], promptSamples: ['g', 'h', 'i', 'j', 'k'] } },
      { merged: { categoryScores: {}, topics: [], promptSamples: ['l', 'm', 'n', 'o', 'p'] } },
    ]
    const result = backfillDailyData(daily, past)
    // MIN_PROMPTS * 2 = 10, so stops after 2 past days (1 + 5 + 5 = 11 ≥ 10)
    expect(result.promptSamples.length).toBeLessThanOrEqual(16)
  })

  it('does not mutate original', () => {
    const daily = { categoryScores: { memory: 1 }, topics: [], promptSamples: ['a'] }
    const past = [{ merged: { categoryScores: { memory: 10 }, topics: [], promptSamples: ['b'] } }]
    backfillDailyData(daily, past)
    expect(daily.categoryScores.memory).toBe(1)
  })
})

// ── generateRecommendIds ───────────────────────────────────

describe('generateRecommendIds', () => {
  const quizzes = [
    { id: 'mem-001', category: 'memory', difficulty: 'beginner' },
    { id: 'mem-002', category: 'memory', difficulty: 'intermediate' },
    { id: 'mem-003', category: 'memory', difficulty: 'advanced' },
    { id: 'tool-001', category: 'tools', difficulty: 'beginner' },
    { id: 'tool-002', category: 'tools', difficulty: 'intermediate' },
    { id: 'ext-001', category: 'extensions', difficulty: 'beginner' },
    { id: 'ext-002', category: 'extensions', difficulty: 'intermediate' },
    { id: 'cmd-001', category: 'commands', difficulty: 'beginner' },
    { id: 'key-001', category: 'keyboard', difficulty: 'beginner' },
  ]

  it('picks IDs from top categories', () => {
    const scores = { memory: 20, tools: 10, extensions: 5, commands: 0, keyboard: 0 }
    const ids = generateRecommendIds(quizzes, scores)
    expect(ids.some((id) => id.startsWith('mem-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('tool-'))).toBe(true)
  })

  it('adds beginner IDs from unused categories', () => {
    const scores = { memory: 20, tools: 10, extensions: 5, commands: 0, keyboard: 0 }
    const ids = generateRecommendIds(quizzes, scores)
    // commands and keyboard have score 0 → unused
    const unusedIds = ids.filter((id) => id.startsWith('cmd-') || id.startsWith('key-'))
    expect(unusedIds.length).toBeGreaterThan(0)
  })

  it('handles all-zero scores', () => {
    const scores = { memory: 0, tools: 0 }
    const ids = generateRecommendIds(quizzes, scores)
    // Only beginner from unused
    expect(
      ids.every((id) => {
        const q = quizzes.find((q) => q.id === id)
        return q?.difficulty === 'beginner'
      })
    ).toBe(true)
  })
})
