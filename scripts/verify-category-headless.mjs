#!/usr/bin/env node
/**
 * Headless per-category quiz verifier.
 *
 * Spawns `claude -p` as a subprocess to verify one category's quizzes
 * against cached documentation. Avoids the Agent-tool fan-out problem
 * that quiz-refine --team hits when running inside a forked skill
 * context: each category is an independent subprocess, so they can be
 * launched in parallel from a shell loop, a CI step, or Node's
 * spawnSync without needing Task/Agent availability.
 *
 * Usage:
 *   node scripts/verify-category-headless.mjs <category>
 *   node scripts/verify-category-headless.mjs <category> --dry-run   # just emit the prompt, don't call claude
 *   node scripts/verify-category-headless.mjs <category> --model sonnet
 *
 * Output:
 *   .claude/tmp/verify_<category>.json — verifier's structured report
 *   .claude/tmp/verify_<category>.log  — raw stdout for debugging
 *
 * Parallel invocation example:
 *   for cat in memory skills tools commands extensions session keyboard bestpractices; do
 *     node scripts/verify-category-headless.mjs "$cat" &
 *   done; wait
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TMP_DIR = join(ROOT, '.claude', 'tmp')
const QUIZZES_DIR = join(TMP_DIR, 'quizzes')

const VALID_CATEGORIES = new Set([
  'memory',
  'skills',
  'tools',
  'commands',
  'extensions',
  'session',
  'keyboard',
  'bestpractices',
])

const args = process.argv.slice(2)
const category = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
const modelArg = args.find((a) => a.startsWith('--model='))
const model = modelArg ? modelArg.slice('--model='.length) : 'sonnet'

if (!category || !VALID_CATEGORIES.has(category)) {
  console.error(`Usage: node scripts/verify-category-headless.mjs <category> [--dry-run] [--model=sonnet|opus]`)
  console.error(`Valid categories: ${[...VALID_CATEGORIES].join(', ')}`)
  process.exit(1)
}

// ── Load inputs ─────────────────────────────────────────────

const quizPath = join(QUIZZES_DIR, `${category}.json`)
if (!existsSync(quizPath)) {
  console.error(`Error: ${quizPath} not found. Run \`npm run verify:diff:full\` first.`)
  process.exit(1)
}

const quizzes = JSON.parse(readFileSync(quizPath, 'utf8'))

// Assemble docs for this category via the existing helper
let docContent
try {
  docContent = execSync(`node ${join(ROOT, 'scripts', 'fetch-docs.mjs')} --assemble ${category}`, {
    encoding: 'utf8',
    cwd: ROOT,
    maxBuffer: 20 * 1024 * 1024,
  })
} catch (err) {
  console.error(`Failed to assemble docs for ${category}: ${err.message}`)
  process.exit(1)
}

// Optional: include pre-lint annotations for this category so the verifier
// can focus on the right fields.
const preLintPath = join(TMP_DIR, 'pre-verify-results.json')
let preLintHint = ''
if (existsSync(preLintPath)) {
  try {
    const pre = JSON.parse(readFileSync(preLintPath, 'utf8'))
    const forCategory = (pre.flagged || []).filter((f) => quizzes.some((q) => q.id === f.id))
    if (forCategory.length > 0) {
      preLintHint = `\n\n## Pre-lint flags for this category (focus here)\n${JSON.stringify(forCategory, null, 2)}`
    }
  } catch {
    // optional input
  }
}

// ── Build prompt ────────────────────────────────────────────

const systemPrompt = `あなたはカテゴリ「${category}」のクイズ検証エージェントです。

対象クイズ（${quizzes.length}問）を公式ドキュメントと照合し、以下のチェックリストで評価してください:
- A: 事実の正確性（question / options / explanation / wrongFeedback）
- B: 用語・名称の正確性
- C: referenceUrl の有効性
- D: 内部一貫性
- E: バッククォート書式
- F: wrongFeedback 品質
- G: 解説の教育的価値
- H: 不正解選択肢の妥当性

修正は行わず、JSON で結果を返してください:
{
  "category": "${category}",
  "total": ${quizzes.length},
  "issues": [
    { "id": "...", "severity": "critical|major|minor|info", "field": "...", "issue": "...", "suggestion": "..." }
  ]
}

severity:
- critical: ドキュメントと明確に矛盾、学習者を誤らせる
- major: 用語不正確 / 重要な欠落 / wrongFeedback の事実誤認
- minor: バッククォート漏れ等の書式
- info: 改善提案（distractor balance 等）

判断に迷う場合は "needsOpusReview": true を issue に付与してください。`

const userPrompt = `## ドキュメント（キャッシュ）

${docContent.slice(0, 40000)}

## 対象クイズ（JSON）

${JSON.stringify(quizzes, null, 2).slice(0, 60000)}${preLintHint}

上記をチェックリストで評価し、JSON オブジェクトのみ返してください（前後の説明なし）。`

// ── Write prompt for debugging / dry-run ───────────────────

if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true })

const promptFile = join(TMP_DIR, `verify-prompt-${category}.txt`)
writeFileSync(promptFile, `${systemPrompt}\n\n${userPrompt}`)

console.log(
  `[${category}] prompt written: ${promptFile} (${(readFileSync(promptFile, 'utf8').length / 1024).toFixed(1)}KB)`
)
console.log(`[${category}] quizzes: ${quizzes.length}, pre-lint flags in scope: ${preLintHint ? 'yes' : 'no'}`)

if (dryRun) {
  console.log(`[${category}] --dry-run: skipping claude invocation`)
  process.exit(0)
}

// ── Invoke claude -p ────────────────────────────────────────

console.log(`[${category}] calling claude -p --model ${model}...`)
const startTime = Date.now()

let raw
try {
  raw = execSync(`cat "${promptFile}" | claude -p - --model ${model} --output-format text`, {
    timeout: 600_000,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
} catch (err) {
  console.error(`[${category}] claude -p failed: ${err.message?.slice(0, 200)}`)
  process.exit(1)
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
console.log(`[${category}] completed in ${elapsed}s`)

const logFile = join(TMP_DIR, `verify_${category}.log`)
writeFileSync(logFile, raw)

// ── Parse result ────────────────────────────────────────────

// Unwrap optional JSON envelope, then extract the inner JSON object
let text = raw
try {
  const wrapper = JSON.parse(raw)
  text = typeof wrapper === 'string' ? wrapper : wrapper.result || JSON.stringify(wrapper)
} catch {
  // stdout was not a JSON wrapper — use as-is
}

const jsonMatch = text.match(/\{[\s\S]*\}/)
if (!jsonMatch) {
  console.error(`[${category}] no JSON object found in output. See ${logFile}`)
  process.exit(1)
}

let report
try {
  report = JSON.parse(jsonMatch[0])
} catch (err) {
  console.error(`[${category}] failed to parse verifier JSON: ${err.message}. See ${logFile}`)
  process.exit(1)
}

const outFile = join(TMP_DIR, `verify_${category}.json`)
writeFileSync(outFile, JSON.stringify(report, null, 2))

const issues = report.issues || []
const severityCounts = issues.reduce((acc, i) => {
  acc[i.severity] = (acc[i.severity] || 0) + 1
  return acc
}, {})

console.log(
  `[${category}] ${issues.length} issues (${
    Object.entries(severityCounts)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ') || 'clean'
  })`
)
console.log(`[${category}] report saved: ${outFile}`)
