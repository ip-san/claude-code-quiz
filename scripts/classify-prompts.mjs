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

import { execSync } from 'child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

const STORE_DIR = join(process.env.HOME || '', '.claude-quiz-recommend')
const ROLLING_FILE = join(STORE_DIR, 'rolling-7d.json')
const OUTPUT_FILE = join(STORE_DIR, 'classified-prompts.json')
const LOCK_FILE = join(STORE_DIR, '.classify-lock')

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

  // ── Build Haiku prompt ────────────────────────────────────
  // Include conversation flow context for better classification
  const flowContext = (rolling.conversationFlows || [])
    .slice(-5)
    .map((f) => f.prompts.slice(-5).join(' → '))
    .join('\n')

  const promptList = prompts.slice(-50).map((p, i) => ({
    id: i,
    text: p.slice(0, 100),
  }))

  const classifyPrompt = `以下はユーザーの Claude Code 利用プロンプトです。各プロンプトを分類してJSON配列で返してください。

## 分類ルール
- intent: 何をしようとしていたか（10文字以内）
- category: memory|skills|tools|commands|extensions|session|keyboard|bestpractices
- struggle: none|mild|strong（苦戦の兆候）

## 会話の流れ（参考）
${flowContext || 'なし'}

## プロンプト一覧
${JSON.stringify(promptList)}

JSON配列のみ返してください。説明不要。`

  // ── Call Haiku via claude CLI ──────────────────────────────
  let result
  try {
    result = execSync(`claude -p "${classifyPrompt.replace(/"/g, '\\"')}" --model haiku --output-format json`, {
      timeout: 60_000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    // Haiku call failed — not critical, skip
    cleanup()
    process.exit(0)
  }

  // ── Parse Haiku response ───���──────────────────────────────
  let classifications = []
  try {
    const parsed = JSON.parse(result)
    // Handle both direct array and {result: [...]} formats
    classifications = Array.isArray(parsed) ? parsed : parsed.result || parsed.classifications || []
  } catch {
    // Try extracting JSON array from text response
    const match = result.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        classifications = JSON.parse(match[0])
      } catch {
        cleanup()
        process.exit(0)
      }
    }
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
      intentClusters.set(intent, { intent, promptIds: [], dominantStruggle: 'none' })
    }
    const cluster = intentClusters.get(intent)
    cluster.promptIds.push(c.id)
    if (c.struggle === 'strong' || (c.struggle === 'mild' && cluster.dominantStruggle === 'none')) {
      cluster.dominantStruggle = c.struggle
    }
  }

  // ── Write output ──────────────────────────────────────────
  const output = {
    classifiedAt: new Date().toISOString(),
    model: 'haiku',
    promptCount: promptList.length,
    classifications,
    summary: {
      intentClusters: [...intentClusters.values()].sort((a, b) => b.promptIds.length - a.promptIds.length).slice(0, 10),
      categoryDistribution: categoryDist,
      overallStruggles: struggleDist,
    },
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

  // ── Chain: run aggregation ────────────────────────────────
  const aggregateScript = join(process.cwd(), 'scripts', 'aggregate-classifications.mjs')
  if (existsSync(aggregateScript)) {
    try {
      execSync(`node "${aggregateScript}"`, { timeout: 10_000, stdio: 'ignore' })
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
