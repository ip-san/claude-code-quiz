#!/usr/bin/env node
/**
 * Claude Code のグローバル設定にレコメンド用フックを追加するセットアップスクリプト
 *
 * Usage:
 *   bun run setup:hooks          # フックを追加
 *   bun run setup:hooks --remove # フックを削除
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const CLAUDE_DIR = join(process.env.HOME || '', '.claude')
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json')
const SCRIPT_PATH = join(process.cwd(), 'scripts', 'collect-session.mjs')
const remove = process.argv.includes('--remove')

// ── Read existing settings ─────────────────────────────────
mkdirSync(CLAUDE_DIR, { recursive: true })

let settings = {}
if (existsSync(SETTINGS_PATH)) {
  try {
    settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'))
  } catch {
    console.error('⚠️  ~/.claude/settings.json の読み込みに失敗しました。手動で確認してください。')
    process.exit(1)
  }
}

if (!settings.hooks) settings.hooks = {}

// ── Hook definitions ───────────────────────────────────────
const HOOK_MARKER = 'claude-quiz-recommend'

const sessionStartHook = {
  type: 'command',
  command: `node ${SCRIPT_PATH} --scan-all-today`,
  timeout: 30,
  async: true,
  _marker: HOOK_MARKER,
}

const sessionEndHook = {
  type: 'command',
  command: `node ${SCRIPT_PATH}`,
  timeout: 30,
  async: true,
  _marker: HOOK_MARKER,
}

// ── Helper: filter out our hooks ───────────────────────────
function removeOurHooks(hookArray) {
  if (!Array.isArray(hookArray)) return hookArray
  return hookArray
    .map((entry) => {
      if (entry.hooks) {
        entry.hooks = entry.hooks.filter((h) => h._marker !== HOOK_MARKER)
        return entry.hooks.length > 0 ? entry : null
      }
      return entry
    })
    .filter(Boolean)
}

// ── Remove mode ────────────────────────────────────────────
if (remove) {
  if (settings.hooks.SessionStart) {
    settings.hooks.SessionStart = removeOurHooks(settings.hooks.SessionStart)
    if (settings.hooks.SessionStart.length === 0) delete settings.hooks.SessionStart
  }
  if (settings.hooks.SessionEnd) {
    settings.hooks.SessionEnd = removeOurHooks(settings.hooks.SessionEnd)
    if (settings.hooks.SessionEnd.length === 0) delete settings.hooks.SessionEnd
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n')
  console.log('✓ レコメンド用フックを削除しました')
  console.log(`  ファイル: ${SETTINGS_PATH}`)
  process.exit(0)
}

// ── Add mode ───────────────────────────────────────────────
// First remove old versions (idempotent)
if (settings.hooks.SessionStart) {
  settings.hooks.SessionStart = removeOurHooks(settings.hooks.SessionStart)
}
if (settings.hooks.SessionEnd) {
  settings.hooks.SessionEnd = removeOurHooks(settings.hooks.SessionEnd)
}

// Add SessionStart hook
if (!settings.hooks.SessionStart) settings.hooks.SessionStart = []
const existingStartEntry = settings.hooks.SessionStart.find((e) => e.hooks)
if (existingStartEntry) {
  existingStartEntry.hooks.push(sessionStartHook)
} else {
  settings.hooks.SessionStart.push({ hooks: [sessionStartHook] })
}

// Add SessionEnd hook
if (!settings.hooks.SessionEnd) settings.hooks.SessionEnd = []
const existingEndEntry = settings.hooks.SessionEnd.find((e) => e.hooks)
if (existingEndEntry) {
  existingEndEntry.hooks.push(sessionEndHook)
} else {
  settings.hooks.SessionEnd.push({ hooks: [sessionEndHook] })
}

writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n')

console.log('✓ レコメンド用フックをグローバル設定に追加しました')
console.log()
console.log('  設定ファイル: ' + SETTINGS_PATH)
console.log('  収集スクリプト: ' + SCRIPT_PATH)
console.log()
console.log('  SessionStart: 今日の全セッションをスキャン（非同期）')
console.log('  SessionEnd:   終了したセッションを収集（非同期）')
console.log()
console.log('  削除するには: bun run setup:hooks --remove')
