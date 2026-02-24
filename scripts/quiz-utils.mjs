#!/usr/bin/env node

/**
 * Quiz Utility Scripts
 *
 * クイズデータの操作・分析用ユーティリティ。
 * npm scripts から呼び出して使用する。
 *
 * Usage:
 *   node scripts/quiz-utils.mjs randomize   # correctIndex をランダム化
 *   node scripts/quiz-utils.mjs stats       # カテゴリ・難易度・参照ページの統計
 *   node scripts/quiz-utils.mjs coverage    # ドキュメントページ別カバレッジ
 *   node scripts/quiz-utils.mjs check       # 品質チェック（テスト相当の簡易版）
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
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
  data.quizzes = data.quizzes.map(q => {
    const correctOption = q.options[q.correctIndex]
    const indices = shuffle([0, 1, 2, 3])
    const newOptions = indices.map(i => q.options[i])
    const newCorrectIndex = newOptions.indexOf(correctOption)
    counts[newCorrectIndex]++
    return { ...q, options: newOptions, correctIndex: newCorrectIndex }
  })

  saveQuizzes(data)
  console.log(`Randomized ${data.quizzes.length} questions (seed: ${seed})`)
  console.log('Distribution:', counts.map((c, i) => `index${i}: ${c} (${(c / data.quizzes.length * 100).toFixed(1)}%)`).join(', '))
}

// === Statistics ===
function stats() {
  const data = loadQuizzes()
  const quizzes = data.quizzes

  console.log(`Total: ${quizzes.length} questions\n`)

  // Category distribution
  const categories = {}
  quizzes.forEach(q => { categories[q.category] = (categories[q.category] || 0) + 1 })
  console.log('=== Category Distribution ===')
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(15)} ${String(count).padStart(3)} (${(count / quizzes.length * 100).toFixed(1)}%)`)
  })

  // Difficulty distribution
  const difficulties = {}
  quizzes.forEach(q => { difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1 })
  console.log('\n=== Difficulty Distribution ===')
  Object.entries(difficulties).sort((a, b) => b[1] - a[1]).forEach(([diff, count]) => {
    console.log(`  ${diff.padEnd(15)} ${String(count).padStart(3)} (${(count / quizzes.length * 100).toFixed(1)}%)`)
  })

  // correctIndex distribution
  const indices = [0, 0, 0, 0, 0, 0]
  quizzes.forEach(q => { indices[q.correctIndex] = (indices[q.correctIndex] || 0) + 1 })
  console.log('\n=== correctIndex Distribution ===')
  indices.forEach((count, i) => {
    if (count > 0) {
      const pct = (count / quizzes.length * 100).toFixed(1)
      const bar = '█'.repeat(Math.round(count / quizzes.length * 40))
      console.log(`  index ${i}: ${String(count).padStart(3)} (${pct}%) ${bar}`)
    }
  })
}

// === Coverage by doc page ===
function coverage() {
  const data = loadQuizzes()
  const quizzes = data.quizzes

  const pages = {}
  quizzes.forEach(q => {
    if (q.referenceUrl) {
      const page = q.referenceUrl.replace(/.*docs\/en\//, '').replace(/#.*/, '')
      pages[page] = (pages[page] || 0) + 1
    }
  })

  console.log(`=== Documentation Page Coverage (${quizzes.length} total) ===\n`)
  Object.entries(pages).sort((a, b) => b[1] - a[1]).forEach(([page, count]) => {
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
  const ids = quizzes.map(q => q.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) {
    console.log(`FAIL: Duplicate IDs: ${dupes.join(', ')}`)
    issues++
  }

  // correctIndex bias
  const counts = [0, 0, 0, 0]
  quizzes.forEach(q => { counts[q.correctIndex] = (counts[q.correctIndex] || 0) + 1 })
  counts.forEach((c, i) => {
    const pct = c / quizzes.length
    if (pct > 0.35) {
      console.log(`FAIL: correctIndex=${i} is ${(pct * 100).toFixed(1)}% (>35%)`)
      issues++
    }
  })

  // wrongFeedback structure
  quizzes.forEach(q => {
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

  if (issues === 0) {
    console.log(`OK: ${quizzes.length} questions passed all checks`)
  } else {
    console.log(`\n${issues} issue(s) found`)
    process.exit(1)
  }
}

// === Main ===
const command = process.argv[2]
switch (command) {
  case 'randomize': randomize(); break
  case 'stats': stats(); break
  case 'coverage': coverage(); break
  case 'check': check(); break
  default:
    console.log('Usage: node scripts/quiz-utils.mjs <command>')
    console.log('Commands: randomize, stats, coverage, check')
    process.exit(1)
}
