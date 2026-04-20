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

import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { KNOWN_NONEXISTENT_TERMS, NEGATION_MARKERS } from './topic-config.mjs'

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
    envVars: new Map(), // term → Set of question IDs
    slashCmds: new Map(),
    cliFlags: new Map(),
    hookEvents: new Map(),
    toolNames: new Map(),
    configKeys: new Map(),
  }

  const ENV_RE =
    /`(CLAUDE_[A-Z_]+|MAX_[A-Z_]+|MCP_[A-Z_]+|BASH_[A-Z_]+|USE_[A-Z_]+|ANTHROPIC_[A-Z_]+|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|DISABLE_[A-Z_]+)`/g
  const SLASH_RE = /`\/([\w-]+)`/g
  const FLAG_RE = /`(--[\w-]+(?:=\S+)?)`/g
  const HOOK_RE =
    /`(PreToolUse|PostToolUse|PostToolUseFailure|UserPromptSubmit|SessionStart|SessionEnd|Stop|SubagentStart|SubagentStop|Notification|PermissionRequest|TeammateIdle|TaskCompleted|ConfigChange|WorktreeCreate)`/g
  const TOOL_RE =
    /`(Bash|Read|Write|Edit|Grep|Glob|WebFetch|WebSearch|NotebookEdit|TodoWrite|AskUserQuestion|Task|Agent)`/g
  const CONFIG_RE =
    /`(allowed-tools|allowedTools|defaultMode|allowManagedHooksOnly|permissions\.deny|permissions\.allow|spinnerVerbs\.mode|spinnerVerbs\.verbs|spinnerVerbs|deniedMcpServers|allowedMcpServers|alwaysThinkingEnabled|availableModels|hookSpecificOutput|autoMemoryEnabled|sandbox\.autoAllowBashIfSandboxed|apiKeyHelper|teammateModeConfig|fileSuggestion|companyAnnouncements|allowManagedHooksOnly|user-invocable|context:\s*fork|argument-hint)`/g

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
      // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
      while ((match = ENV_RE.exec(text)) !== null) {
        addTerm(terms.envVars, match[1], quiz.id)
      }

      SLASH_RE.lastIndex = 0
      // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
      while ((match = SLASH_RE.exec(text)) !== null) {
        addTerm(terms.slashCmds, '/' + match[1], quiz.id)
      }

      FLAG_RE.lastIndex = 0
      // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
      while ((match = FLAG_RE.exec(text)) !== null) {
        addTerm(terms.cliFlags, match[1], quiz.id)
      }

      HOOK_RE.lastIndex = 0
      // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
      while ((match = HOOK_RE.exec(text)) !== null) {
        addTerm(terms.hookEvents, match[1], quiz.id)
      }

      TOOL_RE.lastIndex = 0
      // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
      while ((match = TOOL_RE.exec(text)) !== null) {
        addTerm(terms.toolNames, match[1], quiz.id)
      }

      CONFIG_RE.lastIndex = 0
      // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
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

  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'))
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

// Quizzes that teach "X does not exist" have to quote X, so the
// term-not-in-docs check should not flag them. Negation pattern is
// centralized in topic-config.mjs for consistency with quiz-lint.mjs.
function isNegatedOccurrence(text, term) {
  const idx = text.indexOf(term)
  if (idx < 0) return false
  const window = text.slice(Math.max(0, idx - 40), idx + term.length + 40)
  return NEGATION_MARKERS.test(window)
}

// Returns true if every occurrence of term across the given quizzes sits in
// a negation window. Used to filter false-positive "term not in docs" flags.
function allOccurrencesNegated(term, quizIds, allQuizzesById) {
  for (const quizId of quizIds) {
    const quiz = allQuizzesById.get(quizId)
    if (!quiz) continue
    const fields = getAllTextFields(quiz)
    for (const field of fields) {
      if (!field.value || !field.value.includes(term)) continue
      if (!isNegatedOccurrence(field.value, term)) return false
    }
  }
  return true
}

// ============================================================
// Check and report
// ============================================================

function checkTerms(termMap, docs, label, quiet = false, allQuizzesById = null) {
  const found = []
  const notFound = []
  let negationSuppressed = 0

  for (const [term, quizIds] of termMap.entries()) {
    const pages = searchInDocs(docs, term)
    if (pages.length > 0) {
      found.push({ term, quizIds: [...quizIds], pages })
    } else if (allQuizzesById && allOccurrencesNegated(term, quizIds, allQuizzesById)) {
      // Every occurrence teaches "X does not exist" — suppress the flag.
      negationSuppressed++
    } else {
      notFound.push({ term, quizIds: [...quizIds] })
    }
  }

  if (!quiet) {
    console.log(`\n=== ${label} ===`)
    console.log(`  Total: ${termMap.size} unique terms`)
    console.log(`  Found in docs: ${found.length}`)
    console.log(`  NOT found in docs: ${notFound.length}`)

    if (negationSuppressed > 0) {
      console.log(`  Suppressed (negation context): ${negationSuppressed}`)
    }

    if (notFound.length > 0) {
      console.log(`\n  ⚠ Terms not found in cached documentation:`)
      for (const { term, quizIds } of notFound.sort((a, b) => a.term.localeCompare(b.term))) {
        console.log(`    ${term}`)
        console.log(
          `      Used in: ${quizIds.slice(0, 5).join(', ')}${quizIds.length > 5 ? ` (+${quizIds.length - 5} more)` : ''}`
        )
      }
    }
  }

  return { found: found.length, notFound: notFound.length, notFoundTerms: notFound, negationSuppressed }
}

// ============================================================
// Main
// ============================================================

const args = process.argv.slice(2)
const command = args.find((a) => !a.startsWith('--')) || 'all'
const jsonMode = args.includes('--json')
const validCommands = ['all', 'env', 'slash', 'flags', 'hooks', 'tools', 'config', 'known']
if (!validCommands.includes(command)) {
  console.log('Usage: node scripts/quiz-fact-check.mjs [all|env|slash|flags|hooks|tools|config|known] [--json]')
  process.exit(1)
}

const data = loadQuizzes()
const terms = extractTermsFromQuizzes(data.quizzes)
const docs = loadDocContent()
const allQuizzesById = new Map(data.quizzes.map((q) => [q.id, q]))

// ── Known-nonexistent-terms check ───────────────────────────────
// Separate from the term-not-in-docs sweep: these are features we've
// confirmed do NOT exist in Claude Code, so any positive mention in
// a quiz is a factual error.
function checkKnownNonexistent(quizzes, quiet = false) {
  const hits = []
  for (const entry of KNOWN_NONEXISTENT_TERMS) {
    for (const quiz of quizzes) {
      const fields = getAllTextFields(quiz)
      for (const field of fields) {
        if (!field.value || !field.value.includes(entry.term)) continue
        if (isNegatedOccurrence(field.value, entry.term)) continue
        // Skip distractor text: wrong answers are the natural place to list
        // nonexistent features. Only flag them in the correct answer, the
        // question stem, the explanation, or any wrongFeedback (feedback is
        // supposed to teach, so claiming a nonexistent feature there is wrong).
        const optMatch = field.key.match(/^options\[(\d+)\]\.text$/)
        if (optMatch) {
          const idx = Number(optMatch[1])
          if (idx !== quiz.correctIndex) continue
        }
        hits.push({ id: quiz.id, field: field.key, term: entry.term, reason: entry.reason })
      }
    }
  }
  if (!quiet) {
    console.log(`\n=== Known-Nonexistent Terms ===`)
    if (hits.length === 0) {
      console.log(`  ✓ No positive mentions of known-nonexistent features`)
    } else {
      console.log(`  ⚠ ${hits.length} positive mention(s) of features that do not exist:`)
      for (const h of hits) {
        console.log(`    ${h.id} [${h.field}]: "${h.term}" — ${h.reason}`)
      }
    }
  }
  return hits
}

if (!jsonMode) {
  console.log(`=== Quiz Fact-Check ===`)
  console.log(`Questions: ${data.quizzes.length}`)
  console.log(`Doc pages: ${Object.keys(docs).length}`)
}

let totalNotFound = 0
const jsonResults = {}

const checks = [
  ['env', terms.envVars, 'Environment Variables'],
  ['slash', terms.slashCmds, 'Slash Commands'],
  ['flags', terms.cliFlags, 'CLI Flags'],
  ['hooks', terms.hookEvents, 'Hook Events'],
  ['tools', terms.toolNames, 'Tool Names'],
  ['config', terms.configKeys, 'Config Keys'],
]

for (const [key, termMap, label] of checks) {
  if (command === 'all' || command === key) {
    const r = checkTerms(termMap, docs, label, jsonMode, allQuizzesById)
    totalNotFound += r.notFound
    if (jsonMode) {
      jsonResults[key] = r.notFoundTerms.map((t) => ({
        term: t.term,
        quizIds: t.quizIds,
        status: 'flagged',
        type: 'term-not-in-docs',
      }))
    }
  }
}

// Run known-nonexistent check (applies to "all" / "known" commands)
let knownHits = []
if (command === 'all' || command === 'known') {
  knownHits = checkKnownNonexistent(data.quizzes, jsonMode)
  if (jsonMode) {
    jsonResults.knownNonexistent = knownHits.map((h) => ({
      term: h.term,
      quizIds: [h.id],
      status: 'error',
      type: 'positive-mention-of-nonexistent',
      reason: h.reason,
      field: h.field,
    }))
  }
}

if (jsonMode) {
  console.log(JSON.stringify(jsonResults))
  process.exit(0)
}

console.log(`\n=== Summary ===`)
if (totalNotFound === 0 && knownHits.length === 0) {
  console.log('All extracted terms found in documentation and no positive mentions of nonexistent features.')
} else {
  if (totalNotFound > 0) {
    console.log(`${totalNotFound} term(s) not found in cached docs.`)
    console.log('Note: Terms may exist in docs not yet cached, or may be internal-only terms.')
    console.log('Run `npm run docs:fetch` to refresh the cache, then re-check.')
  }
  if (knownHits.length > 0) {
    console.log(`${knownHits.length} positive mention(s) of known-nonexistent features (factual errors).`)
  }
}
