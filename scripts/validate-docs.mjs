#!/usr/bin/env node
import { execSync } from 'child_process'
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
import { readdirSync, readFileSync, statSync } from 'fs'
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
const diagramCount = quizData.quizzes.filter((q) => q.diagram).length
checkCount('Diagram count', diagramCount, /ダイアグラム:\*\* (\d+)問/)

// ── Overview questions ──────────────────────────────────────
const overviewCount = quizData.quizzes.filter((q) => q.tags?.includes('overview')).length
checkCount('Overview count', overviewCount, /(\d+)問の学習パス/)

// ── Doc page count ──────────────────────────────────────────
const docPages = new Set(
  quizData.quizzes
    .map((q) => q.referenceUrl)
    .filter(Boolean)
    .map((url) => {
      const match = url.match(/\/docs\/(?:ja|en)\/(.+?)(?:#.*)?$/)
      return match ? match[1] : null
    })
    .filter(Boolean)
)
checkCount('Doc page count', docPages.size, /(\d+)ドキュメントページ/)

// ── Category count ──────────────────────────────────────────
const categories = new Set(quizData.quizzes.map((q) => q.category))
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
    checkCount('Vitest test count', testCount, /Vitest（(\d+)テスト）/, 1)
    // Check all inline "Nテスト" references that should match testCount
    // Find stale test counts (>100, not matching actual, not E2E/Visual counts)
    const staleTestCounts = new Set()
    const inlineMatches = claudeMd.match(/(\d+)テスト/g) || []
    for (const m of inlineMatches) {
      const n = parseInt(m)
      if (n > 100 && Math.abs(n - testCount) > 1) {
        staleTestCounts.add(n)
      }
    }
    // Auto-fix: replace all stale test counts with actual count
    for (const stale of staleTestCounts) {
      errors.push(`Inline test count mismatch: "${stale}テスト" found, actual ${testCount}`)
      autoFixes.push({
        label: `Inline test count ${stale}`,
        pattern: new RegExp(`${stale}テスト`),
        old: stale,
        new: testCount,
        _replaceAll: true,
      })
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
  testResult2.testResults.forEach((r) => {
    const m = r.name.match(/src\/(\w+)/)
    const key = m ? m[1] : 'other'
    if (layerCounts[key] !== undefined) {
      layerCounts[key] += r.assertionResults.filter((a) => a.status === 'passed').length
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
  const states = viewStateMatch[1].match(/'(\w+)'/g)?.map((s) => s.replace(/'/g, '')) ?? []
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
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  for (const skill of skillDirs) {
    if (!claudeMd.includes(skill)) {
      errors.push(`Skill '${skill}' exists in .claude/skills/ but is not mentioned in CLAUDE.md`)
    }
  }
} catch {
  // .claude/skills may not exist
}

// ── README.md validation ────────────────────────────────────
const readmeMd = readFileSync('README.md', 'utf8')

// Total quiz count in README
const readmeTotalMatch = readmeMd.match(/8つのカテゴリ（(\d+)問）/)
if (readmeTotalMatch) {
  const readmeTotal = parseInt(readmeTotalMatch[1])
  if (readmeTotal !== quizCount) {
    errors.push(`README.md total quiz count: actual ${quizCount}, README says ${readmeTotal}`)
    autoFixes.push({
      label: 'README quiz count',
      pattern: /8つのカテゴリ（(\d+)問）/,
      old: readmeTotal,
      new: quizCount,
      file: 'README.md',
    })
  }
}

// Per-category counts in README
const categoryCountMap = {}
for (const q of quizData.quizzes) {
  categoryCountMap[q.category] = (categoryCountMap[q.category] || 0) + 1
}
const readmeCategoryNames = {
  memory: 'Memory',
  skills: 'Skills',
  tools: 'Tools',
  commands: 'Commands',
  extensions: 'Extensions',
  session: 'Session',
  keyboard: 'Keyboard',
  bestpractices: 'Best Practices',
}
for (const [catId, catName] of Object.entries(readmeCategoryNames)) {
  const actual = categoryCountMap[catId] || 0
  const catPattern = new RegExp(`\\| ${catName} \\| (\\d+)問`)
  const catMatch = readmeMd.match(catPattern)
  if (catMatch) {
    const readmeCount = parseInt(catMatch[1])
    if (readmeCount !== actual) {
      errors.push(`README.md ${catName} count: actual ${actual}, README says ${readmeCount}`)
      autoFixes.push({
        label: `README ${catName} count`,
        pattern: catPattern,
        old: readmeCount,
        new: actual,
        file: 'README.md',
      })
    }
  }
}

// ── Inline quiz count references (CLAUDE.md) ───────────────
// Catch all "N問" references that should match quizCount
const inlineQuizPatterns = [
  { pattern: /JSON、(\d+)問/, label: 'CLAUDE.md directory tree quiz count' },
  { pattern: /(\d+)問チェック/, label: 'CLAUDE.md check command quiz count' },
  { pattern: /(\d+)問から検索/, label: 'CLAUDE.md search quiz count' },
  { pattern: /(\d+)問の解説/, label: 'CLAUDE.md reader quiz count' },
  { pattern: /(\d+)問（~/, label: 'CLAUDE.md test section quiz count' },
]
for (const { pattern, label } of inlineQuizPatterns) {
  const match = claudeMd.match(pattern)
  if (match) {
    const found = parseInt(match[1])
    if (found !== quizCount) {
      errors.push(`${label}: actual ${quizCount}, CLAUDE.md says ${found}`)
      autoFixes.push({ label, pattern, old: found, new: quizCount })
    }
  }
}

// ── Inline counts in README.md ──────────────────────────────
// Diagram count
const readmeDiagramMatch = readmeMd.match(/(\d+)問にアニメーション/)
if (readmeDiagramMatch) {
  const found = parseInt(readmeDiagramMatch[1])
  if (found !== diagramCount) {
    errors.push(`README.md diagram count: actual ${diagramCount}, README says ${found}`)
    autoFixes.push({
      label: 'README diagram count',
      pattern: /(\d+)問にアニメーション/,
      old: found,
      new: diagramCount,
      file: 'README.md',
    })
  }
}

// ── theme.ts subtitle check ─────────────────────────────────
const themeContent = readFileSync('src/config/theme.ts', 'utf8')
const subtitleHardcoded = themeContent.match(/subtitle:.*?(\d{3,})問/)
if (subtitleHardcoded) {
  errors.push(`theme.ts subtitle contains hardcoded count ${subtitleHardcoded[1]} — use \${count} template`)
}

// ── Reference URL language ──────────────────────────────────
const enUrls = quizData.quizzes.filter((q) => q.referenceUrl?.includes('/docs/en/')).length
if (enUrls > 0) {
  errors.push(`${enUrls} questions still use /docs/en/ URLs (should be /docs/ja/)`)
}

// ── Auto-fix mode ───────────────────────────────────────────
if (process.argv.includes('--fix') && autoFixes.length > 0) {
  const { writeFileSync } = await import('fs')

  // Group fixes by file
  const fixesByFile = {}
  for (const fix of autoFixes) {
    const file = fix.file || 'CLAUDE.md'
    if (!fixesByFile[file]) fixesByFile[file] = []
    fixesByFile[file].push(fix)
  }

  for (const [file, fixes] of Object.entries(fixesByFile)) {
    let content = readFileSync(file, 'utf8')
    for (const fix of fixes) {
      if (fix._replaceAll) {
        // Simple global string replacement (e.g. "378テスト" → "389テスト")
        content = content.replaceAll(`${fix.old}テスト`, `${fix.new}テスト`)
      } else {
        const regex = new RegExp(fix.pattern.source.replace('(\\d+)', String(fix.old)))
        const replacement = fix.pattern.source
          .replace('(\\d+)', String(fix.new))
          .replace(/\\/g, '')
          .replace(/\.\*\*/g, '**')
        content = content.replace(regex, replacement)
      }
    }
    writeFileSync(file, content)
  }

  console.log(`✓ Auto-fixed ${autoFixes.length} values:`)
  autoFixes.forEach((f) => console.log(`  ${f.file || 'CLAUDE.md'} — ${f.label}: ${f.old} → ${f.new}`))
  process.exit(0)
}

// ── Report ──────────────────────────────────────────────────
if (errors.length === 0) {
  const jaUrls = quizData.quizzes.filter((q) => q.referenceUrl?.includes('/docs/ja/')).length
  console.log(
    `✓ CLAUDE.md is accurate (${quizCount} questions, ${diagramCount} diagrams, ${componentCount} components, ${docPages.size} doc pages, ${jaUrls} ja URLs)`
  )
} else {
  console.error('✗ CLAUDE.md discrepancies found:')
  errors.forEach((e) => console.error(`  - ${e}`))
  if (autoFixes.length > 0) {
    console.error(`\n  Run "npm run docs:validate -- --fix" to auto-fix ${autoFixes.length} values`)
  }
  process.exit(1)
}
