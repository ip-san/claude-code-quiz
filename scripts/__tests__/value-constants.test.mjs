import { describe, expect, it } from 'vitest'
import { VALUE_DEFAULT_WEIGHT, VALUE_TAG_BONUS_MJS } from '../value-constants.mjs'

// これらは src/domain/valueObjects/ValueScore.ts の VALUE_TAG_BONUS / DEFAULT_CATEGORY_WEIGHT の
// .mjs 複製。TS 側(ValueScore.test.ts)と本テストが同じ値を pin することで、
// どちらか一方だけを書き換えた場合に CI が drift を検知する。
describe('value-constants (mjs side, must match ValueScore.ts)', () => {
  it('VALUE_TAG_BONUS_MJS matches the TS VALUE_TAG_BONUS', () => {
    expect(VALUE_TAG_BONUS_MJS).toEqual({ practical: 6, trivia: -4 })
  })

  it('VALUE_DEFAULT_WEIGHT matches the TS DEFAULT_CATEGORY_WEIGHT', () => {
    expect(VALUE_DEFAULT_WEIGHT).toBe(10)
  })
})
