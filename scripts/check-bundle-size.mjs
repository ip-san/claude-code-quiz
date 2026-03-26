#!/usr/bin/env node
/**
 * Bundle Size Monitor
 * vite build の出力から chunk サイズを検出し、閾値超過を警告する。
 * npm run build:web の結果を解析する。
 */

import { execSync } from 'child_process'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

// 閾値（KB）
const LIMITS = {
  totalInitial: 450, // 初期ロード合計（index.js + vendor.js + index.css、現在 ~395KB）
  singleChunk: 250,  // 単一チャンク（quiz-data は除外）
  totalAll: 2000,    // 全チャンク合計（quiz-data 込み）
}

// quiz-data は遅延ロードされるため初期ロード・単一チャンクチェックから除外
const EXCLUDE_FROM_INITIAL = ['quiz-data']

const distDir = 'dist-web/assets'

// Build if dist doesn't exist
try {
  readdirSync(distDir)
} catch {
  console.log('Building web bundle...')
  execSync('npx vite build --config vite.config.web.ts', { stdio: 'pipe' })
}

const files = readdirSync(distDir)
const chunks = files
  .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  .map((f) => {
    const size = statSync(join(distDir, f)).size
    return { name: f, sizeKB: Math.round(size / 1024 * 10) / 10 }
  })
  .sort((a, b) => b.sizeKB - a.sizeKB)

const totalKB = chunks.reduce((sum, c) => sum + c.sizeKB, 0)
const jsChunks = chunks.filter((c) => c.name.endsWith('.js'))
const cssChunks = chunks.filter((c) => c.name.endsWith('.css'))
const isExcluded = (name) => EXCLUDE_FROM_INITIAL.some((ex) => name.includes(ex))
const initialJS = jsChunks.filter((c) => !isExcluded(c.name) && (c.name.includes('index') || c.name.includes('vendor')))
const initialKB = initialJS.reduce((sum, c) => sum + c.sizeKB, 0) + cssChunks.reduce((sum, c) => sum + c.sizeKB, 0)

const errors = []
const warnings = []

// Check limits
if (initialKB > LIMITS.totalInitial) {
  errors.push(`Initial load ${initialKB}KB exceeds ${LIMITS.totalInitial}KB limit`)
}
if (totalKB > LIMITS.totalAll) {
  errors.push(`Total bundle ${totalKB}KB exceeds ${LIMITS.totalAll}KB limit`)
}
for (const chunk of chunks) {
  if (!isExcluded(chunk.name) && chunk.sizeKB > LIMITS.singleChunk) {
    warnings.push(`Chunk ${chunk.name} is ${chunk.sizeKB}KB (limit: ${LIMITS.singleChunk}KB)`)
  }
}

// Report
console.log('Bundle Size Report')
console.log('─'.repeat(50))
console.log(`\nChunks (${chunks.length} files):`)
for (const c of chunks) {
  const bar = '█'.repeat(Math.ceil(c.sizeKB / 5))
  const flag = c.sizeKB > LIMITS.singleChunk ? ' ⚠️' : ''
  console.log(`  ${c.name.padEnd(40)} ${String(c.sizeKB).padStart(6)}KB ${bar}${flag}`)
}

console.log(`\n  ${'Total JS:'.padEnd(40)} ${String(jsChunks.reduce((s, c) => s + c.sizeKB, 0)).padStart(6)}KB`)
console.log(`  ${'Total CSS:'.padEnd(40)} ${String(cssChunks.reduce((s, c) => s + c.sizeKB, 0)).padStart(6)}KB`)
console.log(`  ${'Total:'.padEnd(40)} ${String(totalKB).padStart(6)}KB`)
console.log(`  ${'Initial load (est):'.padEnd(40)} ${String(initialKB).padStart(6)}KB`)

console.log(`\nLimits: initial < ${LIMITS.totalInitial}KB | chunk < ${LIMITS.singleChunk}KB | total < ${LIMITS.totalAll}KB`)

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:')
  warnings.forEach((w) => console.log(`  - ${w}`))
}

if (errors.length > 0) {
  console.error('\n✗ Bundle size check FAILED:')
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
} else {
  console.log('\n✓ Bundle size check passed')
}
