/**
 * Quiz Content Quality Tests
 *
 * quizzes.json の構造的品質を自動検証する。
 * Zod スキーマ検証（QuizValidator）では検出できない
 * コンテンツレベルの問題を検出する。
 *
 * 検出対象:
 * - ID重複・命名規則
 * - correctIndex / correctIndices の整合性と偏り
 * - wrongFeedback の構造（正解に付いていないか、不正解に欠けていないか）
 * - カテゴリの妥当性（PREDEFINED_CATEGORIES と一致するか）
 * - 問題文・解説の空チェック・重複チェック
 * - 選択肢テキストの重複
 * - referenceUrl のドキュメントページ妥当性
 * - タグの妥当性
 * - 全体像モードのタグ品質
 */

import { describe, it, expect } from 'vitest'
import quizData from '../../data/quizzes.json'
import { PREDEFINED_CATEGORIES } from '../../domain/valueObjects/Category'
import { PREDEFINED_TOPIC_TAGS } from '../../domain/valueObjects/TopicTag'

const quizzes = quizData.quizzes
const singleQuizzes = quizzes.filter(q => q.type !== 'multi')
const multiQuizzes = quizzes.filter(q => q.type === 'multi')
const validCategoryIds = PREDEFINED_CATEGORIES.map(c => c.id)

/** ID prefix → category の対応表（gs- はレガシー） */
const ID_PREFIX_TO_CATEGORY: Record<string, string> = {
  'mem': 'memory',
  'skill': 'skills',
  'tool': 'tools',
  'cmd': 'commands',
  'ext': 'extensions',
  'ses': 'session',
  'key': 'keyboard',
  'bp': 'bestpractices',
}

/** 有効なドキュメントページパス */
const VALID_DOC_PAGES = [
  // code.claude.com pages — Core
  'overview', 'quickstart', 'settings', 'memory',
  // Interactive & Tools
  'interactive-mode', 'how-claude-code-works',
  // Extensions & Integration
  'mcp', 'hooks', 'hooks-guide', 'discover-plugins',
  'plugins', 'plugins-reference', 'plugin-marketplaces',
  'sub-agents', 'agent-teams', 'skills',
  // Advanced
  'common-workflows', 'checkpointing', 'best-practices',
  'model-config', 'sandboxing', 'headless',
  // Customization & UI
  'keybindings', 'output-styles', 'statusline', 'terminal-config', 'fast-mode',
  // Platforms & IDE
  'vs-code', 'jetbrains', 'desktop', 'chrome', 'slack',
  // CI/CD & Automation
  'github-actions', 'gitlab-ci-cd', 'scheduled-tasks', 'remote-control',
  // Enterprise & Configuration
  'server-managed-settings', 'devcontainer',
  // Cloud & Provider
  'claude-code-on-the-web', 'amazon-bedrock', 'google-vertex-ai',
  'microsoft-foundry', 'llm-gateway',
  // Enterprise & Security (new)
  'network-config', 'third-party-integrations', 'analytics',
  'monitoring-usage', 'security',
  // Features (new)
  'code-review', 'troubleshooting',
  // Supplementary
  'permissions', 'cli-reference', 'setup', 'features-overview',
  'desktop-quickstart', 'authentication',
  // platform.claude.com pages
  'agent-sdk/overview',
]

/** 有効なタグパターン */
const VALID_TAG_PATTERNS = [
  /^overview$/,
  /^overview-\d+$/,
  /^overview-ch-\d+$/,
  /^topic-[a-z]+(-[a-z]+)*$/,
]

const validTopicTagIds = PREDEFINED_TOPIC_TAGS.map(t => t.id)

describe('Quiz Content Quality', () => {
  describe('ID の一意性と命名規則', () => {
    it('すべてのIDが一意であること', () => {
      const ids = quizzes.map(q => q.id)
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
      expect(duplicates).toEqual([])
    })

    it('IDが命名規則に準拠していること（prefix-NNN 形式）', () => {
      const violations = quizzes.filter(q => !/^[a-z]+-\d{3}$/.test(q.id))
      const ids = violations.map(q => q.id)
      expect(ids, `命名規則違反: ${ids.join(', ')}`).toEqual([])
    })

    it('IDプレフィックスがカテゴリと対応していること（gs- レガシーを除く）', () => {
      const violations: string[] = []
      quizzes.forEach(q => {
        const prefix = q.id.replace(/-\d+$/, '')
        if (prefix === 'gs') return // レガシーIDは除外
        const expectedCategory = ID_PREFIX_TO_CATEGORY[prefix]
        if (expectedCategory && q.category !== expectedCategory) {
          violations.push(`${q.id}: prefix "${prefix}" → expected "${expectedCategory}", got "${q.category}"`)
        }
        if (!expectedCategory && !ID_PREFIX_TO_CATEGORY[prefix]) {
          violations.push(`${q.id}: unknown prefix "${prefix}"`)
        }
      })
      expect(violations, `ID-カテゴリ不一致: ${violations.join(', ')}`).toEqual([])
    })
  })

  describe('correctIndex / correctIndices の整合性', () => {
    it('単一選択問題に correctIndex が必ず存在すること', () => {
      const violations = singleQuizzes.filter(q => q.correctIndex == null)
      const ids = violations.map(q => q.id)
      expect(ids, `correctIndex がない single 問題: ${ids.join(', ')}`).toEqual([])
    })

    it('単一選択問題に correctIndices が存在しないこと', () => {
      const violations = singleQuizzes.filter(q => 'correctIndices' in q && q.correctIndices != null)
      const ids = violations.map(q => q.id)
      expect(ids, `single 問題に correctIndices がある: ${ids.join(', ')}`).toEqual([])
    })

    it('複数選択問題に correctIndex が存在しないこと（correctIndices のみ使用）', () => {
      const violations = multiQuizzes.filter(q => 'correctIndex' in q)
      const ids = violations.map(q => q.id)
      expect(ids, `multi 問題に correctIndex がある: ${ids.join(', ')}`).toEqual([])
    })

    it('複数選択問題に correctIndices が2個以上あること', () => {
      const violations = multiQuizzes.filter(q => !q.correctIndices || q.correctIndices.length < 2)
      const ids = violations.map(q => q.id)
      expect(ids, `correctIndices が2個未満: ${ids.join(', ')}`).toEqual([])
    })

    it('複数選択問題の correctIndices が全て options 範囲内であること', () => {
      const violations: string[] = []
      multiQuizzes.forEach(q => {
        (q.correctIndices ?? []).forEach(idx => {
          if (idx < 0 || idx >= q.options.length) {
            violations.push(`${q.id} correctIndices[${idx}]`)
          }
        })
      })
      expect(violations, `範囲外の correctIndices: ${violations.join(', ')}`).toEqual([])
    })
  })

  describe('correctIndex の分布（単一選択問題）', () => {
    it('特定のインデックスに35%以上集中していないこと', () => {
      const counts = new Map<number, number>()
      singleQuizzes.forEach(q => {
        const ci = q.correctIndex!
        counts.set(ci, (counts.get(ci) ?? 0) + 1)
      })
      const total = singleQuizzes.length

      for (const [index, count] of counts) {
        const pct = count / total
        expect(
          pct,
          `correctIndex=${index} が ${(pct * 100).toFixed(1)}% (${count}/${total}) で偏りすぎ`
        ).toBeLessThanOrEqual(0.35)
      }
    })

    it('少なくとも3つ以上の異なるインデックスが使用されていること', () => {
      const usedIndices = new Set(singleQuizzes.map(q => q.correctIndex!))
      expect(usedIndices.size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('wrongFeedback の構造（単一選択問題）', () => {
    it('正解選択肢に wrongFeedback が付いていないこと', () => {
      const violations = singleQuizzes.filter(q => {
        const correct = q.options[q.correctIndex!]
        return 'wrongFeedback' in correct && correct.wrongFeedback !== undefined
      })
      const ids = violations.map(q => q.id)
      expect(ids, `正解に wrongFeedback がある: ${ids.join(', ')}`).toEqual([])
    })

    it('不正解選択肢に wrongFeedback が存在すること', () => {
      const violations: string[] = []
      singleQuizzes.forEach(q => {
        q.options.forEach((opt, i) => {
          if (i !== q.correctIndex && !opt.wrongFeedback) {
            violations.push(`${q.id} option[${i}]`)
          }
        })
      })
      expect(violations, `wrongFeedback が欠けている: ${violations.slice(0, 10).join(', ')}`).toEqual([])
    })
  })

  describe('wrongFeedback の構造（複数選択問題）', () => {
    it('正解選択肢に wrongFeedback が付いていないこと', () => {
      const violations: string[] = []
      multiQuizzes.forEach(q => {
        const correctSet = new Set(q.correctIndices ?? [])
        q.options.forEach((opt, i) => {
          if (correctSet.has(i) && 'wrongFeedback' in opt && opt.wrongFeedback !== undefined) {
            violations.push(`${q.id} option[${i}]`)
          }
        })
      })
      expect(violations, `正解に wrongFeedback がある: ${violations.join(', ')}`).toEqual([])
    })

    it('不正解選択肢に wrongFeedback が存在すること', () => {
      const violations: string[] = []
      multiQuizzes.forEach(q => {
        const correctSet = new Set(q.correctIndices ?? [])
        q.options.forEach((opt, i) => {
          if (!correctSet.has(i) && !opt.wrongFeedback) {
            violations.push(`${q.id} option[${i}]`)
          }
        })
      })
      expect(violations, `wrongFeedback が欠けている: ${violations.slice(0, 10).join(', ')}`).toEqual([])
    })
  })

  describe('カテゴリの妥当性', () => {
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

  describe('選択肢の品質', () => {
    it('同一問題内に重複する選択肢テキストがないこと', () => {
      const violations: string[] = []
      quizzes.forEach(q => {
        const seen = new Set<string>()
        q.options.forEach((opt, i) => {
          if (seen.has(opt.text)) {
            violations.push(`${q.id} option[${i}]: "${opt.text}"`)
          }
          seen.add(opt.text)
        })
      })
      expect(violations, `重複選択肢: ${violations.join(', ')}`).toEqual([])
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

    it('問題文と解説文が同一でないこと', () => {
      const violations = quizzes.filter(q => q.question === q.explanation)
      const ids = violations.map(q => q.id)
      expect(ids, `問題文と解説が同一: ${ids.join(', ')}`).toEqual([])
    })

    it('すべての問題に referenceUrl があること', () => {
      const missing = quizzes.filter(q => !q.referenceUrl)
      const ids = missing.map(q => q.id)
      expect(ids, `referenceUrl がない: ${ids.join(', ')}`).toEqual([])
    })

    it('referenceUrl が公式ドキュメントURLであること', () => {
      const validPrefixes = [
        'https://code.claude.com/docs/en/',
        'https://platform.claude.com/docs/en/',
      ]
      const invalid = quizzes.filter(q =>
        q.referenceUrl && !validPrefixes.some(p => q.referenceUrl.startsWith(p))
      )
      const details = invalid.map(q => `${q.id}: "${q.referenceUrl}"`)
      expect(details, `無効なURL: ${details.join(', ')}`).toEqual([])
    })

    it('referenceUrl のパスが既知のドキュメントページであること', () => {
      const prefixes = [
        'https://code.claude.com/docs/en/',
        'https://platform.claude.com/docs/en/',
      ]
      const violations: string[] = []
      quizzes.forEach(q => {
        if (!q.referenceUrl) return
        const matchedPrefix = prefixes.find(p => q.referenceUrl.startsWith(p))
        if (!matchedPrefix) return // URL形式のチェックは別テストで実施済み
        const pathWithFragment = q.referenceUrl.slice(matchedPrefix.length)
        const page = pathWithFragment.split('#')[0]
        if (!VALID_DOC_PAGES.includes(page)) {
          violations.push(`${q.id}: unknown page "${page}"`)
        }
      })
      expect(violations, `不明なドキュメントページ: ${violations.join(', ')}`).toEqual([])
    })
  })

  describe('タグの妥当性', () => {
    it('すべてのタグが既知のパターンに一致すること', () => {
      const violations: string[] = []
      quizzes.forEach(q => {
        (q.tags ?? []).forEach((tag: string) => {
          if (!VALID_TAG_PATTERNS.some(p => p.test(tag))) {
            violations.push(`${q.id}: unknown tag "${tag}"`)
          }
        })
      })
      expect(violations, `不明なタグ: ${violations.join(', ')}`).toEqual([])
    })

    it('topic-* タグが PREDEFINED_TOPIC_TAGS に定義済みであること', () => {
      const violations: string[] = []
      quizzes.forEach(q => {
        (q.tags ?? []).forEach((tag: string) => {
          if (tag.startsWith('topic-') && !validTopicTagIds.includes(tag)) {
            violations.push(`${q.id}: undefined topic tag "${tag}"`)
          }
        })
      })
      expect(violations, `未定義のトピックタグ: ${violations.join(', ')}`).toEqual([])
    })
  })

  describe('全体像モードのタグ品質', () => {
    const overviewQuizzes = quizzes.filter(q =>
      q.tags && q.tags.includes('overview')
    )

    it('overview タグ付き問題が30問以上あること', () => {
      expect(overviewQuizzes.length).toBeGreaterThanOrEqual(30)
    })

    it('すべてのoverview問題にソート用タグがあること', () => {
      const missingOrder = overviewQuizzes.filter(q =>
        !q.tags!.some((t: string) => /^overview-\d+$/.test(t))
      )
      const ids = missingOrder.map(q => q.id)
      expect(ids, `ソートタグがない: ${ids.join(', ')}`).toEqual([])
    })

    it('ソート用タグに重複がないこと', () => {
      const orderTags = overviewQuizzes.flatMap(q =>
        q.tags!.filter((t: string) => /^overview-\d+$/.test(t))
      )
      const duplicates = orderTags.filter((t: string, i: number) => orderTags.indexOf(t) !== i)
      expect(duplicates, `重複タグ: ${duplicates.join(', ')}`).toEqual([])
    })

    it('全カテゴリが含まれていること', () => {
      const categories = new Set(overviewQuizzes.map(q => q.category))
      const missing = validCategoryIds.filter(c => !categories.has(c))
      expect(missing, `欠落カテゴリ: ${missing.join(', ')}`).toEqual([])
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

  describe('ダイアグラムの品質', () => {
    const diagramQuizzes = quizzes.filter(
      (q): q is typeof q & { diagram: NonNullable<typeof q.diagram> } =>
        q.diagram != null
    )

    it('diagramフィールドが有効なtypeを持つこと', () => {
      const validTypes = ['hierarchy', 'flow', 'cycle', 'comparison']
      const violations = diagramQuizzes.filter(
        q => !validTypes.includes(q.diagram.type)
      )
      expect(violations.map(q => q.id)).toEqual([])
    })

    it('hierarchyダイアグラムが2個以上のアイテムを持つこと', () => {
      const violations = diagramQuizzes
        .filter(q => q.diagram.type === 'hierarchy')
        .filter(q => (q.diagram.items?.length ?? 0) < 2)
      expect(violations.map(q => q.id)).toEqual([])
    })

    it('flowダイアグラムが2個以上のステップを持つこと', () => {
      const violations = diagramQuizzes
        .filter(q => q.diagram.type === 'flow')
        .filter(q => (q.diagram.steps?.length ?? 0) < 2)
      expect(violations.map(q => q.id)).toEqual([])
    })

    it('cycleダイアグラムが2個以上の状態を持つこと', () => {
      const violations = diagramQuizzes
        .filter(q => q.diagram.type === 'cycle')
        .filter(q => (q.diagram.states?.length ?? 0) < 2)
      expect(violations.map(q => q.id)).toEqual([])
    })

    it('comparisonダイアグラムが2個以上のカラムを持つこと', () => {
      const violations = diagramQuizzes
        .filter(q => q.diagram.type === 'comparison')
        .filter(q => (q.diagram.columns?.length ?? 0) < 2)
      expect(violations.map(q => q.id)).toEqual([])
    })
  })
})
