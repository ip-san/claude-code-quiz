import { describe, expect, it } from 'vitest'
import { buildAuditClaims, parseAuditResponse, updatePreVerifyResults } from '../audit-matched-quiz.mjs'

describe('parseAuditResponse', () => {
  it('parses clean JSON array', () => {
    const text = '[{"id":"mem-001","verdict":"confirm","reason":"一致"}]'
    const result = parseAuditResponse(text)
    expect(result).toEqual([{ id: 'mem-001', verdict: 'confirm', reason: '一致' }])
  })

  it('parses JSON wrapped in markdown fences', () => {
    const text = '```json\n[{"id":"bp-001","verdict":"demote","reason":"数値不一致"}]\n```'
    const result = parseAuditResponse(text)
    expect(result).toEqual([{ id: 'bp-001', verdict: 'demote', reason: '数値不一致' }])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseAuditResponse('not json')).toEqual([])
    expect(parseAuditResponse('')).toEqual([])
  })

  it('handles multiple verdicts', () => {
    const text = JSON.stringify([
      { id: 'mem-001', verdict: 'confirm', reason: 'OK' },
      { id: 'bp-002', verdict: 'demote', reason: '根拠薄い' },
      { id: 'key-003', verdict: 'confirm', reason: '一致' },
    ])
    const result = parseAuditResponse(text)
    expect(result).toHaveLength(3)
    expect(result[1].verdict).toBe('demote')
  })
})

describe('buildAuditClaims', () => {
  const quizzes = [
    {
      id: 'mem-001',
      question: 'Memory に関する問題です。正しいものを選んでください。',
      options: [{ text: '正解の選択肢テキスト' }, { text: '不正解1', wrongFeedback: 'これは違います' }],
      correctIndex: 0,
      explanation: '解説テキストです。',
      category: 'memory',
    },
    {
      id: 'bp-002',
      question: 'ベストプラクティスについて',
      options: [{ text: '選択肢A', wrongFeedback: '違います' }, { text: '正解B' }],
      correctIndex: 1,
      explanation: 'BPの解説',
      category: 'bestpractices',
    },
  ]

  it('builds claims with Haiku reason and matchedDoc', () => {
    const matched = [{ id: 'mem-001', reason: 'ドキュメントと一致', matchedDoc: 'memory' }]
    const claims = buildAuditClaims(quizzes, matched)
    expect(claims).toHaveLength(1)
    expect(claims[0]).toEqual({
      id: 'mem-001',
      question: 'Memory に関する問題です。正しいものを選んでください。',
      correctAnswer: '正解の選択肢テキスト',
      explanation: '解説テキストです。',
      category: 'memory',
      haikuReason: 'ドキュメントと一致',
      matchedDoc: 'memory',
    })
  })

  it('handles missing reason/matchedDoc gracefully', () => {
    const matched = [{ id: 'bp-002' }]
    const claims = buildAuditClaims(quizzes, matched)
    expect(claims).toHaveLength(1)
    expect(claims[0].haikuReason).toBe('')
    expect(claims[0].matchedDoc).toBe('')
  })

  it('filters out matched items not in quizzes', () => {
    const matched = [
      { id: 'mem-001', reason: 'OK', matchedDoc: 'memory' },
      { id: 'nonexistent-999', reason: 'OK', matchedDoc: '' },
    ]
    const claims = buildAuditClaims(quizzes, matched)
    expect(claims).toHaveLength(1)
    expect(claims[0].id).toBe('mem-001')
  })

  it('returns empty array for empty matched', () => {
    expect(buildAuditClaims(quizzes, [])).toEqual([])
  })
})

describe('updatePreVerifyResults', () => {
  const baseResults = {
    preVerifiedAt: '2026-04-11T00:00:00Z',
    model: 'haiku',
    total: 100,
    matched: [
      { id: 'mem-001', reason: 'OK', matchedDoc: 'memory' },
      { id: 'bp-002', reason: 'OK', matchedDoc: 'bestpractices' },
      { id: 'key-003', reason: 'OK', matchedDoc: 'keyboard' },
    ],
    flagged: [{ id: 'tool-001', reason: '不一致' }],
    uncertain: [{ id: 'cmd-001', reason: '不明' }],
    sonnetTargets: ['tool-001', 'cmd-001'],
    skipCount: 3,
  }

  it('moves demoted items from matched to flagged', () => {
    const verdicts = [
      { id: 'mem-001', verdict: 'confirm', reason: '妥当' },
      { id: 'bp-002', verdict: 'demote', reason: '数値が異なる' },
      { id: 'key-003', verdict: 'confirm', reason: 'OK' },
    ]
    const updated = updatePreVerifyResults(baseResults, verdicts)

    // matched should lose bp-002
    expect(updated.matched).toHaveLength(2)
    expect(updated.matched.map((m) => m.id)).toEqual(['mem-001', 'key-003'])

    // flagged should gain bp-002
    expect(updated.flagged).toHaveLength(2)
    expect(updated.flagged[1]).toEqual({ id: 'bp-002', reason: 'Opus audit: 数値が異なる' })

    // sonnetTargets should include bp-002
    expect(updated.sonnetTargets).toContain('bp-002')
    expect(updated.sonnetTargets).toContain('tool-001')
    expect(updated.sonnetTargets).toContain('cmd-001')

    // skipCount updated
    expect(updated.skipCount).toBe(2)

    // opusAudit metadata
    expect(updated.opusAudit.confirmed).toBe(2)
    expect(updated.opusAudit.demoted).toBe(1)
    expect(updated.opusAudit.demotedIds).toEqual(['bp-002'])
  })

  it('returns unchanged results when no demotions', () => {
    const verdicts = [
      { id: 'mem-001', verdict: 'confirm', reason: '妥当' },
      { id: 'bp-002', verdict: 'confirm', reason: '妥当' },
      { id: 'key-003', verdict: 'confirm', reason: '妥当' },
    ]
    const updated = updatePreVerifyResults(baseResults, verdicts)
    expect(updated).toBe(baseResults) // Same reference — no mutation
  })

  it('handles all items demoted', () => {
    const verdicts = [
      { id: 'mem-001', verdict: 'demote', reason: '根拠薄い' },
      { id: 'bp-002', verdict: 'demote', reason: '変更済み' },
      { id: 'key-003', verdict: 'demote', reason: '非推奨' },
    ]
    const updated = updatePreVerifyResults(baseResults, verdicts)
    expect(updated.matched).toHaveLength(0)
    expect(updated.flagged).toHaveLength(4) // 1 original + 3 demoted
    expect(updated.skipCount).toBe(0)
    expect(updated.opusAudit.demoted).toBe(3)
  })

  it('does not duplicate sonnetTargets', () => {
    // Simulate a case where a demoted ID is already in sonnetTargets
    const results = { ...baseResults, sonnetTargets: ['tool-001', 'cmd-001', 'bp-002'] }
    const verdicts = [{ id: 'bp-002', verdict: 'demote', reason: '再検証' }]
    const updated = updatePreVerifyResults(results, verdicts)
    const bp002Count = updated.sonnetTargets.filter((id) => id === 'bp-002').length
    expect(bp002Count).toBe(1)
  })

  it('handles empty verdicts array', () => {
    const updated = updatePreVerifyResults(baseResults, [])
    expect(updated).toBe(baseResults)
  })
})
