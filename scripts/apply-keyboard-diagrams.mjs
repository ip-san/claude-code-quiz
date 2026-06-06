#!/usr/bin/env node

/**
 * Apply generated keyboard diagrams to quizzes.json.
 *
 * .claude/tmp/keyboard-diagrams.json の各 keyboard ダイアグラムを、
 * 対象問題の diagrams[] 末尾に追加し、explanation 先頭に {{diagram:N}} マーカーを足して
 * 解説の最初に描画させる。null の問題はスキップ。既に keyboard 図があればスキップ（冪等）。
 *
 * Usage:
 *   node scripts/apply-keyboard-diagrams.mjs --dry-run   # 変更予定のみ表示
 *   node scripts/apply-keyboard-diagrams.mjs             # 反映 + quiz:check
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { isValidKbDiagram } from './keyboard-diagram-validate.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const GEN_PATH = resolve(__dirname, '../.claude/tmp/keyboard-diagrams.json')
const DRY_RUN = process.argv.includes('--dry-run')

if (!existsSync(GEN_PATH)) {
  console.error(`✗ 生成結果が見つかりません: ${GEN_PATH}`)
  console.error(`  先に node scripts/generate-keyboard-diagrams.mjs を実行してください`)
  process.exit(1)
}

const gen = JSON.parse(readFileSync(GEN_PATH, 'utf8')).items || {}
const quizFile = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
const byId = Object.fromEntries(quizFile.quizzes.map((q) => [q.id, q]))

let applied = 0
let skippedNull = 0
let skippedExisting = 0
const samples = []

for (const [id, diagram] of Object.entries(gen)) {
  if (!diagram) {
    skippedNull++
    continue
  }
  const q = byId[id]
  if (!q) continue
  // 構造検証（Zod の下限・上限と同期）。quiz:check は Zod を走らせないため、
  // 不正/上限超過の図を apply 段で弾く（手編集や生成不具合の安全網）。
  if (!isValidKbDiagram(diagram)) {
    console.error(`✗ ${id}: 不正な keyboard 図構造（combos 1-6 / keys 1-4 / label 非空）。中止します`)
    process.exit(1)
  }
  q.diagrams = q.diagrams || []
  if (q.diagrams.some((d) => d.type === 'keyboard')) {
    skippedExisting++
    continue
  }
  const idx = q.diagrams.length
  if (!DRY_RUN) {
    // 既知フィールドのみ pick して未知フィールドの流入を防ぐ（type は 'keyboard' に固定）
    const clean = { type: 'keyboard', combos: diagram.combos }
    if (diagram.sequence !== undefined) clean.sequence = diagram.sequence
    if (diagram.caption !== undefined) clean.caption = diagram.caption
    if (diagram.label !== undefined) clean.label = diagram.label
    q.diagrams.push(clean)
    q.explanation = `{{diagram:${idx}}}\n\n${q.explanation}`
  }
  applied++
  if (samples.length < 8) {
    const combos = (diagram.combos || [])
      .map((c) => (c.keys || []).map((k) => k.label).join('+'))
      .join(diagram.sequence ? ' → ' : ' / ')
    samples.push(`  ${id}: [${combos}]`)
  }
}

console.log(`\n[適用] ${applied}問  / null skip: ${skippedNull}  / 既存 keyboard skip: ${skippedExisting}`)
console.log(`[サンプル]\n${samples.join('\n')}`)

if (DRY_RUN) {
  console.log(`\n[dry-run] 変更は未反映。--dry-run を外して再実行してください`)
  process.exit(0)
}

writeFileSync(QUIZ_PATH, `${JSON.stringify(quizFile, null, 2)}\n`)
console.log(`\n✓ ${QUIZ_PATH} を更新`)
console.log(`[verify] quiz:check 実行...`)
try {
  // check + check-ellipsis の2段（後段が keyboard 図の caption/label の …/... 混入を検出する）
  execSync('node scripts/quiz-utils.mjs check && node scripts/quiz-utils.mjs check-ellipsis', { stdio: 'inherit' })
  console.log(`✓ quiz:check 通過`)
} catch {
  console.error(`✗ quiz:check 失敗`)
  process.exit(1)
}
