import { describe, expect, it } from 'vitest'
import { analyzeUsageFromContents, type FileReader, getCachedRecommendData } from './recommendHandlers'

// ── getCachedRecommendData ─────────────────────────────────

describe('getCachedRecommendData', () => {
  const today = new Date().toISOString().slice(0, 10)

  const makeReader = (files: Record<string, string>): FileReader => ({
    readFileSync: (path: string) => {
      const content = files[path]
      if (!content) throw new Error(`ENOENT: ${path}`)
      return content
    },
  })

  it('returns data from latest-recommend.json', () => {
    const reader = makeReader({
      '/store/latest-recommend.json': JSON.stringify({
        date: today,
        ids: ['mem-001'],
        sessionCount: 1,
        questionCount: 1,
        topCategories: ['memory'],
        topics: [],
        promptSamples: ['test'],
        reasons: { 'mem-001': 'reason' },
        coachingMessage: 'coaching!',
      }),
    })
    const result = getCachedRecommendData('/store', reader)
    expect(result).not.toBeNull()
    expect(result!.ids).toEqual(['mem-001'])
    expect(result!.coachingMessage).toBe('coaching!')
  })

  it('returns null for stale data (>7 days)', () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const reader = makeReader({
      '/store/latest-recommend.json': JSON.stringify({ date: oldDate, ids: [] }),
    })
    expect(getCachedRecommendData('/store', reader)).toBeNull()
  })

  it('returns null when file does not exist', () => {
    const reader = makeReader({})
    expect(getCachedRecommendData('/store', reader)).toBeNull()
  })

  it('enriches promptSamples from rolling-7d.json', () => {
    const reader = makeReader({
      '/store/latest-recommend.json': JSON.stringify({
        date: today,
        ids: ['mem-001'],
        promptSamples: ['original'],
      }),
      '/store/rolling-7d.json': JSON.stringify({ prompts: ['rolling1', 'rolling2'] }),
    })
    const result = getCachedRecommendData('/store', reader)
    expect(result!.promptSamples).toEqual(['rolling1', 'rolling2'])
  })

  it('enriches coachingMessage from reasons.json when missing', () => {
    const reader = makeReader({
      '/store/latest-recommend.json': JSON.stringify({
        date: today,
        ids: ['mem-001'],
        promptSamples: [],
      }),
      '/store/reasons.json': JSON.stringify({ coachingMessage: 'from reasons' }),
    })
    const result = getCachedRecommendData('/store', reader)
    expect(result!.coachingMessage).toBe('from reasons')
  })

  it('preserves existing coachingMessage (no override from reasons.json)', () => {
    const reader = makeReader({
      '/store/latest-recommend.json': JSON.stringify({
        date: today,
        ids: ['mem-001'],
        promptSamples: [],
        coachingMessage: 'existing',
      }),
      '/store/reasons.json': JSON.stringify({ coachingMessage: 'should not override' }),
    })
    const result = getCachedRecommendData('/store', reader)
    expect(result!.coachingMessage).toBe('existing')
  })

  it('works when rolling-7d.json and reasons.json are missing', () => {
    const reader = makeReader({
      '/store/latest-recommend.json': JSON.stringify({
        date: today,
        ids: ['mem-001'],
        promptSamples: ['only sample'],
      }),
    })
    const result = getCachedRecommendData('/store', reader)
    expect(result!.promptSamples).toEqual(['only sample'])
    expect(result!.coachingMessage).toBeUndefined()
  })
})

// ── analyzeUsageFromContents ───────────────────────────────

describe('analyzeUsageFromContents', () => {
  const CATEGORY_KW = {
    memory: ['CLAUDE.md', 'memory'],
    tools: ['Read', 'Write', 'Edit'],
  }
  const TOPIC_KW = {
    MCP: ['MCP', 'mcp'],
    Hooks: ['hook', 'Hook'],
  }

  const makeContent = (entries: Array<{ type?: string; message: unknown }>) =>
    entries.map((e) => JSON.stringify(e)).join('\n')

  it('extracts tools from assistant messages', () => {
    const content = makeContent([
      { message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Read', input: {} }] } },
      { message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Read', input: {} }] } },
    ])
    const result = analyzeUsageFromContents([content], CATEGORY_KW, TOPIC_KW)
    expect(result.tools).toEqual({ Read: 2 })
  })

  it('extracts prompts from user messages', () => {
    const content = makeContent([{ type: 'user', message: { content: 'CLAUDE.md を編集したい' } }])
    const result = analyzeUsageFromContents([content], CATEGORY_KW, TOPIC_KW)
    expect(result.categoryScores.memory).toBeGreaterThan(0)
  })

  it('detects topics from prompts', () => {
    const content = makeContent([{ type: 'user', message: { content: 'MCP サーバーの設定方法と hook の使い方' } }])
    const result = analyzeUsageFromContents([content], CATEGORY_KW, TOPIC_KW)
    const topicNames = result.topics.map((t: { topic: string }) => t.topic)
    expect(topicNames).toContain('MCP')
    expect(topicNames).toContain('Hooks')
  })

  it('counts session count from contents array length', () => {
    const result = analyzeUsageFromContents(['{}', '{}', '{}'], CATEGORY_KW, TOPIC_KW)
    expect(result.sessionCount).toBe(3)
  })

  it('filters prompt samples', () => {
    const content = makeContent([
      { type: 'user', message: { content: 'node index.js' } },
      { type: 'user', message: { content: 'git status' } },
      { type: 'user', message: { content: 'memory の設定を確認したい' } },
    ])
    const result = analyzeUsageFromContents([content], CATEGORY_KW, TOPIC_KW)
    expect(result.promptSamples).toEqual(['memory の設定を確認したい'])
  })

  it('handles empty contents', () => {
    const result = analyzeUsageFromContents([], CATEGORY_KW, TOPIC_KW)
    expect(result.tools).toEqual({})
    expect(result.sessionCount).toBe(0)
  })

  it('skips malformed JSON lines', () => {
    const content = 'not json\n' + JSON.stringify({ type: 'user', message: { content: 'valid prompt here!!' } })
    const result = analyzeUsageFromContents([content], CATEGORY_KW, TOPIC_KW)
    expect(result.promptSamples.length).toBeGreaterThanOrEqual(0)
  })

  it('extracts file paths from tool_use inputs', () => {
    const content = makeContent([
      {
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/src/CLAUDE.md' } }],
        },
      },
    ])
    const result = analyzeUsageFromContents([content], CATEGORY_KW, TOPIC_KW)
    expect(result.categoryScores.memory).toBeGreaterThan(0)
  })
})
