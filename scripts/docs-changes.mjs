#!/usr/bin/env node
/**
 * ドキュメント内容差分（前回 verify:save 時点のベースライン vs 現在のキャッシュ）
 *
 * verify:diff はハッシュ比較のため「変わった」ことしか分からない。こちらは実際の変更行と、
 * そのページを referenceUrl に持つ問題数を出し、影響する問題だけを検証できるようにする。
 *
 * Usage:
 *   node scripts/docs-changes.mjs            # ページ別の変更行数（多い順）
 *   node scripts/docs-changes.mjs --hunks    # 差分本文も出力（判定エージェントへの入力用）
 *   node scripts/docs-changes.mjs --json     # 機械可読
 */

import { spawnSync } from 'child_process'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS_DIR = resolve(ROOT, '.claude/tmp/docs')
const BASELINE_DIR = resolve(ROOT, '.claude/tmp/docs-baseline')
const args = process.argv.slice(2)

if (!existsSync(BASELINE_DIR)) {
  console.error('No baseline yet. Run "bun run verify:save" after a verification round to create one.')
  process.exit(1)
}

// referenceUrl のページ（plugins/install → plugins-install）ごとの問題 ID
const { quizzes } = JSON.parse(readFileSync(resolve(ROOT, 'src/data/quizzes.json'), 'utf8'))
const idsByPage = {}
for (const q of quizzes) {
  const m = q.referenceUrl?.match(/\/docs\/(?:en|ja)\/([^#?]+)/)
  if (!m) continue
  const page = m[1].replaceAll('/', '-')
  if (!idsByPage[page]) idsByPage[page] = []
  idsByPage[page].push(q.id)
}

const current = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'))
const changes = []
const noBaseline = []
for (const file of current) {
  const page = file.replace(/\.md$/, '')
  const base = resolve(BASELINE_DIR, file)
  if (!existsSync(base)) {
    noBaseline.push(page)
    continue
  }
  const res = spawnSync('diff', [base, resolve(DOCS_DIR, file)], { encoding: 'utf8' })
  if (res.status === 0) continue
  const changedLines = res.stdout.split('\n').filter((l) => l.startsWith('<') || l.startsWith('>')).length
  changes.push({ page, changedLines, quizIds: idsByPage[page] ?? [], hunks: res.stdout })
}
changes.sort((a, b) => b.changedLines - a.changedLines)

if (args.includes('--json')) {
  console.log(JSON.stringify({ changes, noBaseline }, null, 2))
  process.exit(0)
}

const affected = new Set(changes.flatMap((c) => c.quizIds))
console.log(`Changed pages: ${changes.length} / ${current.length}（referenceUrl で参照する問題 ${affected.size} 問）`)
for (const c of changes) {
  console.log(`  ${c.page.padEnd(40)} ${String(c.changedLines).padStart(4)} lines  ${c.quizIds.length} quizzes`)
}
if (noBaseline.length) console.log(`No baseline (new pages): ${noBaseline.join(', ')}`)

if (args.includes('--hunks')) {
  for (const c of changes) {
    console.log(`\n===== ${c.page}`)
    console.log(c.hunks)
  }
}
