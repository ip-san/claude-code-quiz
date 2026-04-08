#!/usr/bin/env node

/**
 * 解説テキストに {{diagram:0}} マーカーを挿入するスクリプト
 *
 * Haiku に解説文とダイアグラム種別を渡し、
 * 解説を「概念説明」→ ダイアグラム → 「詳細/補足」に分割する。
 *
 * Usage:
 *   node scripts/inline-diagrams.mjs [--dry-run] [--limit N] [--offset N]
 */

import { execSync } from 'child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity
const offsetIdx = args.indexOf('--offset')
const offset = offsetIdx >= 0 ? Number(args[offsetIdx + 1]) : 0

const QUIZ_FILE = join(import.meta.dirname, '..', 'src', 'data', 'quizzes.json')
const data = JSON.parse(readFileSync(QUIZ_FILE, 'utf-8'))

// Filter: has diagrams, no existing markers, explanation long enough to split
const targets = data.quizzes.filter(
  (q) => q.diagrams?.length > 0 && !q.explanation.includes('{{diagram:') && q.explanation.length >= 80
)

console.log(`Total targets: ${targets.length} (offset=${offset}, limit=${limit})`)
const batch = targets.slice(offset, offset + limit)
console.log(`Processing: ${batch.length} questions`)

const DIAGRAM_TYPE_JA = {
  terminal: 'ターミナル操作例',
  flow: 'フロー図',
  hierarchy: '階層図',
  comparison: '比較表',
  config: '設定ファイル例',
  cycle: '循環図',
}

const tmpDir = mkdtempSync(join(tmpdir(), 'inline-diagrams-'))
let updated = 0
let skipped = 0
let errors = 0

for (let i = 0; i < batch.length; i++) {
  const q = batch[i]
  const diagramType = q.diagrams[0].type
  const diagramLabel = DIAGRAM_TYPE_JA[diagramType] || diagramType

  const prompt = `あなたはクイズ解説の編集者です。以下の解説文に {{diagram:0}} マーカーを1つだけ挿入してください。

## ルール
- マーカーは独立した行に配置（前後に改行）
- 解説を「導入/概念説明」と「詳細/補足/具体例」の2パートに分割する位置に挿入
- ダイアグラムは${diagramLabel}です。ダイアグラムが説明する内容の直後に配置
- 解説文の内容は一切変更しない（句読点、助詞、バッククォート、空白も変えない）
- 解説が短すぎて分割が不自然な場合は、末尾に配置
- 出力は修正後の解説文のみ。説明や前置きは不要。コードブロックで囲まない

## 解説文
${q.explanation}`

  const promptFile = join(tmpDir, `prompt-${i}.txt`)
  writeFileSync(promptFile, prompt)

  try {
    const result = execSync(`cat "${promptFile}" | claude -p - --model haiku --output-format text`, {
      encoding: 'utf-8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    }).trim()

    // Validate: must contain exactly one marker
    const markerCount = (result.match(/\{\{diagram:0\}\}/g) || []).length
    if (markerCount !== 1) {
      console.log(`  [SKIP] ${q.id}: marker count=${markerCount}`)
      skipped++
      continue
    }

    // Validate: original text preserved (strip markers and newlines to compare)
    const originalNorm = q.explanation.replace(/\s+/g, '')
    const resultNorm = result.replace(/\{\{diagram:\d+\}\}/g, '').replace(/\s+/g, '')
    if (originalNorm !== resultNorm) {
      console.log(`  [SKIP] ${q.id}: text was modified`)
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`  [DRY] ${q.id}: OK`)
      console.log(`    ${result.replace(/\n/g, '\\n').slice(0, 200)}`)
    } else {
      // Apply to data
      const quiz = data.quizzes.find((x) => x.id === q.id)
      if (quiz) quiz.explanation = result
    }
    updated++
  } catch (e) {
    console.log(`  [ERR] ${q.id}: ${e.message?.slice(0, 80)}`)
    errors++
  }

  // Progress
  if ((i + 1) % 10 === 0) {
    console.log(`  Progress: ${i + 1}/${batch.length} (updated=${updated}, skipped=${skipped}, errors=${errors})`)
  }
}

console.log(`\nDone: updated=${updated}, skipped=${skipped}, errors=${errors}`)

if (!dryRun && updated > 0) {
  writeFileSync(QUIZ_FILE, JSON.stringify(data, null, 2) + '\n')
  console.log(`Wrote ${QUIZ_FILE}`)
}
