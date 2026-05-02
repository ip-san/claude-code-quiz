#!/usr/bin/env node

/**
 * Apply practicality tags
 *
 * `.claude/tmp/quiz-practicality.json` の分類結果を `src/data/quizzes.json` の
 * `tags` 配列に反映する。
 *
 * - label = "practical" → tags に "practical" を追加（"trivia" があれば削除）
 * - label = "trivia"    → tags に "trivia" を追加（"practical" があれば削除）
 * - label = "neutral"   → どちらも付けない（既存の "practical"/"trivia" は削除）
 *
 * Usage:
 *   node scripts/apply-practicality-tags.mjs --dry-run    # 変更予定のみ表示
 *   node scripts/apply-practicality-tags.mjs              # 実際に反映 + quiz:check 実行
 *   node scripts/apply-practicality-tags.mjs --skip-check # quiz:check をスキップ
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const CLASSIFICATION_PATH = resolve(__dirname, '../.claude/tmp/quiz-practicality.json')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SKIP_CHECK = args.includes('--skip-check')

if (!existsSync(CLASSIFICATION_PATH)) {
  console.error(`✗ 分類結果が見つかりません: ${CLASSIFICATION_PATH}`)
  console.error(`  先に 'node scripts/classify-quiz-practicality.mjs' を実行してください`)
  process.exit(1)
}

const classification = JSON.parse(readFileSync(CLASSIFICATION_PATH, 'utf8'))
const items = classification.items || {}
const quizFile = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))

let added = 0
let removed = 0
let unchanged = 0
let missing = 0
const sample = { practical: [], trivia: [], neutral: [] }

for (const quiz of quizFile.quizzes) {
  const entry = items[quiz.id]
  if (!entry) {
    missing++
    continue
  }
  const desiredLabel = entry.label // 'practical' | 'trivia' | 'neutral'
  const tags = quiz.tags || []
  const hadPractical = tags.includes('practical')
  const hadTrivia = tags.includes('trivia')

  // Build new tags array
  const next = tags.filter((t) => t !== 'practical' && t !== 'trivia')
  if (desiredLabel === 'practical') next.push('practical')
  if (desiredLabel === 'trivia') next.push('trivia')

  const changed = JSON.stringify(tags) !== JSON.stringify(next)
  if (changed) {
    if ((desiredLabel === 'practical' && !hadPractical) || (desiredLabel === 'trivia' && !hadTrivia)) added++
    if ((desiredLabel !== 'practical' && hadPractical) || (desiredLabel !== 'trivia' && hadTrivia)) removed++
    if (!DRY_RUN) {
      if (next.length > 0) quiz.tags = next
      else delete quiz.tags
    }
  } else {
    unchanged++
  }

  if (sample[desiredLabel] && sample[desiredLabel].length < 3) {
    sample[desiredLabel].push(`${quiz.id}: ${quiz.question.slice(0, 50)}`)
  }
}

const dist = classification.distribution || {}
console.log(`\n[input] ${CLASSIFICATION_PATH}`)
console.log(`  分類済み: ${classification.classified} 件 / 全 ${classification.totalQuestions} 問`)
console.log(`  分布: practical=${dist.practical} trivia=${dist.trivia} neutral=${dist.neutral}`)
console.log(`\n[diff]`)
console.log(`  追加: ${added} 件`)
console.log(`  削除: ${removed} 件`)
console.log(`  変更なし: ${unchanged} 件`)
console.log(`  分類なし（未対応）: ${missing} 件`)
console.log(`\n[サンプル]`)
for (const label of ['practical', 'trivia', 'neutral']) {
  console.log(`  [${label}]`)
  for (const s of sample[label]) console.log(`    ${s}`)
}

if (DRY_RUN) {
  console.log(`\n[dry-run] 変更は反映されていません。--dry-run を外して再実行してください`)
  process.exit(0)
}

writeFileSync(QUIZ_PATH, JSON.stringify(quizFile, null, 2) + '\n')
console.log(`\n✓ ${QUIZ_PATH} を更新しました`)

if (SKIP_CHECK) {
  console.log(`[skip] quiz:check をスキップ（--skip-check 指定）`)
  process.exit(0)
}

console.log(`\n[verify] quiz:check を実行...`)
try {
  execSync('node scripts/quiz-utils.mjs check', { stdio: 'inherit' })
  console.log(`✓ quiz:check 通過`)
} catch {
  console.error(`✗ quiz:check 失敗。タグを手動で確認してください`)
  process.exit(1)
}
