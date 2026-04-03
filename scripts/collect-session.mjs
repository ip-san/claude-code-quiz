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
import { basename, join } from 'path'

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

function analyzeTranscript(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean)
  const tools = {}
  const prompts = []

  for (const line of lines) {
    try {
      const j = JSON.parse(line)
      if (j.type === 'user' && j.message?.content) {
        const text =
          typeof j.message.content === 'string'
            ? j.message.content
            : j.message.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join(' ')
        if (text.length > 5) prompts.push(text)
      }
      if (j.message?.content && Array.isArray(j.message.content)) {
        for (const c of j.message.content) {
          if (c.type === 'tool_use') {
            tools[c.name] = (tools[c.name] || 0) + 1
            if (c.input?.command) prompts.push(c.input.command)
          }
        }
      }
    } catch {
      /* skip */
    }
  }

  // Score categories
  const allText = prompts.join(' ')
  const categoryScores = {}
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    categoryScores[cat] = keywords.reduce((score, kw) => {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return score + (allText.match(regex) || []).length
    }, 0)
  }

  // Detect topics
  const topics = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const hits = keywords.filter((kw) => allText.toLowerCase().includes(kw.toLowerCase())).length
    if (hits >= 1) topics.push({ topic, hits })
  }

  // Prompt samples (human-readable context)
  const promptSamples = prompts
    .filter(
      (p) =>
        p.length > 10 &&
        p.length < 200 &&
        !p.startsWith('node ') &&
        !p.startsWith('git ') &&
        !p.startsWith('ls ') &&
        !p.startsWith('cat ') &&
        !p.startsWith('grep ') &&
        !p.includes('<command-') &&
        !p.includes('<local-command') &&
        !p.includes('</') &&
        !/^[!/]/.test(p) // skip !commands and /slash-commands
    )
    .map((p) => p.trim())
    .slice(-20)

  return { tools, categoryScores, topics, promptSamples, promptCount: prompts.length }
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

// Convert topics back to array
daily.merged = {
  tools: merged.tools,
  categoryScores: merged.categoryScores,
  topics: Object.entries(merged.topics)
    .map(([topic, hits]) => ({ topic, hits }))
    .sort((a, b) => b.hits - a.hits),
  promptSamples: merged.promptSamples.slice(-30),
}

writeFileSync(dailyFile, JSON.stringify(daily, null, 2))

// ── Build rolling 7-day cache ──────────────────────────────
const ROLLING_DAYS = 7
const rollingCache = { prompts: [], topics: {}, categoryScores: {}, sessionCount: 0, days: [] }

for (let d = 0; d < ROLLING_DAYS; d++) {
  const dateStr = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const dayFile = join(SESSIONS_DIR, `${dateStr}.json`)
  if (!existsSync(dayFile)) continue
  try {
    const dayData = JSON.parse(readFileSync(dayFile, 'utf8'))
    const weight = d === 0 ? 1.0 : 0.7 - d * 0.08 // today=1.0, yesterday=0.62, 2d=0.54...
    rollingCache.days.push(dateStr)
    rollingCache.sessionCount += dayData.sessions.length
    // Prompts: more recent = more entries
    const maxPrompts = d === 0 ? 20 : Math.max(5, 15 - d * 2)
    rollingCache.prompts.push(...(dayData.merged.promptSamples || []).slice(-maxPrompts))
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
      prompts: rollingCache.prompts.slice(-50),
      topics: rollingTopics.slice(0, 10),
      categoryScores: rollingCache.categoryScores,
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
// Top 3 categories → pick 5 question IDs each
try {
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
    writeFileSync(
      join(STORE_DIR, 'latest-recommend.json'),
      JSON.stringify(
        {
          date: today,
          sessionCount: daily.sessions.length,
          questionCount: ids.length,
          ids,
          url,
          topCategories: sorted.slice(0, 3).map(([c]) => c),
          topics: daily.merged.topics.slice(0, 5),
          promptSamples: daily.merged.promptSamples.slice(-15),
        },
        null,
        2
      )
    )

    // Desktop notification
    const topTopics = daily.merged.topics
      .slice(0, 2)
      .map((t) => t.topic)
      .join('・')
    const msg = topTopics
      ? `${topTopics}に取り組んでいました。${ids.length}問の復習を用意しました`
      : `${ids.length}問の復習問題を用意しました`

    // Output for hook stderr (shown to user)
    console.error(`\n📚 ${msg}`)
    console.error(`   ${url}\n`)
  }
} catch {
  // Quiz data not available — just save session data
}
