#!/usr/bin/env node

/**
 * Classify SDK candidates
 *
 * quizzes.json をスキャンし、SDK & Platform カテゴリへの移動候補を出力する。
 *
 * Usage:
 *   node scripts/classify-sdk-candidates.mjs
 *   node scripts/classify-sdk-candidates.mjs --threshold 2  # スコア閾値
 *
 * Output:
 *   .claude/tmp/sdk-candidates.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const OUT_PATH = resolve(__dirname, '../.claude/tmp/sdk-candidates.json')

const args = process.argv.slice(2)
const threshold = Number(args[args.indexOf('--threshold') + 1] || 2)

// referenceUrl 由来の決定的シグナル（移動推奨）
const URL_MOVE_PATTERNS = [
  /agent-sdk/i,
  /\bsdk\//i,
  /messages-api/i,
  /\/messages\b/i,
  /console\.anthropic\.com/i,
  /workbench/i,
  /managed-agents/i,
  /prompt-caching/i,
]

// referenceUrl 由来の決定的シグナル（残留推奨）
const URL_KEEP_PATTERNS = [
  /\/settings/i,
  /server-managed-settings/i,
  /authentication/i,
  /llm-gateway/i,
  /microsoft-foundry/i,
  /\/costs/i,
  /env-vars/i,
  /third-party-integrations/i,
  /amazon-bedrock/i,
  /google-vertex/i,
  /network-config/i,
]

// 本文・選択肢で SDK っぽさを示すキーワード（スコア +1 ずつ）
const TEXT_KEYWORDS = [
  /Agent SDK/,
  /Anthropic API/i,
  /@anthropic-ai\/sdk/,
  /@anthropic-ai\/claude-agent-sdk/,
  /messages\.create/,
  /Anthropic Console/,
  /Workbench/i,
  /Managed Agents/i,
  /\bAPI キー\b/,
  /\bAPI Key\b/i,
  /Claude API/,
  /anthropic\.messages/,
  /allowedTools/i,
  /SDK 経由/,
  /SDK で/,
  /SDK の/,
]

// 本文に含まれていても Claude Code 文脈の可能性が高い（スコア -1）
const TEXT_NEGATIVE = [
  /Claude Code (?:CLI|を|の|で|が)/,
  /\/init\b/,
  /CLAUDE\.md/,
  /Slash command/i,
  /スラッシュコマンド/,
]

function loadQuizzes() {
  return JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
}

function ensureDir(p) {
  const d = dirname(p)
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

function collectText(q) {
  const parts = [q.question, q.explanation, ...(q.options || []).map((o) => o.text)]
  if (q.options) {
    for (const o of q.options) {
      if (o.wrongFeedback) parts.push(o.wrongFeedback)
    }
  }
  return parts.filter(Boolean).join('\n')
}

function classify(q) {
  const url = q.referenceUrl || ''
  const text = collectText(q)
  const signals = []
  let score = 0
  let urlMove = false
  let urlKeep = false

  for (const pat of URL_MOVE_PATTERNS) {
    if (pat.test(url)) {
      urlMove = true
      signals.push(`url-move:${pat.source}`)
    }
  }
  for (const pat of URL_KEEP_PATTERNS) {
    if (pat.test(url)) {
      urlKeep = true
      signals.push(`url-keep:${pat.source}`)
    }
  }
  for (const pat of TEXT_KEYWORDS) {
    if (pat.test(text)) {
      score += 1
      signals.push(`kw:${pat.source}`)
    }
  }
  for (const pat of TEXT_NEGATIVE) {
    if (pat.test(text)) {
      score -= 1
      signals.push(`neg:${pat.source}`)
    }
  }

  let recommendation
  if (urlMove && !urlKeep) recommendation = 'move'
  else if (urlKeep && !urlMove) recommendation = 'keep'
  else if (score >= threshold) recommendation = 'move'
  else if (score >= 1) recommendation = 'review'
  else recommendation = 'keep'

  return { score, signals, recommendation, urlMove, urlKeep }
}

function main() {
  const data = loadQuizzes()
  const candidates = []

  for (const q of data.quizzes) {
    const cls = classify(q)
    if (cls.recommendation === 'keep' && cls.score < 1 && !cls.urlMove) continue
    candidates.push({
      id: q.id,
      category: q.category,
      referenceUrl: q.referenceUrl || '',
      questionPreview: (q.question || '').slice(0, 80),
      score: cls.score,
      urlMove: cls.urlMove,
      urlKeep: cls.urlKeep,
      recommendation: cls.recommendation,
      signals: cls.signals,
      decision: cls.recommendation === 'move' ? 'move' : cls.recommendation === 'keep' ? 'keep' : '',
    })
  }

  candidates.sort((a, b) => {
    const order = { move: 0, review: 1, keep: 2, '': 1.5 }
    const ra = order[a.decision] ?? 1
    const rb = order[b.decision] ?? 1
    if (ra !== rb) return ra - rb
    return b.score - a.score
  })

  ensureDir(OUT_PATH)
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), threshold, count: candidates.length, candidates },
      null,
      2
    ) + '\n'
  )

  const counts = candidates.reduce((acc, c) => {
    acc[c.recommendation] = (acc[c.recommendation] || 0) + 1
    return acc
  }, {})
  console.log(`Wrote ${candidates.length} candidates to ${OUT_PATH}`)
  console.log(`Recommendations:`, counts)
  console.log(
    `\nNext: open ${OUT_PATH} and set 'decision' to 'move' or 'keep' for review entries, then run migrate-to-sdk.mjs`
  )
}

main()
