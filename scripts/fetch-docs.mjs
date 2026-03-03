#!/usr/bin/env node

/**
 * Documentation Pre-Cache Script
 *
 * Claude Code 公式ドキュメントを Jina Reader API 経由で一括取得し、
 * ローカルキャッシュに Markdown として保存する。
 * スキル実行時の WebFetch 重複呼び出しを排除し、検証・生成の高速化を実現。
 *
 * Usage:
 *   node scripts/fetch-docs.mjs                          # 全ページ取得
 *   node scripts/fetch-docs.mjs --force                  # キャッシュを無視して再取得
 *   node scripts/fetch-docs.mjs --status                 # キャッシュ状態を表示
 *   node scripts/fetch-docs.mjs --pages memory,settings  # 指定ページのみ取得
 *
 * Output:
 *   .claude/tmp/docs/{page-name}.md
 */

import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DOCS_DIR = resolve(ROOT, '.claude/tmp/docs')

// Jina Reader API base URL
const JINA_READER_BASE = 'https://r.jina.ai/'

// All official doc pages
const DOC_PAGES = [
  // Core
  { name: 'overview', url: 'https://code.claude.com/docs/en/overview' },
  { name: 'quickstart', url: 'https://code.claude.com/docs/en/quickstart' },
  { name: 'settings', url: 'https://code.claude.com/docs/en/settings' },
  { name: 'memory', url: 'https://code.claude.com/docs/en/memory' },
  // Interactive & Tools
  { name: 'interactive-mode', url: 'https://code.claude.com/docs/en/interactive-mode' },
  { name: 'how-claude-code-works', url: 'https://code.claude.com/docs/en/how-claude-code-works' },
  // Extensions & Integration
  { name: 'mcp', url: 'https://code.claude.com/docs/en/mcp' },
  { name: 'hooks', url: 'https://code.claude.com/docs/en/hooks' },
  { name: 'discover-plugins', url: 'https://code.claude.com/docs/en/discover-plugins' },
  { name: 'sub-agents', url: 'https://code.claude.com/docs/en/sub-agents' },
  // Advanced
  { name: 'common-workflows', url: 'https://code.claude.com/docs/en/common-workflows' },
  { name: 'checkpointing', url: 'https://code.claude.com/docs/en/checkpointing' },
  { name: 'best-practices', url: 'https://code.claude.com/docs/en/best-practices' },
  { name: 'skills', url: 'https://code.claude.com/docs/en/skills' },
  { name: 'model-config', url: 'https://code.claude.com/docs/en/model-config' },
  { name: 'sandboxing', url: 'https://code.claude.com/docs/en/sandboxing' },
  // Supplementary (not for referenceUrl but useful for fact-checking)
  { name: 'permissions', url: 'https://code.claude.com/docs/en/permissions' },
  { name: 'cli-reference', url: 'https://code.claude.com/docs/en/cli-reference' },
  // Agent SDK (different domain)
  { name: 'agent-sdk-overview', url: 'https://platform.claude.com/docs/en/agent-sdk/overview' },
]

// Cache validity: 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Clean up Jina Reader markdown output.
 * Removes navigation, sidebar, and other noise while keeping main content.
 *
 * Strategy: Find the content boundary using setext H1 (===) or "On this page"
 * markers, then strip remaining UI artifacts.
 */
function cleanMarkdown(raw) {
  // Extract content after "Markdown Content:" header (Jina format)
  const contentMatch = raw.match(/Markdown Content:\s*\n([\s\S]+)/)
  let text = contentMatch ? contentMatch[1] : raw

  // === Phase 1: Find content boundary ===
  // Jina output typically: [ATX H1] [nav] [On this page] [setext H1] [content]

  // Strategy A: Find setext H1 (===) — most reliable boundary
  const h1Match = text.match(/^(.+)\n={3,}/m)
  if (h1Match) {
    const h1Index = text.indexOf(h1Match[0])
    // Only cut if there's significant nav noise before it (>200 chars)
    if (h1Index > 200) {
      text = text.slice(h1Index)
      text = text.replace(/^(.+)\n={3,}/, (_, title) => {
        const clean = title.replace(/\s*-\s*Claude Code Docs\s*$/, '').trim()
        return `# ${clean}`
      })
    }
  }

  // Strategy B: If still has nav noise, use "On this page" as boundary
  if (/\[Skip to main content\]/.test(text.slice(0, 500))) {
    const idx = text.indexOf('On this page')
    if (idx > 0) {
      const after = text.slice(idx)
      // Find first real content heading or paragraph after the ToC links
      const start = after.match(/\n(?:#{1,4}\s|[A-Z][a-z].*\S{10,})/)
      if (start) {
        text = after.slice(start.index + 1)
      }
    }
  }

  // === Phase 2: Remove remaining UI artifacts ===
  text = text.replace(/!\[Image \d+:.*?\]\(.*?\)/g, '')
  text = text.replace(/\[[\u200B\u200C\u200D\uFEFF]*\]\([^)]+\)\s*/g, '')
  text = text.replace(/^Copy page\s*$/gm, '')
  text = text.replace(/^Report incorrect code\s*$/gm, '')
  text = text.replace(/\[Skip to main content\]\([^)]+\)\s*/g, '')
  text = text.replace(/\[Claude Code Docs home page[^\]]*\]\([^)]+\)\s*/g, '')
  text = text.replace(/^(English|⌘K Ask AI|Search\.\.\.|Navigation)\s*$/gm, '')
  text = text.replace(/^#{5}\s+(Getting started|Core concepts|Platforms and integrations|Build with Claude Code|Deployment|Administration|Configuration|Reference|Resources)\s*$/gm, '')
  // Concatenated nav breadcrumbs
  text = text.replace(/^\[[\w\s]+\]\(https:\/\/(code|platform)\.claude\.com\/docs\/[^)]+\)(\[[\w\s]+\]\(https:\/\/(code|platform)\.claude\.com\/docs\/[^)]+\))+\s*$/gm, '')

  // Remove nav link lists (3+ consecutive doc links as bullet items)
  const lines = text.split('\n')
  const cleaned = []
  const buffer = []

  for (const line of lines) {
    const trimmed = line.trim()
    const isNavLink = /^\*\s+\[.*?\]\(https:\/\/(code|platform)\.claude\.com\/docs\//.test(trimmed)
      && !trimmed.includes('`') && trimmed.length < 200

    if (isNavLink) {
      buffer.push(line)
    } else {
      if (buffer.length < 3) cleaned.push(...buffer)
      buffer.length = 0
      cleaned.push(line)
    }
  }
  if (buffer.length < 3) cleaned.push(...buffer)

  text = cleaned.join('\n')

  // === Phase 3: Normalize ===
  text = text.replace(/^(.+)\n-{3,}$/gm, '## $1')
  text = text.replace(/^(# .+)\s*-\s*Claude Code Docs\s*$/gm, '$1')
  text = text.replace(/\n{4,}/g, '\n\n')
  text = text.replace(/[ \t]+$/gm, '')
  text = text.trim()

  return text
}

/**
 * Check if a cached file is still valid
 */
function isCacheValid(filePath) {
  if (!existsSync(filePath)) return false
  const stat = statSync(filePath)
  const size = stat.size
  // Must be non-trivial (> 1KB) and within TTL
  return size > 1024 && (Date.now() - stat.mtimeMs) < CACHE_TTL_MS
}

/**
 * Fetch a single page via Jina Reader with retry
 */
async function fetchPage(page, force = false) {
  const outPath = resolve(DOCS_DIR, `${page.name}.md`)

  if (!force && isCacheValid(outPath)) {
    const size = statSync(outPath).size
    return { name: page.name, status: 'cached', path: outPath, size }
  }

  const jinaUrl = `${JINA_READER_BASE}${page.url}`

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
        },
        signal: AbortSignal.timeout(60000),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }

      const raw = await res.text()
      const markdown = cleanMarkdown(raw)

      if (markdown.length < 100) {
        throw new Error(`Content too small (${markdown.length} chars) - likely failed to render`)
      }

      // Add metadata header
      const header = [
        `<!-- Cached: ${new Date().toISOString()} -->`,
        `<!-- Source: ${page.url} -->`,
        '',
      ].join('\n')

      writeFileSync(outPath, header + markdown + '\n')

      return { name: page.name, status: 'fetched', path: outPath, size: markdown.length }
    } catch (err) {
      if (attempt === 3) {
        return { name: page.name, status: 'error', error: err.message }
      }
      // Wait before retry (increasing backoff)
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
}

/**
 * Show cache status
 */
function showStatus() {
  console.log('Documentation Cache Status\n')
  console.log(`Cache dir: ${DOCS_DIR}`)
  console.log(`TTL: ${CACHE_TTL_MS / 1000 / 60 / 60}h\n`)

  if (!existsSync(DOCS_DIR)) {
    console.log('Cache directory does not exist. Run `npm run docs:fetch` first.')
    return
  }

  const now = Date.now()
  let cached = 0
  let expired = 0
  let missing = 0

  for (const page of DOC_PAGES) {
    const filePath = resolve(DOCS_DIR, `${page.name}.md`)
    if (!existsSync(filePath)) {
      console.log(`  [MISSING] ${page.name}`)
      missing++
    } else {
      const stat = statSync(filePath)
      const ageMs = now - stat.mtimeMs
      const ageH = (ageMs / 1000 / 60 / 60).toFixed(1)
      const sizeKB = (stat.size / 1024).toFixed(1)
      if (stat.size < 1024) {
        console.log(`  [EMPTY]   ${page.name} -- ${sizeKB}KB (too small, refetch needed)`)
        missing++
      } else if (ageMs < CACHE_TTL_MS) {
        console.log(`  [OK]      ${page.name} -- ${sizeKB}KB, ${ageH}h ago`)
        cached++
      } else {
        console.log(`  [EXPIRED] ${page.name} -- ${sizeKB}KB, ${ageH}h ago`)
        expired++
      }
    }
  }

  console.log(`\n${cached} cached, ${expired} expired, ${missing} missing/empty (${DOC_PAGES.length} total)`)
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--status')) {
    showStatus()
    return
  }

  const force = args.includes('--force')

  // --pages filter: only fetch specified pages (comma-separated)
  const pagesArg = args.find(a => a.startsWith('--pages'))
  let pagesToFetch = DOC_PAGES
  if (pagesArg) {
    // Support both --pages=a,b and --pages a,b
    let pageNames
    if (pagesArg.includes('=')) {
      pageNames = pagesArg.split('=')[1].split(',').map(s => s.trim())
    } else {
      const idx = args.indexOf('--pages')
      pageNames = (args[idx + 1] || '').split(',').map(s => s.trim())
    }
    pagesToFetch = DOC_PAGES.filter(p => pageNames.includes(p.name))
    if (pagesToFetch.length === 0) {
      console.error(`No matching pages found for: ${pageNames.join(', ')}`)
      console.error(`Available: ${DOC_PAGES.map(p => p.name).join(', ')}`)
      process.exit(1)
    }
  }

  mkdirSync(DOCS_DIR, { recursive: true })

  console.log(`Fetching ${pagesToFetch.length} documentation pages via Jina Reader...`)
  if (force) console.log('  (--force: ignoring cache)')
  if (pagesArg) console.log(`  (--pages: ${pagesToFetch.map(p => p.name).join(', ')})`)
  console.log()

  // Fetch in parallel batches of 3 (Jina rate limit: ~200 req/min)
  const BATCH_SIZE = 3
  const results = []

  for (let i = 0; i < pagesToFetch.length; i += BATCH_SIZE) {
    const batch = pagesToFetch.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(p => fetchPage(p, force)))
    results.push(...batchResults)

    // Progress indicator
    const done = Math.min(i + BATCH_SIZE, pagesToFetch.length)
    process.stdout.write(`\r  Progress: ${done}/${pagesToFetch.length}`)

    // Brief pause between batches
    if (i + BATCH_SIZE < pagesToFetch.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  console.log('\n')

  // Report results
  const fetched = results.filter(r => r.status === 'fetched')
  const cached = results.filter(r => r.status === 'cached')
  const errors = results.filter(r => r.status === 'error')

  console.log('Results:')
  for (const r of results) {
    if (r.status === 'fetched') {
      console.log(`  [FETCHED] ${r.name} (${(r.size / 1024).toFixed(1)}KB)`)
    } else if (r.status === 'cached') {
      console.log(`  [CACHED]  ${r.name} (${(r.size / 1024).toFixed(1)}KB)`)
    } else {
      console.log(`  [ERROR]   ${r.name}: ${r.error}`)
    }
  }

  console.log(`\n${fetched.length} fetched, ${cached.length} cached, ${errors.length} errors`)
  console.log(`Cache: ${DOCS_DIR}`)

  if (errors.length > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
