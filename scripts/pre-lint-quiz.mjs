#!/usr/bin/env node
/**
 * Deterministic Pre-Lint Orchestrator
 *
 * quiz-lint / quiz-fact-check / quiz-cross-check の3スクリプトを実行し、
 * 結果を pre-verify-results.json 互換フォーマットで出力する。
 *
 * Haiku pre-verify-quiz.mjs の代替。LLM 不要で100%決定論的。
 *
 * 出力: .claude/tmp/pre-verify-results.json
 */

import { execSync } from 'child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TMP_DIR = join(ROOT, '.claude', 'tmp')
const OUTPUT_FILE = join(TMP_DIR, 'pre-verify-results.json')
const QUIZ_FILE = join(ROOT, 'src', 'data', 'quizzes.json')

// ── Run lint scripts ────────────────────────────────────────

function runScript(script, args = '') {
  try {
    const raw = execSync(`node ${join(ROOT, 'scripts', script)} ${args}`, {
      timeout: 30_000,
      encoding: 'utf8',
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return JSON.parse(raw)
  } catch (err) {
    console.error(`  Warning: ${script} failed: ${err.message?.slice(0, 100)}`)
    return null
  }
}

console.log('Pre-lint: running deterministic checks...')

const lintResults = runScript('quiz-lint.mjs', 'all --json')
const factResults = runScript('quiz-fact-check.mjs', '--json')
const crossResults = runScript('quiz-cross-check.mjs', '--json')

// ── Aggregate flagged IDs ───────────────────────────────────

/** @type {Map<string, Array<{check: string, detail: string}>>} */
const flaggedMap = new Map()

function addFlag(id, check, detail) {
  if (!flaggedMap.has(id)) flaggedMap.set(id, [])
  flaggedMap.get(id).push({ check, detail })
}

// Lint results: each key is a check type, value is array of issues
if (lintResults) {
  for (const [checkType, issues] of Object.entries(lintResults)) {
    for (const issue of issues) {
      if (issue.id) {
        addFlag(issue.id, checkType, issue.detail || issue.type || checkType)
      }
    }
  }
}

// Fact-check results: each key is a term type, value is array of not-found terms
if (factResults) {
  for (const [termType, issues] of Object.entries(factResults)) {
    for (const issue of issues) {
      for (const id of issue.quizIds || []) {
        addFlag(id, `factCheck:${termType}`, `${issue.term} not found in docs`)
      }
    }
  }
}

// Cross-check results: array of contradictions
if (Array.isArray(crossResults)) {
  for (const issue of crossResults) {
    for (const id of issue.quizIds || []) {
      addFlag(id, 'crossCheck', `${issue.type}: ${issue.topic}`)
    }
  }
}

// ── Classify into tiers ─────────────────────────────────────

// Checks that indicate factual accuracy concerns (need Sonnet A-B)
const FACT_CHECKS = new Set([
  'factCheck:env',
  'factCheck:slash',
  'factCheck:flags',
  'factCheck:hooks',
  'factCheck:tools',
  'factCheck:config',
  'crossCheck',
  'terminology',
])
// Checks that are auto-fixable (Sonnet can skip)
const AUTO_FIX_CHECKS = new Set(['backtick'])
// Everything else is quality-only (distractor, difficulty, url, quality)

function classifyTier(checks) {
  const hasFactual = checks.some((c) => FACT_CHECKS.has(c))
  const allAutoFix = checks.every((c) => AUTO_FIX_CHECKS.has(c))
  if (allAutoFix) return 'autofix'
  if (hasFactual) return 'fact'
  return 'quality'
}

// ── Build pre-verify-results.json ───────────────────────────

const quizData = JSON.parse(readFileSync(QUIZ_FILE, 'utf8'))
const allIds = new Set(quizData.quizzes.map((q) => q.id))
const flaggedIds = new Set(flaggedMap.keys())

const matched = []
const flagged = []
const lintAnnotations = {}
const tierCounts = { fact: 0, quality: 0, autofix: 0 }

for (const id of allIds) {
  if (flaggedIds.has(id)) {
    const annotations = flaggedMap.get(id)
    const checks = [...new Set(annotations.map((a) => a.check))]
    const tier = classifyTier(checks)
    tierCounts[tier]++
    flagged.push({
      id,
      reason: checks.join(', '),
      checks,
      tier,
    })
    lintAnnotations[id] = annotations
  } else {
    matched.push({ id, reason: '全チェック通過' })
  }
}

// autofix tier doesn't need Sonnet
const sonnetTargets = flagged.filter((f) => f.tier !== 'autofix').map((f) => f.id)

const output = {
  preVerifiedAt: new Date().toISOString(),
  model: 'deterministic-lint',
  total: allIds.size,
  matched,
  flagged,
  uncertain: [],
  sonnetTargets,
  skipCount: matched.length,
  lintAnnotations,
  tiers: tierCounts,
}

mkdirSync(TMP_DIR, { recursive: true })
writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

const pct = Math.round((matched.length / allIds.size) * 100)
console.log(`✓ Pre-lint: ${matched.length} passed (${pct}%), ${flagged.length} flagged`)
console.log(`  Tiers: fact=${tierCounts.fact}, quality=${tierCounts.quality}, autofix=${tierCounts.autofix}`)
console.log(`  → Sonnet targets: ${sonnetTargets.length} (autofix ${tierCounts.autofix}問はスキップ)`)
