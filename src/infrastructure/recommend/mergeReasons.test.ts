/**
 * @vitest-environment jsdom
 *
 * mergeReasons のユニットテスト
 *
 * Architecture: reasons.json が IDs/reasons の正。metadata は topics 等の補完。
 */

import { describe, expect, it } from 'vitest'
import { mergeReasons, type RecommendResult } from './mergeReasons'

function makeMetadata(overrides: Partial<RecommendResult> = {}): RecommendResult {
  return {
    ids: ['old-001', 'old-002', 'old-003'],
    questionCount: 3,
    url: 'https://example.com/?ids=old-001,old-002,old-003',
    topCategories: ['tools', 'extensions'],
    topics: [{ topic: 'Hooks', hits: 5 }],
    sessionCount: 10,
    promptSamples: ['prompt A', 'prompt B'],
    ...overrides,
  }
}

// ── reasons.json が正 ───────────────────────────────────────────────────────

describe('mergeReasons — reasons.json as source of truth', () => {
  it('uses AI-selected IDs from reasons.json, not metadata IDs', () => {
    // At least one ID overlaps to pass stale detection
    const metadata = makeMetadata({ ids: ['bp-073', 'random-002'] })
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-073': '理由A', 'ext-003': '理由B' },
    })

    const { merged, source, result } = mergeReasons(metadata, reasonsJson, '')
    expect(merged).toBe(true)
    expect(source).toBe('reasons.json')
    expect(result.ids).toEqual(['bp-073', 'ext-003'])
    expect(result.questionCount).toBe(2)
    expect(result.url).toContain('bp-073,ext-003')
    // random IDs are completely replaced
    expect(result.ids).not.toContain('random-001')
  })

  it('preserves metadata fields (topics, sessionCount, promptSamples)', () => {
    const metadata = makeMetadata({ ids: ['bp-001'] })
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': 'r' },
    })

    const { result } = mergeReasons(metadata, reasonsJson, '')
    expect(result.topCategories).toEqual(['tools', 'extensions'])
    expect(result.topics).toEqual([{ topic: 'Hooks', hits: 5 }])
    expect(result.sessionCount).toBe(10)
    expect(result.promptSamples).toEqual(['prompt A', 'prompt B'])
  })

  it('uses coachingMessage from reasons.json', () => {
    const metadata = makeMetadata({ ids: ['bp-001'] })
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': 'r' },
      coachingMessage: 'AI生成メッセージ',
    })

    const { result } = mergeReasons(metadata, reasonsJson, '')
    expect(result.coachingMessage).toBe('AI生成メッセージ')
  })

  it('falls back to metadata coachingMessage when reasons.json has none', () => {
    const metadata = makeMetadata({ coachingMessage: 'メタデータのメッセージ' })
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': 'r' },
    })

    const { result } = mergeReasons(metadata, reasonsJson, '')
    expect(result.coachingMessage).toBe('メタデータのメッセージ')
  })

  it('does not mutate the original metadata object', () => {
    const metadata = makeMetadata()
    const original = { ...metadata }
    mergeReasons(metadata, JSON.stringify({ reasons: { 'bp-001': 'r' } }), '')
    expect(metadata.ids).toEqual(original.ids)
    expect(metadata.reasons).toBeUndefined()
  })
})

// ── フォールバック ────────────────────────────────────────────────────────────

describe('mergeReasons — fallback behavior', () => {
  it('falls back to stdout when reasonsJson is null', () => {
    const metadata = makeMetadata()
    const stdout = '- **bp-001** [beginner]: stdout理由'

    const { merged, source, result } = mergeReasons(metadata, null, stdout)
    expect(merged).toBe(true)
    expect(source).toBe('stdout')
    expect(result.ids).toEqual(['bp-001'])
    expect(result.reasons!['bp-001']).toBe('stdout理由')
  })

  it('falls back to stdout when reasonsJson is invalid JSON', () => {
    const metadata = makeMetadata()
    const stdout = '- **bp-001** [intermediate]: フォールバック'

    const { source } = mergeReasons(metadata, '{invalid', stdout)
    expect(source).toBe('stdout')
  })

  it('falls back to stdout when reasons.json has empty reasons', () => {
    const metadata = makeMetadata()
    const reasonsJson = JSON.stringify({ reasons: {} })
    const stdout = '- **bp-001** [advanced]: 空フォールバック'

    const { source } = mergeReasons(metadata, reasonsJson, stdout)
    expect(source).toBe('stdout')
  })

  it('falls back to stdout when reasons is not an object', () => {
    const metadata = makeMetadata()
    const reasonsJson = JSON.stringify({ reasons: 'string' })
    const stdout = '- `bp-001`: 型不正フォールバック'

    const { source } = mergeReasons(metadata, reasonsJson, stdout)
    expect(source).toBe('stdout')
  })

  it('returns merged=false when no source has reasons', () => {
    const metadata = makeMetadata()
    const { merged, source } = mergeReasons(metadata, null, 'no patterns')
    expect(merged).toBe(false)
    expect(source).toBeNull()
  })

  it('returns merged=false when both sources are empty', () => {
    const { merged } = mergeReasons(makeMetadata(), null, '')
    expect(merged).toBe(false)
  })
})

// ── スキップ ──────────────────────────────────────────────────────────────────

describe('mergeReasons — skip when already merged', () => {
  it('skips when metadata already has reasons', () => {
    const metadata = makeMetadata({ reasons: { 'bp-001': '既存' } })
    const reasonsJson = JSON.stringify({ reasons: { 'bp-073': '新規' } })

    const { merged, source, result } = mergeReasons(metadata, reasonsJson, '')
    expect(merged).toBe(false)
    expect(source).toBeNull()
    expect(result.reasons!['bp-001']).toBe('既存')
  })
})

// ── stdout からの抽出 ────────────────────────────────────────────────────────

describe('mergeReasons — stdout extraction preserves metadata', () => {
  it('replaces IDs but keeps metadata when extracting from stdout', () => {
    const metadata = makeMetadata({
      ids: ['old-001'],
      sessionCount: 42,
      topCategories: ['memory'],
    })
    const stdout = '- **bp-073** [advanced]: 理由\n- **ext-003** [intermediate]: 理由2'

    const { result } = mergeReasons(metadata, null, stdout)
    expect(result.ids).toEqual(['bp-073', 'ext-003'])
    expect(result.sessionCount).toBe(42)
    expect(result.topCategories).toEqual(['memory'])
  })

  it('extracts coachingMessage from stdout', () => {
    const metadata = makeMetadata()
    const stdout = '- **bp-001** [beginner]: r\n**コーチングメッセージ:** 成長中'

    const { result } = mergeReasons(metadata, null, stdout)
    expect(result.coachingMessage).toBe('成長中')
  })
})

// ── Zod バリデーション ───────────────────────────────────────────────────────

describe('mergeReasons — Zod schema validation', () => {
  it('rejects reasons.json with invalid ID format', () => {
    const metadata = makeMetadata()
    const reasonsJson = JSON.stringify({
      reasons: { INVALID: 'reason' },
    })
    const stdout = '- **bp-001** [beginner]: フォールバック'

    const { source } = mergeReasons(metadata, reasonsJson, stdout)
    // Invalid ID format (no prefix-NNN) should fail Zod validation → fallback to stdout
    expect(source).toBe('stdout')
  })

  it('rejects reasons.json with empty reason string', () => {
    const metadata = makeMetadata()
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': '' },
    })
    const stdout = '- **bp-001** [beginner]: フォールバック'

    const { source } = mergeReasons(metadata, reasonsJson, stdout)
    expect(source).toBe('stdout')
  })

  it('rejects reasons.json with numeric values', () => {
    const metadata = makeMetadata()
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': 42 },
    })
    const stdout = '- **bp-001** [beginner]: フォールバック'

    const { source } = mergeReasons(metadata, reasonsJson, stdout)
    expect(source).toBe('stdout')
  })

  it('accepts valid reasons.json with proper ID format', () => {
    const metadata = makeMetadata({ ids: ['bp-001', 'ext-042', 'mem-123'] })
    const reasonsJson = JSON.stringify({
      reasons: {
        'bp-001': '有効な理由',
        'ext-042': '別の有効な理由',
        'mem-123': 'もう一つ',
      },
    })

    const { merged, source, result } = mergeReasons(metadata, reasonsJson, '')
    expect(merged).toBe(true)
    expect(source).toBe('reasons.json')
    expect(Object.keys(result.reasons!)).toHaveLength(3)
  })

  it('accepts reasons.json with coachingMessage', () => {
    const metadata = makeMetadata({ ids: ['bp-001'] })
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': '理由' },
      coachingMessage: 'コーチング',
    })

    const { result } = mergeReasons(metadata, reasonsJson, '')
    expect(result.coachingMessage).toBe('コーチング')
  })

  it('accepts reasons.json without coachingMessage', () => {
    const metadata = makeMetadata({ ids: ['bp-001'] })
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': '理由' },
    })

    const { merged } = mergeReasons(metadata, reasonsJson, '')
    expect(merged).toBe(true)
  })
})

// ── Stale reasons.json 検出 ──────────────────────────────────────────────────

describe('mergeReasons — stale detection', () => {
  it('detects stale reasons.json when no IDs overlap with metadata', () => {
    const metadata = makeMetadata({ ids: ['tool-001', 'tool-002', 'tool-003'] })
    const reasonsJson = JSON.stringify({
      reasons: {
        'bp-001': '前回の理由A',
        'ext-001': '前回の理由B',
      },
    })
    const stdout = '- **tool-001** [beginner]: 新しい理由'

    const { source } = mergeReasons(metadata, reasonsJson, stdout)
    // Stale reasons.json (no overlap) should be skipped → fallback to stdout
    expect(source).toBe('stdout')
  })

  it('accepts reasons.json when some IDs overlap with metadata', () => {
    const metadata = makeMetadata({ ids: ['bp-001', 'tool-002', 'ext-003'] })
    const reasonsJson = JSON.stringify({
      reasons: {
        'bp-001': '理由A',
        'ext-001': '理由B',
      },
    })

    const { source } = mergeReasons(metadata, reasonsJson, '')
    // bp-001 overlaps → not stale
    expect(source).toBe('reasons.json')
  })

  it('accepts reasons.json when metadata has empty ids', () => {
    const metadata = makeMetadata({ ids: [] })
    const reasonsJson = JSON.stringify({
      reasons: { 'bp-001': '理由' },
    })

    const { source } = mergeReasons(metadata, reasonsJson, '')
    // No metadata IDs to compare → trust reasons.json
    expect(source).toBe('reasons.json')
  })

  it('returns skipReason=already_merged when reasons exist', () => {
    const metadata = makeMetadata({ reasons: { 'bp-001': '既存' } })
    const { skipReason } = mergeReasons(metadata, null, '')
    expect(skipReason).toBe('already_merged')
  })

  it('returns skipReason=no_source when nothing available', () => {
    const metadata = makeMetadata()
    const { skipReason } = mergeReasons(metadata, null, '')
    expect(skipReason).toBe('no_source')
  })
})
