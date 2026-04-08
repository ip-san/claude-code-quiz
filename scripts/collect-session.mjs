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

// ── Analyze transcript ─────────────────────────────────────
const CATEGORY_KEYWORDS = {
  memory: ['CLAUDE.md', 'claude.md', 'memory', 'MEMORY.md', '/memory', '/init', 'rules/', '@import'],
  skills: ['skill', 'SKILL.md', '/batch', '/loop', '/schedule', 'context: fork', 'frontmatter'],
  tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebFetch', 'tool_use'],
  commands: [
    '/compact',
    '/clear',
    '/resume',
    '/model',
    '/context',
    '/branch',
    '/voice',
    '/rewind',
    'claude -p',
    '--bare',
  ],
  extensions: ['MCP', 'mcp', 'hook', 'Hook', 'plugin', 'subagent', 'Agent', 'Chrome', 'Slack'],
  session: ['コンテキスト', 'token', 'compact', 'checkpoint', 'resume', 'session', 'fork', 'worktree', 'effort'],
  keyboard: ['Ctrl+', 'Shift+', 'Alt+', 'Esc', 'Tab', 'shortcut', 'vim', 'keybind'],
  bestpractices: ['plan mode', 'Plan', 'verify', 'test', 'review', 'IMPORTANT', 'best practice'],
}

const TOPIC_KEYWORDS = {
  'CLAUDE.mdの書き方': ['CLAUDE.md', '/init', 'ルール', '指示'],
  コンテキスト管理: ['コンテキスト', '/compact', '/clear', 'context', '圧縮'],
  MCP: ['MCP', 'mcp', 'ツール連携', 'stdio'],
  Hooks: ['hook', 'Hook', 'フック', 'PreToolUse', 'PostToolUse'],
  サブエージェント: ['subagent', 'サブエージェント', 'Agent', 'worktree', '並列'],
  Skills: ['skill', 'SKILL.md', 'スキル', 'frontmatter'],
  デバッグ: ['debug', 'デバッグ', 'エラー', 'error', 'バグ'],
  テスト: ['test', 'テスト', 'vitest', 'playwright'],
  'CI/CD': ['CI', 'GitHub Actions', 'deploy', 'デプロイ'],
  セキュリティ: ['security', 'セキュリティ', 'permission', 'sandbox'],
  コスト管理: ['cost', 'コスト', '料金', 'effort'],
}

// ── Sub-functions for analyzeTranscript ───────────────────

function parseJsonlLines(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean)
  const tools = {}
  const prompts = []
  const conversations = []
  let promptIndex = 0

  for (const line of lines) {
    try {
      const j = JSON.parse(line)

      // ── User messages ─────────────────────────────────────
      if (j.type === 'user' && j.message?.content) {
        const text =
          typeof j.message.content === 'string'
            ? j.message.content
            : j.message.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join(' ')
        if (text.length > 5) {
          prompts.push(text)
          promptIndex++
          conversations.push({ seq: promptIndex, role: 'user', text })
        }
      }

      // ── Assistant messages (Claude's response) ────────────
      // Collect response summary + tool results for struggle accuracy
      if (j.message?.role === 'assistant' && j.message?.content && Array.isArray(j.message.content)) {
        let responseText = ''
        let toolsUsed = []
        let hasError = false

        for (const c of j.message.content) {
          if (c.type === 'text' && c.text) {
            responseText += c.text
          }
          if (c.type === 'tool_use') {
            tools[c.name] = (tools[c.name] || 0) + 1
            toolsUsed.push(c.name)
            if (c.input?.command) prompts.push(c.input.command)
          }
          if (c.type === 'tool_result' && c.is_error) {
            hasError = true
          }
        }

        // Build conversation pair: what user asked → what Claude did
        if (responseText.length > 0 || toolsUsed.length > 0) {
          const summary = responseText.slice(0, 120) || `[ツール: ${toolsUsed.slice(0, 3).join(', ')}]`
          conversations.push({
            seq: promptIndex,
            role: 'assistant',
            text: summary,
            toolsUsed: toolsUsed.length > 0 ? toolsUsed.slice(0, 5) : undefined,
            hasError: hasError || undefined,
          })
        }
      }

      // ── Tool results (separate from assistant content) ────
      if (j.type === 'tool_result' || j.message?.role === 'tool') {
        // Check for error in tool results
        const isError = j.is_error || j.message?.is_error
        if (isError && conversations.length > 0) {
          const last = conversations[conversations.length - 1]
          if (last.role === 'assistant') {
            last.hasError = true
          }
        }
      }
    } catch {
      /* skip */
    }
  }
  return { tools, prompts, conversations }
}

function scoreCategories(prompts) {
  const allText = prompts.join(' ')
  const categoryScores = {}
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    categoryScores[cat] = keywords.reduce((score, kw) => {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return score + (allText.match(regex) || []).length
    }, 0)
  }
  return categoryScores
}

function analyzeTranscript(filePath) {
  const { tools, prompts, conversations } = parseJsonlLines(filePath)

  const categoryScores = scoreCategories(prompts)
  const allText = prompts.join(' ').toLowerCase()

  // Detect topics
  const topics = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const hits = keywords.filter((kw) => allText.includes(kw.toLowerCase())).length
    if (hits >= 1) topics.push({ topic, hits })
  }

  // Prompt samples (human-readable context for AI analysis)
  const commandPrefixPattern =
    /^(node |git |ls |cat |grep |rg |bun |npm |npx |docker |curl |wget |ssh |cd |mkdir |rm |mv |cp |tail |head |sed |awk |kill |pkill |lsof |stat |wc |chmod |chown |tar |find |sleep |echo |printf |make |pip |python3? )/
  const promptSamples = prompts
    .filter(
      (p) =>
        p.length > 10 &&
        p.length < 200 &&
        !commandPrefixPattern.test(p) &&
        !p.includes('<command-') &&
        !p.includes('<local-command') &&
        !p.includes('</') &&
        !/^[!/]/.test(p) && // skip !commands and /slash-commands
        !/^\(cd |^2>&1/.test(p) && // skip subshell commands and redirections
        !/^[A-Z_]+=/.test(p) // skip env var assignments
    )
    .map((p) => p.trim())
    .slice(-20)

  // ── Quantitative signals (mechanical, no judgment) ────────
  // These are simple counts/ratios that Layer 2 (Haiku) will interpret
  const meaningful = prompts.filter(
    (p) => p.length > 10 && !p.startsWith('node ') && !p.startsWith('git ') && !/^[!/]/.test(p)
  )

  const struggleSignals = {
    promptCount: meaningful.length,
    // Front-half vs back-half average length ratio (fatigue indicator)
    lengthRatio:
      meaningful.length >= 4
        ? (() => {
            const half = Math.floor(meaningful.length / 2)
            const frontAvg = meaningful.slice(0, half).reduce((s, p) => s + p.length, 0) / half
            const backAvg = meaningful.slice(half).reduce((s, p) => s + p.length, 0) / (meaningful.length - half)
            return frontAvg > 0 ? Math.round((backAvg / frontAvg) * 100) / 100 : 1
          })()
        : 1,
  }

  // NOTE: Intent classification, struggle detection, and topic assignment
  // are delegated to Layer 2 (Haiku) in classify-prompts.mjs.
  // This script only collects raw data — it does not make judgments
  // about user intent, sentiment, or behavior patterns.

  return {
    tools,
    categoryScores,
    topics,
    promptSamples,
    promptCount: prompts.length,
    conversations,
    struggleSignals,
  }
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

// Merge all sessions for the day
const merged = { tools: {}, categoryScores: {}, topics: {}, promptSamples: [] }

for (const sess of daily.sessions) {
  // Merge tools
  for (const [tool, count] of Object.entries(sess.tools)) {
    merged.tools[tool] = (merged.tools[tool] || 0) + count
  }
  // Merge category scores (sum)
  for (const [cat, score] of Object.entries(sess.categoryScores)) {
    merged.categoryScores[cat] = (merged.categoryScores[cat] || 0) + score
  }
  // Merge topics (max hits)
  for (const t of sess.topics) {
    merged.topics[t.topic] = Math.max(merged.topics[t.topic] || 0, t.hits)
  }
  // Collect prompt samples (last 3 from each session)
  merged.promptSamples.push(...(sess.promptSamples || []).slice(-10))
}

// Aggregate quantitative struggle signals across sessions
let totalPromptCount = 0
let totalLengthRatio = 0
let ratioCount = 0
for (const sess of daily.sessions) {
  if (sess.struggleSignals) {
    totalPromptCount += sess.struggleSignals.promptCount || 0
    if (sess.struggleSignals.lengthRatio !== 1) {
      totalLengthRatio += sess.struggleSignals.lengthRatio
      ratioCount++
    }
  }
}

daily.merged = {
  tools: merged.tools,
  categoryScores: merged.categoryScores,
  topics: Object.entries(merged.topics)
    .map(([topic, hits]) => ({ topic, hits }))
    .sort((a, b) => b.hits - a.hits),
  promptSamples: merged.promptSamples.slice(-30),
  struggleSignals: {
    promptCount: totalPromptCount,
    lengthRatio: ratioCount > 0 ? Math.round((totalLengthRatio / ratioCount) * 100) / 100 : 1,
  },
}

writeFileSync(dailyFile, JSON.stringify(daily, null, 2))

// ── Build rolling 7-day cache ──────────────────────────────
const ROLLING_DAYS = 7
const rollingCache = {
  prompts: [],
  conversationFlows: [],
  topics: {},
  categoryScores: {},
  sessionCount: 0,
  days: [],
  struggleSignals: {
    promptCount: 0,
    lengthRatio: 1,
  },
}

for (let d = 0; d < ROLLING_DAYS; d++) {
  const dateStr = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const dayFile = join(SESSIONS_DIR, `${dateStr}.json`)
  if (!existsSync(dayFile)) continue
  try {
    const dayData = JSON.parse(readFileSync(dayFile, 'utf8'))
    const weight = d === 0 ? 1.0 : 0.7 - d * 0.08 // today=1.0, yesterday=0.62, 2d=0.54...
    rollingCache.days.push(dateStr)
    rollingCache.sessionCount += dayData.sessions.length
    // Prompts: collect from individual sessions, filter out commands
    const commandPrefixes =
      /^(docker |npm |bun |node |npx |git |tail |sleep |rm |kill |pkill |cat |grep |ls |cd |mkdir |sed |awk |curl |wget |ssh )/
    for (const sess of dayData.sessions) {
      if (sess.promptSamples?.length > 0) {
        const meaningful = sess.promptSamples.filter((p) => p.length > 10 && !commandPrefixes.test(p))
        rollingCache.prompts.push(...meaningful)
      }
    }
    // Collect conversation flows with dialogue pairs (user + assistant)
    for (const sess of dayData.sessions) {
      if (sess.conversations && sess.conversations.length > 0) {
        rollingCache.conversationFlows.push({
          date: dateStr,
          sessionId: sess.id,
          prompts: sess.conversations.slice(-20).map((c) => ({
            role: c.role || 'user',
            text: (c.text || '').slice(0, 120),
            hasError: c.hasError || undefined,
          })),
        })
      }
    }
    // Merge struggle signals (accumulate counts from today, highest weight)
    if (d === 0 && dayData.merged?.struggleSignals) {
      rollingCache.struggleSignals = dayData.merged.struggleSignals
    }
    // Category scores (weighted)
    for (const [cat, score] of Object.entries(dayData.merged.categoryScores)) {
      rollingCache.categoryScores[cat] = (rollingCache.categoryScores[cat] || 0) + Math.round(Number(score) * weight)
    }
    // Topics (max hits, weighted)
    for (const t of dayData.merged.topics) {
      rollingCache.topics[t.topic] = Math.max(rollingCache.topics[t.topic] || 0, Math.round(t.hits * weight))
    }
  } catch {
    /* skip */
  }
}

// Convert topics to sorted array
const rollingTopics = Object.entries(rollingCache.topics)
  .map(([topic, hits]) => ({ topic, hits }))
  .sort((a, b) => b.hits - a.hits)

writeFileSync(
  join(STORE_DIR, 'rolling-7d.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      days: rollingCache.days,
      sessionCount: rollingCache.sessionCount,
      promptCount: rollingCache.prompts.length,
      prompts: [...new Set(rollingCache.prompts)].slice(-50),
      conversationFlows: rollingCache.conversationFlows.slice(-5),
      topics: rollingTopics.slice(0, 10),
      categoryScores: rollingCache.categoryScores,
      // Quantitative signals only — judgment delegated to Haiku (classify-prompts.mjs)
      struggleSignals: rollingCache.struggleSignals,
    },
    null,
    2
  )
)

// ── Backfill from past days if today's data is thin ─────────
const MIN_PROMPTS = 5
const BACKFILL_DAYS = 7

if (daily.merged.promptSamples.length < MIN_PROMPTS) {
  for (let d = 1; d <= BACKFILL_DAYS; d++) {
    const pastDate = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const pastFile = join(SESSIONS_DIR, `${pastDate}.json`)
    if (!existsSync(pastFile)) continue
    try {
      const pastDaily = JSON.parse(readFileSync(pastFile, 'utf8'))
      // Merge past category scores (lower weight)
      for (const [cat, score] of Object.entries(pastDaily.merged.categoryScores)) {
        daily.merged.categoryScores[cat] = (daily.merged.categoryScores[cat] || 0) + Math.round(Number(score) * 0.5)
      }
      // Merge past topics
      for (const t of pastDaily.merged.topics) {
        const existing = daily.merged.topics.find((e) => e.topic === t.topic)
        if (existing) existing.hits = Math.max(existing.hits, Math.round(t.hits * 0.5))
        else daily.merged.topics.push({ topic: t.topic, hits: Math.round(t.hits * 0.5) })
      }
      // Backfill prompt samples
      const pastPrompts = (pastDaily.merged.promptSamples || []).slice(-5)
      daily.merged.promptSamples.push(...pastPrompts)
      if (daily.merged.promptSamples.length >= MIN_PROMPTS * 2) break
    } catch {
      /* skip corrupt file */
    }
  }
  daily.merged.topics.sort((a, b) => b.hits - a.hits)
}

// ── Generate recommendation URL ────────────────────────────
// Skip when called from /recommend skill (--scan-all-today) — the skill writes its own output with AI-generated reasons
// Top 3 categories → pick 5 question IDs each
try {
  if (scanAllToday) throw new Error('skip')
  const quizPath = join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'src/data/quizzes.json')
  if (existsSync(quizPath)) {
    const quizData = JSON.parse(readFileSync(quizPath, 'utf8'))
    const allQ = quizData.quizzes
    const ids = []
    const sorted = Object.entries(daily.merged.categoryScores)
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1])

    for (const [cat] of sorted.slice(0, 3)) {
      const pool = allQ.filter((q) => q.category === cat).sort(() => Math.random() - 0.5)
      ids.push(...pool.slice(0, 5).map((q) => q.id))
    }
    // Add 3 beginner from unused categories
    const unused = Object.entries(daily.merged.categoryScores)
      .filter(([, s]) => s === 0)
      .map(([c]) => c)
    for (const cat of unused.slice(0, 2)) {
      const pool = allQ.filter((q) => q.category === cat && q.difficulty === 'beginner').sort(() => Math.random() - 0.5)
      ids.push(...pool.slice(0, 3).map((q) => q.id))
    }

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
          topCategories: sorted.slice(0, 3).map(([c]) => c),
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
