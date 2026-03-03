#!/usr/bin/env node

/**
 * Verification State Manager
 *
 * クイズ検証の差分管理スクリプト。
 * コンテンツハッシュとドキュメントハッシュを比較し、
 * 再検証が必要な問題だけを特定する。
 *
 * Usage:
 *   node scripts/verify-state.mjs diff              # 差分のみ抽出（デフォルト）
 *   node scripts/verify-state.mjs diff --full        # 全問再検証（フルスキャン）
 *   node scripts/verify-state.mjs diff memory tools  # 特定カテゴリのみ
 *   node scripts/verify-state.mjs save               # 検証完了後に状態を保存
 *   node scripts/verify-state.mjs status             # 現在の状態を表示
 *
 * Output:
 *   .claude/tmp/verify-state.json   — 検証状態の永続化
 *   .claude/tmp/verify-targets.json — 今回検証が必要な問題リスト
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const QUIZ_PATH = resolve(ROOT, 'src/data/quizzes.json')
const DOCS_DIR = resolve(ROOT, '.claude/tmp/docs')
const STATE_PATH = resolve(ROOT, '.claude/tmp/verify-state.json')
const TARGETS_PATH = resolve(ROOT, '.claude/tmp/verify-targets.json')
const QUIZ_SPLIT_DIR = resolve(ROOT, '.claude/tmp/quizzes')

// ============================================================
// Category → Document Mapping
// ============================================================
// Each category maps to the doc pages its questions primarily reference.
// This allows sub-agents to read ONLY relevant docs instead of all 19.

const CATEGORY_DOC_MAP = {
  memory: ['memory', 'best-practices', 'settings'],
  skills: ['skills', 'sub-agents', 'best-practices'],
  tools: ['how-claude-code-works', 'interactive-mode', 'sub-agents'],
  commands: ['interactive-mode', 'cli-reference', 'common-workflows'],
  extensions: ['mcp', 'hooks', 'discover-plugins', 'settings'],
  session: ['how-claude-code-works', 'common-workflows', 'checkpointing', 'settings'],
  keyboard: ['interactive-mode', 'common-workflows'],
  bestpractices: ['best-practices', 'model-config', 'common-workflows', 'sandboxing'],
}

// Supplementary docs always available for cross-reference
const SUPPLEMENTARY_DOCS = ['settings', 'permissions', 'overview', 'agent-sdk-overview']

// Cache validity: 24 hours (must match fetch-docs.mjs CACHE_TTL_MS)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Get relevant doc pages for a category (primary + supplementary)
 */
function getDocsForCategory(category) {
  const primary = CATEGORY_DOC_MAP[category] || []
  const all = new Set([...primary, ...SUPPLEMENTARY_DOCS])
  return [...all]
}

// ============================================================
// Hashing
// ============================================================

function hashString(str) {
  return createHash('sha256').update(str).digest('hex').slice(0, 16)
}

/**
 * Hash a quiz question's verifiable content
 * (question, options, explanation, correctIndex — everything that could be wrong)
 */
function hashQuiz(quiz) {
  const content = JSON.stringify({
    question: quiz.question,
    options: quiz.options,
    correctIndex: quiz.correctIndex,
    correctIndices: quiz.correctIndices,
    explanation: quiz.explanation,
    referenceUrl: quiz.referenceUrl,
  })
  return hashString(content)
}

/**
 * Hash a cached doc file's content
 */
function hashDocFile(docName) {
  const filePath = resolve(DOCS_DIR, `${docName}.md`)
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf8')
  // Strip the cache metadata header (first 2 lines) to only hash actual content
  const body = content.replace(/^<!--.*?-->\n/gm, '').trim()
  return hashString(body)
}

// ============================================================
// State Management
// ============================================================

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { quizHashes: {}, docHashes: {}, lastVerified: null }
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
}

function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true })
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n')
}

// ============================================================
// Diff Logic
// ============================================================

function computeDiff(categories, fullScan) {
  const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
  const state = loadState()

  // Current doc hashes
  const currentDocHashes = {}
  const allDocNames = new Set()
  Object.values(CATEGORY_DOC_MAP).flat().forEach(d => allDocNames.add(d))
  SUPPLEMENTARY_DOCS.forEach(d => allDocNames.add(d))
  for (const docName of allDocNames) {
    currentDocHashes[docName] = hashDocFile(docName)
  }

  // Find which docs changed since last verification
  const changedDocs = new Set()
  for (const [docName, hash] of Object.entries(currentDocHashes)) {
    if (hash && hash !== state.docHashes[docName]) {
      changedDocs.add(docName)
    }
  }

  // Filter quizzes by requested categories
  const targetCategories = categories.length > 0
    ? categories
    : Object.keys(CATEGORY_DOC_MAP)

  const quizzes = data.quizzes.filter(q => targetCategories.includes(q.category))

  // Classify each quiz
  const needsVerification = []
  const skippable = []

  for (const quiz of quizzes) {
    const currentHash = hashQuiz(quiz)
    const previousHash = state.quizHashes[quiz.id]

    if (fullScan) {
      needsVerification.push({ ...quizRef(quiz), reason: 'full-scan' })
      continue
    }

    // New question (no previous hash)
    if (!previousHash) {
      needsVerification.push({ ...quizRef(quiz), reason: 'new' })
      continue
    }

    // Quiz content changed
    if (currentHash !== previousHash) {
      needsVerification.push({ ...quizRef(quiz), reason: 'content-changed' })
      continue
    }

    // Referenced docs changed
    const categoryDocs = CATEGORY_DOC_MAP[quiz.category] || []
    const hasDocChange = categoryDocs.some(doc => changedDocs.has(doc))
    if (hasDocChange) {
      needsVerification.push({ ...quizRef(quiz), reason: 'doc-changed' })
      continue
    }

    skippable.push(quizRef(quiz))
  }

  return {
    targets: needsVerification,
    skipped: skippable,
    changedDocs: [...changedDocs],
    currentDocHashes,
    categories: targetCategories,
  }
}

function quizRef(quiz) {
  return { id: quiz.id, category: quiz.category }
}

// ============================================================
// Commands
// ============================================================

function cmdDiff(args) {
  const fullScan = args.includes('--full')
  const categories = args.filter(a => !a.startsWith('--'))

  const result = computeDiff(categories, fullScan)

  // Group targets by category
  const byCategory = {}
  for (const t of result.targets) {
    if (!byCategory[t.category]) byCategory[t.category] = []
    byCategory[t.category].push(t)
  }

  console.log('=== Verification Diff ===\n')

  if (fullScan) {
    console.log('Mode: FULL SCAN (--full)\n')
  } else {
    console.log('Mode: INCREMENTAL (diff)\n')
  }

  if (result.changedDocs.length > 0) {
    console.log(`Changed docs: ${result.changedDocs.join(', ')}`)
  }

  console.log(`\nTargets: ${result.targets.length} questions need verification`)
  console.log(`Skipped: ${result.skipped.length} questions unchanged\n`)

  if (result.targets.length > 0) {
    // Reason breakdown
    const reasons = {}
    result.targets.forEach(t => { reasons[t.reason] = (reasons[t.reason] || 0) + 1 })
    console.log('Reasons:')
    for (const [reason, count] of Object.entries(reasons)) {
      console.log(`  ${reason}: ${count}`)
    }

    console.log('\nBy category:')
    for (const [cat, targets] of Object.entries(byCategory).sort()) {
      console.log(`  ${cat}: ${targets.length} (${targets.map(t => t.id).join(', ')})`)
    }
  }

  // Save targets for use by SKILL.md
  const output = {
    mode: fullScan ? 'full' : 'incremental',
    timestamp: new Date().toISOString(),
    changedDocs: result.changedDocs,
    categories: result.categories,
    categoryDocMap: {},
    targets: result.targets,
    skippedCount: result.skipped.length,
    totalCount: result.targets.length + result.skipped.length,
  }

  // Include per-category doc mapping for targets only
  const neededDocPages = new Set()
  for (const cat of result.categories) {
    if (byCategory[cat] && byCategory[cat].length > 0) {
      const docs = getDocsForCategory(cat)
      output.categoryDocMap[cat] = docs
      docs.forEach(d => neededDocPages.add(d))
    }
  }

  // Check if all needed doc caches are valid (allows skipping docs:fetch)
  if (neededDocPages.size > 0) {
    let allCached = true
    for (const docName of neededDocPages) {
      const filePath = resolve(DOCS_DIR, `${docName}.md`)
      if (!existsSync(filePath)) { allCached = false; break }
      const stat = statSync(filePath)
      if (stat.size <= 1024 || (Date.now() - stat.mtimeMs) >= CACHE_TTL_MS) {
        allCached = false; break
      }
    }
    output.allDocsCached = allCached
    if (allCached) {
      console.log(`\nDoc cache: all ${neededDocPages.size} needed pages are valid (docs:fetch can be skipped)`)
    }
  }

  mkdirSync(dirname(TARGETS_PATH), { recursive: true })
  writeFileSync(TARGETS_PATH, JSON.stringify(output, null, 2) + '\n')
  console.log(`\nTargets saved to: ${TARGETS_PATH}`)

  // Split quiz data by category (only categories with targets)
  if (result.targets.length > 0) {
    splitQuizzesByCategory(result.targets, byCategory)
  }
}

/**
 * Split quiz data into per-category JSON files for sub-agents.
 * Each file contains only the questions that need verification.
 * Sub-agents read ~30-120KB instead of the full 450KB quizzes.json.
 */
function splitQuizzesByCategory(targets, byCategory) {
  const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
  mkdirSync(QUIZ_SPLIT_DIR, { recursive: true })

  const targetIds = new Set(targets.map(t => t.id))
  let totalSplit = 0

  for (const [cat, catTargets] of Object.entries(byCategory)) {
    const catTargetIds = new Set(catTargets.map(t => t.id))
    const catQuizzes = data.quizzes.filter(q => q.category === cat)

    // Mark which questions need verification vs context-only
    const output = catQuizzes.map(q => ({
      ...q,
      _needsVerification: catTargetIds.has(q.id),
    }))

    const outPath = resolve(QUIZ_SPLIT_DIR, `${cat}.json`)
    writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')

    const sizeKB = (Buffer.byteLength(JSON.stringify(output, null, 2)) / 1024).toFixed(1)
    const verifyCount = output.filter(q => q._needsVerification).length
    console.log(`  Split: ${cat}.json (${output.length} questions, ${verifyCount} to verify, ${sizeKB}KB)`)
    totalSplit++
  }

  console.log(`\n${totalSplit} category files saved to: ${QUIZ_SPLIT_DIR}/`)
}

function cmdSave() {
  const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
  const state = loadState()

  // Update quiz hashes
  for (const quiz of data.quizzes) {
    state.quizHashes[quiz.id] = hashQuiz(quiz)
  }

  // Remove hashes for deleted quizzes
  const currentIds = new Set(data.quizzes.map(q => q.id))
  for (const id of Object.keys(state.quizHashes)) {
    if (!currentIds.has(id)) {
      delete state.quizHashes[id]
    }
  }

  // Update doc hashes
  const allDocNames = new Set()
  Object.values(CATEGORY_DOC_MAP).flat().forEach(d => allDocNames.add(d))
  SUPPLEMENTARY_DOCS.forEach(d => allDocNames.add(d))
  for (const docName of allDocNames) {
    const hash = hashDocFile(docName)
    if (hash) state.docHashes[docName] = hash
  }

  state.lastVerified = new Date().toISOString()
  saveState(state)

  console.log(`Verification state saved.`)
  console.log(`  Quizzes tracked: ${Object.keys(state.quizHashes).length}`)
  console.log(`  Doc pages tracked: ${Object.keys(state.docHashes).length}`)
  console.log(`  Timestamp: ${state.lastVerified}`)
}

function cmdStatus() {
  const state = loadState()

  console.log('=== Verification State ===\n')

  if (!state.lastVerified) {
    console.log('No verification state found. Run a verification first.')
    return
  }

  console.log(`Last verified: ${state.lastVerified}`)
  console.log(`Quizzes tracked: ${Object.keys(state.quizHashes).length}`)
  console.log(`Doc pages tracked: ${Object.keys(state.docHashes).length}`)

  // Quick diff preview
  const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
  let newCount = 0
  let changedCount = 0
  let unchangedCount = 0

  for (const quiz of data.quizzes) {
    const currentHash = hashQuiz(quiz)
    const previousHash = state.quizHashes[quiz.id]
    if (!previousHash) newCount++
    else if (currentHash !== previousHash) changedCount++
    else unchangedCount++
  }

  console.log(`\nQuiz status:`)
  console.log(`  New: ${newCount}`)
  console.log(`  Changed: ${changedCount}`)
  console.log(`  Unchanged: ${unchangedCount}`)

  // Doc changes
  const allDocNames = new Set()
  Object.values(CATEGORY_DOC_MAP).flat().forEach(d => allDocNames.add(d))
  SUPPLEMENTARY_DOCS.forEach(d => allDocNames.add(d))

  let docChangedCount = 0
  for (const docName of allDocNames) {
    const currentHash = hashDocFile(docName)
    if (currentHash && currentHash !== state.docHashes[docName]) {
      docChangedCount++
    }
  }
  console.log(`  Doc pages changed: ${docChangedCount}`)
}

function cmdMapping() {
  console.log('=== Category → Document Mapping ===\n')
  for (const [cat, docs] of Object.entries(CATEGORY_DOC_MAP).sort()) {
    console.log(`  ${cat.padEnd(15)} → ${docs.join(', ')}`)
  }
  console.log(`\n  (supplementary) → ${SUPPLEMENTARY_DOCS.join(', ')}`)
}

// ============================================================
// Main
// ============================================================

const args = process.argv.slice(2)
const command = args[0] || 'diff'

switch (command) {
  case 'diff': cmdDiff(args.slice(1)); break
  case 'save': cmdSave(); break
  case 'status': cmdStatus(); break
  case 'mapping': cmdMapping(); break
  default:
    console.log('Usage: node scripts/verify-state.mjs <command>')
    console.log('Commands: diff, diff --full, save, status, mapping')
    process.exit(1)
}
