#!/usr/bin/env node
/**
 * CLAUDE.md の統計値が実装と一致しているか自動検証
 * npm run docs:validate で実行
 *
 * 検証項目:
 * - クイズ数、ダイアグラム数、全体像問題数
 * - ドキュメントページ数、カテゴリ数
 * - コンポーネントファイル数
 * - Vitest テスト数、E2E テスト数
 * - referenceUrl の言語チェック
 * - クイズモード数
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const claudeMd = readFileSync('CLAUDE.md', 'utf8')
const quizData = JSON.parse(readFileSync('src/data/quizzes.json', 'utf8'))
const errors = []
const autoFixes = []

// ── Helper ──────────────────────────────────────────────────
function checkCount(label, actual, pattern, tolerance = 0) {
  const match = claudeMd.match(pattern)
  if (match) {
    const docValue = parseInt(match[1])
    if (Math.abs(docValue - actual) > tolerance) {
      errors.push(`${label}: actual ${actual}, CLAUDE.md says ${docValue}`)
      autoFixes.push({ label, pattern, old: docValue, new: actual })
    }
  }
}

function countFiles(dir) {
  let count = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      count += countFiles(full)
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      count++
    }
  }
  return count
}

// ── Quiz count ──────────────────────────────────────────────
const quizCount = quizData.quizzes.length
checkCount('Quiz count', quizCount, /クイズデータ:\*\* (\d+)問/)

// ── Diagram count ───────────────────────────────────────────
const diagramCount = quizData.quizzes.filter(q => q.diagram).length
checkCount('Diagram count', diagramCount, /ダイアグラム:\*\* (\d+)問/)

// ── Overview questions ──────────────────────────────────────
const overviewCount = quizData.quizzes.filter(q => q.tags?.includes('overview')).length
checkCount('Overview count', overviewCount, /(\d+)問の学習パス/)

// ── Doc page count ──────────────────────────────────────────
const docPages = new Set(quizData.quizzes.map(q => q.referenceUrl).filter(Boolean).map(url => {
  const match = url.match(/\/docs\/(?:ja|en)\/(.+?)(?:#.*)?$/)
  return match ? match[1] : null
}).filter(Boolean))
checkCount('Doc page count', docPages.size, /(\d+)ドキュメントページ/)

// ── Category count ──────────────────────────────────────────
const categories = new Set(quizData.quizzes.map(q => q.category))
checkCount('Category count', categories.size, /(\d+) categories/)

// ── Component file count ────────────────────────────────────
const componentCount = countFiles('src/components')
checkCount('Component file count', componentCount, /コンポーネント（(\d+)ファイル）/)

// ── Vitest test count ───────────────────────────────────────
try {
  const testOutput = execSync('npx vitest run --reporter=json 2>/dev/null || true', { encoding: 'utf8' })
  const testResult = JSON.parse(testOutput)
  const testCount = testResult.numPassedTests
  if (testCount) {
    checkCount('Vitest test count', testCount, /Vitest（(\d+)テスト）/)
    // Also check inline references like "375テスト"
    const inlineMatches = claudeMd.match(/(\d+)テスト/g) || []
    for (const m of inlineMatches) {
      const n = parseInt(m)
      if (n > 100 && n !== testCount && !claudeMd.includes(`${n}テスト）+ Playwright`)) {
        // Only flag standalone test counts that aren't the Vitest(...) pattern
        const isInContext = claudeMd.includes(`${n}テスト、`)
        if (isInContext) {
          errors.push(`Inline test count mismatch: "${n}テスト" found, actual ${testCount}`)
        }
      }
    }
  }
} catch {
  // JSON parse failed, skip
}

// ── E2E test count ──────────────────────────────────────────
try {
  const e2eOutput = execSync('npx playwright test --list 2>&1', { encoding: 'utf8' })
  const e2eMatch = e2eOutput.match(/Total: (\d+) tests?/)
  if (e2eMatch) {
    const e2eCount = parseInt(e2eMatch[1])
    checkCount('E2E test count', e2eCount, /Playwright E2E（(\d+)テスト）/)
  }
} catch {
  // skip if playwright not available
}

// ── Test strategy table ─────────────────────────────────────
try {
  const testOutput2 = execSync('npx vitest run --reporter=json 2>/dev/null || true', { encoding: 'utf8' })
  const testResult2 = JSON.parse(testOutput2)
  const layerCounts = { domain: 0, infrastructure: 0, stores: 0 }
  testResult2.testResults.forEach(r => {
    const m = r.name.match(/src\/(\w+)/)
    const key = m ? m[1] : 'other'
    if (layerCounts[key] !== undefined) {
      layerCounts[key] += r.assertionResults.filter(a => a.status === 'passed').length
    }
  })
  checkCount('Domain test count (table)', layerCounts.domain, /\| Domain \| (\d+) \|/)
  checkCount('Infrastructure test count (table)', layerCounts.infrastructure, /\| Infrastructure \| (\d+) \|/)
  checkCount('Store test count (table)', layerCounts.stores, /\| Store \| (\d+) \|/, 1)
} catch {
  // skip
}

// ── Quiz mode count ─────────────────────────────────────────
const modeLines = claudeMd.match(/^\|[^|]+\|[^|]+\| 毎問表示/gm) || []
const deferLines = claudeMd.match(/^\|[^|]+\|[^|]+\|.*deferFeedback/gm) || []
const totalModes = modeLines.length + deferLines.length
if (totalModes < 9) {
  errors.push(`Mode table may be incomplete: found ${totalModes} modes (expected 9)`)
}

// ── ViewState check ─────────────────────────────────────────
// Verify all ViewState values used in code are mentioned in CLAUDE.md
const storeContent = readFileSync('src/stores/quizStore.ts', 'utf8')
const viewStateMatch = storeContent.match(/type ViewState = (.+)/)
if (viewStateMatch) {
  const states = viewStateMatch[1].match(/'(\w+)'/g)?.map(s => s.replace(/'/g, '')) ?? []
  for (const state of states) {
    if (state === 'menu' || state === 'quiz' || state === 'result') continue // core states, not features
    if (!claudeMd.toLowerCase().includes(state.toLowerCase())) {
      errors.push(`ViewState '${state}' exists in code but is not mentioned in CLAUDE.md`)
    }
  }
}

// ── Skills check ────────────────────────────────────────────
try {
  const skillDirs = readdirSync('.claude/skills', { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
  for (const skill of skillDirs) {
    if (!claudeMd.includes(skill)) {
      errors.push(`Skill '${skill}' exists in .claude/skills/ but is not mentioned in CLAUDE.md`)
    }
  }
} catch {
  // .claude/skills may not exist
}

// ── Reference URL language ──────────────────────────────────
const enUrls = quizData.quizzes.filter(q => q.referenceUrl?.includes('/docs/en/')).length
if (enUrls > 0) {
  errors.push(`${enUrls} questions still use /docs/en/ URLs (should be /docs/ja/)`)
}

// ── Auto-fix mode ───────────────────────────────────────────
if (process.argv.includes('--fix') && autoFixes.length > 0) {
  let content = readFileSync('CLAUDE.md', 'utf8')
  for (const fix of autoFixes) {
    const regex = new RegExp(fix.pattern.source.replace('(\\d+)', String(fix.old)))
    const replacement = fix.pattern.source
      .replace('(\\d+)', String(fix.new))
      .replace(/\\/g, '')
      .replace(/\.\*\*/g, '**')
    content = content.replace(regex, replacement)
  }
  const { writeFileSync } = await import('fs')
  writeFileSync('CLAUDE.md', content)
  console.log(`✓ Auto-fixed ${autoFixes.length} values in CLAUDE.md:`)
  autoFixes.forEach(f => console.log(`  ${f.label}: ${f.old} → ${f.new}`))
  process.exit(0)
}

// ── Report ──────────────────────────────────────────────────
if (errors.length === 0) {
  const jaUrls = quizData.quizzes.filter(q => q.referenceUrl?.includes('/docs/ja/')).length
  console.log(`✓ CLAUDE.md is accurate (${quizCount} questions, ${diagramCount} diagrams, ${componentCount} components, ${docPages.size} doc pages, ${jaUrls} ja URLs)`)
} else {
  console.error('✗ CLAUDE.md discrepancies found:')
  errors.forEach(e => console.error(`  - ${e}`))
  if (autoFixes.length > 0) {
    console.error(`\n  Run "npm run docs:validate -- --fix" to auto-fix ${autoFixes.length} values`)
  }
  process.exit(1)
}
