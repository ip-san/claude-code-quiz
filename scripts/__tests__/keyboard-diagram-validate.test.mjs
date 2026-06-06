import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { isValidKbDiagram } from '../keyboard-diagram-validate.mjs'

const combo = (n) => ({ keys: Array.from({ length: n }, (_, i) => ({ label: `k${i}` })) })

describe('isValidKbDiagram', () => {
  it('accepts a well-formed diagram (combos 1-6, keys 1-4, non-empty labels)', () => {
    expect(isValidKbDiagram({ combos: [{ keys: [{ label: 'Ctrl' }, { label: 'C', highlight: true }] }] })).toBe(true)
    expect(isValidKbDiagram({ combos: [combo(4)], sequence: true })).toBe(true)
    expect(isValidKbDiagram({ combos: Array.from({ length: 6 }, () => combo(1)) })).toBe(true)
  })

  it('rejects lower-bound violations (empty combos / empty keys / empty label)', () => {
    expect(isValidKbDiagram({ combos: [] })).toBe(false)
    expect(isValidKbDiagram({ combos: [{ keys: [] }] })).toBe(false)
    expect(isValidKbDiagram({ combos: [{ keys: [{ label: '' }] }] })).toBe(false)
  })

  it('rejects upper-bound violations (keys>4 / combos>6) — matches Zod max', () => {
    expect(isValidKbDiagram({ combos: [combo(5)] })).toBe(false)
    expect(isValidKbDiagram({ combos: Array.from({ length: 7 }, () => combo(1)) })).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(isValidKbDiagram(null)).toBeFalsy()
    expect(isValidKbDiagram({})).toBeFalsy()
    expect(isValidKbDiagram({ combos: 'x' })).toBeFalsy()
    expect(isValidKbDiagram({ combos: [{ keys: [{}] }] })).toBeFalsy()
  })

  it('stays in sync with the Zod KeyComboSchema/KeyboardDiagramSchema bounds (drift guard)', () => {
    // QuizValidator.ts の Zod 定義から min/max を抽出し、.mjs の上限・下限と一致することを固定する。
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../src/infrastructure/validation/QuizValidator.ts'),
      'utf8'
    )
    const keys = src.match(/keys:\s*z\.array\([^)]*\)\.min\((\d+)\)\.max\((\d+)\)/)
    const combos = src.match(/combos:\s*z\.array\([^)]*\)\.min\((\d+)\)\.max\((\d+)\)/)
    expect(keys, 'KeyComboSchema.keys min/max not found').toBeTruthy()
    expect(combos, 'KeyboardDiagramSchema.combos min/max not found').toBeTruthy()
    // .mjs 側の境界（keys 1-4 / combos 1-6）と一致
    expect([keys[1], keys[2]]).toEqual(['1', '4'])
    expect([combos[1], combos[2]]).toEqual(['1', '6'])
  })
})
