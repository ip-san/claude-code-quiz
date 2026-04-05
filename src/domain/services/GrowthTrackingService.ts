/**
 * GrowthTrackingService — 個人の成長を追跡するコーチングサービス
 *
 * detectWorkPatterns() の結果を履歴保存し、前回と比較して
 * 「改善」「悪化」「新規」を検出する。
 * ユーザーの使い方が段々改善しているかを可視化するための基盤。
 */

import { theme } from '@/config/theme'

const STORAGE_KEY = `${theme.storagePrefix}-pattern-history`
const MAX_SNAPSHOTS = 10

/** 保存する1回分のスナップショット */
export interface PatternSnapshot {
  /** ISO date string (YYYY-MM-DD) */
  readonly date: string
  /** 検出されたパターン名の配列 */
  readonly patterns: readonly string[]
  /** パターン名 → 具体的な回数/強度 */
  readonly patternCounts: Readonly<Record<string, number>>
  /** AI usage style（あれば） */
  readonly aiStyle?: string
  /** プロンプトの成熟度指標 */
  readonly maturity: {
    /** 平均プロンプト長 */
    readonly avgLength: number
    /** 探求系プロンプトの割合 (0-1) */
    readonly inquiryRatio: number
    /** 具体的な指示の割合（ファイル名・行番号含む）(0-1) */
    readonly specificityRatio: number
    /** 総プロンプト数 */
    readonly totalPrompts: number
  }
}

/** パターンの変化詳細 */
export interface PatternChange {
  readonly pattern: string
  readonly detail: string
  /** 前回の検出回数 */
  readonly prevCount: number
  /** 今回の検出回数 */
  readonly currentCount: number
  /** 改善率 (0-100)。完全解消=100 */
  readonly improvementPercent?: number
}

/** クイズ学習と実務改善の因果分析 */
export interface LearningImpact {
  /** クイズを解いて改善されたパターン */
  readonly quizHelped: readonly { pattern: string; category: string; message: string }[]
  /** クイズを解いていなくて改善されていないパターン */
  readonly quizNeeded: readonly { pattern: string; category: string; message: string }[]
}

/** 前回と今回の比較結果 */
export interface GrowthInsight {
  /** 改善されたパターン（前回あったが今回なくなった or 回数が減った） */
  readonly improved: readonly PatternChange[]
  /** 新たに検出されたパターン */
  readonly newIssues: readonly PatternChange[]
  /** プロンプト成熟度の変化 */
  readonly maturityChange: {
    readonly direction: 'improving' | 'stable' | 'declining'
    readonly message: string
  }
  /** クイズ→実務の因果分析 */
  readonly learningImpact?: LearningImpact
  /** コーチングメッセージ（最も重要な1つ） */
  readonly coachingMessage: string
  /** 比較回数（何回目の分析か） */
  readonly analysisCount: number
}

export class GrowthTrackingService {
  /**
   * プロンプト配列から成熟度指標を計算
   */
  static computeMaturity(prompts: string[]): PatternSnapshot['maturity'] {
    const meaningful = prompts.filter((p) => p.length > 10)
    const total = meaningful.length || 1

    const avgLength = meaningful.reduce((sum, p) => sum + p.length, 0) / total

    const inquiryPatterns = /なぜ|どう違|仕組み|理由|どういう|メリット|デメリット|比較|explain|why/i
    const inquiryCount = meaningful.filter((p) => inquiryPatterns.test(p)).length
    const inquiryRatio = inquiryCount / total

    const specificPatterns = /\.tsx?|\.jsx?|\.json|行\d|line \d|src\/|ファイル名/i
    const specificCount = meaningful.filter((p) => specificPatterns.test(p)).length
    const specificityRatio = specificCount / total

    return {
      avgLength: Math.round(avgLength),
      inquiryRatio: round2(inquiryRatio),
      specificityRatio: round2(specificityRatio),
      totalPrompts: meaningful.length,
    }
  }

  /**
   * 現在のパターン結果をスナップショットとして保存
   */
  static saveSnapshot(
    patterns: { pattern: string; savedMinutes: number; aiStyle?: string }[],
    prompts: string[]
  ): void {
    const history = this.loadHistory()
    const today = new Date().toISOString().slice(0, 10)

    const patternCounts: Record<string, number> = {}
    let aiStyle: string | undefined
    for (const p of patterns) {
      patternCounts[p.pattern] = (patternCounts[p.pattern] ?? 0) + 1
      if (p.aiStyle) aiStyle = p.aiStyle
    }

    const snapshot: PatternSnapshot = {
      date: today,
      patterns: [...new Set(patterns.map((p) => p.pattern))],
      patternCounts,
      aiStyle,
      maturity: this.computeMaturity(prompts),
    }

    // Replace if same date exists, otherwise append
    const idx = history.findIndex((s) => s.date === today)
    if (idx >= 0) {
      history[idx] = snapshot
    } else {
      history.push(snapshot)
    }

    // Keep only recent snapshots
    const trimmed = history.slice(-MAX_SNAPSHOTS)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      /* ignore */
    }
  }

  /**
   * 前回のスナップショットと比較して成長インサイトを生成
   */
  static compareWithPrevious(
    currentPatterns: { pattern: string; category?: string; savedMinutes: number; aiStyle?: string }[],
    prompts: string[],
    recommendedAccuracy?: Record<string, { correct: number; total: number }>
  ): GrowthInsight | null {
    const history = this.loadHistory()
    if (history.length === 0) return null

    const previous = history[history.length - 1]
    const currentMaturity = this.computeMaturity(prompts)

    // Build current pattern count map
    const currentCounts: Record<string, number> = {}
    for (const p of currentPatterns) {
      currentCounts[p.pattern] = (currentCounts[p.pattern] ?? 0) + 1
    }
    const prevCounts = previous.patternCounts ?? {}

    // Improved: was in previous but resolved or reduced
    const improved: PatternChange[] = []
    for (const p of previous.patterns) {
      const prev = prevCounts[p] ?? 1
      const curr = currentCounts[p] ?? 0
      if (curr < prev) {
        const pct = prev > 0 ? Math.round(((prev - curr) / prev) * 100) : 100
        const detail = curr === 0 ? `「${p}」が解消されました` : `「${p}」が${pct}%改善（${prev}回→${curr}回）`
        improved.push({ pattern: p, detail, prevCount: prev, currentCount: curr, improvementPercent: pct })
      }
    }

    // New issues: in current but not in previous
    const newIssues: PatternChange[] = []
    for (const p of Object.keys(currentCounts)) {
      if (!(p in prevCounts) || (prevCounts[p] ?? 0) === 0) {
        newIssues.push({
          pattern: p,
          detail: `「${p}」が新たに検出されました`,
          prevCount: 0,
          currentCount: currentCounts[p],
        })
      }
    }

    // Maturity direction
    const maturityChange = this.assessMaturityChange(previous.maturity, currentMaturity)

    // Learning impact: correlate quiz completion with pattern changes
    const learningImpact = this.analyzeLearningImpact(improved, currentPatterns, recommendedAccuracy, previous.patterns)

    // Coaching message
    const coachingMessage = this.generateCoachingMessage(improved, newIssues, maturityChange, history.length)

    return {
      improved,
      newIssues,
      maturityChange,
      learningImpact,
      coachingMessage,
      analysisCount: history.length + 1,
    }
  }

  /**
   * 保存済み履歴を読み込み
   */
  static loadHistory(): PatternSnapshot[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      return JSON.parse(stored) as PatternSnapshot[]
    } catch {
      return []
    }
  }

  /**
   * 成熟度の変化を評価
   */
  private static assessMaturityChange(
    prev: PatternSnapshot['maturity'],
    current: PatternSnapshot['maturity']
  ): GrowthInsight['maturityChange'] {
    let score = 0

    // Inquiry ratio improvement
    if (current.inquiryRatio > prev.inquiryRatio + 0.05) score++
    else if (current.inquiryRatio < prev.inquiryRatio - 0.05) score--

    // Specificity improvement
    if (current.specificityRatio > prev.specificityRatio + 0.05) score++
    else if (current.specificityRatio < prev.specificityRatio - 0.05) score--

    // Prompt length: moderate is best (30-100 chars)
    const prevModerate = prev.avgLength >= 30 && prev.avgLength <= 100
    const currModerate = current.avgLength >= 30 && current.avgLength <= 100
    if (!prevModerate && currModerate) score++
    else if (prevModerate && !currModerate) score--

    if (score > 0) {
      const details: string[] = []
      if (current.inquiryRatio > prev.inquiryRatio + 0.05) details.push('「なぜ」と質問する頻度が増加')
      if (current.specificityRatio > prev.specificityRatio + 0.05) details.push('具体的な指示が増加')
      return {
        direction: 'improving',
        message: details.length > 0 ? details.join('、') : 'プロンプトの質が向上しています',
      }
    }
    if (score < 0) {
      return { direction: 'declining', message: '丸投げ傾向が増えています。「なぜ？」と質問してみましょう' }
    }
    return { direction: 'stable', message: '安定した使い方ができています' }
  }

  /**
   * コーチングメッセージを生成
   */
  private static generateCoachingMessage(
    improved: readonly PatternChange[],
    newIssues: readonly PatternChange[],
    maturityChange: GrowthInsight['maturityChange'],
    historyCount: number
  ): string {
    // First analysis with history
    if (historyCount === 1) {
      return '前回の分析結果と比較できるようになりました。使い続けるほど成長が見えてきます'
    }

    // Big improvement
    if (improved.length >= 2 && newIssues.length === 0) {
      return `素晴らしい成長です！${improved.length}つの課題が解消されました。この調子で続けましょう`
    }

    // Some improvement with numbers
    if (improved.length > 0 && improved.length > newIssues.length) {
      const top = improved[0]
      const pct = top.improvementPercent
      const numDetail = pct && pct < 100 ? `（${pct}%改善）` : ''
      return `「${top.pattern}」が改善${numDetail}。クイズで学んだことが実務に活きています`
    }

    // New issues but also improvement
    if (improved.length > 0 && newIssues.length > 0) {
      return `「${improved[0].pattern}」は改善。次は「${newIssues[0].pattern}」に取り組んでみましょう`
    }

    // Only new issues
    if (newIssues.length > 0) {
      return `「${newIssues[0].pattern}」が見つかりました。関連するクイズで効率的な方法を学びましょう`
    }

    // Maturity improving
    if (maturityChange.direction === 'improving') {
      return maturityChange.message
    }

    // Stable
    return '使い方が安定しています。新しいカテゴリに挑戦して、さらにスキルアップしませんか？'
  }

  /**
   * クイズ学習と実務改善の因果分析
   *
   * パターンのカテゴリとクイズ正答率を突き合わせて:
   * - クイズ解いた + 改善した → 「学習が実務に活きている」
   * - クイズ解いてない + 改善してない → 「クイズを解けば改善できるかも」
   */
  private static analyzeLearningImpact(
    improved: readonly PatternChange[],
    currentPatterns: { pattern: string; category?: string }[],
    recommendedAccuracy?: Record<string, { correct: number; total: number }>,
    prevPatterns?: readonly string[]
  ): LearningImpact | undefined {
    if (!recommendedAccuracy || Object.keys(recommendedAccuracy).length === 0) return undefined

    // Build pattern → category map from current patterns + known mappings
    // Known mappings cover patterns that may have been resolved (not in current)
    const KNOWN_PATTERN_CATEGORIES: Record<string, string> = {
      同じ修正を繰り返し指示: 'memory',
      長いプロンプトで毎回文脈を説明: 'memory',
      テストを手動で何度も実行: 'extensions',
      セッションが長い: 'session',
      ファイルの場所を何度も質問: 'tools',
      影響範囲を繰り返し確認: 'bestpractices',
      'AI への丸投げ傾向': 'bestpractices',
      'デバッグを AI に委任する傾向': 'bestpractices',
      概念を理解しようとする質問が多い: 'bestpractices',
    }
    const patternCategory = new Map<string, string>(Object.entries(KNOWN_PATTERN_CATEGORIES))
    for (const p of currentPatterns) {
      if (p.category) patternCategory.set(p.pattern, p.category)
    }

    const quizHelped: LearningImpact['quizHelped'][number][] = []
    const quizNeeded: LearningImpact['quizNeeded'][number][] = []

    // Improved patterns: check if user solved related quizzes
    for (const imp of improved) {
      const cat = patternCategory.get(imp.pattern)
      if (!cat) continue
      const acc = recommendedAccuracy[cat]
      if (acc && acc.total > 0 && acc.correct / acc.total >= 0.5) {
        quizHelped.push({
          pattern: imp.pattern,
          category: cat,
          message: `${imp.pattern}が改善 — ${cat}のクイズ${acc.correct}/${acc.total}問正解が活きています`,
        })
      }
    }

    // Persistent patterns: check if user has NOT solved related quizzes
    if (prevPatterns) {
      for (const p of currentPatterns) {
        if (!p.category) continue
        // Pattern exists in both current and previous → not improving
        if (prevPatterns.includes(p.pattern)) {
          const acc = recommendedAccuracy[p.category]
          if (!acc || acc.total === 0) {
            quizNeeded.push({
              pattern: p.pattern,
              category: p.category,
              message: `${p.pattern}が続いています — ${p.category}のクイズを解くと改善できるかもしれません`,
            })
          }
        }
      }
    }

    if (quizHelped.length === 0 && quizNeeded.length === 0) return undefined
    return { quizHelped, quizNeeded }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
