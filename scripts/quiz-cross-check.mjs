#!/usr/bin/env node

/**
 * Quiz Cross-Check Script
 *
 * クイズデータ内のクロスカテゴリ矛盾を検出する。
 * 同じ技術用語・機能に言及する複数の問題を比較し、
 * explanation/wrongFeedback間の矛盾を検出する。
 *
 * Usage:
 *   node scripts/quiz-cross-check.mjs              # 全チェック
 *   node scripts/quiz-cross-check.mjs --verbose     # 詳細出力
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')

function loadQuizzes() {
  return JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
}

function getAllTextFields(quiz) {
  const parts = [quiz.question, quiz.explanation]
  quiz.options.forEach((opt) => {
    parts.push(opt.text)
    if (opt.wrongFeedback) parts.push(opt.wrongFeedback)
  })
  return parts.filter(Boolean).join(' ')
}

// ============================================================
// 1. Topic Clustering — group questions by shared terms
// ============================================================

function buildTopicClusters(quizzes) {
  const clusters = new Map() // topic → [{ id, category, text }]

  // Key topics to cluster on
  const TOPIC_PATTERNS = [
    // Environment variables
    /`(CLAUDE_[A-Z_]+)`/g,
    /`(MAX_[A-Z_]+)`/g,
    /`(MCP_[A-Z_]+)`/g,
    /`(BASH_[A-Z_]+)`/g,
    /`(DISABLE_[A-Z_]+)`/g,
    // Slash commands
    /`(\/[\w-]+)`/g,
    // Config keys
    /`(allowManagedHooksOnly|defaultMode|allowed-tools|spinnerVerbs|permissions\.deny|permissions\.allow|apiKeyHelper)`/g,
    // Hook events
    /`(PreToolUse|PostToolUse|UserPromptSubmit|Stop|SubagentStop|SessionStart|Notification|PermissionRequest)`/g,
    // Features
    /`(Ctrl\+[A-Z]|Shift\+Tab|Alt\+[A-Z])`/g,
    // Tools
    /`(context:\s*fork)`/g,
  ]

  for (const quiz of quizzes) {
    const fullText = getAllTextFields(quiz)

    for (const pattern of TOPIC_PATTERNS) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(fullText)) !== null) {
        const topic = match[1].trim()
        if (!clusters.has(topic)) clusters.set(topic, [])
        // Avoid duplicate entries for same quiz
        const existing = clusters.get(topic)
        if (!existing.some((e) => e.id === quiz.id)) {
          existing.push({
            id: quiz.id,
            category: quiz.category,
            text: fullText,
          })
        }
      }
    }
  }

  return clusters
}

// ============================================================
// 2. Contradiction Detection — find conflicting claims
// ============================================================

// Patterns that indicate numeric claims
const NUMBER_CLAIM_PATTERNS = [
  /(\d+)つの(レベル|段階|種類|タイプ|値|カテゴリ|ステップ|モード|方法|オプション)/g,
  /(\d+)(種類|個|件|つ|段階)/g,
]

// Patterns that indicate factual claims about what something is/does
const FACTUAL_CLAIM_PATTERNS = [/(デフォルト(?:値)?(?:は|が))[^。]+/g, /(正しくは|正しい(?:値|名|名前|パス)は)[^。]+/g]

function detectContradictions(clusters) {
  const issues = []

  for (const [topic, entries] of clusters.entries()) {
    if (entries.length < 2) continue

    // Check for numeric contradictions
    const numericClaims = new Map() // "Nつのレベル" pattern → { claim, ids }

    for (const entry of entries) {
      for (const pattern of NUMBER_CLAIM_PATTERNS) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(entry.text)) !== null) {
          // Only count if the topic is nearby (within 100 chars)
          const topicIdx = entry.text.indexOf(topic)
          if (topicIdx !== -1 && Math.abs(match.index - topicIdx) < 200) {
            const claimKey = match[0].replace(/\d+/, 'N')
            const number = parseInt(match[1])
            if (!numericClaims.has(claimKey)) {
              numericClaims.set(claimKey, [])
            }
            numericClaims.get(claimKey).push({
              number,
              id: entry.id,
              context: entry.text.slice(Math.max(0, match.index - 30), match.index + match[0].length + 30),
            })
          }
        }
      }
    }

    // Report numeric contradictions
    for (const [claimKey, claims] of numericClaims.entries()) {
      const numbers = new Set(claims.map((c) => c.number))
      if (numbers.size > 1) {
        issues.push({
          topic,
          type: 'numeric-contradiction',
          message: `Different numeric claims: ${[...numbers].join(' vs ')}`,
          details: claims.map((c) => `  ${c.id}: "${c.context.trim()}"`),
        })
      }
    }

    // Check for assertion contradictions (X is Y vs X is Z)
    const defaultClaims = []
    for (const entry of entries) {
      for (const pattern of FACTUAL_CLAIM_PATTERNS) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(entry.text)) !== null) {
          const topicIdx = entry.text.indexOf(topic)
          if (topicIdx !== -1 && Math.abs(match.index - topicIdx) < 150) {
            defaultClaims.push({
              id: entry.id,
              claim: match[0].slice(0, 80),
            })
          }
        }
      }
    }

    // Only flag if there are multiple different claims about defaults
    if (defaultClaims.length >= 2) {
      const uniqueClaims = new Set(defaultClaims.map((c) => c.claim))
      if (uniqueClaims.size > 1) {
        issues.push({
          topic,
          type: 'factual-variation',
          message: `Multiple factual claims about "${topic}"`,
          details: defaultClaims.map((c) => `  ${c.id}: "${c.claim}"`),
        })
      }
    }
  }

  return issues
}

// ============================================================
// 3. Report
// ============================================================

const verbose = process.argv.includes('--verbose')
const data = loadQuizzes()
const quizzes = data.quizzes

console.log('=== Quiz Cross-Check ===')
console.log(`Questions: ${quizzes.length}\n`)

// Build clusters
const clusters = buildTopicClusters(quizzes)

// Filter to multi-question clusters
const multiClusters = [...clusters.entries()].filter(([, v]) => v.length >= 2)
console.log(`Topic clusters with 2+ questions: ${multiClusters.length}`)

if (verbose) {
  console.log('\n--- Topic Clusters ---')
  for (const [topic, entries] of multiClusters.sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  "${topic}" (${entries.length} questions):`)
    for (const e of entries) {
      console.log(`    ${e.id} [${e.category}]`)
    }
  }
}

// Detect contradictions
const issues = detectContradictions(clusters)

console.log(`\nContradictions detected: ${issues.length}`)

if (issues.length > 0) {
  console.log('\n--- Potential Contradictions ---')
  for (const issue of issues) {
    console.log(`\n  [${issue.type}] Topic: "${issue.topic}"`)
    console.log(`  ${issue.message}`)
    for (const detail of issue.details) {
      console.log(detail)
    }
  }
}

console.log('\n=== Summary ===')
if (issues.length === 0) {
  console.log('No cross-category contradictions detected.')
} else {
  console.log(`${issues.length} potential contradiction(s) found. Review manually.`)
  console.log('Note: Some "contradictions" may be valid context-dependent differences.')
}
