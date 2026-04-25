#!/usr/bin/env node

/**
 * Follow-up fix: the comparison→hierarchy converter (early version) truncated
 * the correct option's `sub` at 140 chars, leaving some bullets cut mid-token.
 *
 * This script scans hierarchy diagrams whose item.text ends with "（正解）" or
 * "（正しい）" and re-derives sub from the question's full `explanation`
 * (no length cap). Safe to re-run; it's a no-op when sub already matches.
 *
 * Usage:
 *   node scripts/fix-memory-cut-subs.mjs --category=session
 *   node scripts/fix-memory-cut-subs.mjs                    # all categories
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const catArg = args.find((a) => a.startsWith('--category='))
const categoryFilter = catArg ? catArg.split('=')[1] : null

const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
let fixed = 0
const samples = []

for (const q of data.quizzes) {
  if (categoryFilter && q.category !== categoryFilter) continue
  const diagrams = Array.isArray(q.diagrams) ? q.diagrams : []
  for (const d of diagrams) {
    if (d?.type !== 'hierarchy' || !Array.isArray(d.items)) continue
    // Heuristic: identify items whose text ends with "（正解）" or "（正しい）"
    // These were generated from the converter and have explanation-derived sub.
    for (const item of d.items) {
      if (typeof item.text !== 'string') continue
      const isCorrectMarker = item.text.endsWith('（正解）') || item.text.endsWith('（正しい）')
      if (!isCorrectMarker) continue
      // Re-derive sub from full explanation (no cap).
      const fullExplanation = (q.explanation || '')
        .replace(/\{\{diagram:\d+\}\}/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!fullExplanation) continue
      if (item.sub === fullExplanation) continue
      if (samples.length < 3) {
        samples.push({ id: q.id, before: item.sub, after: fullExplanation })
      }
      item.sub = fullExplanation
      fixed++
    }
  }
}

if (!dryRun) {
  writeFileSync(QUIZ_PATH, JSON.stringify(data, null, 2) + '\n')
}

console.log(`Fixed ${fixed} hierarchy correct-item subs`)
for (const s of samples) {
  console.log(`\n--- ${s.id} ---`)
  console.log(`BEFORE: ${s.before.slice(0, 200)}${s.before.length > 200 ? '…' : ''}`)
  console.log(`AFTER:  ${s.after.slice(0, 200)}${s.after.length > 200 ? '…' : ''}`)
}
