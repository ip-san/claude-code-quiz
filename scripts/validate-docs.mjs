#!/usr/bin/env node
/**
 * CLAUDE.md の統計値が実装と一致しているか自動検証
 * npm run docs:validate で実行
 */
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const claudeMd = readFileSync('CLAUDE.md', 'utf8')
const quizData = JSON.parse(readFileSync('src/data/quizzes.json', 'utf8'))
const errors = []

// Quiz count
const quizCount = quizData.quizzes.length
if (!claudeMd.includes(`${quizCount}問`)) {
  errors.push(`Quiz count mismatch: actual ${quizCount}, CLAUDE.md doesn't contain "${quizCount}問"`)
}

// Test count
const testOutput = execSync('npx vitest run --reporter=json 2>/dev/null || true', { encoding: 'utf8' })
try {
  const testResult = JSON.parse(testOutput)
  const testCount = testResult.numPassedTests
  if (testCount && !claudeMd.includes(`${testCount}テスト`)) {
    errors.push(`Test count mismatch: actual ${testCount}, CLAUDE.md doesn't contain "${testCount}テスト"`)
  }
} catch {
  // JSON parse failed, skip test count validation
}

// Overview questions
const overviewCount = quizData.quizzes.filter(q => q.tags?.includes('overview')).length
if (!claudeMd.includes(`${overviewCount}問の学習パス`) && !claudeMd.includes(`${overviewCount}問`)) {
  // Check if any mention of overview count exists
  const overviewMatch = claudeMd.match(/(\d+)問の学習パス/)
  if (overviewMatch && parseInt(overviewMatch[1]) !== overviewCount) {
    errors.push(`Overview count mismatch: actual ${overviewCount}, CLAUDE.md says ${overviewMatch[1]}`)
  }
}

// Mode count
const modeLines = claudeMd.match(/^\|[^|]+\|[^|]+\| 毎問表示/gm) || []
const deferLine = claudeMd.match(/deferFeedback/g) || []
const totalModes = modeLines.length + deferLine.length
// Just check mode table has entries
if (modeLines.length < 8) {
  errors.push(`Mode table may be incomplete: found ${modeLines.length + 1} modes in table`)
}

// Reference URLs
const jaUrls = quizData.quizzes.filter(q => q.referenceUrl?.includes('/docs/ja/')).length
const enUrls = quizData.quizzes.filter(q => q.referenceUrl?.includes('/docs/en/')).length
if (enUrls > 0) {
  errors.push(`${enUrls} questions still use /docs/en/ URLs (should be /docs/ja/)`)
}

// Report
if (errors.length === 0) {
  console.log(`✓ CLAUDE.md is accurate (${quizCount} questions, ${jaUrls} ja URLs)`)
} else {
  console.error('✗ CLAUDE.md discrepancies found:')
  errors.forEach(e => console.error('  -', e))
  process.exit(1)
}
