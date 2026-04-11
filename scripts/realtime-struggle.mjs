/**
 * リアルタイム苦戦検出フック — PostToolUseFailure / PostToolUse / UserPromptSubmit 共用
 *
 * stdin から hook JSON を読み取り、苦戦シグナルを蓄積。
 * - PostToolUseFailure → JSON `reason`/`decision` で Claude にフィードバック
 * - PostToolUse → 成功時に consecutiveErrors リセット（出力なし）
 * - UserPromptSubmit → plain text stdout でユーザーにヒント表示
 *
 * 状態: ~/.claude-quiz-recommend/realtime-state.json
 */

import { execSync } from 'child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

import { FRUSTRATION_REGEX } from './topic-config.mjs'

// ── Constants ─────────────────────────────────────────────────

const STATE_DIR = join(homedir(), '.claude-quiz-recommend')
const STATE_FILE = join(STATE_DIR, 'realtime-state.json')
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours → new session

// Cooldowns (ms)
const COOLDOWN_STRONG_CLAUDE = 3 * 60 * 1000
const COOLDOWN_USER_TIP = 5 * 60 * 1000
const COOLDOWN_NOTIFICATION = 30 * 60 * 1000

// Warmup: skip first N prompts
const WARMUP_PROMPTS = 3

// ── State ─────────────────────────────────────────────────────

/** @returns {import('./realtime-struggle.mjs').StruggleState} */
export function loadState() {
  try {
    const raw = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    // Reset if stale session
    if (Date.now() - new Date(raw.updatedAt).getTime() > SESSION_TIMEOUT_MS) {
      return freshState()
    }
    return raw
  } catch {
    return freshState()
  }
}

export function freshState() {
  return {
    updatedAt: new Date().toISOString(),
    consecutiveErrors: 0,
    totalErrors: 0,
    frustrationHits: 0,
    promptCount: 0,
    recentPrompts: [],
    lastClaudeStrongAt: null,
    lastUserTipAt: null,
    lastNotificationAt: null,
  }
}

export function saveState(state) {
  state.updatedAt = new Date().toISOString()
  try {
    mkdirSync(STATE_DIR, { recursive: true })
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch {
    /* non-critical */
  }
}

// ── Detection Logic (pure, testable) ─────────────────────────

/**
 * PostToolUseFailure (Bash) handler: count errors and give Claude feedback.
 * PostToolUseFailure fires only on tool failure and provides `is_interrupt`.
 * Output is JSON for Claude feedback (hooks.md L1046-1051: `reason` / `decision`).
 *
 * @param {object} state - current struggle state
 * @param {object} hookInput - parsed stdin JSON from PostToolUseFailure
 * @returns {{ state: object, json: object | null }} updated state + JSON output for Claude
 */
export function handlePostToolUseFailure(state, hookInput) {
  // Skip user-interrupted tool calls (is_interrupt is PostToolUseFailure-only, hooks.md L1092)
  if (hookInput.is_interrupt) {
    return { state, json: null }
  }

  state.consecutiveErrors++
  state.totalErrors++

  // Check thresholds
  const now = Date.now()

  if (state.consecutiveErrors >= 3) {
    if (!state.lastClaudeStrongAt || now - new Date(state.lastClaudeStrongAt).getTime() > COOLDOWN_STRONG_CLAUDE) {
      state.lastClaudeStrongAt = new Date().toISOString()
      return {
        state,
        json: {
          decision: 'block',
          reason:
            '[苦戦検出] 連続エラー3回。現在のアプローチは機能していません。ステップバックして問題を再分析してください。',
        },
      }
    }
  } else if (state.consecutiveErrors >= 2) {
    // mild — no cooldown for Claude feedback
    return {
      state,
      json: {
        reason: '[苦戦検出] 連続エラー検出。別のアプローチを検討してください。',
      },
    }
  }

  return { state, json: null }
}

/**
 * PostToolUse (Bash) handler: reset consecutive errors on success.
 * PostToolUse fires only on successful tool completion (hooks.md L1017).
 *
 * @param {object} state - current struggle state
 * @returns {{ state: object }} updated state (no output)
 */
export function handlePostToolUseSuccess(state) {
  state.consecutiveErrors = 0
  return { state }
}

/**
 * UserPromptSubmit handler: detect frustration keywords & repeated prompts.
 * @param {object} state - current struggle state
 * @param {object} hookInput - parsed stdin JSON from UserPromptSubmit
 * @returns {{ state: object, output: string, notify: boolean }} updated state + stdout + notification flag
 */
export function handleUserPromptSubmit(state, hookInput) {
  const prompt = hookInput.prompt ?? ''

  // Skip slash commands, short prompts
  if (/^[!/]/.test(prompt) || prompt.length < 10) {
    return { state, output: '', notify: false }
  }

  state.promptCount++

  // Track recent prompts (keep last 10)
  const key = prompt.slice(0, 60).toLowerCase()
  state.recentPrompts.push(key)
  if (state.recentPrompts.length > 10) {
    state.recentPrompts = state.recentPrompts.slice(-10)
  }

  // Warmup: skip first N prompts
  if (state.promptCount <= WARMUP_PROMPTS) {
    return { state, output: '', notify: false }
  }

  // Detect frustration keywords
  if (FRUSTRATION_REGEX.test(prompt)) {
    state.frustrationHits++
  }

  // Detect repeated prompts (same text 3+ times)
  const counts = new Map()
  for (const p of state.recentPrompts) {
    counts.set(p, (counts.get(p) || 0) + 1)
  }
  const hasRepeated = [...counts.values()].some((c) => c >= 3)

  // Evaluate tier
  const now = Date.now()
  const isStrong = state.frustrationHits >= 3 || hasRepeated
  const isMild = state.frustrationHits >= 1 || state.consecutiveErrors >= 2

  if (isStrong) {
    let output = ''
    let notify = false

    if (!state.lastUserTipAt || now - new Date(state.lastUserTipAt).getTime() > COOLDOWN_USER_TIP) {
      state.lastUserTipAt = new Date().toISOString()
      output = hasRepeated
        ? '💡 同じ指示を繰り返しているようです。CLAUDE.md にルールを追加するか、別のアプローチを試してみてください。'
        : '💡 苦戦が続いています。/compact でコンテキストをリセットするか、問題を小さく分割してみてください。'
    }

    if (!state.lastNotificationAt || now - new Date(state.lastNotificationAt).getTime() > COOLDOWN_NOTIFICATION) {
      state.lastNotificationAt = new Date().toISOString()
      notify = true
    }

    return { state, output, notify }
  }

  if (isMild) {
    if (!state.lastUserTipAt || now - new Date(state.lastUserTipAt).getTime() > COOLDOWN_USER_TIP) {
      state.lastUserTipAt = new Date().toISOString()
      return {
        state,
        output: '💡 うまくいかない場合は、plan mode で方針を整理してみてください。',
        notify: false,
      }
    }
  }

  return { state, output: '', notify: false }
}

// ── Desktop Notification ──────────────────────────────────────

function sendNotification(title, body) {
  try {
    const safeTitle = title.replace(/"/g, '\\"')
    const safeBody = body.replace(/"/g, '\\"')
    execSync(`osascript -e 'display notification "${safeBody}" with title "${safeTitle}"'`, {
      timeout: 3000,
      stdio: 'ignore',
    })
  } catch {
    /* non-critical */
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  // Read stdin
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString()

  let hookInput
  try {
    hookInput = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  const state = loadState()
  const event = hookInput.hook_event_name

  if (event === 'PostToolUseFailure') {
    const result = handlePostToolUseFailure(state, hookInput)
    saveState(result.state)
    if (result.json) process.stdout.write(JSON.stringify(result.json))
  } else if (event === 'PostToolUse') {
    const result = handlePostToolUseSuccess(state)
    saveState(result.state)
  } else if (event === 'UserPromptSubmit') {
    const result = handleUserPromptSubmit(state, hookInput)
    saveState(result.state)
    if (result.output) process.stdout.write(result.output)
    if (result.notify) {
      sendNotification('Claude Code', '苦戦が検出されました。クイズで関連知識を確認しませんか？')
    }
  }
}

main().catch(() => process.exit(0))
