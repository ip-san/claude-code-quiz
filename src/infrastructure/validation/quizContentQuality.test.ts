/**
 * Quiz Content Quality Tests
 *
 * quizzes.json の構造的品質を自動検証する。
 * Zod スキーマ検証（QuizValidator）では検出できない
 * コンテンツレベルの問題を検出する。
 *
 * 検出対象:
 * - ID重複
 * - correctIndex の偏り（特定位置に集中していないか）
 * - wrongFeedback の構造（正解に付いていないか、不正解に欠けていないか）
 * - カテゴリの妥当性（PREDEFINED_CATEGORIES と一致するか）
 * - 問題文・解説の空チェック
 */

import { describe, it, expect } from 'vitest'
import quizData from '../../data/quizzes.json'
import { PREDEFINED_CATEGORIES } from '../../domain/valueObjects/Category'

const quizzes = quizData.quizzes

describe('Quiz Content Quality', () => {
  describe('ID の一意性', () => {
    it('すべてのIDが一意であること', () => {
      const ids = quizzes.map(q => q.id)
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
      expect(duplicates).toEqual([])
    })
  })

  describe('correctIndex の分布', () => {
    it('特定のインデックスに35%以上集中していないこと', () => {
      const counts = [0, 0, 0, 0, 0, 0]
      quizzes.forEach(q => {
        counts[q.correctIndex] = (counts[q.correctIndex] || 0) + 1
      })
      const total = quizzes.length
      const maxAllowedPct = 0.35

      counts.forEach((count, index) => {
        if (count > 0) {
          const pct = count / total
          expect(
            pct,
            `correctIndex=${index} が ${(pct * 100).toFixed(1)}% (${count}/${total}) で偏りすぎ`
          ).toBeLessThanOrEqual(maxAllowedPct)
        }
      })
    })

    it('少なくとも3つ以上の異なるインデックスが使用されていること', () => {
      const usedIndices = new Set(quizzes.map(q => q.correctIndex))
      expect(usedIndices.size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('wrongFeedback の構造', () => {
    it('正解選択肢に wrongFeedback が付いていないこと', () => {
      const violations = quizzes.filter(q => {
        const correct = q.options[q.correctIndex]
        return 'wrongFeedback' in correct && correct.wrongFeedback !== undefined
      })
      const ids = violations.map(q => q.id)
      expect(ids, `正解に wrongFeedback がある: ${ids.join(', ')}`).toEqual([])
    })

    it('不正解選択肢に wrongFeedback が存在すること', () => {
      const violations: string[] = []
      quizzes.forEach(q => {
        q.options.forEach((opt, i) => {
          if (i !== q.correctIndex && !opt.wrongFeedback) {
            violations.push(`${q.id} option[${i}]`)
          }
        })
      })
      expect(violations, `wrongFeedback が欠けている: ${violations.slice(0, 10).join(', ')}`).toEqual([])
    })
  })

  describe('カテゴリの妥当性', () => {
    const validCategoryIds = PREDEFINED_CATEGORIES.map(c => c.id)

    it('すべてのカテゴリが PREDEFINED_CATEGORIES に含まれること', () => {
      const invalidCategories = quizzes.filter(q => !validCategoryIds.includes(q.category))
      const details = invalidCategories.map(q => `${q.id}: "${q.category}"`)
      expect(details, `無効なカテゴリ: ${details.join(', ')}`).toEqual([])
    })

    it('すべてのカテゴリに少なくとも1問存在すること', () => {
      const categoriesUsed = new Set(quizzes.map(q => q.category))
      const missing = validCategoryIds.filter(id => !categoriesUsed.has(id))
      expect(missing, `問題がないカテゴリ: ${missing.join(', ')}`).toEqual([])
    })
  })

  describe('コンテンツの品質', () => {
    it('問題文が10文字以上であること', () => {
      const tooShort = quizzes.filter(q => q.question.length < 10)
      const details = tooShort.map(q => `${q.id}: "${q.question}" (${q.question.length}文字)`)
      expect(details, `問題文が短すぎる: ${details.join(', ')}`).toEqual([])
    })

    it('解説文が10文字以上であること', () => {
      const tooShort = quizzes.filter(q => q.explanation.length < 10)
      const details = tooShort.map(q => `${q.id}: "${q.explanation}" (${q.explanation.length}文字)`)
      expect(details, `解説文が短すぎる: ${details.join(', ')}`).toEqual([])
    })

    it('すべての問題に referenceUrl があること', () => {
      const missing = quizzes.filter(q => !q.referenceUrl)
      const ids = missing.map(q => q.id)
      expect(ids, `referenceUrl がない: ${ids.join(', ')}`).toEqual([])
    })

    it('referenceUrl が code.claude.com のドキュメントURLであること', () => {
      const invalid = quizzes.filter(q =>
        q.referenceUrl && !q.referenceUrl.startsWith('https://code.claude.com/docs/en/')
      )
      const details = invalid.map(q => `${q.id}: "${q.referenceUrl}"`)
      expect(details, `無効なURL: ${details.join(', ')}`).toEqual([])
    })
  })

  describe('基本統計', () => {
    it('問題数が100問以上であること', () => {
      expect(quizzes.length).toBeGreaterThanOrEqual(100)
    })

    it('3つの難易度すべてが使用されていること', () => {
      const difficulties = new Set(quizzes.map(q => q.difficulty))
      expect(difficulties).toContain('beginner')
      expect(difficulties).toContain('intermediate')
      expect(difficulties).toContain('advanced')
    })

    it('各難易度が全体の10%以上を占めること', () => {
      const total = quizzes.length
      const counts: Record<string, number> = {}
      quizzes.forEach(q => {
        counts[q.difficulty] = (counts[q.difficulty] || 0) + 1
      })

      for (const [difficulty, count] of Object.entries(counts)) {
        const pct = count / total
        expect(
          pct,
          `${difficulty} が ${(pct * 100).toFixed(1)}% で少なすぎ`
        ).toBeGreaterThanOrEqual(0.10)
      }
    })
  })
})
