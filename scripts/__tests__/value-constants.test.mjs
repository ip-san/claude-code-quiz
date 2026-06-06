import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORY_WEIGHT, VALUE_TAG_BONUS } from '../../src/domain/valueObjects/ValueScore'
import { VALUE_DEFAULT_WEIGHT, VALUE_TAG_BONUS_MJS } from '../value-constants.mjs'

// value-constants.mjs は ValueScore.ts(TS) の定数の .mjs 複製（TS↔mjs 境界で import できないため）。
// 本テストは TS 側を実 import して突き合わせるため、どちらか一方だけを書き換えると CI が必ず落ちる
// （= 真の drift 検知）。
describe('value-constants (mjs side) must stay in sync with ValueScore.ts (TS side)', () => {
  it('VALUE_TAG_BONUS_MJS deep-equals the TS VALUE_TAG_BONUS', () => {
    expect(VALUE_TAG_BONUS_MJS).toEqual(VALUE_TAG_BONUS)
  })

  it('VALUE_DEFAULT_WEIGHT equals the TS DEFAULT_CATEGORY_WEIGHT', () => {
    expect(VALUE_DEFAULT_WEIGHT).toBe(DEFAULT_CATEGORY_WEIGHT)
  })

  it('still pins the concrete expected values (guards both sides drifting together)', () => {
    expect(VALUE_TAG_BONUS_MJS).toEqual({ practical: 6, trivia: -4 })
    expect(VALUE_DEFAULT_WEIGHT).toBe(10)
  })
})
