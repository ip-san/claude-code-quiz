import { SCENARIOS, type ScenarioData } from '@/data/scenarios'
import type { Question } from '@/domain/entities/Question'
import { getCategoryById } from '@/domain/valueObjects/Category'

// ── Types ────────────────────────────────────────────────────

export type AnalysisResult = NonNullable<Awaited<ReturnType<NonNullable<typeof window.electronAPI>['analyzeUsage']>>>

export interface RecommendedQuestion {
  id: string
  question: string
  category: string
  reason: string
  /** Why this specific question was chosen — multiple signals */
  signals: string[]
}

export interface WorkPattern {
  pattern: string
  tip: string
  category: string
  /** Estimated minutes saved per session if the user knew this */
  savedMinutes: number
  /** The user's actual prompt that triggered this detection */
  evidence?: string
  /** AI usage style detected (Anthropic research-based) */
  aiStyle?: 'delegation' | 'debug-delegation' | 'inquiry' | 'efficiency'
}

// ── Constants ────────────────────────────────────────────────

export const CATEGORY_REASONS: Record<string, { used: string; unused: string }> = {
  memory: {
    used: 'CLAUDE.md やルール設定に触れていました。効果的な書き方を復習しましょう',
    unused: 'CLAUDE.md を活用すると、Claude への指示が毎回自動で伝わります',
  },
  skills: {
    used: 'スキルやワークフローを使っていました。もっと便利な使い方があるかも',
    unused: 'スキルを作ると、よく使う作業を一言で呼び出せるようになります',
  },
  tools: {
    used: 'ファイル操作やコマンド実行をたくさんしていました。ツールの使い分けを確認',
    unused: 'Read / Edit / Grep などのツールを知ると、Claude への依頼がもっと的確に',
  },
  commands: {
    used: 'コマンド操作をしていました。知っておくと便利なコマンドがまだあるかも',
    unused: '/compact や /branch など、作業効率を上げるコマンドがあります',
  },
  extensions: {
    used: 'MCP やフックなど拡張機能に触れていました。より深い使い方を学びましょう',
    unused: 'MCP サーバーやフックで、Claude Code の機能を大幅に拡張できます',
  },
  session: {
    used: 'セッション管理やコンテキストに関わる作業をしていました',
    unused: 'コンテキストウィンドウの管理を知ると、長時間作業がスムーズに',
  },
  keyboard: {
    used: 'ショートカットを活用していました。まだ知らないキーがあるかも',
    unused: 'ショートカットを覚えると、マウスなしで爆速操作ができます',
  },
  bestpractices: {
    used: 'ベストプラクティスに関わる作業をしていました。知識を固めましょう',
    unused: '効果的な使い方のコツを知ると、Claude の回答品質が上がります',
  },
}

const CATEGORY_TERMS: Record<string, string[]> = {
  memory: ['CLAUDE.md', 'ルール', '指示', 'メモリ', '/init', 'rules', '設定'],
  skills: ['スキル', 'skill', 'コマンド', '/batch', '/loop', 'ワークフロー'],
  tools: ['ファイル', 'Read', 'Edit', 'Bash', 'Grep', '検索', '書き換え', '変更'],
  commands: ['/compact', '/clear', '/model', '/branch', 'コマンド', 'CLI'],
  extensions: ['MCP', 'hook', 'フック', 'プラグイン', 'サブエージェント', 'Agent', '拡張'],
  session: ['コンテキスト', 'セッション', 'トークン', '圧縮', '復帰', 'モデル'],
  keyboard: ['ショートカット', 'Ctrl', 'Shift', 'キー', '操作'],
  bestpractices: ['テスト', 'レビュー', 'デバッグ', 'Plan', '設計', 'エラー', '影響', '確認'],
}

const SCENARIO_CATEGORY_MAP: Record<string, string[]> = {
  'scenario-onboard': ['memory', 'bestpractices'],
  'scenario-dotclaude': ['memory'],
  'scenario-claudemd': ['memory', 'bestpractices'],
  'scenario-tools': ['tools', 'bestpractices'],
  'scenario-keyboard': ['keyboard'],
  'scenario-context': ['session'],
  'scenario-workflow': ['bestpractices', 'commands'],
  'scenario-planmode': ['commands', 'bestpractices'],
  'scenario-session': ['session', 'memory'],
  'scenario-debug': ['tools', 'bestpractices'],
  'scenario-claudemd-pruning': ['memory'],
  'scenario-skills': ['skills'],
  'scenario-mcp': ['extensions'],
  'scenario-mcp-setup': ['extensions'],
  'scenario-legacy': ['tools'],
  'scenario-cicd': ['commands', 'extensions'],
  'scenario-team': ['memory', 'bestpractices'],
  'scenario-parallel': ['session', 'tools'],
  'scenario-hidden-gems': ['keyboard', 'commands'],
  'scenario-cicd-setup': ['commands', 'extensions'],
  'scenario-security': ['extensions', 'session'],
  'scenario-extend': ['extensions', 'skills'],
}

const PATTERN_SCENARIO_MAP: Record<string, string[]> = {
  同じ修正を繰り返し指示: ['scenario-claudemd', 'scenario-claudemd-pruning'],
  長いプロンプトで毎回文脈を説明: ['scenario-claudemd', 'scenario-onboard'],
  テストを手動で何度も実行: ['scenario-cicd', 'scenario-cicd-setup'],
  セッションが長い: ['scenario-session', 'scenario-context'],
  ファイルの場所を何度も質問: ['scenario-legacy', 'scenario-tools'],
  影響範囲を繰り返し確認: ['scenario-planmode', 'scenario-debug'],
}

// ── Functions ────────────────────────────────────────────────

export function groupByCategory(
  recs: RecommendedQuestion[]
): { category: string; reason: string; questions: RecommendedQuestion[] }[] {
  const groups = new Map<string, { reason: string; questions: RecommendedQuestion[] }>()
  for (const rec of recs) {
    const existing = groups.get(rec.category)
    if (existing) {
      existing.questions.push(rec)
    } else {
      groups.set(rec.category, { reason: rec.reason, questions: [rec] })
    }
  }
  return [...groups.entries()].map(([category, { reason, questions }]) => ({ category, reason, questions }))
}

/** Find ALL matching prompts for a category, shuffled */
export function findRelatedPrompts(prompts: string[], category: string): string[] {
  const terms = CATEGORY_TERMS[category] ?? []
  return prompts
    .filter((p) => p.length > 10 && terms.some((t) => p.toLowerCase().includes(t.toLowerCase())))
    .sort(() => Math.random() - 0.5)
}

/** Detect inefficiency patterns from prompts — "you could have done this better" */
export function detectWorkPatterns(prompts: string[]): WorkPattern[] {
  const patterns: WorkPattern[] = []
  const meaningful = prompts.filter((p) => p.length > 10)

  // Repetition: same theme 3+ times
  const themeCount = new Map<string, { count: number; example: string }>()
  for (const p of meaningful) {
    const key = p.slice(0, 15).toLowerCase()
    const existing = themeCount.get(key)
    themeCount.set(key, { count: (existing?.count ?? 0) + 1, example: p })
  }
  for (const [, { count, example }] of themeCount) {
    if (count >= 3) {
      patterns.push({
        pattern: '同じ修正を繰り返し指示',
        tip: 'CLAUDE.md にルールを書けば毎回伝える必要がない',
        category: 'memory',
        savedMinutes: count * 3,
        evidence: example,
      })
      break
    }
  }

  // Long prompts: context re-explanation
  const longPrompts = meaningful.filter((p) => p.length > 80)
  if (longPrompts.length >= 3) {
    patterns.push({
      pattern: '長いプロンプトで毎回文脈を説明',
      tip: 'CLAUDE.md に書けば自動で読み込まれる',
      category: 'memory',
      savedMinutes: longPrompts.length * 2,
      evidence: longPrompts[0],
    })
  }

  // Manual test commands
  const testCmds = meaningful.filter((p) => /test|テスト/.test(p.toLowerCase()))
  if (testCmds.length >= 2) {
    patterns.push({
      pattern: 'テストを手動で何度も実行',
      tip: 'PostToolUse hook で自動テストを設定できる',
      category: 'extensions',
      savedMinutes: testCmds.length * 2,
      evidence: testCmds[0],
    })
  }

  // Session length indicator
  if (meaningful.length > 15) {
    patterns.push({
      pattern: `セッションが長い（プロンプト${meaningful.length}件）`,
      tip: '/compact でコンテキストを圧縮できる',
      category: 'session',
      savedMinutes: 5,
    })
  }

  // File search patterns
  const searchPrompts = meaningful.filter((p) => /どこ|探し|見つ|ファイル.*教え/.test(p))
  if (searchPrompts.length >= 2) {
    patterns.push({
      pattern: 'ファイルの場所を何度も質問',
      tip: 'Glob/Grep ツールなら一発で検索できる',
      category: 'tools',
      savedMinutes: searchPrompts.length * 2,
      evidence: searchPrompts[0],
    })
  }

  // Impact/scope questions
  const impactPrompts = meaningful.filter((p) => /影響|範囲|他に.*ない|壊れ/.test(p))
  if (impactPrompts.length >= 2) {
    patterns.push({
      pattern: '影響範囲を繰り返し確認',
      tip: 'Plan モードで事前に設計すると手戻りが減る',
      category: 'bestpractices',
      savedMinutes: impactPrompts.length * 3,
      evidence: impactPrompts[0],
    })
  }

  // ── AI Usage Style Detection (Anthropic research-based) ──

  // Delegation pattern: "お願いします" "全部やって" "まとめて" "作って"
  const delegationPrompts = meaningful.filter((p) => /お願い|全部|まとめて|作って|やって|してください$/.test(p))
  // Debug delegation: error paste → "直して" "修正して" pattern
  const debugDelegation = meaningful.filter((p) =>
    /直して|修正して|エラー.*なおし|fix|動かない.*して/.test(p.toLowerCase())
  )
  // Inquiry pattern (positive): "なぜ" "どう違う" "仕組み" "理由"
  const inquiryPrompts = meaningful.filter((p) => /なぜ|どう違|仕組み|理由|どういう|メリット|デメリット|比較/.test(p))

  const totalStyled = delegationPrompts.length + debugDelegation.length + inquiryPrompts.length
  if (totalStyled >= 3) {
    const delegationRatio = (delegationPrompts.length + debugDelegation.length) / totalStyled

    if (delegationRatio > 0.7 && delegationPrompts.length >= 3) {
      patterns.push({
        pattern: 'AI への丸投げ傾向',
        tip: '「なぜそうなるか」を質問すると理解が深まり、スキルが定着する（Anthropic 研究）',
        category: 'bestpractices',
        savedMinutes: 0,
        evidence: delegationPrompts[0],
        aiStyle: 'delegation',
      })
    } else if (debugDelegation.length >= 2) {
      patterns.push({
        pattern: 'デバッグを AI に委任する傾向',
        tip: 'エラーの原因を「なぜ起きたか」と質問すると、次回から自力で解決できるようになる',
        category: 'bestpractices',
        savedMinutes: debugDelegation.length * 5,
        evidence: debugDelegation[0],
        aiStyle: 'debug-delegation',
      })
    } else if (inquiryPrompts.length >= 3) {
      patterns.push({
        pattern: '概念を理解しようとする質問が多い',
        tip: '素晴らしいアプローチ！より高度な問題に挑戦してみましょう',
        category: 'bestpractices',
        savedMinutes: 0,
        evidence: inquiryPrompts[0],
        aiStyle: 'inquiry',
      })
    }
  }

  return patterns
}

/** Map category scores to a developer role label */
export function detectDeveloperRole(categoryScores: Record<string, number>): string | null {
  const top = Object.entries(categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat)
  if (top.length === 0) return null

  const has = (cat: string) => top.includes(cat)
  if (has('tools') && has('bestpractices')) return 'コードレビュアー型'
  if (has('extensions') && has('tools')) return 'インフラ自動化型'
  if (has('memory') && has('bestpractices')) return 'チームリーダー型'
  if (has('extensions') && has('skills')) return '拡張カスタマイズ型'
  if (has('session') && has('tools')) return 'ヘビーユーザー型'
  if (has('commands') && has('session')) return 'パワーユーザー型'
  if (has('keyboard')) return 'ショートカットマスター型'
  if (has('memory')) return 'ルール設計型'
  if (has('tools')) return '実装者型'
  if (has('bestpractices')) return '品質重視型'
  return null
}

export function findRecommendedScenario(
  categoryScores: Record<string, number>,
  promptSamples: string[] = []
): { scenario: ScenarioData; reason: string } | null {
  const topCategories = Object.entries(categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat)

  if (topCategories.length === 0) return null

  const scored = SCENARIOS.map((s) => {
    const cats = SCENARIO_CATEGORY_MAP[s.id] ?? []
    const matched = cats.filter((c) => topCategories.includes(c))
    return { scenario: s, score: matched.length, matched }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null

  // Try behavior-pattern-based matching first (more specific)
  const workPatterns = detectWorkPatterns(promptSamples)
  for (const wp of workPatterns) {
    const patternScenarioIds = PATTERN_SCENARIO_MAP[wp.pattern] ?? []
    const match = patternScenarioIds.map((id) => SCENARIOS.find((s) => s.id === id)).find((s) => s != null)
    if (match) {
      return { scenario: match, reason: `${wp.pattern} → ${wp.tip}` }
    }
  }

  // Fallback: category-based matching
  const topScore = scored[0].score
  const topMatches = scored.filter((s) => s.score === topScore)
  const pick = topMatches[Math.floor(Math.random() * topMatches.length)]

  const catNames = pick.matched.map((c) => getCategoryById(c)?.name ?? c).join('・')
  const relatedPrompt = pick.matched.flatMap((c) => findRelatedPrompts(promptSamples, c)).find((p) => p.length > 0)
  const reason = relatedPrompt
    ? `「${relatedPrompt.length > 30 ? relatedPrompt.slice(0, 30) + '...' : relatedPrompt}」の作業に関連`
    : `${catNames}の作業に関連したシナリオです`

  return { scenario: pick.scenario, reason }
}

export function computeRecommendations(
  analysis: AnalysisResult,
  allQuestions: Question[],
  excludeIds?: Set<string>
): { recs: RecommendedQuestion[]; unused: string[] } {
  const recs: RecommendedQuestion[] = []
  const used = new Set<string>(excludeIds ?? [])
  const prompts = analysis.promptSamples ?? []

  const sorted = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  const workPatterns = detectWorkPatterns(prompts)
  const patternsByCategory = new Map<string, string>()
  for (const wp of workPatterns) {
    if (!patternsByCategory.has(wp.category)) {
      patternsByCategory.set(wp.category, `💡 ${wp.tip}`)
    }
  }

  // AI usage style affects difficulty selection
  const aiStyle = workPatterns.find((wp) => wp.aiStyle)?.aiStyle
  const preferDifficulty: string | null =
    aiStyle === 'delegation'
      ? 'beginner'
      : // 丸投げ型 → 基礎を固める
        aiStyle === 'debug-delegation'
        ? 'intermediate'
        : // デバッグ委任 → 中級のなぜ問題
          aiStyle === 'inquiry'
          ? 'advanced'
          : // 質問型 → 高度な問題に誘導
            null

  for (const [cat] of sorted.slice(0, 3)) {
    const related = findRelatedPrompts(prompts, cat)
    const quote = related[0]
    const fallback = CATEGORY_REASONS[cat]?.used ?? '関連する作業をしていました'
    const reason = quote ? `「${quote.length > 35 ? quote.slice(0, 35) + '...' : quote}」— ${fallback}` : fallback
    const catName = getCategoryById(cat)?.name ?? cat
    const rank = sorted.findIndex(([c]) => c === cat) + 1
    const pool = allQuestions.filter((q) => q.category === cat && !used.has(q.id))
    // Prefer questions matching AI usage style difficulty
    const sorted2 = preferDifficulty
      ? [...pool].sort((a, b) => {
          const aMatch = a.difficulty === preferDifficulty ? 0 : 1
          const bMatch = b.difficulty === preferDifficulty ? 0 : 1
          return aMatch - bMatch || Math.random() - 0.5
        })
      : pool.sort(() => Math.random() - 0.5)
    const sampled = sorted2.slice(0, 5)
    for (const q of sampled) {
      const signals: string[] = []
      const patternTip = patternsByCategory.get(cat)
      if (patternTip) signals.push(patternTip)
      if (aiStyle === 'delegation') signals.push('🎯 基礎理解を固める問題')
      else if (aiStyle === 'inquiry') signals.push('🚀 より高度な問題に挑戦')
      else signals.push(`${catName}は作業関連度${rank}位`)
      if (quote) signals.push(`「${quote.length > 25 ? quote.slice(0, 25) + '...' : quote}」に関連`)
      recs.push({ id: q.id, question: q.question, category: q.category, reason, signals })
      used.add(q.id)
    }
  }

  const unused = Object.entries(analysis.categoryScores)
    .filter(([, s]) => s === 0)
    .map(([cat]) => cat)

  for (const cat of unused.slice(0, 2)) {
    const reason = CATEGORY_REASONS[cat]?.unused ?? `${getCategoryById(cat)?.name ?? cat} を知ると作業がもっと効率的に`
    const pool = allQuestions.filter((q) => q.category === cat && q.difficulty === 'beginner' && !used.has(q.id))
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 3)
    for (const q of sampled) {
      const catName = getCategoryById(cat)?.name ?? cat
      recs.push({
        id: q.id,
        question: q.question,
        category: q.category,
        reason,
        signals: [`${catName}はまだ使っていない機能`, '入門レベルから始めましょう'],
      })
      used.add(q.id)
    }
  }

  return { recs, unused }
}
