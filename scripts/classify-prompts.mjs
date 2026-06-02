#!/usr/bin/env node

/**
 * Layer 2: Haiku によるプロンプト分類
 *
 * rolling-7d.json のプロンプトを Haiku で意図分類し、
 * classified-prompts.json に保存する。
 *
 * collect-session.mjs の完了後に detached で実行される。
 * 入力が不足している場合は何もせずに終了。
 */

import { execFileSync } from 'child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

const STORE_DIR = join(process.env.HOME || '', '.claude-quiz-recommend')
const ROLLING_FILE = join(STORE_DIR, 'rolling-7d.json')
const OUTPUT_FILE = join(STORE_DIR, 'classified-prompts.json')
const LOCK_FILE = join(STORE_DIR, '.classify-lock')

// ── Tunables ──────────────────────────────────────────────
const CLASSIFIER_MODEL = 'haiku'
const CLASSIFY_TIMEOUT_MS = 60_000
const AGGREGATE_TIMEOUT_MS = 10_000

// ── Guard: skip if lock exists or input missing ───────────
if (existsSync(LOCK_FILE)) {
  const lockAge = Date.now() - new Date(readFileSync(LOCK_FILE, 'utf8')).getTime()
  if (lockAge < 300_000) {
    // Lock is fresh (< 5min) — another process is running
    process.exit(0)
  }
}
if (!existsSync(ROLLING_FILE)) process.exit(0)

// ── Create lock ───────────────────────────────────────────
writeFileSync(LOCK_FILE, new Date().toISOString())

try {
  const rolling = JSON.parse(readFileSync(ROLLING_FILE, 'utf8'))
  const prompts = rolling.prompts || []

  if (prompts.length < 5) {
    // Not enough data for meaningful classification
    cleanup()
    process.exit(0)
  }

  // ── Build struggle hints from deterministic analysis ──────
  const ss = rolling.struggleSignals || {}
  const struggleHints = []
  if (ss.repeatedPrompts > 0) struggleHints.push(`同じプロンプトの繰り返し: ${ss.repeatedPrompts}回`)
  if (ss.consecutiveErrors >= 2) struggleHints.push(`連続エラー: 最大${ss.consecutiveErrors}回`)
  if (ss.frustrationHits > 0) struggleHints.push(`不満キーワード検出: ${ss.frustrationHits}回`)
  if (ss.resetSignals >= 2) struggleHints.push(`セッションリセット: ${ss.resetSignals}回`)
  // ヒント注入は参考情報のため低めのしきい値（1.5）。実際の mild 判定は session-analysis.mjs で 1.8
  if (ss.lengthRatio >= 1.5) struggleHints.push(`プロンプト長が後半で増加: ${ss.lengthRatio}倍`)
  const struggleHintText =
    struggleHints.length > 0
      ? `\n## 事前分析による苦戦シグナル\n${struggleHints.map((h) => `- ${h}`).join('\n')}\n上記を参考に struggle を判定してください。ただし最終判断は会話の文脈に基づいてください。\n`
      : ''

  // ── Build Haiku prompt ────────────────────────────────────
  // Include conversation flows WITH assistant responses for accurate struggle detection
  const flowContext = (rolling.conversationFlows || [])
    .slice(-5)
    .map((f) => {
      // Format as dialogue pairs: User→Claude→User→Claude
      if (Array.isArray(f.prompts) && f.prompts.length > 0 && typeof f.prompts[0] === 'object') {
        // New format: [{role, text, hasError?}, ...]
        return f.prompts
          .slice(-10)
          .map((p) => {
            const prefix = p.role === 'assistant' ? 'Claude' : 'User'
            const err = p.hasError ? ' [エラー]' : ''
            return `${prefix}: ${(p.text || '').slice(0, 80)}${err}`
          })
          .join('\n  ')
      }
      // Legacy format: plain string array
      return f.prompts
        .slice(-5)
        .map((p) => (typeof p === 'string' ? p : ''))
        .join(' → ')
    })
    .join('\n---\n')

  const promptList = prompts.slice(-50).map((p, i) => ({
    id: i,
    text: p.slice(0, 100),
  }))

  const classifyPrompt = `以下はユーザーの Claude Code 利用プロンプトです。各プロンプトを分類してください。

## 分類ルール（各プロンプト）
- intent: 何をしようとしていたか（10文字以内）
- category: memory|skills|tools|commands|extensions|session|keyboard|bestpractices
- struggle: none|mild|strong（苦戦の兆候）
- phase: 探索|質問|試行|修正|成功|放棄（作業フェーズ）
- tip: 苦戦(mild/strong)の場合のみ、Claude Code の具体的な機能名を使った改善提案（20文字以内）。none の場合は null
- aiStyle: delegation|inquiry|efficiency|null（AI活用スタイル）
  - delegation: エラーを貼り付けて「直して」、結果だけ求める
  - inquiry: 「なぜ」「どう違う」など理解を求める質問
  - efficiency: ツールやコマンドを効率的に使っている
  - null: 判定できない場合

tip の例:
- 同じ指示を繰り返している → "CLAUDE.md にルールを書く"
- ファイルを探している → "Glob/Grep ツールを使う"
- セッションが長く文脈を忘れている → "/compact で圧縮"
- エラーを貼り付けて直してと言う → "エラーの原因を質問する"
- テストを何度も手動実行 → "PostToolUse hook で自動化"

重要:
- tip はユーザーの実際の作業内容に合った提案にすること。汎用的な提案は避ける
- phase は会話の流れを見て判断すること。同じプロンプトでも文脈で変わる
- 会話の流れには Claude の応答も含まれる。Claude が一発で解決した場合は struggle=none
- Claude が的外れな回答をしてユーザーが再質問した場合は struggle=mild/strong
- [エラー] マークはツール実行が失敗したことを示す

${struggleHintText}## 会話の流れ（User と Claude の対話）
${flowContext || 'なし'}

## プロンプト一覧
${JSON.stringify(promptList)}

2つの出力を返してください:
1. classifications: プロンプトごとの分類配列（上記フォーマット）
2. meta: 全体の分析
   - developerRole: ユーザーの開発者タイプ（15文字以内）。例: コードレビュアー型、インフラ自動化型
   - suggestedScenarios: ユーザーの作業に最も関連するシナリオID（最大3つ）
     選択肢: scenario-onboard, scenario-dotclaude, scenario-claudemd, scenario-tools, scenario-keyboard, scenario-context, scenario-workflow, scenario-planmode, scenario-session, scenario-debug, scenario-claudemd-pruning, scenario-skills, scenario-mcp, scenario-mcp-setup, scenario-legacy, scenario-cicd, scenario-team, scenario-parallel, scenario-hidden-gems, scenario-cicd-setup, scenario-security, scenario-extend

JSON形式: {"classifications": [...], "meta": {"developerRole": "...", "suggestedScenarios": [...]}}
JSONのみ返してください。説明不要。`

  // ── Call Haiku via claude CLI ──────────────────────────────
  let result
  try {
    result = execFileSync('claude', ['-p', classifyPrompt, '--model', CLASSIFIER_MODEL, '--output-format', 'json'], {
      timeout: CLASSIFY_TIMEOUT_MS,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    // Haiku call failed — not critical, skip
    cleanup()
    process.exit(0)
  }

  // ── Parse Haiku response ────────────────────────────────────
  let classifications = []
  let meta = {}
  try {
    // claude CLI --output-format json wraps in {result: "..."}
    let text = result
    try {
      const wrapper = JSON.parse(result)
      text = typeof wrapper === 'string' ? wrapper : wrapper.result || wrapper.content || JSON.stringify(wrapper)
    } catch {
      // Not JSON wrapper — use raw text
    }

    // Strip markdown code fences (```json ... ```)
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')

    // Try to parse as {classifications: [...], meta: {...}} first
    const objMatch = text.match(/\{[\s\S]*\}/)
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0])
      if (parsed.classifications && Array.isArray(parsed.classifications)) {
        classifications = parsed.classifications
        meta = parsed.meta || {}
      } else if (Array.isArray(parsed)) {
        // Shouldn't happen with object match, but be safe
        classifications = parsed
      } else {
        // Fallback: try extracting array
        const arrMatch = text.match(/\[[\s\S]*\]/)
        if (arrMatch) {
          classifications = JSON.parse(arrMatch[0])
        }
      }
    } else {
      // Fallback: extract JSON array (backward compat)
      const arrMatch = text.match(/\[[\s\S]*\]/)
      if (arrMatch) {
        classifications = JSON.parse(arrMatch[0])
      }
    }
  } catch {
    cleanup()
    process.exit(0)
  }

  // ── Build summary ─────────────────────────────────────────
  const categoryDist = {}
  const struggleDist = { none: 0, mild: 0, strong: 0 }
  const intentClusters = new Map()

  for (const c of classifications) {
    // Category distribution
    categoryDist[c.category] = (categoryDist[c.category] || 0) + 1
    // Struggle distribution
    struggleDist[c.struggle] = (struggleDist[c.struggle] || 0) + 1
    // Intent clusters
    const intent = c.intent || 'unknown'
    if (!intentClusters.has(intent)) {
      intentClusters.set(intent, { intent, promptIds: [], dominantStruggle: 'none', tip: null })
    }
    const cluster = intentClusters.get(intent)
    cluster.promptIds.push(c.id)
    if (c.struggle === 'strong' || (c.struggle === 'mild' && cluster.dominantStruggle === 'none')) {
      cluster.dominantStruggle = c.struggle
    }
    // Keep the first non-null tip from Haiku as the representative tip for this cluster
    if (c.tip && !cluster.tip) {
      cluster.tip = c.tip
    }
  }

  // ── Compute aiStyle distribution ───────────────────────────
  const aiStyleDist = { delegation: 0, inquiry: 0, efficiency: 0 }
  for (const c of classifications) {
    if (c.aiStyle && aiStyleDist[c.aiStyle] !== undefined) {
      aiStyleDist[c.aiStyle]++
    }
  }

  // ── Write output ──────────────────────────────────────────
  const output = {
    classifiedAt: new Date().toISOString(),
    model: CLASSIFIER_MODEL,
    promptCount: promptList.length,
    classifications,
    summary: {
      intentClusters: [...intentClusters.values()].sort((a, b) => b.promptIds.length - a.promptIds.length).slice(0, 10),
      categoryDistribution: categoryDist,
      overallStruggles: struggleDist,
      developerRole: meta.developerRole || null,
      suggestedScenarios: meta.suggestedScenarios || [],
      aiStyleDistribution: aiStyleDist,
    },
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

  // ── Chain: run aggregation ────────────────────────────────
  const aggregateScript = join(process.cwd(), 'scripts', 'aggregate-classifications.mjs')
  if (existsSync(aggregateScript)) {
    try {
      execFileSync('node', [aggregateScript], { timeout: AGGREGATE_TIMEOUT_MS, stdio: 'ignore' })
    } catch {
      // Non-critical
    }
  }
} finally {
  cleanup()
}

function cleanup() {
  try {
    unlinkSync(LOCK_FILE)
  } catch {
    /* ignore */
  }
}
