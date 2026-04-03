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
    .slice(-5)

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
  merged.promptSamples.push(...(sess.promptSamples || []).slice(-3))
}

// Convert topics back to array
daily.merged = {
  tools: merged.tools,
  categoryScores: merged.categoryScores,
  topics: Object.entries(merged.topics)
    .map(([topic, hits]) => ({ topic, hits }))
    .sort((a, b) => b.hits - a.hits),
  promptSamples: merged.promptSamples.slice(-10),
}

writeFileSync(dailyFile, JSON.stringify(daily, null, 2))

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
          promptSamples: daily.merged.promptSamples.slice(-5),
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
