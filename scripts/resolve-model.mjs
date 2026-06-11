#!/usr/bin/env node
/**
 * Model availability resolver for the quiz fix loop.
 *
 * 優先チェーン（例: fable → opus → sonnet）を順にプローブし、
 * 最初に利用可能なモデル名を返す。`claude -p` を1回小さく実行して
 * 可用性を決定論的に確認し、結果を 24h キャッシュする。
 *
 * 用途:
 *   - quiz-refine / quality-loop の判定層モデル選択（Fable 5 第一候補）。
 *     Agent ツール起動前の事前解決に使う。なお verify-category-headless.mjs と
 *     audit-critical-quiz.mjs は実行時フォールバックチェーンを各自内蔵しており、
 *     本スクリプトの事前解決は必須ではない
 *
 * キャッシュ: 利用可能（positive）は 24h、利用不可（negative）は 1h で失効。
 * 一時的なタイムアウト・ネットワーク断で長時間下位モデルに固定されるのを防ぐ。
 *
 * Usage (CLI):
 *   node scripts/resolve-model.mjs fable opus sonnet   # → "fable" 等を stdout に出力
 *   node scripts/resolve-model.mjs --no-cache fable opus
 *   node scripts/resolve-model.mjs --status            # キャッシュ内容を表示
 *
 * Usage (import):
 *   import { resolveModel, probeModel } from './resolve-model.mjs'
 *   const model = resolveModel(['fable', 'opus', 'sonnet'])
 *
 * Exit codes:
 *   0: 利用可能なモデルが見つかった（stdout にモデル名）
 *   1: チェーン全滅（呼び出し側は決定論的 lint のみへ縮退する）
 *   2: 引数エラー
 */

import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TMP_DIR = join(ROOT, '.claude', 'tmp')
const CACHE_FILE = join(TMP_DIR, 'model-availability.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h（positive: 利用可能）
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000 // 1h（negative: 一時障害の可能性があるため短く）
const PROBE_TIMEOUT_MS = 90_000

function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveCache(cache) {
  mkdirSync(TMP_DIR, { recursive: true })
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
}

/**
 * モデルが利用可能か `claude -p` の最小実行で確認する。
 * @param {string} model - モデル名（fable / opus / sonnet / haiku / フルID）
 * @param {{ useCache?: boolean }} opts
 * @returns {boolean}
 */
export function probeModel(model, opts = {}) {
  const useCache = opts.useCache !== false
  const cache = loadCache()
  const entry = cache[model]

  if (useCache && entry) {
    const ttl = entry.available ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS
    if (Date.now() - entry.checkedAt < ttl) {
      return entry.available
    }
  }

  let available = false
  let error = null
  try {
    execFileSync('claude', ['-p', 'Reply with exactly: ok', '--model', model, '--output-format', 'text'], {
      timeout: PROBE_TIMEOUT_MS,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    available = true
  } catch (err) {
    error = (err.stderr || err.message || '').slice(0, 200)
  }

  cache[model] = { available, checkedAt: Date.now(), ...(error ? { error } : {}) }
  saveCache(cache)
  return available
}

/**
 * 優先チェーンから最初に利用可能なモデルを返す。全滅なら null。
 * @param {string[]} chain - 優先順のモデル名リスト
 * @param {{ useCache?: boolean, log?: (msg: string) => void }} opts
 * @returns {string | null}
 */
export function resolveModel(chain, opts = {}) {
  const noop = () => undefined
  const log = opts.log || noop
  for (const model of chain) {
    if (probeModel(model, opts)) {
      log(`resolve-model: "${model}" available`)
      return model
    }
    log(`resolve-model: "${model}" unavailable, trying next`)
  }
  return null
}

// ── CLI ─────────────────────────────────────────────────────

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const args = process.argv.slice(2)

  if (args.includes('--status')) {
    if (!existsSync(CACHE_FILE)) {
      console.log('No availability cache yet.')
      process.exit(0)
    }
    const cache = loadCache()
    for (const [model, entry] of Object.entries(cache)) {
      const age = Math.round((Date.now() - entry.checkedAt) / 60_000)
      console.log(`${model}: ${entry.available ? 'available' : 'UNAVAILABLE'} (checked ${age}m ago)`)
    }
    process.exit(0)
  }

  const useCache = !args.includes('--no-cache')
  const chain = args.filter((a) => !a.startsWith('--'))

  if (chain.length === 0) {
    console.error('Usage: node scripts/resolve-model.mjs [--no-cache] <model> [model...]')
    console.error('Example: node scripts/resolve-model.mjs fable opus sonnet')
    process.exit(2)
  }

  const model = resolveModel(chain, { useCache, log: (m) => console.error(m) })
  if (!model) {
    console.error(`resolve-model: no model in chain [${chain.join(', ')}] is available`)
    process.exit(1)
  }
  console.log(model)
}
