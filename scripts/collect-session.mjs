#!/usr/bin/env node
/**
 * SessionEnd フックから呼ばれるセッション収集スクリプト
 *
 * - stdin から SessionEnd の JSON を受け取る
 * - transcript_path のセッション JSONL を解析
 * - 結果を ~/.claude-quiz-recommend/sessions/ に蓄積（日付別）
 * - 同日の複数セッションを自動マージ
 * - 解析完了時にレコメンド URL を生成し、デスクトップ通知
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { scriptLocale: loc } = await import(join(__dirname, 'locale.mjs'))

import {
  analyzeTranscriptContent,
  backfillDailyData,
  buildRollingCacheData,
  generateRecommendIds,
  mergeDailySessions,
} from './session-analysis.mjs'

const STORE_DIR = join(process.env.HOME || '', '.claude-quiz-recommend')
const SESSIONS_DIR = join(STORE_DIR, 'sessions')
const scanAllToday = process.argv.includes('--scan-all-today')

// Ensure directories exist
mkdirSync(SESSIONS_DIR, { recursive: true })

// ── Collect session file paths ─────────────────────────────
const transcriptPaths = []

if (scanAllToday) {
  // --scan-all-today: Find ALL session files modified today across all projects
  // This catches sessions that are still open (never triggered SessionEnd)
  const projectsDir = join(process.env.HOME || '', '.claude', 'projects')
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const cutoff = todayStart.getTime()

  try {
    for (const projDir of readdirSync(projectsDir)) {
      const projPath = join(projectsDir, projDir)
      try {
        for (const f of readdirSync(projPath)) {
          if (!f.endsWith('.jsonl')) continue
          const fPath = join(projPath, f)
          if (statSync(fPath).mtimeMs > cutoff) {
            transcriptPaths.push(fPath)
          }
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
} else {
  // Single session mode: Read from stdin (SessionEnd) or find most recent
  let stdinData = ''
  try {
    stdinData = readFileSync('/dev/stdin', 'utf8')
  } catch {
    /* no stdin */
  }

  let transcriptPath = ''

  if (stdinData) {
    try {
      const hook = JSON.parse(stdinData)
      transcriptPath = hook.transcript_path || ''
    } catch {
      /* invalid JSON */
    }
  }

  if (!transcriptPath) {
    const projectsDir = join(process.env.HOME || '', '.claude', 'projects')
    try {
      let newest = { path: '', mtime: 0 }
      for (const projDir of readdirSync(projectsDir)) {
        const projPath = join(projectsDir, projDir)
        try {
          for (const f of readdirSync(projPath)) {
            if (!f.endsWith('.jsonl')) continue
            const fPath = join(projPath, f)
            const mt = statSync(fPath).mtimeMs
            if (mt > newest.mtime) newest = { path: fPath, mtime: mt }
          }
        } catch {
          /* skip */
        }
      }
      transcriptPath = newest.path
    } catch {
      /* skip */
    }
  }

  if (transcriptPath && existsSync(transcriptPath)) {
    transcriptPaths.push(transcriptPath)
  }
}

if (transcriptPaths.length === 0) {
  process.exit(0)
}

// ── Analyze transcript (delegates to session-analysis.mjs) ──

function analyzeTranscript(filePath) {
  const content = readFileSync(filePath, 'utf8')
  return analyzeTranscriptContent(content)
}

// ── Analyze sessions ───────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const dailyFile = join(SESSIONS_DIR, `${today}.json`)

let daily = { date: today, sessions: [], merged: { tools: {}, categoryScores: {}, topics: [], promptSamples: [] } }

if (scanAllToday) {
  // Full scan: rebuild from all today's session files
  const knownIds = new Set()
  for (const tp of transcriptPaths) {
    const id = basename(tp, '.jsonl')
    if (knownIds.has(id)) continue
    knownIds.add(id)
    const result = analyzeTranscript(tp)
    daily.sessions.push({ id, timestamp: new Date().toISOString(), ...result })
  }
} else {
  // Single session: append to existing daily file
  if (existsSync(dailyFile)) {
    try {
      daily = JSON.parse(readFileSync(dailyFile, 'utf8'))
    } catch {
      /* reset */
    }
  }
  const tp = transcriptPaths[0]
  const result = analyzeTranscript(tp)
  const id = basename(tp, '.jsonl')
  // Avoid duplicate: replace if same session ID exists (re-analyzed open session)
  daily.sessions = daily.sessions.filter((s) => s.id !== id)
  daily.sessions.push({ id, timestamp: new Date().toISOString(), ...result })
}

// Merge all sessions for the day (delegated to session-analysis.mjs)
daily.merged = mergeDailySessions(daily.sessions)

writeFileSync(dailyFile, JSON.stringify(daily, null, 2))

// ── Build rolling 7-day cache ──────────────────────────────
const ROLLING_DAYS = 7
const rollingEntries = []

for (let d = 0; d < ROLLING_DAYS; d++) {
  const dateStr = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const dayFile = join(SESSIONS_DIR, `${dateStr}.json`)
  if (!existsSync(dayFile)) continue
  try {
    const dayData = JSON.parse(readFileSync(dayFile, 'utf8'))
    rollingEntries.push({ dateStr, dayIndex: d, dayData })
  } catch {
    /* skip */
  }
}

const rollingResult = buildRollingCacheData(rollingEntries)

writeFileSync(
  join(STORE_DIR, 'rolling-7d.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      promptCount: rollingResult.prompts.length,
      ...rollingResult,
    },
    null,
    2
  )
)

// ── Backfill from past days if today's data is thin ─────────
const BACKFILL_DAYS = 7
const pastDays = []
for (let d = 1; d <= BACKFILL_DAYS; d++) {
  const pastDate = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const pastFile = join(SESSIONS_DIR, `${pastDate}.json`)
  if (!existsSync(pastFile)) continue
  try {
    pastDays.push(JSON.parse(readFileSync(pastFile, 'utf8')))
  } catch {
    /* skip corrupt file */
  }
}
daily.merged = backfillDailyData(daily.merged, pastDays)

// ── Generate recommendation URL ────────────────────────────
// Skip when called from /recommend skill (--scan-all-today) — the skill writes its own output with AI-generated reasons
// Top 3 categories → pick 5 question IDs each
try {
  if (scanAllToday) throw new Error('skip')
  const quizPath = join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'src/data/quizzes.json')
  if (existsSync(quizPath)) {
    const quizData = JSON.parse(readFileSync(quizPath, 'utf8'))
    const allQ = quizData.quizzes
    const ids = generateRecommendIds(allQ, daily.merged.categoryScores)

    const url = `https://ip-san.github.io/claude-code-quiz/?ids=${ids.join(',')}`

    // Save URL for desktop app to read
    // Preserve existing AI-generated reasons and coachingMessage if present
    let existingReasons = undefined
    let existingCoaching = undefined
    try {
      const existing = JSON.parse(readFileSync(join(STORE_DIR, 'latest-recommend.json'), 'utf8'))
      if (existing.reasons && Object.keys(existing.reasons).length > 0) {
        existingReasons = existing.reasons
        existingCoaching = existing.coachingMessage
      }
    } catch {
      // No existing file
    }
    // Also check reasons.json for coachingMessage (source of truth)
    if (!existingCoaching) {
      try {
        const reasonsFile = JSON.parse(readFileSync(join(STORE_DIR, 'reasons.json'), 'utf8'))
        if (reasonsFile.coachingMessage) existingCoaching = reasonsFile.coachingMessage
      } catch {
        // reasons.json not available
      }
    }
    writeFileSync(
      join(STORE_DIR, 'latest-recommend.json'),
      JSON.stringify(
        {
          date: today,
          sessionCount: daily.sessions.length,
          questionCount: existingReasons ? Object.keys(existingReasons).length : ids.length,
          ids: existingReasons ? Object.keys(existingReasons) : ids,
          url: existingReasons
            ? `https://ip-san.github.io/claude-code-quiz/?ids=${Object.keys(existingReasons).join(',')}`
            : url,
          topCategories: Object.entries(daily.merged.categoryScores)
            .filter(([, s]) => s > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([c]) => c),
          topics: daily.merged.topics.slice(0, 5),
          promptSamples: daily.merged.promptSamples.slice(-15),
          ...(existingReasons && { reasons: existingReasons }),
          ...(existingCoaching && { coachingMessage: existingCoaching }),
        },
        null,
        2
      )
    )

    // Detect work patterns for actionable tip
    const allPrompts = daily.sessions.flatMap((s) => s.promptSamples || []).filter((p) => p.length > 10)
    let tipMsg = ''
    const longPrompts = allPrompts.filter((p) => p.length > 80)
    const testCmds = allPrompts.filter((p) => /test|テスト/i.test(p))
    const repeatThemes = new Map()
    for (const p of allPrompts) {
      const key = p.slice(0, 15).toLowerCase()
      repeatThemes.set(key, (repeatThemes.get(key) || 0) + 1)
    }
    const hasRepeat = [...repeatThemes.values()].some((c) => c >= 3)

    if (hasRepeat) tipMsg = loc.collect.tipRepeat
    else if (longPrompts.length >= 3) tipMsg = loc.collect.tipLongPrompt
    else if (testCmds.length >= 2) tipMsg = loc.collect.tipTestAuto

    // Desktop notification
    const topTopics = daily.merged.topics
      .slice(0, 2)
      .map((t) => t.topic)
      .join('・')
    const msg = topTopics ? loc.collect.notifyWithTopics(topTopics, ids.length) : loc.collect.notifyGeneric(ids.length)

    // Output for hook stderr (shown to user)
    console.error(`\n📚 ${msg}`)
    if (tipMsg) console.error(`${tipMsg}`)
    console.error(`   ${url}\n`)
  }
} catch {
  // Quiz data not available — just save session data
}

// ── Trigger Haiku classification (background) ──────────────
// Runs detached so it doesn't block the SessionEnd hook timeout
try {
  const classifyScript = join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'scripts', 'classify-prompts.mjs')
  if (existsSync(classifyScript)) {
    const { spawn: spawnDetached } = await import('child_process')
    const child = spawnDetached('node', [classifyScript], {
      cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, CLAUDE_PROJECT_DIR: process.env.CLAUDE_PROJECT_DIR || process.cwd() },
    })
    child.unref()
  }
} catch {
  // Non-critical — classification will run next time
}
