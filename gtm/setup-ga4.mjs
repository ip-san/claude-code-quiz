#!/usr/bin/env node
/**
 * GA4 カスタムディメンション・指標 自動登録スクリプト
 *
 * events.json のパラメータ定義から GA4 のカスタムディメンション/指標を一括登録する。
 *
 * 使い方:
 *   node gtm/setup-ga4.mjs                    # プロパティ一覧を表示
 *   node gtm/setup-ga4.mjs <property-id>      # ディメンション・指標を登録
 *   node gtm/setup-ga4.mjs <property-id> --dry-run  # 登録内容のプレビューのみ
 *
 * 環境変数:
 *   GOOGLE_APPLICATION_CREDENTIALS - サービスアカウントキーのパス（.env から読み込み）
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// .env 読み込み
const envPath = resolve(rootDir, '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/)
    if (match) {
      // ~ をホームディレクトリに展開
      const value = match[2].trim().replace(/^~/, homedir())
      process.env[match[1]] = value
    }
  }
} catch {
  console.error('Error: .env not found')
  process.exit(1)
}

const { AnalyticsAdminServiceClient } = await import('@google-analytics/admin')
const client = new AnalyticsAdminServiceClient()

const propertyId = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

// カスタムディメンション定義
const DIMENSIONS = [
  { parameterName: 'platform', displayName: 'プラットフォーム', description: 'electron / pwa' },
  { parameterName: 'quiz_mode', displayName: 'クイズモード', description: 'overview, full, random, etc.' },
  { parameterName: 'category', displayName: 'カテゴリ', description: 'memory, tools, skills, etc.' },
  { parameterName: 'action', displayName: 'アクション', description: 'start, complete, skip, etc.' },
  { parameterName: 'chapter_id', displayName: 'チャプター', description: 'チャプター番号 (1-6)' },
]

// カスタム指標定義
const METRICS = [
  { parameterName: 'accuracy', displayName: '正答率', measurementUnit: 'STANDARD' },
  { parameterName: 'score', displayName: 'スコア', measurementUnit: 'STANDARD' },
  { parameterName: 'duration_sec', displayName: '所要時間', measurementUnit: 'SECONDS' },
  { parameterName: 'question_count', displayName: '問題数', measurementUnit: 'STANDARD' },
]

// プロパティ一覧表示
if (!propertyId) {
  console.log('GA4 プロパティ一覧を取得中...\n')
  try {
    const [accounts] = await client.listAccountSummaries({})
    for (const account of accounts) {
      console.log(`Account: ${account.displayName} (${account.name})`)
      for (const prop of account.propertySummaries ?? []) {
        const id = prop.property?.replace('properties/', '')
        console.log(`  Property: ${prop.displayName} — ID: ${id}`)
      }
    }
    console.log('\n使い方: node gtm/setup-ga4.mjs <property-id>')
  } catch (err) {
    console.error('Error:', err.message)
  }
  process.exit(0)
}

const parent = `properties/${propertyId}`
console.log(`\nGA4 Property: ${parent}`)
console.log(dryRun ? '(dry-run: 登録は実行しません)\n' : '\n')

// 既存のディメンション・指標を取得（重複回避）
let existingDimensions = []
let existingMetrics = []
try {
  const [dims] = await client.listCustomDimensions({ parent })
  existingDimensions = dims.map((d) => d.parameterName)
  const [mets] = await client.listCustomMetrics({ parent })
  existingMetrics = mets.map((m) => m.parameterName)
} catch (err) {
  console.error('既存定義の取得に失敗:', err.message)
  process.exit(1)
}

// ディメンション登録
console.log('=== カスタムディメンション ===')
for (const dim of DIMENSIONS) {
  if (existingDimensions.includes(dim.parameterName)) {
    console.log(`  SKIP (既存): ${dim.displayName} (${dim.parameterName})`)
    continue
  }
  if (dryRun) {
    console.log(`  WOULD CREATE: ${dim.displayName} (${dim.parameterName})`)
    continue
  }
  try {
    await client.createCustomDimension({
      parent,
      customDimension: {
        parameterName: dim.parameterName,
        displayName: dim.displayName,
        description: dim.description,
        scope: 'EVENT',
      },
    })
    console.log(`  CREATED: ${dim.displayName} (${dim.parameterName})`)
  } catch (err) {
    console.error(`  ERROR: ${dim.displayName} — ${err.message}`)
  }
}

// 指標登録
console.log('\n=== カスタム指標 ===')
for (const met of METRICS) {
  if (existingMetrics.includes(met.parameterName)) {
    console.log(`  SKIP (既存): ${met.displayName} (${met.parameterName})`)
    continue
  }
  if (dryRun) {
    console.log(`  WOULD CREATE: ${met.displayName} (${met.parameterName})`)
    continue
  }
  try {
    await client.createCustomMetric({
      parent,
      customMetric: {
        parameterName: met.parameterName,
        displayName: met.displayName,
        measurementUnit: met.measurementUnit,
        scope: 'EVENT',
      },
    })
    console.log(`  CREATED: ${met.displayName} (${met.parameterName})`)
  } catch (err) {
    console.error(`  ERROR: ${met.displayName} — ${err.message}`)
  }
}

console.log('\n完了!')
