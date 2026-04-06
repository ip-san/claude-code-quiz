#!/usr/bin/env node
/**
 * スキルのベストプラクティスチェック
 *
 * 公式推奨: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
 * - 2,000 トークン以下（推奨。超過は警告）
 * - 500 行以下
 * - フロントマターに name + description 必須
 * - description は「いつ使うか」が明確
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const SKILLS_DIR = '.claude/skills'
const AGENTS_DIR = '.claude/agents'
const MAX_LINES = 500
const MAX_TOKENS = 2000 // official recommendation
const WARN_TOKENS = 3000 // soft limit for fork context skills

const errors = []
const warnings = []

// ── Check skills ─────────────────────────────────────────────
for (const dir of readdirSync(SKILLS_DIR)) {
  const skillFile = join(SKILLS_DIR, dir, 'SKILL.md')
  try {
    statSync(skillFile)
  } catch {
    continue
  }

  const content = readFileSync(skillFile, 'utf8')
  const lines = content.split('\n').length
  const tokens = Math.round(content.length / 4) // rough estimate

  // Frontmatter check
  if (!content.startsWith('---')) {
    errors.push(`${dir}: missing frontmatter`)
  } else {
    const fm = content.split('---')[1]
    if (!fm.includes('name:')) errors.push(`${dir}: missing 'name' in frontmatter`)
    if (!fm.includes('description:')) errors.push(`${dir}: missing 'description' in frontmatter`)
    if (!fm.includes('allowed-tools:')) warnings.push(`${dir}: no 'allowed-tools' (will have access to all tools)`)
  }

  // Size check
  const isFork = content.includes('context: fork')
  if (lines > MAX_LINES) {
    warnings.push(`${dir}: ${lines} lines (recommended: <${MAX_LINES}). Consider splitting.`)
  }
  if (!isFork && tokens > MAX_TOKENS) {
    warnings.push(
      `${dir}: ~${tokens} tokens in main context (recommended: <${MAX_TOKENS}). Consider 'context: fork' or splitting.`
    )
  }
  if (isFork && tokens > WARN_TOKENS) {
    // Fork context is more lenient but still worth noting
    warnings.push(`${dir}: ~${tokens} tokens (fork context, soft limit ${WARN_TOKENS})`)
  }
}

// ── Check agents ─────────────────────────────────────────────
for (const file of readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'))) {
  const content = readFileSync(join(AGENTS_DIR, file), 'utf8')
  const name = file.replace('.md', '')

  if (!content.startsWith('---')) {
    errors.push(`agent/${name}: missing frontmatter`)
  } else {
    const fm = content.split('---')[1]
    if (!fm.includes('name:')) errors.push(`agent/${name}: missing 'name'`)
    if (!fm.includes('description:')) errors.push(`agent/${name}: missing 'description'`)
    if (!fm.includes('model:')) warnings.push(`agent/${name}: no 'model' specified (will inherit parent)`)
  }
}

// ── Report ──────────────────────────────────────────────────
if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} error(s):`)
  for (const e of errors) console.error(`  - ${e}`)
}
if (warnings.length > 0) {
  console.warn(`\n⚠ ${warnings.length} warning(s):`)
  for (const w of warnings) console.warn(`  - ${w}`)
}
if (errors.length === 0 && warnings.length === 0) {
  console.log('✓ All skills and agents follow best practices')
}

process.exit(errors.length > 0 ? 1 : 0)
