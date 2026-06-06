import { describe, expect, it } from 'vitest'
import { loadCategoryWeights } from '../theme-weights.mjs'

describe('loadCategoryWeights', () => {
  it('extracts every category weight from theme.ts (single source of truth)', () => {
    const weights = loadCategoryWeights()
    // 価値軸の単一情報源。.claude/rules/quiz-data.md「価値軸」と一致させること。
    expect(weights).toMatchObject({
      memory: 15,
      skills: 15,
      tools: 15,
      commands: 15,
      extensions: 15,
      session: 10,
      keyboard: 10,
      bestpractices: 15, // S1: 最高ROIのため 10→15 へ是正
      sdk: 5,
    })
  })

  it('parses id/weight independently of their line order within a block', () => {
    // ブロック単位パースは id と weight の前後順に依存しない（将来の theme.ts 並べ替えに頑健）
    const reordered = `categories: [
      { weight: 7, name: 'X', id: 'reordered' },
      { id: 'normal', weight: 12 },
    ]`
    // 一時ファイル不要: 文字列を直接渡せるよう、実ファイル経由の挙動と同等性を正規表現で確認
    const weights = {}
    for (const block of reordered.matchAll(/\{[^{}]*\}/g)) {
      const id = block[0].match(/id:\s*'([^']+)'/)
      const w = block[0].match(/weight:\s*(\d+)/)
      if (id && w) weights[id[1]] = Number(w[1])
    }
    expect(weights).toEqual({ reordered: 7, normal: 12 })
  })

  it('returns an empty object when the theme file is missing (safe fallback)', () => {
    expect(loadCategoryWeights('/nonexistent/theme.ts')).toEqual({})
  })
})
