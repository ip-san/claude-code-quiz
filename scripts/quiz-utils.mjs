#!/usr/bin/env node

/**
 * Quiz Utility Scripts
 *
 * クイズデータの操作・分析用ユーティリティ。
 * npm scripts から呼び出して使用する。
 *
 * Usage:
 *   node scripts/quiz-utils.mjs randomize         # correctIndex をランダム化
 *   node scripts/quiz-utils.mjs stats             # カテゴリ・難易度・参照ページの統計
 *   node scripts/quiz-utils.mjs coverage          # ドキュメントページ別カバレッジ
 *   node scripts/quiz-utils.mjs section-coverage  # セクションレベルのカバレッジギャップ分析
 *   node scripts/quiz-utils.mjs overlap           # 問題の重複・類似検出
 *   node scripts/quiz-utils.mjs check             # 品質チェック（テスト相当の簡易版）
 *   node scripts/quiz-utils.mjs edit              # ID指定でクイズフィールドを編集
 *   node scripts/quiz-utils.mjs merge-proposals   # skill-proposals → known-issues マージ
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')

function loadQuizzes() {
  return JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
}

function saveQuizzes(data) {
  writeFileSync(QUIZ_PATH, JSON.stringify(data, null, 2) + '\n')
}

// === Randomize correctIndex ===
function randomize() {
  const data = loadQuizzes()
  const seed = Date.now() % 100000
  let s = seed

  function seededRandom() {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }

  function shuffle(arr) {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  const counts = [0, 0, 0, 0]
  let multiCount = 0
  data.quizzes = data.quizzes.map((q) => {
    const optionIndices = Array.from({ length: q.options.length }, (_, i) => i)
    const shuffledIndices = shuffle(optionIndices)
    const newOptions = shuffledIndices.map((i) => q.options[i])

    if (q.type === 'multi' && q.correctIndices) {
      // Multi-select: remap correctIndices
      const oldCorrectSet = new Set(q.correctIndices)
      const newCorrectIndices = []
      shuffledIndices.forEach((oldIdx, newIdx) => {
        if (oldCorrectSet.has(oldIdx)) {
          newCorrectIndices.push(newIdx)
        }
      })
      newCorrectIndices.sort((a, b) => a - b)
      multiCount++
      return { ...q, options: newOptions, correctIndices: newCorrectIndices }
    }

    // Single-select: remap correctIndex
    const correctOption = q.options[q.correctIndex]
    const newCorrectIndex = newOptions.indexOf(correctOption)
    counts[newCorrectIndex]++
    return { ...q, options: newOptions, correctIndex: newCorrectIndex }
  })

  saveQuizzes(data)
  const singleCount = data.quizzes.length - multiCount
  console.log(`Randomized ${data.quizzes.length} questions (seed: ${seed})`)
  console.log(`  Single-select: ${singleCount}, Multi-select: ${multiCount}`)
  console.log(
    'Distribution (single):',
    counts.map((c, i) => `index${i}: ${c} (${((c / Math.max(singleCount, 1)) * 100).toFixed(1)}%)`).join(', ')
  )
}

// === Statistics ===
function stats() {
  const data = loadQuizzes()
  const quizzes = data.quizzes

  const singleQuizzes = quizzes.filter((q) => q.type !== 'multi')
  const multiQuizzes = quizzes.filter((q) => q.type === 'multi')
  console.log(`Total: ${quizzes.length} questions (single: ${singleQuizzes.length}, multi: ${multiQuizzes.length})\n`)

  // Category distribution
  const categories = {}
  quizzes.forEach((q) => {
    categories[q.category] = (categories[q.category] || 0) + 1
  })
  console.log('=== Category Distribution ===')
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(15)} ${String(count).padStart(3)} (${((count / quizzes.length) * 100).toFixed(1)}%)`)
    })

  // Difficulty distribution
  const difficulties = {}
  quizzes.forEach((q) => {
    difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1
  })
  console.log('\n=== Difficulty Distribution ===')
  Object.entries(difficulties)
    .sort((a, b) => b[1] - a[1])
    .forEach(([diff, count]) => {
      console.log(`  ${diff.padEnd(15)} ${String(count).padStart(3)} (${((count / quizzes.length) * 100).toFixed(1)}%)`)
    })

  // correctIndex distribution (single-select only)
  const indices = [0, 0, 0, 0, 0, 0]
  singleQuizzes.forEach((q) => {
    indices[q.correctIndex] = (indices[q.correctIndex] || 0) + 1
  })
  console.log('\n=== correctIndex Distribution (single-select) ===')
  indices.forEach((count, i) => {
    if (count > 0) {
      const pct = ((count / singleQuizzes.length) * 100).toFixed(1)
      const bar = '█'.repeat(Math.round((count / singleQuizzes.length) * 40))
      console.log(`  index ${i}: ${String(count).padStart(3)} (${pct}%) ${bar}`)
    }
  })
}

// === Coverage by doc page ===
function coverage() {
  const data = loadQuizzes()
  const quizzes = data.quizzes

  const pages = {}
  quizzes.forEach((q) => {
    if (q.referenceUrl) {
      const page = q.referenceUrl.replace(/.*docs\/en\//, '').replace(/#.*/, '')
      pages[page] = (pages[page] || 0) + 1
    }
  })

  console.log(`=== Documentation Page Coverage (${quizzes.length} total) ===\n`)
  Object.entries(pages)
    .sort((a, b) => b[1] - a[1])
    .forEach(([page, count]) => {
      const bar = '█'.repeat(Math.round(count / 2))
      console.log(`  ${page.padEnd(25)} ${String(count).padStart(3)} ${bar}`)
    })
}

// === Quick quality check ===
function check() {
  const data = loadQuizzes()
  const quizzes = data.quizzes
  let issues = 0

  // Duplicate IDs
  const ids = quizzes.map((q) => q.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) {
    console.log(`FAIL: Duplicate IDs: ${dupes.join(', ')}`)
    issues++
  }

  const singleQuizzes = quizzes.filter((q) => q.type !== 'multi')
  const multiQuizzes = quizzes.filter((q) => q.type === 'multi')

  // correctIndex bias (single-select only)
  const counts = [0, 0, 0, 0]
  singleQuizzes.forEach((q) => {
    counts[q.correctIndex] = (counts[q.correctIndex] || 0) + 1
  })
  counts.forEach((c, i) => {
    const pct = c / Math.max(singleQuizzes.length, 1)
    if (pct > 0.35) {
      console.log(`FAIL: correctIndex=${i} is ${(pct * 100).toFixed(1)}% (>35%)`)
      issues++
    }
  })

  // wrongFeedback structure (single-select)
  singleQuizzes.forEach((q) => {
    const correct = q.options[q.correctIndex]
    if (correct.wrongFeedback) {
      console.log(`FAIL: ${q.id} correct answer has wrongFeedback`)
      issues++
    }
    q.options.forEach((opt, i) => {
      if (i !== q.correctIndex && !opt.wrongFeedback) {
        console.log(`FAIL: ${q.id} option[${i}] missing wrongFeedback`)
        issues++
      }
    })
  })

  // wrongFeedback structure (multi-select)
  multiQuizzes.forEach((q) => {
    if (!q.correctIndices || q.correctIndices.length < 2) {
      console.log(`FAIL: ${q.id} multi-select needs at least 2 correctIndices`)
      issues++
      return
    }
    const correctSet = new Set(q.correctIndices)
    q.options.forEach((opt, i) => {
      if (correctSet.has(i) && opt.wrongFeedback) {
        console.log(`FAIL: ${q.id} correct option[${i}] has wrongFeedback`)
        issues++
      }
      if (!correctSet.has(i) && !opt.wrongFeedback) {
        console.log(`FAIL: ${q.id} option[${i}] missing wrongFeedback`)
        issues++
      }
    })
    q.correctIndices.forEach((idx) => {
      if (idx < 0 || idx >= q.options.length) {
        console.log(`FAIL: ${q.id} correctIndices[${idx}] out of bounds`)
        issues++
      }
    })
  })

  if (issues === 0) {
    console.log(`OK: ${quizzes.length} questions passed all checks`)
  } else {
    console.log(`\n${issues} issue(s) found`)
    process.exit(1)
  }
}

// === Search existing questions ===
function search() {
  const keyword = process.argv.slice(3).join(' ')
  if (!keyword) {
    console.log('Usage: node scripts/quiz-utils.mjs search <keyword>')
    console.log('Searches question, options, explanation, and wrongFeedback fields.')
    process.exit(1)
  }

  const data = loadQuizzes()
  const lowerKeyword = keyword.toLowerCase()
  const matches = []

  for (const q of data.quizzes) {
    const searchable = [
      q.question,
      q.explanation,
      ...q.options.map((o) => o.text),
      ...q.options.filter((o) => o.wrongFeedback).map((o) => o.wrongFeedback),
    ]
      .join(' ')
      .toLowerCase()

    if (searchable.includes(lowerKeyword)) {
      matches.push(q)
    }
  }

  if (matches.length === 0) {
    console.log(`No questions found matching "${keyword}"`)
    return
  }

  console.log(`=== ${matches.length} questions matching "${keyword}" ===\n`)
  for (const q of matches) {
    const correctText =
      q.type === 'multi' ? q.correctIndices.map((i) => q.options[i].text).join(' / ') : q.options[q.correctIndex].text
    console.log(`  ${q.id.padEnd(12)} [${q.category}/${q.difficulty}]`)
    console.log(`    Q: ${q.question.slice(0, 80)}${q.question.length > 80 ? '...' : ''}`)
    console.log(`    A: ${correctText.slice(0, 80)}${correctText.length > 80 ? '...' : ''}`)
    console.log()
  }
}

// === Edit a quiz field by ID ===
function edit() {
  const args = process.argv.slice(3)
  if (args.length < 3) {
    console.log('Usage: node scripts/quiz-utils.mjs edit <id> <field> <value>')
    console.log('Fields: question, explanation, referenceUrl, hint, option.N, wrongFeedback.N')
    process.exit(1)
  }

  const [id, field, ...valueParts] = args
  const value = valueParts.join(' ')
  const data = loadQuizzes()
  const quiz = data.quizzes.find((q) => q.id === id)

  if (!quiz) {
    console.error(`ERROR: Quiz "${id}" not found`)
    process.exit(1)
  }

  let oldValue
  const optionMatch = field.match(/^(option|wrongFeedback)\.(\d+)$/)

  if (optionMatch) {
    const [, type, indexStr] = optionMatch
    const idx = parseInt(indexStr, 10)
    if (idx < 0 || idx >= quiz.options.length) {
      console.error(`ERROR: Option index ${idx} out of bounds (0-${quiz.options.length - 1})`)
      process.exit(1)
    }
    if (type === 'option') {
      oldValue = quiz.options[idx].text
      quiz.options[idx].text = value
    } else {
      oldValue = quiz.options[idx].wrongFeedback || '(none)'
      if (value === '') {
        delete quiz.options[idx].wrongFeedback
      } else {
        quiz.options[idx].wrongFeedback = value
      }
    }
  } else if (['question', 'explanation', 'referenceUrl', 'hint'].includes(field)) {
    oldValue = quiz[field] || '(none)'
    quiz[field] = value
  } else {
    console.error(
      `ERROR: Unknown field "${field}". Valid: question, explanation, referenceUrl, hint, option.N, wrongFeedback.N`
    )
    process.exit(1)
  }

  saveQuizzes(data)

  console.log(`Updated ${id} [${field}]:`)
  console.log(`  OLD: ${String(oldValue).slice(0, 120)}${String(oldValue).length > 120 ? '...' : ''}`)
  console.log(`  NEW: ${value.slice(0, 120)}${value.length > 120 ? '...' : ''}`)
}

// === Merge skill-proposals into known-issues ===
function mergeProposals() {
  const proposalsPath = resolve(__dirname, '../.claude/tmp/skill-proposals.md')
  const knownIssuesPath = resolve(__dirname, '../.claude/skills/quiz-refine/known-issues.md')

  let proposalsContent
  try {
    proposalsContent = readFileSync(proposalsPath, 'utf8')
  } catch {
    console.log('No skill-proposals.md found. Nothing to merge.')
    return
  }

  const knownIssues = readFileSync(knownIssuesPath, 'utf8')

  // Extract proposals with 汎用性: 高 or 中
  const proposalBlocks = proposalsContent.split(/^### Proposal \d+:/m).slice(1)
  const eligible = proposalBlocks.filter((block) => /汎用性.*[：:]\s*\[?(高|中)\]?/m.test(block))

  if (eligible.length === 0) {
    console.log('No high/medium generalizability proposals found. Nothing to merge.')
    return
  }

  // Extract existing H2 section titles from known-issues
  const existingSections = [...knownIssues.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim())

  let additions = []
  for (const block of eligible) {
    const titleMatch = block.match(/^\s*\[?([^\]\n]+)\]?/m)
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Pattern'
    const observationMatch = block.match(/\*\*観察\*\*[：:]\s*(.+)/m)
    const observation = observationMatch ? observationMatch[1].trim() : ''
    const proposalMatch = block.match(/\*\*提案\*\*[：:]\s*(.+)/m)
    const proposal = proposalMatch ? proposalMatch[1].trim() : ''

    if (!observation && !proposal) continue

    // Check if a similar section exists (fuzzy match on key terms)
    const content = `- ${observation}${proposal ? ' → ' + proposal : ''}`
    const matched = existingSections.find((s) => title.split(/\s+/).some((word) => word.length > 3 && s.includes(word)))

    if (matched) {
      additions.push({ type: 'append', section: matched, content })
    } else {
      additions.push({ type: 'new', title, content })
    }
  }

  if (additions.length === 0) {
    console.log('Proposals parsed but no actionable content found.')
    return
  }

  let updated = knownIssues
  const appended = []
  const newSections = []

  // Process appends to existing sections
  for (const add of additions.filter((a) => a.type === 'append')) {
    const sectionHeader = `## ${add.section}`
    const startIdx = updated.indexOf(sectionHeader)
    if (startIdx === -1) continue

    // Find the end of this section (next ## or end of file)
    const afterHeader = startIdx + sectionHeader.length
    const nextSectionMatch = updated.slice(afterHeader).match(/\n## /)
    const endIdx = nextSectionMatch ? afterHeader + nextSectionMatch.index : updated.length

    const sectionContent = updated.slice(startIdx, endIdx).trimEnd()
    updated = updated.slice(0, startIdx) + sectionContent + '\n' + add.content + '\n' + updated.slice(endIdx)
    appended.push(`  + Appended to "${add.section}"`)
  }

  // Add new sections at end
  for (const add of additions.filter((a) => a.type === 'new')) {
    updated = updated.trimEnd() + `\n\n## ${add.title}\n\n${add.content}\n`
    newSections.push(`  + New section: "${add.title}"`)
  }

  if (appended.length === 0 && newSections.length === 0) {
    console.log('No changes to apply.')
    return
  }

  writeFileSync(knownIssuesPath, updated)
  console.log(`Merged ${appended.length + newSections.length} proposals into known-issues.md:`)
  for (const line of [...appended, ...newSections]) console.log(line)
}

// === Section-Level Coverage ===
function sectionCoverage() {
  const data = loadQuizzes()
  const quizzes = data.quizzes
  const sectionsDir = resolve(__dirname, '../.claude/tmp/docs/sections')

  if (!existsSync(sectionsDir)) {
    console.log('Error: Section metadata not found. Run `npm run docs:fetch` first.')
    process.exit(1)
  }

  const sectionPages = readdirSync(sectionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  // Sections to exclude from gap analysis
  const EXCLUDE_SLUGS = new Set(['related-resources', 'see-also', 'next-steps', 'further-reading'])

  const results = []

  for (const page of sectionPages) {
    const indexPath = resolve(sectionsDir, page, '_index.json')
    if (!existsSync(indexPath)) continue

    const sections = JSON.parse(readFileSync(indexPath, 'utf8'))

    // Questions referencing this page
    const pageQuestions = quizzes.filter((q) => {
      if (!q.referenceUrl) return false
      const m = q.referenceUrl.match(/\/docs\/en\/([^#?]+)/)
      return m && m[1] === page
    })

    // Anchor-based coverage
    const anchoredSlugs = new Set()
    pageQuestions.forEach((q) => {
      const m = q.referenceUrl.match(/#(.+)/)
      if (m) anchoredSlugs.add(m[1])
    })

    // Content-match fallback for non-anchored questions
    const noAnchorQuestions = pageQuestions.filter((q) => !q.referenceUrl.includes('#'))

    const sectionResults = sections
      .filter((s) => !EXCLUDE_SLUGS.has(s.slug))
      .map((section) => {
        const hasAnchoredQ = anchoredSlugs.has(section.slug)

        const titleWords = section.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
        const contentMatched = noAnchorQuestions.filter((q) => {
          const text = (q.question + ' ' + q.explanation).toLowerCase()
          return titleWords.some((w) => text.includes(w))
        }).length

        return {
          slug: section.slug,
          title: section.title,
          chars: section.chars,
          covered: hasAnchoredQ || contentMatched > 0,
        }
      })

    const uncovered = sectionResults.filter((s) => !s.covered)

    results.push({
      page,
      totalSections: sectionResults.length,
      totalQuestions: pageQuestions.length,
      uncoveredSections: uncovered,
      coveredCount: sectionResults.length - uncovered.length,
    })
  }

  // Output
  console.log('=== Section-Level Coverage ===\n')

  let totalUncovered = 0
  for (const r of results.sort((a, b) => b.uncoveredSections.length - a.uncoveredSections.length)) {
    if (r.uncoveredSections.length === 0) {
      console.log(
        `  ${r.page.padEnd(25)} ${r.coveredCount}/${r.totalSections} covered (${r.totalQuestions} questions) OK`
      )
      continue
    }

    totalUncovered += r.uncoveredSections.length
    console.log(`\n  ${r.page} — ${r.coveredCount}/${r.totalSections} covered (${r.totalQuestions} questions)`)
    console.log('  Uncovered:')
    for (const s of r.uncoveredSections) {
      console.log(`    #${s.slug} "${s.title}" (${s.chars} chars)`)
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Total uncovered sections: ${totalUncovered}`)
}

// === Question Overlap Detection ===
function overlap() {
  const data = loadQuizzes()
  const quizzes = data.quizzes.filter((q) => q.type !== 'multi')

  function tokenize(text) {
    return new Set(
      text
        .toLowerCase()
        .replace(/`/g, '')
        .split(/[\s、。,.()[\]「」：:]+/)
        .filter((w) => w.length > 2)
    )
  }

  function jaccard(a, b) {
    const intersection = [...a].filter((x) => b.has(x)).length
    const union = new Set([...a, ...b]).size
    return union === 0 ? 0 : intersection / union
  }

  // Strategy 1: Same anchored URL clusters
  const byAnchoredUrl = {}
  quizzes.forEach((q) => {
    if (!q.referenceUrl || !q.referenceUrl.includes('#')) return
    if (!byAnchoredUrl[q.referenceUrl]) byAnchoredUrl[q.referenceUrl] = []
    byAnchoredUrl[q.referenceUrl].push(q)
  })

  const urlClusters = Object.entries(byAnchoredUrl)
    .filter(([, qs]) => qs.length >= 2)
    .map(([url, qs]) => ({ url, questions: qs }))

  // Strategy 2: Similar knowledge point (Jaccard on same page)
  const byPage = {}
  quizzes.forEach((q) => {
    if (!q.referenceUrl) return
    const page = q.referenceUrl.replace(/#.*/, '').replace(/.*\/docs\/en\//, '')
    if (!byPage[page]) byPage[page] = []
    byPage[page].push(q)
  })

  const similarPairs = []
  for (const [page, qs] of Object.entries(byPage)) {
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        const a = qs[i],
          b = qs[j]

        const aTokens = tokenize(a.options[a.correctIndex].text)
        const bTokens = tokenize(b.options[b.correctIndex].text)
        const answerSim = jaccard(aTokens, bTokens)

        const qTokens1 = tokenize(a.question)
        const qTokens2 = tokenize(b.question)
        const questionSim = jaccard(qTokens1, qTokens2)

        if (answerSim > 0.5 && questionSim > 0.3) {
          similarPairs.push({
            page,
            ids: [a.id, b.id],
            answerSim: answerSim.toFixed(2),
            questionSim: questionSim.toFixed(2),
            q1: a.question.slice(0, 60),
            q2: b.question.slice(0, 60),
          })
        }
      }
    }
  }

  // Output
  console.log('=== Question Overlap Detection ===\n')

  if (urlClusters.length > 0) {
    console.log(`[Same Anchored URL] ${urlClusters.length} clusters:\n`)
    for (const c of urlClusters.sort((a, b) => b.questions.length - a.questions.length)) {
      console.log(`  ${c.url} (${c.questions.length})`)
      for (const q of c.questions) {
        console.log(`    ${q.id}: ${q.question.slice(0, 70)}`)
      }
    }
  }

  if (similarPairs.length > 0) {
    console.log(`\n[Similar Knowledge Point] ${similarPairs.length} pairs:\n`)
    for (const p of similarPairs.sort((a, b) => parseFloat(b.answerSim) - parseFloat(a.answerSim))) {
      console.log(`  ${p.ids.join(' <> ')} [page: ${p.page}]`)
      console.log(`    Q1: ${p.q1}`)
      console.log(`    Q2: ${p.q2}`)
      console.log(`    A-sim: ${p.answerSim}  Q-sim: ${p.questionSim}`)
    }
  }

  if (urlClusters.length === 0 && similarPairs.length === 0) {
    console.log('No significant overlap detected.')
  }

  console.log(`\n=== Summary ===`)
  console.log(`URL clusters: ${urlClusters.length}, Similar pairs: ${similarPairs.length}`)
}

// === Main ===
const command = process.argv[2]
switch (command) {
  case 'randomize':
    randomize()
    break
  case 'stats':
    stats()
    break
  case 'coverage':
    coverage()
    break
  case 'check':
    check()
    break
  case 'search':
    search()
    break
  case 'edit':
    edit()
    break
  case 'merge-proposals':
    mergeProposals()
    break
  case 'section-coverage':
    sectionCoverage()
    break
  case 'overlap':
    overlap()
    break
  default:
    console.log('Usage: node scripts/quiz-utils.mjs <command>')
    console.log('Commands: randomize, stats, coverage, check, search, edit, merge-proposals, section-coverage, overlap')
    process.exit(1)
}
