#!/usr/bin/env node
/**
 * Claude Code 利用履歴からクイズ問題をレコメンドするスクリプト
 *
 * Usage:
 *   bun run recommend          # 今日のセッションを解析
 *   bun run recommend 3        # 直近3日分を解析
 *   bun run recommend --all    # 全プロジェクトを解析
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { basename, join } from 'path'

// ── Config ─────────────────────────────────────────────────
const CLAUDE_DIR = join(process.env.HOME, '.claude')
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects')
const QUIZ_PATH = 'src/data/quizzes.json'

const args = process.argv.slice(2)
const daysBack = args.find((a) => /^\d+$/.test(a)) ? parseInt(args.find((a) => /^\d+$/.test(a))) : 1
const allProjects = args.includes('--all')
const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000

// ── Quiz data ──────────────────────────────────────────────
const quizData = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
const allQuestions = quizData.quizzes

// ── Category keyword mapping ───────────────────────────────
const categoryKeywords = {
  memory: [
    'CLAUDE.md',
    'claude.md',
    'memory',
    'MEMORY.md',
    '/memory',
    '/init',
    'rules/',
    '.claude/rules',
    '@import',
    'Compact Instructions',
  ],
  skills: [
    'skill',
    'SKILL.md',
    '/batch',
    '/loop',
    '/schedule',
    'context: fork',
    'frontmatter',
    'disable-model-invocation',
  ],
  tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebFetch', 'NotebookEdit', 'tool_use'],
  commands: [
    '/compact',
    '/clear',
    '/resume',
    '/model',
    '/context',
    '/branch',
    '/voice',
    '/rewind',
    '/teleport',
    '/stats',
    '/cost',
    'headless',
    'claude -p',
    '--bare',
  ],
  extensions: ['MCP', 'mcp', 'hook', 'Hook', 'plugin', 'subagent', 'Agent', 'sub-agent', 'Chrome', 'Slack'],
  session: [
    'context window',
    'コンテキスト',
    'token',
    'トークン',
    'compact',
    'checkpoint',
    'resume',
    'session',
    'fork',
    'worktree',
    'effort',
  ],
  keyboard: ['Ctrl+', 'Shift+', 'Alt+', 'Esc', 'Tab', 'shortcut', 'vim', 'keybind'],
  bestpractices: ['plan mode', 'Plan', 'verify', 'test', 'review', 'IMPORTANT', 'best practice', 'anti-pattern'],
}

// ── Topic extraction from prompts ──────────────────────────
const topicKeywords = {
  'CLAUDE.md の書き方': ['CLAUDE.md', 'claude.md', '/init', 'ルール', '指示', '書き方'],
  コンテキスト管理: ['コンテキスト', '/compact', '/clear', 'token', 'context', '圧縮', '溢れ'],
  MCP: ['MCP', 'mcp', 'サーバー', 'ツール連携', 'stdio'],
  Hooks: ['hook', 'Hook', 'フック', 'PreToolUse', 'PostToolUse', 'SessionStart'],
  サブエージェント: ['subagent', 'サブエージェント', 'Agent', 'worktree', '並列'],
  'Skills 作成': ['skill', 'SKILL.md', 'スキル', 'frontmatter'],
  デバッグ: ['debug', 'デバッグ', 'エラー', 'error', 'バグ', 'bug', '修正'],
  テスト: ['test', 'テスト', 'vitest', 'playwright', 'E2E'],
  'CI/CD': ['CI', 'GitHub Actions', 'deploy', 'デプロイ', 'pipeline'],
  セキュリティ: ['security', 'セキュリティ', 'permission', 'sandbox', '権限'],
  コスト管理: ['cost', 'コスト', '料金', 'max-turns', 'effort', 'pricing'],
}

// ── Analyze sessions ───────────────────────────────────────
function getSessionFiles() {
  const projectDirs = allProjects
    ? readdirSync(PROJECTS_DIR).map((d) => join(PROJECTS_DIR, d))
    : [join(PROJECTS_DIR, readdirSync(PROJECTS_DIR).find((d) => d.includes('claude-code-quiz')) || '')]

  const files = []
  for (const dir of projectDirs) {
    try {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.jsonl')) continue
        const path = join(dir, f)
        const stat = statSync(path)
        if (stat.mtimeMs > cutoff) {
          files.push(path)
        }
      }
    } catch {
      /* skip */
    }
  }
  return files
}

function analyzeSession(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean)

  const result = {
    prompts: [],
    tools: {},
    files: new Set(),
    errors: [],
    commands: [],
  }

  for (const line of lines) {
    try {
      const j = JSON.parse(line)

      // User prompts
      if (j.type === 'user' && j.message?.content) {
        const text =
          typeof j.message.content === 'string'
            ? j.message.content
            : j.message.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join(' ')
        if (text.length > 5) result.prompts.push(text)

        // Detect slash commands
        const cmd = text.match(/^\/(\w+)/)
        if (cmd) result.commands.push(cmd[1])
      }

      // Tool usage and file paths
      if (j.message?.content && Array.isArray(j.message.content)) {
        for (const c of j.message.content) {
          if (c.type === 'tool_use') {
            result.tools[c.name] = (result.tools[c.name] || 0) + 1
            if (c.input?.file_path) {
              result.files.add(basename(c.input.file_path))
            }
            if (c.input?.command) {
              result.prompts.push(c.input.command)
            }
          }
        }
      }
    } catch {
      /* skip */
    }
  }

  return result
}

// ── Score categories ───────────────────────────────────────
function scoreCategories(analysis) {
  const allText = [...analysis.prompts, ...analysis.files, ...Object.keys(analysis.tools), ...analysis.commands].join(
    ' '
  )

  const scores = {}
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = keywords.reduce((score, kw) => {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return score + (allText.match(regex) || []).length
    }, 0)
  }
  return scores
}

function detectTopics(analysis) {
  const allText = analysis.prompts.join(' ')
  const detected = []

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const hits = keywords.filter((kw) => allText.toLowerCase().includes(kw.toLowerCase())).length
    if (hits >= 1) detected.push({ topic, hits })
  }

  return detected.sort((a, b) => b.hits - a.hits)
}

// ── Recommend questions ────────────────────────────────────
function recommend(scores, topics) {
  const recs = []

  // 1. Questions from high-score categories (what you used today)
  const sortedCats = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  for (const [cat] of sortedCats.slice(0, 3)) {
    const catQuestions = allQuestions.filter((q) => q.category === cat)
    const sampled = catQuestions.sort(() => Math.random() - 0.5).slice(0, 5)
    recs.push(...sampled.map((q) => ({ ...q, reason: `今日 ${cat} を使ったため` })))
  }

  // 2. Questions from zero-score categories (what you DON'T use — discovery)
  const unusedCats = Object.entries(scores)
    .filter(([, s]) => s === 0)
    .map(([cat]) => cat)
  for (const cat of unusedCats.slice(0, 2)) {
    const catQuestions = allQuestions.filter((q) => q.category === cat && q.difficulty === 'beginner')
    const sampled = catQuestions.sort(() => Math.random() - 0.5).slice(0, 3)
    recs.push(...sampled.map((q) => ({ ...q, reason: `${cat} を使っていないため（発見のチャンス）` })))
  }

  // Deduplicate
  const seen = new Set()
  return recs.filter((q) => {
    if (seen.has(q.id)) return false
    seen.add(q.id)
    return true
  })
}

// ── Main ───────────────────────────────────────────────────
const sessionFiles = getSessionFiles()
if (sessionFiles.length === 0) {
  console.log('直近 ' + daysBack + ' 日間のセッションが見つかりません。')
  process.exit(0)
}

// Merge all sessions
const merged = { prompts: [], tools: {}, files: new Set(), errors: [], commands: [] }
for (const file of sessionFiles) {
  const a = analyzeSession(file)
  merged.prompts.push(...a.prompts)
  for (const [tool, count] of Object.entries(a.tools)) {
    merged.tools[tool] = (merged.tools[tool] || 0) + count
  }
  for (const f of a.files) merged.files.add(f)
  merged.errors.push(...a.errors)
  merged.commands.push(...a.commands)
}

const scores = scoreCategories(merged)
const topics = detectTopics(merged)
const recs = recommend(scores, topics)

// ── Output ─────────────────────────────────────────────────
console.log(`\n📊 Claude Code 利用分析（直近 ${daysBack} 日、${sessionFiles.length} セッション）\n`)

console.log('🔧 ツール使用:')
Object.entries(merged.tools)
  .sort((a, b) => b[1] - a[1])
  .forEach(([tool, count]) => console.log(`  ${tool}: ${count}回`))

console.log('\n📂 触ったトピック:')
if (topics.length > 0) {
  topics.forEach((t) => console.log(`  ${t.topic} (${t.hits}ヒット)`))
} else {
  console.log('  (検出なし)')
}

console.log('\n📈 カテゴリスコア:')
Object.entries(scores)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, score]) => {
    const bar = score > 0 ? '█'.repeat(Math.min(score, 20)) : '░'
    console.log(`  ${cat.padEnd(15)} ${bar} ${score}`)
  })

console.log(`\n🎯 レコメンド問題（${recs.length}問）:\n`)
recs.forEach((q, i) => {
  console.log(`${i + 1}. [${q.category}/${q.difficulty}] ${q.question.slice(0, 70)}`)
  console.log(`   理由: ${q.reason}`)
  console.log(`   ID: ${q.id}\n`)
})

// Output question IDs for programmatic use
const ids = recs.map((q) => q.id)
console.log('─'.repeat(60))
console.log(`クイズ開始URL: https://ip-san.github.io/claude-code-quiz/?ids=${ids.join(',')}`)
console.log(`IDリスト: ${ids.join(',')}`)
