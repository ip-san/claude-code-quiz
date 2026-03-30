import { describe, expect, it } from 'vitest'
import { migrateQuestionIds } from './idMigration'

describe('migrateQuestionIds', () => {
  it('migrates all gs- IDs to new prefixes', () => {
    const input = JSON.stringify({
      questionProgress: {
        'gs-001': { attempts: 3 },
        'gs-003': { attempts: 1 },
        'gs-010': { attempts: 2 },
        'gs-011': { attempts: 1 },
      },
    })
    const result = JSON.parse(migrateQuestionIds(input))
    expect(result.questionProgress).toHaveProperty('bp-082')
    expect(result.questionProgress).toHaveProperty('ses-166')
    expect(result.questionProgress).toHaveProperty('cmd-103')
    expect(result.questionProgress).toHaveProperty('mem-053')
    expect(result.questionProgress).not.toHaveProperty('gs-001')
    expect(result.questionProgress).not.toHaveProperty('gs-003')
  })

  it('does not modify data without gs- IDs', () => {
    const input = JSON.stringify({ questionProgress: { 'bp-001': { attempts: 1 } } })
    expect(migrateQuestionIds(input)).toBe(input)
  })

  it('only replaces exact quoted IDs, not substrings', () => {
    // "flags-001" should not be affected; "gs-001" in quotes IS replaced
    const input = JSON.stringify({ a: 'flags-001', b: 'gs-001' })
    const result = JSON.parse(migrateQuestionIds(input))
    expect(result.a).toBe('flags-001')
    expect(result.b).toBe('bp-082')
  })

  it('handles multiple occurrences of the same ID', () => {
    const input = JSON.stringify({
      questionProgress: { 'gs-007': { attempts: 1 } },
      wrongAnswers: [{ questionId: 'gs-007' }],
    })
    const result = migrateQuestionIds(input)
    expect(result).not.toContain('gs-007')
    expect(result.match(/"bp-084"/g)?.length).toBe(2)
  })

  it('preserves data values during migration', () => {
    const input = JSON.stringify({
      questionProgress: {
        'gs-005': { attempts: 5, correctCount: 3 },
      },
    })
    const result = JSON.parse(migrateQuestionIds(input))
    expect(result.questionProgress['ses-167']).toEqual({ attempts: 5, correctCount: 3 })
  })
})
