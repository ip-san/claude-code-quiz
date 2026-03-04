#!/usr/bin/env node

/**
 * Documentation Pre-Cache Script
 *
 * Claude Code 公式ドキュメントを Jina Reader API 経由で一括取得し、
 * ローカルキャッシュに Markdown として保存する。
 * スキル実行時の WebFetch 重複呼び出しを排除し、検証・生成の高速化を実現。
 *
 * Usage:
 *   node scripts/fetch-docs.mjs                                  # 全ページ取得
 *   node scripts/fetch-docs.mjs --force                          # キャッシュを無視して再取得
 *   node scripts/fetch-docs.mjs --status                         # キャッシュ状態を表示
 *   node scripts/fetch-docs.mjs --pages memory,settings          # 指定ページのみ取得
 *   node scripts/fetch-docs.mjs --assemble <category>            # カテゴリ用ドキュメント組み立て (verify-targets.json 必要)
 *   node scripts/fetch-docs.mjs --assemble --pages hooks,mcp    # ページ指定で組み立て (verify-targets.json 不要)
 *
 * Output:
 *   .claude/tmp/docs/{page-name}.md
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync, rmSync } from 'fs'
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
  // Setext H2 (---) → ATX H2 — コードフェンス外のみ変換
  {
    const rawLines = text.split('\n')
    const normalizedLines = []
    let inCodeFence = false
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i]
      if (/^`{3,}/.test(line)) inCodeFence = !inCodeFence
      const nextLine = rawLines[i + 1]
      if (!inCodeFence && nextLine !== undefined && /^-{3,}$/.test(nextLine) && line.trim().length > 0) {
        normalizedLines.push('## ' + line)
        i++ // skip ---
        continue
      }
      normalizedLines.push(line)
    }
    text = normalizedLines.join('\n')
  }
  text = text.replace(/^(# .+)\s*-\s*Claude Code Docs\s*$/gm, '$1')
  text = text.replace(/\n{4,}/g, '\n\n')
  text = text.replace(/[ \t]+$/gm, '')
  text = text.trim()

  return text
}

// ====== Section Splitting ======

/**
 * GitHub 互換のアンカースラッグ生成
 */
function slugify(title) {
  return title.toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * H3 レベルで分割（大きな H2 セクション内部用）
 */
function splitAtH3(lines) {
  const sections = []
  let current = null
  let inFence = false

  for (const line of lines) {
    if (/^`{3,}/.test(line)) inFence = !inFence
    if (!inFence && line.startsWith('### ')) {
      if (current) sections.push(current)
      current = { title: line.slice(4).trim(), slug: slugify(line.slice(4).trim()), lines: [line] }
    } else if (current) {
      current.lines.push(line)
    }
    // H3 前のテキスト（H2 見出し直後の導入文等）は含めない
  }
  if (current) sections.push(current)
  return sections
}

/**
 * ドキュメントを H2 単位でセクションファイルに分割。
 * 20KB 超の H2 セクションは H3 レベルでさらに分割。
 *
 * @param {string} pageName - ページ名 (e.g. "hooks")
 * @param {string} markdown - cleanMarkdown 済みのテキスト
 * @param {string} sectionsDir - 出力先 (.claude/tmp/docs/sections/{pageName}/)
 * @returns {Array} セクションインデックス
 */
function splitDocIntoSections(pageName, markdown, sectionsDir) {
  // 既存ディレクトリをクリアして再作成
  rmSync(sectionsDir, { recursive: true, force: true })
  mkdirSync(sectionsDir, { recursive: true })

  const lines = markdown.split('\n')
  const rawSections = []
  let current = null
  let inFence = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^`{3,}/.test(line)) inFence = !inFence

    if (!inFence && line.startsWith('## ') && !line.startsWith('### ')) {
      if (current) rawSections.push(current)
      current = {
        title: line.slice(3).trim(),
        slug: slugify(line.slice(3).trim()),
        lines: [line],
      }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) rawSections.push(current)

  // 偽 H2 フィルタ（YAML キーワードやバッククォートで始まるもの）
  const YAML_PATTERN = /^(description:|command:|model:|tools:|  -|disallowedTools:|allowed-tools:|context:|disable-)/
  const realSections = rawSections.filter(s =>
    !s.title.startsWith('`') && !YAML_PATTERN.test(s.title) && s.slug.length > 0
  )

  if (realSections.length === 0) return []

  const H3_SPLIT_THRESHOLD = 20_000 // 20KB
  const index = []

  for (const section of realSections) {
    const content = section.lines.join('\n')
    const bytes = Buffer.byteLength(content, 'utf8')

    if (bytes > H3_SPLIT_THRESHOLD) {
      // H3 レベルで分割
      const h3Dir = resolve(sectionsDir, section.slug)
      mkdirSync(h3Dir, { recursive: true })

      const h3Sections = splitAtH3(section.lines)
      const h3Index = []

      for (const h3 of h3Sections) {
        const h3Content = h3.lines.join('\n')
        writeFileSync(resolve(h3Dir, h3.slug + '.md'), h3Content + '\n')
        h3Index.push({ slug: h3.slug, title: h3.title, chars: Buffer.byteLength(h3Content, 'utf8') })
      }

      writeFileSync(resolve(h3Dir, '_index.json'), JSON.stringify(h3Index, null, 2) + '\n')

      index.push({
        slug: section.slug,
        title: section.title,
        level: 2,
        chars: bytes,
        h3Split: true,
        h3Sections: h3Index.map(h => h.slug),
      })
    } else {
      writeFileSync(resolve(sectionsDir, section.slug + '.md'), content + '\n')
      index.push({ slug: section.slug, title: section.title, level: 2, chars: bytes })
    }
  }

  writeFileSync(resolve(sectionsDir, '_index.json'), JSON.stringify(index, null, 2) + '\n')
  return index
}

/**
 * 指定ドキュメントページの全セクションを読み込んで結合する内部関数。
 * セクションディレクトリが存在しない場合はフラットファイルにフォールバック。
 *
 * @param {string} docName - ページ名 (e.g. "hooks")
 * @param {string[]|'ALL'} selection - 読み込むセクションスラッグ、または 'ALL'
 * @returns {string[]} 結合用のコンテンツパーツ
 */
function readDocSections(docName, selection) {
  const parts = []
  const sectionsDir = resolve(DOCS_DIR, 'sections', docName)
  const indexPath = resolve(sectionsDir, '_index.json')

  // セクションディレクトリが存在しない場合はフラットファイルにフォールバック
  if (!existsSync(indexPath)) {
    const flatPath = resolve(DOCS_DIR, `${docName}.md`)
    if (existsSync(flatPath)) {
      const content = readFileSync(flatPath, 'utf8').replace(/^<!--.*?-->\n/gm, '').trim()
      parts.push(`--- ${docName} ---\n\n${content}`)
    }
    return parts
  }

  const index = JSON.parse(readFileSync(indexPath, 'utf8'))

  // 対象セクションを決定
  const slugsToInclude = selection === 'ALL'
    ? index.map(s => s.slug)
    : selection

  for (const slug of slugsToInclude) {
    const entry = index.find(s => s.slug === slug)
    if (!entry) continue

    if (entry.h3Split) {
      // H3 分割セクション: サブディレクトリの全ファイルを読む
      const h3Dir = resolve(sectionsDir, slug)
      const h3IndexPath = resolve(h3Dir, '_index.json')
      if (existsSync(h3IndexPath)) {
        const h3Index = JSON.parse(readFileSync(h3IndexPath, 'utf8'))
        for (const h3 of h3Index) {
          const h3Path = resolve(h3Dir, `${h3.slug}.md`)
          if (existsSync(h3Path)) {
            parts.push(readFileSync(h3Path, 'utf8').trim())
          }
        }
      }
    } else {
      const sectionPath = resolve(sectionsDir, `${slug}.md`)
      if (existsSync(sectionPath)) {
        parts.push(readFileSync(sectionPath, 'utf8').trim())
      }
    }
  }

  return parts
}

/**
 * カテゴリ用のドキュメントコンテンツを組み立てて stdout に出力。
 *
 * 2つのモード:
 * 1. カテゴリモード: verify-targets.json の categorySectionMap に従いセクション選択
 *    Usage: node scripts/fetch-docs.mjs --assemble <category>
 * 2. ページ指定モード: 指定ページの全セクションを結合（verify-targets.json 不要）
 *    Usage: node scripts/fetch-docs.mjs --assemble --pages hooks,settings,mcp
 */
function assembleDocContent(category, pageNames) {
  const parts = []

  if (pageNames) {
    // ページ指定モード: 各ページの全セクションを読み込み
    for (const pageName of pageNames) {
      parts.push(...readDocSections(pageName, 'ALL'))
    }
  } else {
    // カテゴリモード: verify-targets.json から categorySectionMap を取得
    const targetsPath = resolve(ROOT, '.claude/tmp/verify-targets.json')
    if (!existsSync(targetsPath)) {
      console.error('verify-targets.json not found. Run verify:diff first, or use --pages to specify pages directly.')
      process.exit(1)
    }

    const targets = JSON.parse(readFileSync(targetsPath, 'utf8'))
    const sectionMap = targets.categorySectionMap?.[category]

    if (!sectionMap) {
      console.error(`Category "${category}" not found in categorySectionMap.`)
      console.error(`Available: ${Object.keys(targets.categorySectionMap || {}).join(', ')}`)
      process.exit(1)
    }

    for (const [docName, selection] of Object.entries(sectionMap)) {
      parts.push(...readDocSections(docName, selection))
    }
  }

  if (parts.length === 0) {
    console.error('No content found. Check that docs are cached (npm run docs:fetch).')
    process.exit(1)
  }

  // 結合して出力
  process.stdout.write(parts.join('\n\n---\n\n') + '\n')
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

      // セクション分割
      const sectionsDir = resolve(DOCS_DIR, 'sections', page.name)
      const sectionIndex = splitDocIntoSections(page.name, markdown, sectionsDir)

      return { name: page.name, status: 'fetched', path: outPath, size: markdown.length, sections: sectionIndex.length }
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

  // --assemble: ドキュメントコンテンツを組み立てて stdout に出力
  // Mode 1: --assemble <category>        (categorySectionMap 経由、verify-targets.json 必要)
  // Mode 2: --assemble --pages a,b,c     (ページ直接指定、verify-targets.json 不要)
  if (args.includes('--assemble')) {
    const catIdx = args.indexOf('--assemble')
    const pagesIdx = args.indexOf('--pages', catIdx)

    if (pagesIdx !== -1) {
      // ページ指定モード
      const pagesStr = args[pagesIdx + 1]
      if (!pagesStr) {
        console.error('Usage: node scripts/fetch-docs.mjs --assemble --pages hooks,settings,mcp')
        process.exit(1)
      }
      const pageNames = pagesStr.split(',').map(s => s.trim())
      assembleDocContent(null, pageNames)
    } else {
      // カテゴリモード
      const category = args[catIdx + 1]
      if (!category || category.startsWith('--')) {
        console.error('Usage: node scripts/fetch-docs.mjs --assemble <category>')
        console.error('   or: node scripts/fetch-docs.mjs --assemble --pages hooks,settings')
        process.exit(1)
      }
      assembleDocContent(category, null)
    }
    return
  }

  // --split: 既存キャッシュのセクション分割のみ（再フェッチなし）
  if (args.includes('--split')) {
    console.log('Splitting cached docs into sections...\n')
    for (const page of DOC_PAGES) {
      const filePath = resolve(DOCS_DIR, `${page.name}.md`)
      if (!existsSync(filePath)) {
        console.log(`  [SKIP] ${page.name} (not cached)`)
        continue
      }
      const content = readFileSync(filePath, 'utf8')
      // メタデータヘッダーを除去
      const markdown = content.replace(/^<!--.*?-->\n/gm, '').trim()
      const sectionsDir = resolve(DOCS_DIR, 'sections', page.name)
      const index = splitDocIntoSections(page.name, markdown, sectionsDir)
      const h3Count = index.filter(s => s.h3Split).reduce((sum, s) => sum + s.h3Sections.length, 0)
      console.log(`  [SPLIT] ${page.name}: ${index.length} sections${h3Count ? ` (+${h3Count} H3)` : ''}`)
    }
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

  // Fetch in parallel batches of 5 (Jina rate limit: ~200 req/min)
  const BATCH_SIZE = 5
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
      await new Promise(r => setTimeout(r, 500))
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
      const secInfo = r.sections ? `, ${r.sections} sections` : ''
      console.log(`  [FETCHED] ${r.name} (${(r.size / 1024).toFixed(1)}KB${secInfo})`)
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
