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

// ── Build prompt ────────────────────────────────────────────
const quizClaims = targetQuizzes.slice(0, 30).map((q) => ({
  id: q.id,
  question: q.question.slice(0, 100),
  correctAnswer: q.options[q.correctIndex]?.text?.slice(0, 80) || '',
  explanation: q.explanation?.slice(0, 100) || '',
  category: q.category,
}))

let docContext = ''
for (const cat of categories.slice(0, 4)) {
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
    docContext += `\n## ${cat}\n${doc.slice(0, 2000)}\n`
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

const userPrompt = `## ドキュメント（抜粋）
${docContext.slice(0, 8000)}

## クイズ問題
${JSON.stringify(quizClaims)}

JSON配列で返してください。各要素: {"id": "xxx-NNN", "verdict": "ok|flag|uncertain", "reason": "判定理由（10文字以内）"}
説明不要、JSON配列のみ。`

// ── Call API with Advisor Strategy ──────────────────────────
let results = []
let usedAdvisor = false

async function callWithAdvisor() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    tools: [
      {
        type: 'advisor_20260301',
        name: 'advisor',
        model: 'claude-opus-4-6',
        advisor: 3, // max 3 consultations per request
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Extract text from response (advisor calls are handled internally)
  let text = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text
    }
  }

  // Check if advisor was used
  usedAdvisor = response.usage?.advisor_output_tokens > 0

  // Parse JSON array
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const match = text.match(/\[[\s\S]*\]/)
  if (match) {
    return JSON.parse(match[0])
  }
  return []
}

async function callWithClaudeP() {
  const promptFile = join(TMP_DIR, 'pre-verify-prompt.txt')
  writeFileSync(promptFile, `${systemPrompt}\n\n${userPrompt}`)

  const raw = execSync(`cat "${promptFile}" | claude -p - --model haiku --output-format text`, {
    timeout: 90_000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let text = raw
  try {
    const wrapper = JSON.parse(raw)
    text = typeof wrapper === 'string' ? wrapper : wrapper.result || JSON.stringify(wrapper)
  } catch {
    // Not JSON wrapper
  }
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const match = text.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('  Using Advisor Strategy (Haiku + Opus advisor)...')
    results = await callWithAdvisor()
  } else {
    console.log('  Using claude -p fallback (Haiku only)...')
    results = await callWithClaudeP()
  }
} catch (err) {
  console.error('Pre-verify call failed:', err.message)
  // Try fallback if advisor failed
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      console.log('  Advisor failed, falling back to claude -p...')
      results = await callWithClaudeP()
    } catch {
      results = quizClaims.map((q) => ({ id: q.id, verdict: 'uncertain', reason: '呼び出し失敗' }))
    }
  } else {
    results = quizClaims.map((q) => ({ id: q.id, verdict: 'uncertain', reason: '呼び出し失敗' }))
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
    matched.push({ id: q.id })
  } else {
    flagged.push({ id: q.id, reason: r.reason || '不一致の疑い' })
  }
}

// Questions beyond the 30-item batch are uncertain
for (const q of targetQuizzes.slice(30)) {
  if (!resultMap.has(q.id)) {
    uncertain.push({ id: q.id, reason: 'バッチ上限超過' })
  }
}

// ── Output ──────────────────────────────────────────────────
mkdirSync(TMP_DIR, { recursive: true })
const output = {
  preVerifiedAt: new Date().toISOString(),
  model: usedAdvisor ? 'haiku+opus-advisor' : 'haiku',
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
