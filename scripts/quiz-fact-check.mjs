#!/usr/bin/env node

/**
 * Quiz Fact-Check Script
 *
 * クイズデータから技術用語（環境変数、スラッシュコマンド、CLIフラグ、Hookイベント、ツール名）を
 * 抽出し、キャッシュ済みドキュメントと照合して未検証の用語を検出する。
 *
 * Usage:
 *   node scripts/quiz-fact-check.mjs              # 全チェック
 *   node scripts/quiz-fact-check.mjs env           # 環境変数のみ
 *   node scripts/quiz-fact-check.mjs slash         # スラッシュコマンドのみ
 *   node scripts/quiz-fact-check.mjs flags         # CLIフラグのみ
 *   node scripts/quiz-fact-check.mjs hooks         # Hookイベントのみ
 *   node scripts/quiz-fact-check.mjs tools         # ツール名のみ
 *   node scripts/quiz-fact-check.mjs config        # 設定キーのみ
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const QUIZ_PATH = resolve(ROOT, 'src/data/quizzes.json')
const DOCS_DIR = resolve(ROOT, '.claude/tmp/docs')

// ============================================================
// Extract terms from quiz data
// ============================================================

function loadQuizzes() {
  return JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
}

function getAllTextFields(quiz) {
  const fields = []
  fields.push({ key: 'question', value: quiz.question })
  fields.push({ key: 'explanation', value: quiz.explanation })
  quiz.options.forEach((opt, i) => {
    fields.push({ key: `options[${i}].text`, value: opt.text })
    if (opt.wrongFeedback) {
      fields.push({ key: `options[${i}].wrongFeedback`, value: opt.wrongFeedback })
    }
  })
  return fields
}

function extractTermsFromQuizzes(quizzes) {
  const terms = {
    envVars: new Map(),      // term → Set of question IDs
    slashCmds: new Map(),
    cliFlags: new Map(),
    hookEvents: new Map(),
    toolNames: new Map(),
    configKeys: new Map(),
  }

  const ENV_RE = /`(CLAUDE_[A-Z_]+|MAX_[A-Z_]+|MCP_[A-Z_]+|BASH_[A-Z_]+|USE_[A-Z_]+|ANTHROPIC_[A-Z_]+|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|DISABLE_[A-Z_]+)`/g
  const SLASH_RE = /`\/([\w-]+)`/g
  const FLAG_RE = /`(--[\w-]+(?:=\S+)?)`/g
  const HOOK_RE = /`(PreToolUse|PostToolUse|PostToolUseFailure|UserPromptSubmit|SessionStart|SessionEnd|Stop|SubagentStart|SubagentStop|Notification|PermissionRequest|TeammateIdle|TaskCompleted|ConfigChange|WorktreeCreate)`/g
  const TOOL_RE = /`(Bash|Read|Write|Edit|Grep|Glob|WebFetch|WebSearch|NotebookEdit|TodoWrite|AskUserQuestion|Task|Agent)`/g
  const CONFIG_RE = /`(allowed-tools|allowedTools|defaultMode|allowManagedHooksOnly|permissions\.deny|permissions\.allow|spinnerVerbs\.mode|spinnerVerbs\.verbs|spinnerVerbs|deniedMcpServers|allowedMcpServers|alwaysThinkingEnabled|availableModels|hookSpecificOutput|autoMemoryEnabled|sandbox\.autoAllowBashIfSandboxed|apiKeyHelper|teammateModeConfig|fileSuggestion|companyAnnouncements|allowManagedHooksOnly|user-invocable|context:\s*fork|argument-hint)`/g

  function addTerm(map, term, quizId) {
    if (!map.has(term)) map.set(term, new Set())
    map.get(term).add(quizId)
  }

  for (const quiz of quizzes) {
    const fields = getAllTextFields(quiz)
    for (const field of fields) {
      if (!field.value) continue
      const text = field.value

      let match
      ENV_RE.lastIndex = 0
      while ((match = ENV_RE.exec(text)) !== null) {
        addTerm(terms.envVars, match[1], quiz.id)
      }

      SLASH_RE.lastIndex = 0
      while ((match = SLASH_RE.exec(text)) !== null) {
        addTerm(terms.slashCmds, '/' + match[1], quiz.id)
      }

      FLAG_RE.lastIndex = 0
      while ((match = FLAG_RE.exec(text)) !== null) {
        addTerm(terms.cliFlags, match[1], quiz.id)
      }

      HOOK_RE.lastIndex = 0
      while ((match = HOOK_RE.exec(text)) !== null) {
        addTerm(terms.hookEvents, match[1], quiz.id)
      }

      TOOL_RE.lastIndex = 0
      while ((match = TOOL_RE.exec(text)) !== null) {
        addTerm(terms.toolNames, match[1], quiz.id)
      }

      CONFIG_RE.lastIndex = 0
      while ((match = CONFIG_RE.exec(text)) !== null) {
        addTerm(terms.configKeys, match[1].trim(), quiz.id)
      }
    }
  }

  return terms
}

// ============================================================
// Load and search documentation
// ============================================================

function loadDocContent() {
  if (!existsSync(DOCS_DIR)) {
    console.error('Error: Doc cache not found. Run `npm run docs:fetch` first.')
    process.exit(1)
  }

  const files = readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'))
  const content = {}
  for (const file of files) {
    const page = file.replace('.md', '')
    content[page] = readFileSync(resolve(DOCS_DIR, file), 'utf8')
  }
  return content
}

function searchInDocs(docs, term) {
  const results = []
  for (const [page, content] of Object.entries(docs)) {
    if (content.includes(term)) {
      results.push(page)
    }
  }
  return results
}

// ============================================================
// Check and report
// ============================================================

function checkTerms(termMap, docs, label) {
  const found = []
  const notFound = []

  for (const [term, quizIds] of termMap.entries()) {
    const pages = searchInDocs(docs, term)
    if (pages.length > 0) {
      found.push({ term, quizIds: [...quizIds], pages })
    } else {
      notFound.push({ term, quizIds: [...quizIds] })
    }
  }

  console.log(`\n=== ${label} ===`)
  console.log(`  Total: ${termMap.size} unique terms`)
  console.log(`  Found in docs: ${found.length}`)
  console.log(`  NOT found in docs: ${notFound.length}`)

  if (notFound.length > 0) {
    console.log(`\n  ⚠ Terms not found in cached documentation:`)
    for (const { term, quizIds } of notFound.sort((a, b) => a.term.localeCompare(b.term))) {
      console.log(`    ${term}`)
      console.log(`      Used in: ${quizIds.slice(0, 5).join(', ')}${quizIds.length > 5 ? ` (+${quizIds.length - 5} more)` : ''}`)
    }
  }

  return { found: found.length, notFound: notFound.length, notFoundTerms: notFound }
}

// ============================================================
// Main
// ============================================================

const command = process.argv[2] || 'all'
const validCommands = ['all', 'env', 'slash', 'flags', 'hooks', 'tools', 'config']
if (!validCommands.includes(command)) {
  console.log('Usage: node scripts/quiz-fact-check.mjs [all|env|slash|flags|hooks|tools|config]')
  process.exit(1)
}

const data = loadQuizzes()
const terms = extractTermsFromQuizzes(data.quizzes)
const docs = loadDocContent()

console.log(`=== Quiz Fact-Check ===`)
console.log(`Questions: ${data.quizzes.length}`)
console.log(`Doc pages: ${Object.keys(docs).length}`)

let totalNotFound = 0

if (command === 'all' || command === 'env') {
  const r = checkTerms(terms.envVars, docs, 'Environment Variables')
  totalNotFound += r.notFound
}

if (command === 'all' || command === 'slash') {
  const r = checkTerms(terms.slashCmds, docs, 'Slash Commands')
  totalNotFound += r.notFound
}

if (command === 'all' || command === 'flags') {
  const r = checkTerms(terms.cliFlags, docs, 'CLI Flags')
  totalNotFound += r.notFound
}

if (command === 'all' || command === 'hooks') {
  const r = checkTerms(terms.hookEvents, docs, 'Hook Events')
  totalNotFound += r.notFound
}

if (command === 'all' || command === 'tools') {
  const r = checkTerms(terms.toolNames, docs, 'Tool Names')
  totalNotFound += r.notFound
}

if (command === 'all' || command === 'config') {
  const r = checkTerms(terms.configKeys, docs, 'Config Keys')
  totalNotFound += r.notFound
}

console.log(`\n=== Summary ===`)
if (totalNotFound === 0) {
  console.log('All extracted terms found in documentation.')
} else {
  console.log(`${totalNotFound} term(s) not found in cached docs.`)
  console.log('Note: Terms may exist in docs not yet cached, or may be internal-only terms.')
  console.log('Run `npm run docs:fetch` to refresh the cache, then re-check.')
}
