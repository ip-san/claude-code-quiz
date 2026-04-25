#!/usr/bin/env node

/**
 * One-off transformation: replace truncated `comparison` diagrams with `hierarchy`.
 *
 * Background: ~424 questions have `comparison` diagrams whose `items[]` were
 * truncated mid-sentence with "…" by an earlier generator. The full text of
 * each truncated bullet maps almost 1:1 to the corresponding option's
 * `wrongFeedback` (or to the correct option's text/explanation).
 *
 * This script rebuilds those diagrams as `hierarchy` so each option has its own
 * row with a non-truncated explanation in `sub`. Hierarchy fits 2–10 items and
 * has no string length cap, so we don't lose information.
 *
 * Usage:
 *   node scripts/fix-comparison-ellipsis.mjs --category=memory          # apply
 *   node scripts/fix-comparison-ellipsis.mjs --category=memory --dry-run
 *   node scripts/fix-comparison-ellipsis.mjs                             # all categories
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

function hasTruncation(text) {
  return typeof text === 'string' && text.includes('…')
}

function diagramHasTruncatedComparisonItem(d) {
  if (!d || d.type !== 'comparison' || !Array.isArray(d.columns)) return false
  return d.columns.some((col) => Array.isArray(col.items) && col.items.some(hasTruncation))
}

// Build a hierarchy diagram from the question's options.
// Items: correct option first (marked 正解), then wrong options with their wrongFeedback.
function buildHierarchyFromOptions(q, originalLabel) {
  if (!Array.isArray(q.options) || q.options.length < 2) return null

  const items = []
  // Single-select
  if (typeof q.correctIndex === 'number') {
    const correct = q.options[q.correctIndex]
    // Use the full explanation (no length cap) — truncating at N chars introduces
    // new mid-token cuts. The hierarchy schema has no max length on `sub`.
    const correctSub =
      (q.explanation || '')
        .replace(/\{\{diagram:\d+\}\}/g, '')
        .replace(/\s+/g, ' ')
        .trim() || '正解の選択肢'
    items.push({
      text: `${correct.text}（正解）`,
      sub: correctSub,
    })
    q.options.forEach((opt, i) => {
      if (i === q.correctIndex) return
      items.push({
        text: opt.text,
        sub: opt.wrongFeedback || '誤り',
      })
    })
  } else if (Array.isArray(q.correctIndices)) {
    // Multi-select: mark each correct, then list wrongs
    q.options.forEach((opt, i) => {
      const isCorrect = q.correctIndices.includes(i)
      const sub = isCorrect ? '正しい' : opt.wrongFeedback || '誤り'
      const text = isCorrect ? `${opt.text}（正しい）` : opt.text
      items.push({ text, sub })
    })
  }

  // Hierarchy max 10 items
  if (items.length < 2 || items.length > 10) return null

  return {
    type: 'hierarchy',
    label: originalLabel || '選択肢の整理',
    items,
  }
}

const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
let changedQuestions = 0
let changedDiagrams = 0
const skipped = []

for (const q of data.quizzes) {
  if (categoryFilter && q.category !== categoryFilter) continue
  const diagrams = Array.isArray(q.diagrams) ? q.diagrams : []
  let modified = false
  for (let i = 0; i < diagrams.length; i++) {
    const d = diagrams[i]
    if (!diagramHasTruncatedComparisonItem(d)) continue
    const hierarchy = buildHierarchyFromOptions(q, d.label)
    if (!hierarchy) {
      skipped.push({ id: q.id, reason: 'cannot-build-hierarchy', diagramIndex: i })
      continue
    }
    diagrams[i] = hierarchy
    modified = true
    changedDiagrams++
  }
  if (modified) changedQuestions++
}

if (!dryRun) {
  writeFileSync(QUIZ_PATH, JSON.stringify(data, null, 2) + '\n')
}

console.log('=== Comparison → Hierarchy transformation ===')
console.log(`Mode:               ${dryRun ? 'DRY-RUN' : 'WRITE'}`)
console.log(`Filter:             ${categoryFilter || '(all categories)'}`)
console.log(`Questions changed:  ${changedQuestions}`)
console.log(`Diagrams replaced:  ${changedDiagrams}`)
if (skipped.length > 0) {
  console.log(`Skipped:            ${skipped.length}`)
  for (const s of skipped) console.log(`  ${s.id} #${s.diagramIndex} (${s.reason})`)
}
