#!/usr/bin/env node
/**
 * Layer 3: Sonnet 用入力データの構築
 *
 * classified-prompts.json + rolling-7d.json + learner-profile.json を読み、
 * Sonnet が因果推論と問題選定を行うための入力データを構築する。
 *
 * 設計原則: Sonnet にはできるだけ生に近いデータを渡す。
 * スクリプトで情報を捨てると、Sonnet の判断材料が減り、
 * ユーザーが直接 Opus に聞いた方が良い結果になってしまう。
 *
 * Sonnet の強みは「7日分の全セッションデータを横断分析できること」。
 * この強みを活かすため、時系列の文脈と個別分類結果を保持する。
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { loadCategoryWeights } from './theme-weights.mjs'
import { VALUE_DEFAULT_WEIGHT, VALUE_TAG_BONUS_MJS } from './value-constants.mjs'

const STORE_DIR = join(process.env.HOME || '', '.claude-quiz-recommend')
const CLASSIFIED_FILE = join(STORE_DIR, 'classified-prompts.json')
const ROLLING_FILE = join(STORE_DIR, 'rolling-7d.json')
const PROFILE_FILE = join(STORE_DIR, 'learner-profile.json')
const OUTPUT_FILE = join(STORE_DIR, 'compressed-input.json')
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const QUIZ_FILE = join(PROJECT_DIR, 'src', 'data', 'quizzes.json')
const THEME_FILE = join(PROJECT_DIR, 'src', 'config', 'theme.ts')

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

// ── Read Opus analysis files (zero-cost: already generated) ──
const LEARNER_TYPE_FILE = join(STORE_DIR, 'learner-type.json')
let opusLearnerType = null
try {
  if (existsSync(LEARNER_TYPE_FILE)) {
    opusLearnerType = JSON.parse(readFileSync(LEARNER_TYPE_FILE, 'utf8'))
  }
} catch {
  /* no Opus analysis yet */
}

// Find latest analysis files by trigger type (opus-{trigger}-*.json or sonnet-{trigger}-*.json)
function findLatestAnalysis(triggerName) {
  try {
    const files = readdirSync(STORE_DIR)
      .filter((f) => f.includes(`-${triggerName}-`) && f.endsWith('.json'))
      .sort()
    if (files.length > 0) {
      return JSON.parse(readFileSync(join(STORE_DIR, files[files.length - 1]), 'utf8'))
    }
  } catch {
    /* not available */
  }
  return null
}

const opusStagnation = findLatestAnalysis('stagnation')
const opusBreakthrough = findLatestAnalysis('breakthrough')
const opusMastery = findLatestAnalysis('mastery')
const opusMonthly = findLatestAnalysis('monthly')

// ── Build Sonnet input (preserve raw data) ──────────────────

// 1. Conversation flows — the sequential context that Sonnet needs
//    to understand "what the user was trying to do across sessions"
const conversationFlows = (rolling.conversationFlows || []).slice(-5).map((flow) => ({
  date: flow.date,
  // Preserve dialogue pairs (user + assistant) with role, text, and error flags
  prompts: flow.prompts
    .slice(-10)
    .map((p) =>
      typeof p === 'object'
        ? { role: p.role, text: (p.text || '').slice(0, 80), hasError: p.hasError || undefined }
        : { role: 'user', text: (p || '').slice(0, 80) }
    ),
}))

// 2. Individual Haiku classifications — per-prompt judgment
//    Sonnet can see patterns that Haiku classified as struggle/none
//    and make cross-prompt inferences
const promptClassifications = (classified.classifications || []).slice(-30).map((c) => {
  const promptText = rolling.prompts?.[c.id]?.slice(0, 80) ?? ''
  return {
    text: promptText,
    intent: c.intent,
    category: c.category,
    struggle: c.struggle,
    phase: c.phase ?? null,
    tip: c.tip ?? null,
  }
})

// 3. Summary statistics (from Haiku) — aggregate view
const summary = {
  intentClusters: (classified.summary?.intentClusters || []).slice(0, 10).map((c) => ({
    intent: c.intent,
    count: c.promptIds.length,
    dominantStruggle: c.dominantStruggle,
    tip: c.tip,
  })),
  categoryDistribution: classified.summary?.categoryDistribution || {},
  overallStruggles: classified.summary?.overallStruggles || {},
}

// 4. Learner state — quiz progress + growth trajectory
const learnerState = profile
  ? {
      categoryProgress: profile.categoryProgress || {},
      recommendedAccuracy: profile.recommendedAccuracy || {},
      totalAttempts: profile.totalAttempts || 0,
      totalXp: profile.totalXp || 0,
      streakDays: profile.streakDays || 0,
      patternTrend: summarizePatternTrend(profile.patternHistory || []),
    }
  : null

// 5. Candidate quiz questions — include question text so Sonnet
//    can match prompts to specific questions by understanding
const candidateQuestions = filterCandidates(summary.categoryDistribution, profile)

// ── Reuse cached candidates if classification hasn't changed ─
let stableCandidates = candidateQuestions
try {
  if (existsSync(OUTPUT_FILE)) {
    const prev = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'))
    // 新フィールド(categoryWeight/valueTag)を持つキャッシュのみ流用する。
    // 本変更前に書かれた旧キャッシュを流用すると SKILL の価値tie-break指示が空振りするため、
    // 欠落時は新規算出(candidateQuestions)にフォールバックする。
    const cacheHasValueFields = prev.candidateQuestions?.every((c) => 'valueTag' in c && 'categoryWeight' in c)
    if (prev.classifiedAt === classified.classifiedAt && prev.candidateQuestions?.length > 0 && cacheHasValueFields) {
      stableCandidates = prev.candidateQuestions
    }
  }
} catch {
  /* use fresh candidates */
}

// ── Output ──────────────────────────────────────────────────
const output = {
  generatedAt: new Date().toISOString(),
  classifiedAt: classified.classifiedAt,
  sessionCount: rolling.sessionCount,
  promptCount: rolling.promptCount,

  // Raw conversation flows (time-series context)
  conversationFlows,

  // Per-prompt Haiku classification with original text
  promptClassifications,

  // Aggregate statistics
  summary,

  // Quantitative signals
  struggleSignals: rolling.struggleSignals || {},

  // Learner quiz state
  learnerState,

  // Candidate questions with text (for Sonnet to match against prompts)
  candidateQuestions: stableCandidates,

  // Opus/Sonnet deep analysis (pre-computed, zero additional cost)
  opusAnalysis: opusLearnerType
    ? {
        learnerType: opusLearnerType.learnerType,
        strengths: opusLearnerType.strengths,
        gaps: opusLearnerType.gaps,
        recommendedPath: opusLearnerType.recommendedPath,
        coachingNote: opusLearnerType.coachingNote,
        analyzedAt: opusLearnerType.analyzedAt,
      }
    : null,
  stagnationAnalysis: opusStagnation
    ? {
        rootCause: opusStagnation.rootCause,
        intervention: opusStagnation.intervention,
        motivationalNote: opusStagnation.motivationalNote,
        analyzedAt: opusStagnation.analyzedAt,
      }
    : null,
  breakthroughAnalysis: opusBreakthrough
    ? {
        causalAnalysis: opusBreakthrough.causalAnalysis,
        transferSuggestion: opusBreakthrough.transferSuggestion,
        coachingNote: opusBreakthrough.coachingNote,
        analyzedAt: opusBreakthrough.analyzedAt,
      }
    : null,
  masteryAnalysis: opusMastery
    ? {
        crossCategoryInsight: opusMastery.crossCategoryInsight,
        nextChallenge: opusMastery.nextChallenge,
        suggestedQuestionIds: opusMastery.suggestedQuestionIds,
        coachingNote: opusMastery.coachingNote,
        analyzedAt: opusMastery.analyzedAt,
      }
    : null,
  monthlyReview: opusMonthly
    ? {
        progressSummary: opusMonthly.progressSummary,
        adjustedPath: opusMonthly.adjustedPath,
        coachingNote: opusMonthly.coachingNote,
        analyzedAt: opusMonthly.analyzedAt,
      }
    : null,
}

writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

const size = JSON.stringify(output).length
const candidateCount = stableCandidates.length
console.log(
  `✓ compressed-input.json: ${size} chars (${candidateCount} candidate questions, ${promptClassifications.length} classified prompts)`
)

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
    const catWeights = loadCategoryWeights(THEME_FILE)

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
        if (acc >= 80 && q.difficulty === 'beginner') return false
        if (acc < 50 && q.difficulty === 'advanced') return false
        return true
      })

      const recCorrect = recAccuracy[cat]
      const maxPerCat = recCorrect && recCorrect.correct / (recCorrect.total || 1) >= 0.8 ? 5 : 15

      // 価値重み tie-break: カテゴリ weight（実務頻度×インパクトのプロキシ）と
      // practical タグを「苦戦シグナル」と同等に扱わず、あくまで同程度の苦戦内での
      // 優先度として弱く効かせる。これにより「苦戦 × 価値」の2軸でレコメンドする。
      // 完全な決定論だと候補が固定化するため、軽いランダム成分を残す。
      // スコアは要素ごとに一度だけ算出してから安定ソートする（比較関数内で Math.random を
      // 呼ぶと同一要素のスコアが比較のたびに変わり、ソート順序が不定になるため）。
      // tagBonus/既定weight は scripts/value-constants.mjs（TS の ValueScore.ts と同値）から読む。
      // 価値はあくまで「弱い事前優先」で、最終的な苦戦×価値の tie-break は SKILL/Sonnet 側が行う。
      // そのため jitter 幅(16)を tagBonus レンジ(10)より広く取り、trivia/neutral も候補に残す
      // （大規模カテゴリで practical が上位を独占し、苦戦中の trivia/neutral が事前排除されるのを防ぐ）。
      const valueScore = (q) => {
        const w = catWeights[q.category] ?? VALUE_DEFAULT_WEIGHT
        const tags = q.tags || []
        const tagBonus = tags.includes('practical')
          ? VALUE_TAG_BONUS_MJS.practical
          : tags.includes('trivia')
            ? VALUE_TAG_BONUS_MJS.trivia
            : 0
        return w + tagBonus + Math.random() * 16
      }
      const sampled = pool
        .map((q) => ({ q, score: valueScore(q) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPerCat)
        .map((x) => x.q)
      candidates.push(
        ...sampled.map((q) => ({
          id: q.id,
          category: q.category,
          difficulty: q.difficulty,
          categoryWeight: catWeights[q.category] ?? VALUE_DEFAULT_WEIGHT,
          valueTag: (q.tags || []).includes('practical')
            ? 'practical'
            : (q.tags || []).includes('trivia')
              ? 'trivia'
              : 'neutral',
          question: q.question.slice(0, 50),
        }))
      )
    }

    return candidates.slice(0, 50)
  } catch {
    return []
  }
}
