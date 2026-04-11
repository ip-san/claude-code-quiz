#!/usr/bin/env node
/**
 * Layer 2 for quiz verification: Haiku + Opus Advisor による事実チェック
 *
 * Anthropic SDK の Advisor Strategy を使用:
 * - Haiku が executor として問題をバッチ検証
 * - 判断に迷う問題は Opus advisor に即座に相談
 * - 1回の API コール内で完結（レイテンシ短縮）
 *
 * 出力: .claude/tmp/pre-verify-results.json
 *   - matched: 事実一致（Sonnet 検証スキップ可能）
 *   - flagged: 不一致の疑い（Sonnet で精査必要）
 *   - uncertain: 判定不能（Sonnet で精査必要）
 *
 * フォールバック: ANTHROPIC_API_KEY 未設定時は claude -p (Haiku) にフォールバック
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const PROJECT_DIR = process.cwd()

// Load .env.local if present (git-ignored)
const envLocalPath = join(PROJECT_DIR, '.env.local')
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
  }
}
const TMP_DIR = join(PROJECT_DIR, '.claude', 'tmp')
const TARGETS_FILE = join(TMP_DIR, 'verify-targets.json')
const OUTPUT_FILE = join(TMP_DIR, 'pre-verify-results.json')
const QUIZ_FILE = join(PROJECT_DIR, 'src', 'data', 'quizzes.json')

// ── Guard ───────────────────────────────────────────────────
if (!existsSync(TARGETS_FILE)) {
  console.log('No verify-targets.json found. Run verify:diff first.')
  process.exit(0)
}

const targets = JSON.parse(readFileSync(TARGETS_FILE, 'utf8'))
const targetIds = new Set((targets.targets || []).map((t) => t.id || t))

if (targetIds.size === 0) {
  console.log('No targets to verify.')
  writeFileSync(OUTPUT_FILE, JSON.stringify({ matched: [], flagged: [], uncertain: [], skipped: true }, null, 2))
  process.exit(0)
}

// ── Load quiz data ──────────────────────────────────────────
const quizData = JSON.parse(readFileSync(QUIZ_FILE, 'utf8'))
const targetQuizzes = quizData.quizzes.filter((q) => targetIds.has(q.id))

console.log(`Pre-verifying ${targetQuizzes.length} questions...`)

// ── Fetch docs for target categories ────────────────────────
const categories = [...new Set(targetQuizzes.map((q) => q.category))]
const categoryDocMap = targets.categoryDocMap || {}

const allDocPages = new Set()
for (const cat of categories) {
  const pages = categoryDocMap[cat] || []
  for (const p of pages) allDocPages.add(p)
}
if (allDocPages.size > 0) {
  try {
    execSync(`node scripts/fetch-docs.mjs --pages ${[...allDocPages].join(',')}`, {
      timeout: 60_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    // Doc fetch failed — will use whatever is cached
  }
}

// ── Build doc context ───────────────────────────────────────
let docContext = ''
for (const cat of categories) {
  const pages = categoryDocMap[cat] || []
  if (pages.length === 0) {
    docContext += `\n## ${cat}\n(ドキュメントマッピングなし)\n`
    continue
  }
  try {
    const doc = execSync(`node scripts/fetch-docs.mjs --assemble --pages ${pages.join(',')}`, {
      timeout: 30_000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    docContext += `\n## ${cat}\n${doc.slice(0, 3000)}\n`
  } catch {
    docContext += `\n## ${cat}\n(ドキュメント取得失敗)\n`
  }
}

const systemPrompt = `あなたはクイズの事実チェッカーです。以下のクイズ問題の「正解」と「解説」が、ドキュメントの内容と事実レベルで一致しているか判定してください。

## 判定ルール
- "ok": 正解と解説がドキュメントの内容と明確に一致
- "flag": 不一致の可能性がある（数値、名称、動作が異なる）
- "uncertain": ドキュメントに該当情報がない、または判定できない

**重要: 迷ったら advisor ツールに相談してください。advisor はより高度な推論ができるモデルです。**
advisor に相談すべき場面:
- ドキュメントの記述があいまいで判断に迷う
- 数値やデフォルト値の正確性に自信がない
- 複数の解釈が可能な場合`

// ── Batch helpers ───────────────────────────────────────────
const BATCH_SIZE = 50

function buildBatchClaims(quizBatch) {
  return quizBatch.map((q) => ({
    id: q.id,
    question: q.question.slice(0, 100),
    correctAnswer: q.options[q.correctIndex]?.text?.slice(0, 80) || '',
    explanation: q.explanation?.slice(0, 100) || '',
    category: q.category,
  }))
}

function buildUserPrompt(claims) {
  return `## ドキュメント（抜粋）
${docContext.slice(0, 12000)}

## クイズ問題
${JSON.stringify(claims)}

JSON配列で返してください。各要素: {"id": "xxx-NNN", "verdict": "ok|flag|uncertain", "reason": "判定理由（ok は40文字以内で根拠記述、flag/uncertain は10文字以内）", "matchedDoc": "一致したドキュメントセクション名（ok のみ）"}
説明不要、JSON配列のみ。`
}

function parseJsonArray(text) {
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const match = text.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

// ── Call API with Advisor Strategy ──────────────────────────
let results = []
let usedAdvisor = false
let advisorBatchCount = 0

async function callWithAdvisor(claims) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: systemPrompt,
    tools: [
      {
        type: 'advisor_20260301',
        name: 'advisor',
        model: 'claude-opus-4-6',
        advisor: 3,
      },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(claims) }],
  })

  let text = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text
    }
  }

  if (response.usage?.advisor_output_tokens > 0) {
    usedAdvisor = true
    advisorBatchCount++
  }

  return parseJsonArray(text)
}

async function callWithClaudeP(claims) {
  const promptFile = join(TMP_DIR, 'pre-verify-prompt.txt')
  writeFileSync(promptFile, `${systemPrompt}\n\n${buildUserPrompt(claims)}`)

  // Strip ANTHROPIC_API_KEY so claude -p uses Max plan, not API credits
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY

  const raw = execSync(`cat "${promptFile}" | claude -p - --model haiku --output-format text`, {
    timeout: 90_000,
    encoding: 'utf8',
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let text = raw
  try {
    const wrapper = JSON.parse(raw)
    text = typeof wrapper === 'string' ? wrapper : wrapper.result || JSON.stringify(wrapper)
  } catch {
    // Not JSON wrapper
  }
  return parseJsonArray(text)
}

// ── Process all batches ─────────────────────────────────────
const totalBatches = Math.ceil(targetQuizzes.length / BATCH_SIZE)
let useAdvisorApi = !!process.env.ANTHROPIC_API_KEY
console.log(`  Processing ${totalBatches} batches (${BATCH_SIZE} questions each)...`)

for (let i = 0; i < targetQuizzes.length; i += BATCH_SIZE) {
  const batch = targetQuizzes.slice(i, i + BATCH_SIZE)
  const batchNum = Math.floor(i / BATCH_SIZE) + 1
  const claims = buildBatchClaims(batch)

  try {
    let batchResults
    if (useAdvisorApi) {
      if (batchNum === 1) console.log('  Using Advisor Strategy (Haiku + Opus advisor)...')
      batchResults = await callWithAdvisor(claims)
    } else {
      if (batchNum === 1) console.log('  Using claude -p (Haiku only)...')
      batchResults = await callWithClaudeP(claims)
    }
    results.push(...batchResults)
    console.log(`  Batch ${batchNum}/${totalBatches}: ${batchResults.length} results`)
  } catch (err) {
    // Advisor API failed — try claude -p fallback
    if (useAdvisorApi) {
      console.warn(
        `  Batch ${batchNum}/${totalBatches} Advisor failed, switching to claude -p: ${err.message?.slice(0, 80)}`
      )
      useAdvisorApi = false
      try {
        const batchResults = await callWithClaudeP(claims)
        results.push(...batchResults)
        console.log(`  Batch ${batchNum}/${totalBatches}: ${batchResults.length} results (claude -p)`)
        continue
      } catch (fallbackErr) {
        console.error(`  Batch ${batchNum}/${totalBatches} fallback also failed: ${fallbackErr.message?.slice(0, 80)}`)
      }
    } else {
      console.error(`  Batch ${batchNum}/${totalBatches} failed: ${err.message?.slice(0, 200)}`)
      if (err.stderr) console.error(`  STDERR: ${err.stderr.slice(0, 300)}`)
    }
    results.push(...claims.map((q) => ({ id: q.id, verdict: 'uncertain', reason: '呼び出し失敗' })))
  }
}

// ── Categorize results ──────────────────────────────────────
const matched = []
const flagged = []
const uncertain = []

const resultMap = new Map(results.map((r) => [r.id, r]))

for (const q of targetQuizzes) {
  const r = resultMap.get(q.id)
  if (!r || r.verdict === 'uncertain') {
    uncertain.push({ id: q.id, reason: r?.reason || '判定不能' })
  } else if (r.verdict === 'ok') {
    matched.push({ id: q.id, reason: r.reason || '', matchedDoc: r.matchedDoc || '' })
  } else {
    flagged.push({ id: q.id, reason: r.reason || '不一致の疑い' })
  }
}

// ── Output ──────────────────────────────────────────────────
mkdirSync(TMP_DIR, { recursive: true })
const output = {
  preVerifiedAt: new Date().toISOString(),
  model: usedAdvisor ? `haiku+opus-advisor(${advisorBatchCount}batches)` : 'haiku',
  totalBatches,
  total: targetQuizzes.length,
  matched: matched,
  flagged: flagged,
  uncertain: uncertain,
  sonnetTargets: [...flagged, ...uncertain].map((r) => r.id),
  skipCount: matched.length,
}

writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

console.log(`✓ Pre-verify: ${matched.length} OK, ${flagged.length} flagged, ${uncertain.length} uncertain`)
if (usedAdvisor) console.log('  (Opus advisor was consulted)')
console.log(
  `  → Sonnet targets: ${output.sonnetTargets.length} (${Math.round((1 - output.sonnetTargets.length / targetQuizzes.length) * 100)}% reduction)`
)
