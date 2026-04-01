#!/usr/bin/env node
/**
 * ドキュメントの整合性チェック
 * - docs/README.md から全 docs ファイルがリンクされているか
 * - docs 内の相対リンクが存在するファイルを指しているか
 * - npm（bun 移行済み）の残留がないか
 * - シナリオ問題の重複がないか
 *
 * bun run docs:links で実行
 */
import { readdirSync, readFileSync } from 'fs'
import { resolve } from 'path'

const errors = []

// ── 1. Orphan check: all docs/* linked from docs/README.md ──
const docsReadme = readFileSync('docs/README.md', 'utf-8')
const docFiles = readdirSync('docs').filter((f) => f.endsWith('.md') && f !== 'README.md')
const orphans = docFiles.filter((f) => !docsReadme.includes(f))
if (orphans.length) {
  errors.push(`Orphan docs (not linked from docs/README.md): ${orphans.join(', ')}`)
}

// ── 2. Broken links: relative links in docs point to existing files ──
for (const file of ['README.md', ...docFiles.map((f) => `docs/${f}`)]) {
  const content = readFileSync(file === 'README.md' ? file : file, 'utf-8')
  const links = [...content.matchAll(/\]\(([^)]+\.md[^)]*)\)/g)].map((m) => m[1].split('#')[0])
  for (const link of links) {
    if (link.startsWith('http')) continue
    const base = file.includes('/') ? 'docs' : '.'
    const target = resolve(base, link)
    try {
      readFileSync(target)
    } catch {
      errors.push(`Broken link in ${file}: ${link}`)
    }
  }
}

// ── 3. Stale tool references: npm in docs (bun migration) ──
for (const file of docFiles) {
  const content = readFileSync(`docs/${file}`, 'utf-8')
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (
      line.match(/\bnpm\b/) &&
      !line.includes('npmjs.com') &&
      !line.includes('不使用') &&
      !line.includes('ではなく') &&
      !line.includes('instead') &&
      !line.includes('代替') &&
      !line.includes('残っていた') &&
      !line.includes('残留')
    ) {
      errors.push(`Stale 'npm' in docs/${file}:${i + 1}: ${line.trim().substring(0, 60)}`)
    }
  })
}
// Also check CLAUDE.md
const claudeMd = readFileSync('CLAUDE.md', 'utf-8')
claudeMd.split('\n').forEach((line, i) => {
  if (line.match(/\bnpm\b/) && !line.includes('npmjs.com') && !line.includes('不使用') && !line.includes('ではなく')) {
    errors.push(`Stale 'npm' in CLAUDE.md:${i + 1}: ${line.trim().substring(0, 60)}`)
  }
})

// ── 4. Scenario question duplicates ──
const scenarios = readFileSync('src/data/scenarios.ts', 'utf-8')
const qIds = [...scenarios.matchAll(/questionId: '([^']+)'/g)].map((m) => m[1])
const seen = new Map()
qIds.forEach((id) => seen.set(id, (seen.get(id) || 0) + 1))
const dupes = [...seen.entries()].filter(([, c]) => c > 1)
if (dupes.length) {
  errors.push(`Scenario question duplicates: ${dupes.map(([id, c]) => `${id} x${c}`).join(', ')}`)
}

// ── Report ──
if (errors.length === 0) {
  console.log(
    `✓ Docs integrity OK (${docFiles.length + 1} files, 0 orphans, 0 broken links, 0 stale refs, ${seen.size} unique scenario questions)`
  )
} else {
  console.error('✗ Docs integrity issues:')
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}
