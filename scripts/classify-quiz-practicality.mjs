#!/usr/bin/env node

/**
 * Classify quiz practicality (practical / trivia / neutral)
 *
 * src/data/quizzes.json の全問題を Haiku で分類し、
 * `id → label` の JSON マッピングを出力する。
 *
 * - practical: 明日からすぐ実務で使える機能・操作・設定
 * - trivia:    細かい仕様・内部挙動・滅多に使わない機能（深く知っているとドヤれる類）
 * - neutral:   どちらでもない／判断保留（タグ未付与扱い）
 *
 * 出力後の `apply-practicality-tags.mjs` で quizzes.json の tags 配列に反映する。
 *
 * Usage:
 *   node scripts/classify-quiz-practicality.mjs            # 全 775 問を分類
 *   node scripts/classify-quiz-practicality.mjs --limit 20 # 最初の 20 問だけ（ドライラン）
 *   node scripts/classify-quiz-practicality.mjs --batch 25 # バッチサイズ変更
 *   node scripts/classify-quiz-practicality.mjs --resume   # 既存出力に追記
 *   node scripts/classify-quiz-practicality.mjs --ids cmd-001,mem-002  # 特定 ID のみ
 *
 * Output:
 *   .claude/tmp/quiz-practicality.json
 *   { classifiedAt, model, items: { "cmd-001": { label, reason } } }
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const OUT_PATH = resolve(__dirname, '../.claude/tmp/quiz-practicality.json')

const args = process.argv.slice(2)
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : null
const batchArg = args.indexOf('--batch')
const BATCH_SIZE = batchArg >= 0 ? Number(args[batchArg + 1]) : 20
const RESUME = args.includes('--resume')
const idsArg = args.indexOf('--ids')
const ID_FILTER = idsArg >= 0 ? new Set(args[idsArg + 1].split(',').map((s) => s.trim())) : null
const MODEL = args.includes('--sonnet') ? 'sonnet' : 'haiku'

// ── Load quizzes ───────────────────────────────────────────
const quizFile = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
const allQuizzes = quizFile.quizzes

// ── Load existing output if resuming ───────────────────────
let existingItems = {}
if (RESUME && existsSync(OUT_PATH)) {
  try {
    existingItems = JSON.parse(readFileSync(OUT_PATH, 'utf8')).items || {}
    console.log(`[resume] 既存分類 ${Object.keys(existingItems).length} 問をスキップ`)
  } catch {
    /* ignore */
  }
}

// ── Build target list ──────────────────────────────────────
let targets = allQuizzes.filter((q) => !RESUME || !existingItems[q.id])
if (ID_FILTER) targets = targets.filter((q) => ID_FILTER.has(q.id))
if (LIMIT) targets = targets.slice(0, LIMIT)

console.log(`[start] model=${MODEL} batch=${BATCH_SIZE} 対象=${targets.length}/${allQuizzes.length}`)

if (targets.length === 0) {
  console.log('[done] 対象なし')
  process.exit(0)
}

// ── Build classification prompt ────────────────────────────
function buildPrompt(batch) {
  const items = batch.map((q) => ({
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    question: q.question.slice(0, 250),
    explanation: (q.explanation || '').replace(/\{\{diagram:\d+\}\}/g, '').slice(0, 350),
  }))

  return `あなたは Claude Code の学習クイズを「実務即戦力 / 上級トリビア / どちらでもない」に分類するレビュアーです。

## 分類ルール
- practical: ユーザーが明日から実務で使える機能・操作・設定。例:
  - "${'`/help`'}" や "${'`/clear`'}" の使い方
  - CLAUDE.md の書き方、@import、ベストプラクティス
  - Read/Edit/Write/Glob/Grep ツールの使い分け
  - bookmark や復習チェックなど日常的なワークフロー
  - hooks の代表的な使い方（PreToolUse/PostToolUse 等の主要イベント）
  - 主要キーボードショートカット（Ctrl+C/D, Esc, Shift+Tab）
  - 一般的なエラー対処、設定の優先順位

- trivia: 細かい仕様・内部挙動・滅多に使わない機能。深く知っていればドヤれるが、知らなくても日常作業に支障がない類。例:
  - 環境変数の正確なデフォルト値（MAX_MCP_OUTPUT_TOKENS=25,000 など）
  - Hook イベント 26 種の総数や正確な列挙
  - レアな CLI フラグ（--teleport など）
  - SDK の内部 API の引数名
  - Managed CLAUDE.md の OS 別パス
  - 廃止予定/レガシー機能の細かい挙動

- neutral: どちらにも明確に当てはまらない／中間的なもの。判断に迷ったら neutral にしてください。

## 注意
- difficulty=advanced でも、現場でよく使うパターンなら practical です（例: サブエージェント並列実行）
- difficulty=beginner でも、雑学レベルの細部なら trivia です（例: 設定ファイルパスの正確な絶対パス）
- 迷ったら neutral を選ぶこと（過剰分類より中立を優先）

## 出力フォーマット
JSON のみ返してください。説明や前後の文章は不要です。

{
  "items": [
    { "id": "cmd-001", "label": "practical", "reason": "10字以内の理由" },
    ...
  ]
}

## 分類対象
${JSON.stringify(items, null, 2)}`
}

// ── Call Claude CLI ────────────────────────────────────────
function callClaude(prompt) {
  const tmpFile = resolve(__dirname, '../.claude/tmp/.classify-prompt.txt')
  writeFileSync(tmpFile, prompt)
  try {
    const result = execSync(`claude -p --model ${MODEL} --output-format json < "${tmpFile}"`, {
      timeout: 120_000,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let text = result
    try {
      const wrapper = JSON.parse(result)
      text = typeof wrapper === 'string' ? wrapper : wrapper.result || wrapper.content || JSON.stringify(wrapper)
    } catch {
      /* not JSON wrapper */
    }
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    const objMatch = text.match(/\{[\s\S]*\}/)
    if (!objMatch) throw new Error('no JSON object in response')
    return JSON.parse(objMatch[0])
  } catch (e) {
    throw new Error(`Claude call failed: ${e.message}`)
  }
}

// ── Process in batches ─────────────────────────────────────
const items = { ...existingItems }
let totalClassified = 0
let totalErrors = 0

for (let i = 0; i < targets.length; i += BATCH_SIZE) {
  const batch = targets.slice(i, i + BATCH_SIZE)
  const batchNum = Math.floor(i / BATCH_SIZE) + 1
  const totalBatches = Math.ceil(targets.length / BATCH_SIZE)
  process.stdout.write(`[batch ${batchNum}/${totalBatches}] ${batch.length} 問を分類中... `)

  try {
    const response = callClaude(buildPrompt(batch))
    const classifications = response.items || []
    let batchHits = 0
    for (const c of classifications) {
      if (!c.id || !['practical', 'trivia', 'neutral'].includes(c.label)) continue
      items[c.id] = { label: c.label, reason: c.reason || '' }
      batchHits++
    }
    totalClassified += batchHits
    console.log(`✓ ${batchHits}/${batch.length} 件成功`)

    // Save progress after each batch (resilient to interrupts)
    saveOutput(items)
  } catch (e) {
    totalErrors++
    console.log(`✗ ${e.message}`)
    // Continue with next batch — partial progress is preserved
  }
}

function saveOutput(items) {
  if (!existsSync(dirname(OUT_PATH))) {
    mkdirSync(dirname(OUT_PATH), { recursive: true })
  }
  const dist = { practical: 0, trivia: 0, neutral: 0 }
  for (const v of Object.values(items)) {
    if (dist[v.label] !== undefined) dist[v.label]++
  }
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        classifiedAt: new Date().toISOString(),
        model: MODEL,
        totalQuestions: allQuizzes.length,
        classified: Object.keys(items).length,
        distribution: dist,
        items,
      },
      null,
      2
    )
  )
}

// ── Final summary ──────────────────────────────────────────
console.log(`\n[done] 新規分類: ${totalClassified} 件 / エラー: ${totalErrors} バッチ`)
console.log(`[output] ${OUT_PATH}`)
const finalDist = { practical: 0, trivia: 0, neutral: 0 }
for (const v of Object.values(items)) {
  if (finalDist[v.label] !== undefined) finalDist[v.label]++
}
console.log(`[distribution] practical=${finalDist.practical} trivia=${finalDist.trivia} neutral=${finalDist.neutral}`)
console.log(`\n次のステップ: 結果を確認後、'node scripts/apply-practicality-tags.mjs --dry-run' で反映プレビュー`)
