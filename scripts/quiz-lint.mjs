#!/usr/bin/env node

/**
 * Quiz Lint & Auto-Fix Scripts
 *
 * LLM 検証の前に実行する機械的チェック＆自動修正。
 * 偽陽性の主要因であるバッククォート不足、URL不整合、用語ゆれを
 * 正規表現ベースで検出・修正し、LLM への検証負荷を削減する。
 *
 * Usage:
 *   node scripts/quiz-lint.mjs backtick           # バッククォート lint + 自動修正
 *   node scripts/quiz-lint.mjs backtick --dry-run  # 修正せずレポートのみ
 *   node scripts/quiz-lint.mjs url                 # referenceUrl アンカー検証
 *   node scripts/quiz-lint.mjs terminology         # 用語辞書チェック
 *   node scripts/quiz-lint.mjs all                 # 全チェック実行
 *   node scripts/quiz-lint.mjs all --dry-run       # 全チェック（修正なし）
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const QUIZ_PATH = resolve(ROOT, 'src/data/quizzes.json')
const DOCS_DIR = resolve(ROOT, '.claude/tmp/docs')

function loadQuizzes() {
  return JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
}

function saveQuizzes(data) {
  writeFileSync(QUIZ_PATH, JSON.stringify(data, null, 2) + '\n')
}

// ============================================================
// 1. Backtick Auto-Lint
// ============================================================

/**
 * Terms that should ALWAYS be wrapped in backticks when appearing
 * outside of an existing backtick span.
 *
 * Order matters: longer patterns are checked first to avoid partial matches.
 */

// Environment variables: UPPER_SNAKE_CASE with common prefixes
const ENV_VAR_PATTERN = /(?<!`)\b(CLAUDE_CODE_[A-Z_]+|CLAUDE_ENV_[A-Z_]+|CLAUDE_CONFIG_[A-Z_]+|MAX_[A-Z_]+|MCP_[A-Z_]+|BASH_[A-Z_]+|USE_[A-Z_]+|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|ANTHROPIC_[A-Z_]+)\b(?!`)/g

// CLI flags: --flag-name or -x (single letter)
const FLAG_PATTERN = /(?<!`|[-\w])(--[a-z][-a-z0-9]*(?:=\S+)?)(?!`|[-\w])/g

// Slash commands: /command-name
const SLASH_CMD_PATTERN = /(?<!`|[/\w])(\/(init|memory|compact|clear|rewind|status|model|config|hooks|login|logout|bug|review|terminal-setup|teleport|doctor|cost|vim|rename|todos|tasks|search|ide|project|help|mcp|diff|permissions|listen))(?![-\w]|`)/g

// File paths & config files — sorted by length descending to match longer paths first
// (prevents `CLAUDE.md` from matching inside `~/.claude/CLAUDE.md`)
const FILE_PATH_TERMS = [
  '~/.claude/settings.json', '~/.claude/CLAUDE.md',
  '~/.claude/commands/', '~/.claude/skills/',
  '.claude/settings.json', '.claude/commands/',
  '.claude/rules/', '.claude/skills/', '.claude/tmp/',
  'CLAUDE.local.md', 'CLAUDE.md',
  'settings.json', 'package.json',
  '.gitignore', '.clauderc', '.mcp.json',
].sort((a, b) => b.length - a.length)

// Hook event names (PascalCase)
const HOOK_EVENTS = [
  'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop', 'SubagentStop',
  'SessionStart', 'SessionEnd', 'Notification', 'PermissionRequest',
  'TeammateIdle', 'TaskCompleted', 'ConfigChange', 'WorktreeCreate',
]

// Built-in tool names (Agent/Task excluded — too many false positives with "Agent SDK" etc.)
const TOOL_NAMES = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch',
  'NotebookEdit', 'TodoWrite',
]

// Config keys (camelCase / kebab-case identifiers from settings)
// Sorted by length descending to match compound keys first (e.g., `spinnerVerbs.mode` before `spinnerVerbs`)
const CONFIG_KEYS = [
  'allowed-tools', 'allowedTools', 'context: fork', 'defaultMode',
  'allowManagedHooksOnly', 'permissions.deny', 'permissions.allow',
  'spinnerVerbs.mode', 'spinnerVerbs.verbs', 'spinnerVerbs',
  'deniedMcpServers', 'allowedMcpServers',
  'alwaysThinkingEnabled', 'availableModels', 'hookSpecificOutput',
].sort((a, b) => b.length - a.length)

// Keyboard shortcuts
const KEYBOARD_PATTERN = /(?<!`)((?:Ctrl|Shift|Alt|Option|Cmd|Meta)\+[A-Za-z0-9]+(?:\+[A-Za-z0-9]+)*)(?!`)/g

// CLI commands (full invocations) — longer patterns first to match greedily
const CLI_COMMANDS = [
  'git reset --hard', 'git worktree remove',
  'brew install --cask claude-code',
  'npm test', 'npm install', 'npm run', 'git commit', 'git push',
  'git stash', 'git reset', 'git worktree', 'claude --resume',
  'claude --continue', 'claude --review', 'claude --teleport',
  'claude install-mcp', 'nvm use',
]

/**
 * Check if a position is inside an existing backtick span.
 */
function isInsideBackticks(text, matchIndex) {
  let inBacktick = false
  for (let i = 0; i < matchIndex; i++) {
    if (text[i] === '`') inBacktick = !inBacktick
  }
  return inBacktick
}

/**
 * Wrap a term in backticks if not already wrapped.
 * Handles the common case where the term appears in running text.
 */
function wrapInBackticks(text, term) {
  // Escape special regex characters in the term
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(?<!\`)${escaped}(?!\`)`, 'g')

  return text.replace(pattern, (match, offset) => {
    if (isInsideBackticks(text, offset)) return match
    return `\`${match}\``
  })
}

function lintBackticks(quizzes, dryRun) {
  const fixes = []

  for (const quiz of quizzes) {
    const textFields = [
      { key: 'question', value: quiz.question },
      { key: 'explanation', value: quiz.explanation },
    ]

    // Add option texts and wrongFeedback
    quiz.options.forEach((opt, i) => {
      textFields.push({ key: `options[${i}].text`, value: opt.text })
      if (opt.wrongFeedback) {
        textFields.push({ key: `options[${i}].wrongFeedback`, value: opt.wrongFeedback })
      }
    })

    for (const field of textFields) {
      if (!field.value) continue
      let text = field.value
      let changed = false

      // 1. Environment variables
      text = text.replace(ENV_VAR_PATTERN, (match, varName, offset) => {
        if (isInsideBackticks(text, offset)) return match
        changed = true
        return `\`${varName}\``
      })

      // 2. CLI flags (--flag)
      // Run AFTER CLI commands (step 8) to avoid double-backticking.
      // Deferred to step 8b below.

      // 3. Slash commands
      const slashFixed = text.replace(SLASH_CMD_PATTERN, (match, cmd, _name, offset) => {
        if (isInsideBackticks(text, offset)) return match
        changed = true
        return `\`${cmd}\``
      })
      if (slashFixed !== text) text = slashFixed

      // 4. File paths (exact match)
      for (const filePath of FILE_PATH_TERMS) {
        const before = text
        text = wrapInBackticks(text, filePath)
        if (text !== before) changed = true
      }

      // 5. Hook events
      for (const event of HOOK_EVENTS) {
        const before = text
        // Only match standalone occurrences (word boundary)
        const pattern = new RegExp(`(?<!\`)\\b${event}\\b(?!\`)`, 'g')
        text = text.replace(pattern, (match, offset) => {
          if (isInsideBackticks(text, offset)) return match
          changed = true
          return `\`${match}\``
        })
        if (text !== before) changed = true
      }

      // 6. Built-in tools (only when clearly used as tool names, not prose)
      // Skip when inside quotes (e.g., "Edit|Write" matcher patterns)
      // Skip when followed by Japanese text suggesting prose context (e.g., "Bashコマンド")
      for (const tool of TOOL_NAMES) {
        const pattern = new RegExp(`(?<!\`|[A-Za-z]|["""])${tool}(?!\`|[A-Za-z]|["""])`, 'g')
        const before = text
        text = text.replace(pattern, (match, offset) => {
          if (isInsideBackticks(text, offset)) return match
          // Skip if inside a quoted string like "Edit|Write" (ASCII " and Unicode "")
          const textBefore = text.slice(0, offset)
          const textAfter = text.slice(offset + match.length)
          if (/["""][^"""]*$/.test(textBefore) && /^[^"""]*["""]/.test(textAfter)) {
            return match
          }
          changed = true
          return `\`${match}\``
        })
        if (text !== before) changed = true
      }

      // 7. Keyboard shortcuts (Ctrl+X, Shift+Tab, etc.)
      const kbFixed = text.replace(KEYBOARD_PATTERN, (match, shortcut, offset) => {
        if (isInsideBackticks(text, offset)) return match
        changed = true
        return `\`${shortcut}\``
      })
      if (kbFixed !== text) text = kbFixed

      // 8. CLI commands (full invocations — longer patterns first)
      for (const cmd of CLI_COMMANDS) {
        const before = text
        text = wrapInBackticks(text, cmd)
        if (text !== before) changed = true
      }

      // 8b. CLI flags (--flag) — runs after CLI commands to avoid splitting
      //     e.g., `git reset --hard` is already handled as one unit above
      const flagFixed = text.replace(FLAG_PATTERN, (match, flag, offset) => {
        if (flag === '--') return match
        if (isInsideBackticks(text, offset)) return match
        changed = true
        return `\`${flag}\``
      })
      if (flagFixed !== text) text = flagFixed

      // 9. Config keys
      for (const key of CONFIG_KEYS) {
        const before = text
        text = wrapInBackticks(text, key)
        if (text !== before) changed = true
      }

      if (changed) {
        fixes.push({
          id: quiz.id,
          field: field.key,
          before: field.value,
          after: text,
        })

        if (!dryRun) {
          // Apply fix
          if (field.key === 'question') {
            quiz.question = text
          } else if (field.key === 'explanation') {
            quiz.explanation = text
          } else if (field.key.startsWith('options[')) {
            const match = field.key.match(/options\[(\d+)\]\.(.+)/)
            if (match) {
              const idx = parseInt(match[1])
              const prop = match[2]
              quiz.options[idx][prop] = text
            }
          }
        }
      }
    }
  }

  return fixes
}

// ============================================================
// 2. referenceUrl Anchor Validation
// ============================================================

/**
 * Extract all H2/H3 anchors from cached doc files.
 * Anchors are generated from heading text (GitHub-style slugification).
 */
function extractDocAnchors() {
  const anchors = {} // page → Set of anchor slugs

  if (!existsSync(DOCS_DIR)) {
    console.log('  Warning: Doc cache not found. Run `npm run docs:fetch` first.')
    return anchors
  }

  const files = readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'))
  for (const file of files) {
    const page = file.replace('.md', '')
    const content = readFileSync(resolve(DOCS_DIR, file), 'utf8')
    const headingAnchors = new Set()

    // Extract headings and convert to slugs
    const headingRegex = /^#{1,3}\s+(.+)$/gm
    let match
    while ((match = headingRegex.exec(content)) !== null) {
      const heading = match[1].trim()
      const slug = slugify(heading)
      headingAnchors.add(slug)
    }

    anchors[page] = headingAnchors
  }

  return anchors
}

/**
 * GitHub-style slug generation from heading text.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // remove non-word chars except spaces and hyphens
    .replace(/\s+/g, '-')      // spaces to hyphens
    .replace(/-+/g, '-')       // collapse multiple hyphens
    .replace(/^-|-$/g, '')     // trim leading/trailing hyphens
}

function lintUrls(quizzes) {
  const docAnchors = extractDocAnchors()
  const issues = []

  if (Object.keys(docAnchors).length === 0) {
    return issues
  }

  for (const quiz of quizzes) {
    if (!quiz.referenceUrl) {
      issues.push({ id: quiz.id, type: 'missing-url', message: 'No referenceUrl' })
      continue
    }

    // Validate domain (code.claude.com for Claude Code docs, platform.claude.com for Agent SDK docs)
    const isCodeDocs = quiz.referenceUrl.startsWith('https://code.claude.com/docs/en/')
    const isPlatformDocs = quiz.referenceUrl.startsWith('https://platform.claude.com/docs/en/')
    if (!isCodeDocs && !isPlatformDocs) {
      issues.push({
        id: quiz.id,
        type: 'invalid-domain',
        message: `Unexpected domain: ${quiz.referenceUrl}`,
      })
      continue
    }

    // platform.claude.com URLs are valid but we can't check anchors (no local cache)
    if (isPlatformDocs) continue

    // Extract page and anchor
    const urlMatch = quiz.referenceUrl.match(/\/docs\/en\/([^#?]+)(?:#(.+))?/)
    if (!urlMatch) {
      issues.push({ id: quiz.id, type: 'malformed-url', message: `Cannot parse: ${quiz.referenceUrl}` })
      continue
    }

    const page = urlMatch[1]
    const anchor = urlMatch[2]

    // Check if page exists in our cache
    if (!docAnchors[page]) {
      issues.push({
        id: quiz.id,
        type: 'unknown-page',
        message: `Page "${page}" not in doc cache`,
        url: quiz.referenceUrl,
      })
      continue
    }

    // Check if anchor exists
    if (anchor && !docAnchors[page].has(anchor)) {
      // Try fuzzy match to suggest corrections
      const suggestions = [...docAnchors[page]]
        .filter(a => a.includes(anchor.split('-')[0]) || anchor.includes(a.split('-')[0]))
        .slice(0, 3)

      issues.push({
        id: quiz.id,
        type: 'invalid-anchor',
        message: `Anchor "#${anchor}" not found in "${page}"`,
        url: quiz.referenceUrl,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      })
    }
  }

  return issues
}

// ============================================================
// 3. Terminology Dictionary Check
// ============================================================

/**
 * Known incorrect terms → correct terms.
 * Built from known-issues.md and verified facts in MEMORY.md.
 */
const TERMINOLOGY_DICT = [
  // Official names
  { wrong: 'Azure Foundry', correct: 'Microsoft Foundry', caseInsensitive: false },
  // "Claude Code SDK" — skip if context is clearly historical (e.g., "旧称", "以前は")
  { wrong: 'Claude Code SDK', correct: 'Claude Agent SDK', caseInsensitive: false, skipIfHistorical: true },
  // Non-existent commands/features (only flag in explanation, not in wrong-answer options)
  { wrong: 'claude commit', correct: null, message: '`claude commit` サブコマンドは存在しません', skipWrongOptions: true },
  { wrong: /(?<!`)\/teleport(?!`)/, correct: null, message: '`/teleport` はスラッシュコマンドではなく `claude --teleport` CLIフラグです', skipWrongOptions: true },
  // Terminology precision
  { wrong: 'allowed_tools', correct: 'allowed-tools', caseInsensitive: false },
  // Common misspellings in Japanese context
  { wrong: 'Exntended Thinking', correct: 'Extended Thinking', caseInsensitive: false },
  // Deprecated terminology
  { wrong: /(?<!\w)Task\s+tool(?!\w)/i, correct: null, message: 'CLI では Agent ツールに改名済み（SDK の allowedTools では Task を使用）' },
]

function lintTerminology(quizzes) {
  const issues = []

  for (const quiz of quizzes) {
    // Determine which option indices are wrong answers
    const wrongOptionIndices = new Set()
    if (quiz.type === 'multi' && quiz.correctIndices) {
      quiz.options.forEach((_, i) => { if (!quiz.correctIndices.includes(i)) wrongOptionIndices.add(i) })
    } else {
      quiz.options.forEach((_, i) => { if (i !== quiz.correctIndex) wrongOptionIndices.add(i) })
    }

    const textFields = [
      { key: 'question', value: quiz.question, isWrongOption: false },
      { key: 'explanation', value: quiz.explanation, isWrongOption: false },
      ...quiz.options.map((opt, i) => ({
        key: `options[${i}].text`, value: opt.text, isWrongOption: wrongOptionIndices.has(i),
      })),
      ...quiz.options.map((opt, i) => opt.wrongFeedback ? ({
        key: `options[${i}].wrongFeedback`, value: opt.wrongFeedback, isWrongOption: wrongOptionIndices.has(i),
      }) : null).filter(Boolean),
    ]

    for (const field of textFields) {
      if (!field.value) continue

      for (const entry of TERMINOLOGY_DICT) {
        // Skip if this entry should not flag wrong answer options
        // (the term is intentionally used as an incorrect option)
        if (entry.skipWrongOptions && (field.isWrongOption || field.key.includes('wrongFeedback'))) {
          continue
        }

        let found = false
        let matchedText = ''

        if (entry.wrong instanceof RegExp) {
          const match = field.value.match(entry.wrong)
          if (match) {
            found = true
            matchedText = match[0]
          }
        } else {
          const searchText = entry.caseInsensitive === false
            ? field.value
            : field.value.toLowerCase()
          const searchTerm = entry.caseInsensitive === false
            ? entry.wrong
            : entry.wrong.toLowerCase()

          if (searchText.includes(searchTerm)) {
            found = true
            matchedText = entry.wrong
          }
        }

        // Skip historical references (e.g., "旧称：Claude Code SDK")
        if (found && entry.skipIfHistorical) {
          if (/旧称|以前は|formerly|previously|was called|renamed from/i.test(field.value)) {
            found = false
          }
        }

        if (found) {
          issues.push({
            id: quiz.id,
            field: field.key,
            type: entry.correct ? 'wrong-term' : 'invalid-term',
            found: matchedText,
            correct: entry.correct,
            message: entry.message || `"${matchedText}" → "${entry.correct}"`,
          })
        }
      }
    }
  }

  return issues
}

// ============================================================
// 4. Verification Report Pre-Processor
// ============================================================
// (Integrated into the diff output — filters known-issues from reports)

// Patterns from known-issues that are commonly false-positived by LLM agents
const KNOWN_FALSE_POSITIVES = [
  // Backtick issues that are actually correct
  { pattern: /CLAUDE\.md.*backtick/i, reason: 'CLAUDE.md backtick style is project convention' },
  // These env vars have documented =0 behavior
  { pattern: /DISABLE_AUTO_MEMORY.*=0/i, reason: 'CLAUDE_CODE_DISABLE_AUTO_MEMORY=0 is documented (forces on)' },
]

/**
 * Filter a verification report JSON to remove known false positives.
 * Used as a post-processor after sub-agent verification.
 */
function filterReport(reportPath) {
  if (!existsSync(reportPath)) {
    console.log(`Report file not found: ${reportPath}`)
    return
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'))
  if (!Array.isArray(report.issues)) {
    console.log('No issues array found in report')
    return
  }

  const before = report.issues.length
  report.issues = report.issues.filter(issue => {
    const text = JSON.stringify(issue)
    for (const fp of KNOWN_FALSE_POSITIVES) {
      if (fp.pattern.test(text)) {
        return false
      }
    }
    return true
  })

  const filtered = before - report.issues.length
  if (filtered > 0) {
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
    console.log(`Filtered ${filtered} known false positives from ${reportPath}`)
  }

  return { before, after: report.issues.length, filtered }
}

// ============================================================
// Output Formatting
// ============================================================

function printBacktickReport(fixes) {
  if (fixes.length === 0) {
    console.log('  No backtick issues found.')
    return
  }

  // Group by question ID
  const byId = {}
  for (const fix of fixes) {
    if (!byId[fix.id]) byId[fix.id] = []
    byId[fix.id].push(fix)
  }

  console.log(`  ${fixes.length} fixes in ${Object.keys(byId).length} questions:\n`)

  for (const [id, idFixes] of Object.entries(byId)) {
    console.log(`  ${id}:`)
    for (const fix of idFixes) {
      // Show a compact diff
      const beforeSnip = fix.before.length > 80 ? fix.before.slice(0, 77) + '...' : fix.before
      const afterSnip = fix.after.length > 80 ? fix.after.slice(0, 77) + '...' : fix.after
      console.log(`    ${fix.field}:`)
      console.log(`      - ${beforeSnip}`)
      console.log(`      + ${afterSnip}`)
    }
  }
}

function printUrlReport(issues) {
  if (issues.length === 0) {
    console.log('  All referenceUrls are valid.')
    return
  }

  console.log(`  ${issues.length} URL issues:\n`)
  for (const issue of issues) {
    console.log(`  ${issue.id}: [${issue.type}] ${issue.message}`)
    if (issue.suggestions) {
      console.log(`    Suggestions: ${issue.suggestions.map(s => '#' + s).join(', ')}`)
    }
  }
}

function printTerminologyReport(issues) {
  if (issues.length === 0) {
    console.log('  No terminology issues found.')
    return
  }

  console.log(`  ${issues.length} terminology issues:\n`)
  for (const issue of issues) {
    console.log(`  ${issue.id} [${issue.field}]: ${issue.message}`)
  }
}

// ============================================================
// Main
// ============================================================

const args = process.argv.slice(2)
const command = args[0] || 'all'
const dryRun = args.includes('--dry-run')

if (!['backtick', 'url', 'terminology', 'filter-report', 'all'].includes(command)) {
  console.log('Usage: node scripts/quiz-lint.mjs <command> [--dry-run]')
  console.log('Commands: backtick, url, terminology, filter-report <path>, all')
  process.exit(1)
}

const data = loadQuizzes()
let totalFixes = 0
let hasIssues = false

if (command === 'filter-report') {
  const reportPath = args[1]
  if (!reportPath) {
    console.log('Usage: node scripts/quiz-lint.mjs filter-report <path-to-report.json>')
    process.exit(1)
  }
  filterReport(reportPath)
  process.exit(0)
}

console.log('=== Quiz Lint ===\n')

if (command === 'backtick' || command === 'all') {
  console.log(`[Backtick] ${dryRun ? '(dry-run)' : '(auto-fix)'}`)
  const fixes = lintBackticks(data.quizzes, dryRun)
  printBacktickReport(fixes)
  totalFixes += fixes.length
  if (fixes.length > 0) hasIssues = true
  console.log()
}

if (command === 'url' || command === 'all') {
  console.log('[URL Anchors]')
  const urlIssues = lintUrls(data.quizzes)
  printUrlReport(urlIssues)
  if (urlIssues.length > 0) hasIssues = true
  console.log()
}

if (command === 'terminology' || command === 'all') {
  console.log('[Terminology]')
  const termIssues = lintTerminology(data.quizzes)
  printTerminologyReport(termIssues)
  if (termIssues.length > 0) hasIssues = true
  console.log()
}

// Save if backtick fixes were applied (not dry-run)
if (totalFixes > 0 && !dryRun && (command === 'backtick' || command === 'all')) {
  saveQuizzes(data)
  console.log(`Saved ${totalFixes} backtick fixes to quizzes.json`)
}

// Summary
console.log('=== Summary ===')
if (hasIssues) {
  console.log(`Issues found. ${dryRun ? 'Run without --dry-run to auto-fix backticks.' : ''}`)
} else {
  console.log('All checks passed.')
}
