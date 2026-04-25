#!/usr/bin/env node

/**
 * One-off transformation: convert old-schema terminal lines to new schema.
 *
 * 92 quizzes (166 lines) carried an obsolete shape:
 *   { "prompt": "> ", "command": "/init", "note": "..." }
 *
 * `TerminalDiagram.tsx` reads `line.type` + `line.text`, so these lines
 * rendered as empty placeholders (h-5 div) — the user saw a blank terminal
 * box.
 *
 * Mapping:
 *   { prompt, command, note }
 *     → { type: "prompt", text: command }
 *     → if note is non-empty:  + { type: "info", text: note }
 *
 * Old `prompt: "> "` is dropped — the new `prompt` type renders the `>`
 * prefix itself in TerminalDiagram. Expansion still respects max(12) lines.
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const dryRun = process.argv.includes('--dry-run')

const isOldShape = (line) =>
  line && typeof line === 'object' && !('text' in line) && ('command' in line || 'prompt' in line || 'note' in line)

const convertLine = (line) => {
  const out = []
  const cmd = typeof line.command === 'string' ? line.command : ''
  if (cmd) out.push({ type: 'prompt', text: cmd })
  const note = typeof line.note === 'string' ? line.note : ''
  if (note.trim() !== '') out.push({ type: 'info', text: note })
  return out
}

const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
let changedDiagrams = 0
let changedLines = 0
let changedQuestions = 0
const overflow = []

for (const q of data.quizzes) {
  const diagrams = Array.isArray(q.diagrams) ? q.diagrams : []
  let modified = false
  diagrams.forEach((d, di) => {
    if (!d || d.type !== 'terminal' || !Array.isArray(d.lines)) return
    if (!d.lines.some(isOldShape)) return
    const newLines = d.lines.flatMap((l) => (isOldShape(l) ? convertLine(l) : [l]))
    changedLines += newLines.length - d.lines.length + d.lines.filter(isOldShape).length
    if (newLines.length > 12) {
      overflow.push({ id: q.id, di, before: d.lines.length, after: newLines.length })
      d.lines = newLines.slice(0, 12)
    } else {
      d.lines = newLines
    }
    changedDiagrams++
    modified = true
  })
  if (modified) changedQuestions++
}

if (!dryRun) {
  writeFileSync(QUIZ_PATH, JSON.stringify(data, null, 2) + '\n')
}

console.log('=== Terminal schema migration ===')
console.log(`Mode:               ${dryRun ? 'DRY-RUN' : 'WRITE'}`)
console.log(`Questions changed:  ${changedQuestions}`)
console.log(`Diagrams changed:   ${changedDiagrams}`)
console.log(`Lines rewritten:    ${changedLines}`)
if (overflow.length > 0) {
  console.log(`\nLines truncated to fit 12-line cap (${overflow.length}):`)
  for (const o of overflow) {
    console.log(`  ${o.id} #${o.di}: ${o.before} → ${o.after} (truncated to 12)`)
  }
}
