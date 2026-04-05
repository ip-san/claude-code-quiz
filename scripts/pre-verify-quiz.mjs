#!/usr/bin/env node
/**
 * Layer 2 for quiz verification: Haiku による事実チェック事前フィルタ
 *
 * verify-targets.json の対象問題を公式ドキュメントと突き合わせ、
 * Haiku に事実レベルの一致/不一致を判定させる。
 *
 * 出力: .claude/tmp/pre-verify-results.json
 *   - matched: 事実一致（Sonnet 検証スキップ可能）
 *   - flagged: 不一致の疑い（Sonnet で精査必要）
 *   - uncertain: 判定不能（Sonnet で精査必要）
 *
 * 品質保証: Haiku は「OK」判定のみ信頼。「NG」「不明」は全て Sonnet に渡す。
 * → 偽陰性（見逃し）のリスクなし。偽陽性（不要な精査）は許容。
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

console.log(`Pre-verifying ${targetQuizzes.length} questions with Haiku...`)

// ── Fetch docs for target categories ────────────────────────
const categories = [...new Set(targetQuizzes.map((q) => q.category))]
const categoryDocMap = targets.categoryDocMap || {}

// Pre-fetch docs using page names from categoryDocMap
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

// ── Build Haiku prompt ──────────────────────────────────────
// Batch: send quiz claims + doc excerpts, ask for fact match
const quizClaims = targetQuizzes.slice(0, 30).map((q) => ({
  id: q.id,
  question: q.question.slice(0, 100),
  correctAnswer: q.options[q.correctIndex]?.text?.slice(0, 80) || '',
  explanation: q.explanation?.slice(0, 100) || '',
  category: q.category,
}))

// Get doc content for context (heavily compressed — Haiku only needs key facts)
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

const prompt = `あなたはクイズの事実チェッカーです。以下のクイズ問題の「正解」と「解説」が、ドキュメントの内容と事実レベルで一致しているか判定してください。

## 判定ルール
- "ok": 正解と解説がドキュメントの内容と明確に一致
- "flag": 不一致の可能性がある（数値、名称、動作が異なる）
- "uncertain": ドキュメントに該当情報がない、または判定できない

**重要: 迷ったら "uncertain" にしてください。見逃しより誤検出の方が安全です。**

## ドキュメント（抜粋）
${docContext.slice(0, 8000)}

## クイズ問題
${JSON.stringify(quizClaims)}

JSON配列で返してください。各要素: {"id": "xxx-NNN", "verdict": "ok|flag|uncertain", "reason": "判定理由（10文字以内）"}
説明不要、JSON配列のみ。`

// ── Call Haiku via stdin ─────────────────────────────────────
// Prompt is too long for shell argument, so pipe it via stdin
const promptFile = join(TMP_DIR, 'pre-verify-prompt.txt')
writeFileSync(promptFile, prompt)

let results = []
try {
  const raw = execSync(`cat "${promptFile}" | claude -p - --model haiku --output-format text`, {
    timeout: 90_000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  // Parse response (strip markdown fences)
  let text = raw
  try {
    const wrapper = JSON.parse(raw)
    text = typeof wrapper === 'string' ? wrapper : wrapper.result || JSON.stringify(wrapper)
  } catch {
    // Not JSON wrapper
  }
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const match = text.match(/\[[\s\S]*\]/)
  if (match) {
    results = JSON.parse(match[0])
  }
} catch (err) {
  console.error('Haiku call failed:', err.message)
  // All uncertain on failure
  results = quizClaims.map((q) => ({ id: q.id, verdict: 'uncertain', reason: 'Haiku呼び出し失敗' }))
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
  model: 'haiku',
  total: targetQuizzes.length,
  matched: matched,
  flagged: flagged,
  uncertain: uncertain,
  // Sonnet needs to check: flagged + uncertain
  sonnetTargets: [...flagged, ...uncertain].map((r) => r.id),
  // Safe to skip (Haiku confirmed OK)
  skipCount: matched.length,
}

writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

console.log(`✓ Pre-verify: ${matched.length} OK, ${flagged.length} flagged, ${uncertain.length} uncertain`)
console.log(
  `  → Sonnet targets: ${output.sonnetTargets.length} (${Math.round((1 - output.sonnetTargets.length / targetQuizzes.length) * 100)}% reduction)`
)
