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
 *   node scripts/verify-category-headless.mjs <category> --model=sonnet
 *   node scripts/verify-category-headless.mjs <category> --model=fable,opus,sonnet  # フォールバックチェーン
 *
 * --model はカンマ区切りで優先チェーンを指定できる。先頭モデルが
 * 失敗（モデル不可・認証・タイムアウト）した場合に加え、exit 0 でも
 * 出力からパース可能な JSON レポートが取れない場合も次のモデルへ進む。
 * 判定層の既定チェーンは fable,opus,sonnet（quiz-refine SKILL.md 参照）。
 * 注意: 1モデルあたり timeout 600s のため、3モデルチェーンの最悪
 * レイテンシは約30分（通常は先頭モデルで数分以内に完了する）。
 *
 * Output:
 *   .claude/tmp/verify_<category>.json — verifier's structured report
 *   .claude/tmp/verify_<category>_<model>.log — raw stdout for debugging (モデルごとに分離)
 *
 * Parallel invocation example:
 *   for cat in memory skills tools commands extensions session keyboard bestpractices; do
 *     node scripts/verify-category-headless.mjs "$cat" &
 *   done; wait
 */

import { execFileSync } from 'child_process'
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
const modelChain = (modelArg ? modelArg.slice('--model='.length) : 'sonnet')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

if (!category || !VALID_CATEGORIES.has(category)) {
  console.error(
    `Usage: node scripts/verify-category-headless.mjs <category> [--dry-run] [--model=sonnet|opus|fable,opus,sonnet]`
  )
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
  docContent = execFileSync('node', [join(ROOT, 'scripts', 'fetch-docs.mjs'), '--assemble', category], {
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

const startTime = Date.now()
const promptInput = readFileSync(promptFile, 'utf8')

// Unwrap optional JSON envelope, then extract and parse the inner JSON object.
// Returns null when no parseable report is present (e.g. narration-only output)
// so the caller can fall back to the next model in the chain.
function extractReport(raw) {
  let text = raw
  try {
    const wrapper = JSON.parse(raw)
    text = typeof wrapper === 'string' ? wrapper : wrapper.result || JSON.stringify(wrapper)
  } catch {
    // stdout was not a JSON wrapper — use as-is
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

let report = null
let modelUsed = null
for (let i = 0; i < modelChain.length; i++) {
  const model = modelChain[i]
  console.log(`[${category}] calling claude -p --model ${model}...`)
  // モデルごとに別ログファイルへ残す（フォールバック時に前モデルのデバッグ材料を消さない）
  const logFile = join(TMP_DIR, `verify_${category}_${model.replace(/[^\w.-]/g, '_')}.log`)
  let failure = null
  try {
    const raw = execFileSync('claude', ['-p', '-', '--model', model, '--output-format', 'text'], {
      input: promptInput,
      timeout: 600_000,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    })
    writeFileSync(logFile, raw)
    const parsed = extractReport(raw)
    if (parsed) {
      report = parsed
      modelUsed = model
      break
    }
    failure = `no parseable JSON report in output (see ${logFile})`
  } catch (err) {
    failure = err.message?.slice(0, 200)
    if (err.stdout) writeFileSync(logFile, err.stdout)
  }
  console.error(`[${category}] claude -p (--model ${model}) failed: ${failure}`)
  if (modelChain[i + 1]) console.error(`[${category}] falling back to --model ${modelChain[i + 1]}`)
}

if (report === null) {
  console.error(`[${category}] all models in chain [${modelChain.join(', ')}] failed`)
  process.exit(1)
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
console.log(`[${category}] completed in ${elapsed}s (model: ${modelUsed})`)

report._meta = { model: modelUsed, elapsedSec: Number(elapsed) }
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
