#!/usr/bin/env node
/**
 * Layer 3: 分類結果の集計 + Sonnet 用圧縮入力生成
 *
 * classified-prompts.json + rolling-7d.json + learner-profile.json を読み、
 * compressed-input.json を生成する。
 *
 * Sonnet が読むデータ量を ~15,000文字 → ~1,750文字 に圧縮する。
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const STORE_DIR = join(process.env.HOME || '', '.claude-quiz-recommend')
const CLASSIFIED_FILE = join(STORE_DIR, 'classified-prompts.json')
const ROLLING_FILE = join(STORE_DIR, 'rolling-7d.json')
const PROFILE_FILE = join(STORE_DIR, 'learner-profile.json')
const OUTPUT_FILE = join(STORE_DIR, 'compressed-input.json')
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const QUIZ_FILE = join(PROJECT_DIR, 'src', 'data', 'quizzes.json')

// ── Read inputs ─────────────────────────────────────────────
if (!existsSync(CLASSIFIED_FILE) || !existsSync(ROLLING_FILE)) {
  process.exit(0)
}

const classified = JSON.parse(readFileSync(CLASSIFIED_FILE, 'utf8'))
const rolling = JSON.parse(readFileSync(ROLLING_FILE, 'utf8'))

let profile = null
try {
  if (existsSync(PROFILE_FILE)) {
    profile = JSON.parse(readFileSync(PROFILE_FILE, 'utf8'))
  }
} catch {
  /* no profile yet */
}

// ── Build compressed input ──────────────────────────────────

// 1. Intent clusters (from Haiku)
const intentClusters = (classified.summary?.intentClusters || []).slice(0, 8)

// 2. Quantitative data (from scripts)
const struggleSignals = rolling.struggleSignals || {}
const intentTransitions = (rolling.intentTransitions || []).slice(-5).map((t) => ({
  date: t.date,
  sequence: t.sequence.join('→'),
}))

// 3. Category distribution (from Haiku)
const categoryDistribution = classified.summary?.categoryDistribution || {}

// 4. Learner state (from profile)
const learnerState = profile
  ? {
      categoryProgress: profile.categoryProgress || {},
      recommendedAccuracy: profile.recommendedAccuracy || {},
      totalAttempts: profile.totalAttempts || 0,
      totalXp: profile.totalXp || 0,
      streakDays: profile.streakDays || 0,
      // Summarize pattern trend
      patternTrend: summarizePatternTrend(profile.patternHistory || []),
    }
  : null

// 5. Candidate quiz IDs (pre-filtered)
const candidateIds = filterCandidates(categoryDistribution, profile)

// 6. Representative sample prompts (one per top intent cluster)
const samplePrompts = intentClusters
  .slice(0, 5)
  .map((c) => {
    const promptId = c.promptIds[0]
    const cls = classified.classifications.find((x) => x.id === promptId)
    return cls ? `[${c.intent}] ${rolling.prompts[promptId]?.slice(0, 50) || ''}` : null
  })
  .filter(Boolean)

// ── Reuse cached candidates if classification hasn't changed ─
let stableCandidateIds = candidateIds
try {
  if (existsSync(OUTPUT_FILE)) {
    const prev = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'))
    // Reuse if same classification timestamp (no new Haiku run)
    if (prev.classifiedAt === classified.classifiedAt && prev.candidateIds?.length > 0) {
      stableCandidateIds = prev.candidateIds
    }
  }
} catch {
  /* use fresh candidates */
}

// ── Output ──────────────────────────────────────────────────
const compressed = {
  generatedAt: new Date().toISOString(),
  sessionCount: rolling.sessionCount,
  // Haiku analysis
  intentClusters,
  categoryDistribution,
  overallStruggles: classified.summary?.overallStruggles || {},
  // Script analysis
  struggleSignals,
  intentTransitions,
  // Learner state
  learnerState,
  // Pre-filtered candidates (stable across re-runs if classification unchanged)
  candidateIds: stableCandidateIds,
  classifiedAt: classified.classifiedAt,
  // Minimal samples for Sonnet context
  samplePrompts,
}

writeFileSync(OUTPUT_FILE, JSON.stringify(compressed, null, 2))

const size = JSON.stringify(compressed).length
console.log(`✓ compressed-input.json: ${size} chars (${candidateIds.length} candidate questions)`)

// ── Helper functions ────────────────────────────────────────

function summarizePatternTrend(history) {
  if (!history || history.length < 2) return null
  const oldest = history[0]
  const newest = history[history.length - 1]
  const resolvedPatterns = (oldest.patterns || []).filter((p) => !(newest.patterns || []).includes(p))
  const newPatterns = (newest.patterns || []).filter((p) => !(oldest.patterns || []).includes(p))
  return {
    resolved: resolvedPatterns,
    new: newPatterns,
    snapshotCount: history.length,
    oldestDate: oldest.date,
    newestDate: newest.date,
  }
}

function filterCandidates(catDist, profile) {
  if (!existsSync(QUIZ_FILE)) return []

  try {
    const quizData = JSON.parse(readFileSync(QUIZ_FILE, 'utf8'))
    const allQ = quizData.quizzes
    const catProgress = profile?.categoryProgress || {}
    const recAccuracy = profile?.recommendedAccuracy || {}

    // Sort categories by relevance (Haiku distribution)
    const topCats = Object.entries(catDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat)

    // Also include categories with low accuracy (needs practice)
    const weakCats = Object.entries(catProgress)
      .filter(([, v]) => v.accuracy < 50 && v.attemptedQuestions >= 3)
      .map(([cat]) => cat)

    const targetCats = [...new Set([...topCats, ...weakCats])]

    const candidates = []
    for (const cat of targetCats) {
      const acc = catProgress[cat]?.accuracy ?? 50
      const pool = allQ.filter((q) => {
        if (q.category !== cat) return false
        // Filter by difficulty based on accuracy
        if (acc >= 80 && q.difficulty === 'beginner') return false
        if (acc < 50 && q.difficulty === 'advanced') return false
        return true
      })

      // If user already has high accuracy in this category's recommendations, limit pool
      const recCorrect = recAccuracy[cat]
      const maxPerCat = recCorrect && recCorrect.correct / (recCorrect.total || 1) >= 0.8 ? 5 : 15

      const sampled = pool.sort(() => Math.random() - 0.5).slice(0, maxPerCat)
      candidates.push(...sampled.map((q) => q.id))
    }

    return [...new Set(candidates)].slice(0, 80)
  } catch {
    return []
  }
}
