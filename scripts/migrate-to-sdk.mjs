#!/usr/bin/env node

/**
 * Migrate quizzes to SDK & Platform category
 *
 * .claude/tmp/sdk-candidates.json の decision='move' エントリを基に
 * src/data/quizzes.json の category を 'sdk' に、id を 'sdk-NNN' に書き換える。
 * 旧 ID → 新 ID マップを .claude/tmp/sdk-id-map.json に出力する。
 *
 * Usage:
 *   node scripts/migrate-to-sdk.mjs --dry-run  # diff 表示のみ
 *   node scripts/migrate-to-sdk.mjs --apply    # 実適用
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const CANDIDATES_PATH = resolve(__dirname, '../.claude/tmp/sdk-candidates.json')
const ID_MAP_PATH = resolve(__dirname, '../.claude/tmp/sdk-id-map.json')

const args = process.argv.slice(2)
const dryRun = !args.includes('--apply')

if (!existsSync(CANDIDATES_PATH)) {
  console.error(`Error: candidates file not found: ${CANDIDATES_PATH}`)
  console.error(`Run 'node scripts/classify-sdk-candidates.mjs' first.`)
  process.exit(1)
}

const candidatesFile = JSON.parse(readFileSync(CANDIDATES_PATH, 'utf8'))
const moveCandidates = candidatesFile.candidates.filter((c) => c.decision === 'move')
if (moveCandidates.length === 0) {
  console.error(`Error: no candidates with decision='move' found.`)
  process.exit(1)
}

const moveIds = new Set(moveCandidates.map((c) => c.id))

const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))

// 既存の sdk-NNN ID の最大番号を確認（再実行に耐えるため）
const existingSdkNums = data.quizzes.filter((q) => /^sdk-\d{3}$/.test(q.id)).map((q) => Number(q.id.slice(4)))
let nextNum = existingSdkNums.length ? Math.max(...existingSdkNums) + 1 : 1

const idMap = {} // old → new
const renames = []

// quizzes.json 中の出現順で 001, 002, ... を割り当てる（決定論的）
for (const q of data.quizzes) {
  if (!moveIds.has(q.id)) continue
  const oldId = q.id
  const newId = `sdk-${String(nextNum).padStart(3, '0')}`
  nextNum += 1
  idMap[oldId] = newId
  renames.push({ oldId, newId, oldCategory: q.category })
  q.id = newId
  q.category = 'sdk'
}

// 移動できなかった ID（決定があったのに quizzes.json に存在しなかった）を検出
const missing = moveCandidates.filter((c) => !(c.id in idMap)).map((c) => c.id)
if (missing.length) {
  console.warn(`Warning: candidates not found in quizzes.json: ${missing.join(', ')}`)
}

console.log(`\nWill rename ${renames.length} quizzes:`)
for (const r of renames) {
  console.log(`  ${r.oldId} (${r.oldCategory}) → ${r.newId} (sdk)`)
}

if (dryRun) {
  console.log(`\nDry run. To apply, run with --apply.`)
  process.exit(0)
}

writeFileSync(QUIZ_PATH, JSON.stringify(data, null, 2) + '\n')
writeFileSync(ID_MAP_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), idMap, renames }, null, 2) + '\n')
console.log(`\nApplied. quizzes.json updated.`)
console.log(`ID map written to ${ID_MAP_PATH}`)
console.log(`\nNext steps:`)
console.log(`  1. Sync src/data/scenarios.ts references using the ID map.`)
console.log(`  2. Update src/infrastructure/persistence/sdkMigration.ts with the OLD_TO_NEW_ID_MAP.`)
console.log(`  3. Run bun run quiz:check && bun test.`)
