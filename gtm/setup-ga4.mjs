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
  { parameterName: 'error_message', displayName: 'エラーメッセージ', description: 'アプリエラーの内容（200文字以内）' },
  {
    parameterName: 'error_source',
    displayName: 'エラーソース',
    description: 'react_boundary / window_error / unhandled_rejection',
  },
  { parameterName: 'question_id', displayName: '問題ID', description: '個別問題の識別子（例: mem-001）' },
  { parameterName: 'difficulty', displayName: '難易度', description: 'beginner / intermediate / advanced' },
  { parameterName: 'is_correct', displayName: '正誤', description: '正解: true / 不正解: false' },
  { parameterName: 'theme', displayName: 'テーマ', description: 'dark / light / system' },
  { parameterName: 'method', displayName: 'シェア方法', description: 'native (Web Share API)' },
]

// カスタム指標定義
const METRICS = [
  { parameterName: 'accuracy', displayName: '正答率', measurementUnit: 'STANDARD' },
  { parameterName: 'score', displayName: 'スコア', measurementUnit: 'STANDARD' },
  { parameterName: 'duration_sec', displayName: '所要時間', measurementUnit: 'SECONDS' },
  { parameterName: 'question_count', displayName: '問題数', measurementUnit: 'STANDARD' },
  { parameterName: 'answered_count', displayName: '回答済み数', measurementUnit: 'STANDARD' },
  { parameterName: 'total_questions', displayName: '総問題数', measurementUnit: 'STANDARD' },
  { parameterName: 'questions_remaining', displayName: '残り問題数', measurementUnit: 'STANDARD' },
  { parameterName: 'result_count', displayName: '検索結果件数', measurementUnit: 'STANDARD' },
  { parameterName: 'slide_index', displayName: 'スライド番号', measurementUnit: 'STANDARD' },
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

// ユーザースコープのカスタムディメンション（ユーザープロパティ）
const USER_DIMENSIONS = [
  { parameterName: 'mastery_level', displayName: 'AI活用レベル', description: '入門者/学習者/実践者/推進者/牽引役' },
  { parameterName: 'total_quizzes', displayName: '累計クイズ数', description: '完了したクイズセッション数' },
]

console.log('\n=== ユーザースコープ ディメンション ===')
for (const dim of USER_DIMENSIONS) {
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
        scope: 'USER',
      },
    })
    console.log(`  CREATED: ${dim.displayName} (${dim.parameterName})`)
  } catch (err) {
    console.error(`  ERROR: ${dim.displayName} — ${err.message}`)
  }
}

// ============================================================
// コンバージョンイベント設定
// ============================================================

const CONVERSION_EVENTS = ['quiz_complete', 'certificate_download']

console.log('\n=== コンバージョンイベント ===')
try {
  const [existingConversions] = await client.listConversionEvents({ parent })
  const existingConversionNames = (existingConversions ?? []).map((c) => c.eventName)

  for (const eventName of CONVERSION_EVENTS) {
    if (existingConversionNames.includes(eventName)) {
      console.log(`  SKIP (既存): ${eventName}`)
      continue
    }
    if (dryRun) {
      console.log(`  WOULD CREATE: ${eventName}`)
      continue
    }
    try {
      await client.createConversionEvent({
        parent,
        conversionEvent: { eventName },
      })
      console.log(`  CREATED: ${eventName}`)
    } catch (err) {
      console.error(`  ERROR: ${eventName} — ${err.message}`)
    }
  }
} catch (err) {
  console.error(`  ERROR: コンバージョン取得失敗 — ${err.message}`)
}

// ============================================================
// データ保持期間設定（14ヶ月）
// ============================================================

console.log('\n=== データ保持期間 ===')
try {
  const [retention] = await client.getDataRetentionSettings({ name: `${parent}/dataRetentionSettings` })
  const current = retention.eventDataRetention

  if (current === 'FOURTEEN_MONTHS') {
    console.log('  SKIP (既に14ヶ月)')
  } else if (dryRun) {
    console.log(`  WOULD UPDATE: ${current} → FOURTEEN_MONTHS`)
  } else {
    await client.updateDataRetentionSettings({
      dataRetentionSettings: {
        name: `${parent}/dataRetentionSettings`,
        eventDataRetention: 'FOURTEEN_MONTHS',
        resetUserDataOnNewActivity: true,
      },
      updateMask: { paths: ['event_data_retention', 'reset_user_data_on_new_activity'] },
    })
    console.log(`  UPDATED: ${current} → FOURTEEN_MONTHS`)
  }
} catch (err) {
  console.error(`  ERROR: データ保持期間 — ${err.message}`)
}

// ============================================================
// Enhanced Measurement 確認・設定
// ============================================================

console.log('\n=== Enhanced Measurement ===')
try {
  const [streams] = await client.listDataStreams({ parent })
  const webStream = (streams ?? []).find((s) => s.type === 'WEB_DATA_STREAM')

  if (!webStream) {
    console.log('  SKIP: Web データストリームが見つかりません')
  } else {
    const [settings] = await client.getEnhancedMeasurementSettings({
      name: `${webStream.name}/enhancedMeasurementSettings`,
    })

    const checks = [
      ['scrollsEnabled', settings.scrollsEnabled],
      ['outboundClicksEnabled', settings.outboundClicksEnabled],
      ['siteSearchEnabled', settings.siteSearchEnabled],
      ['pageChangesEnabled', settings.pageChangesEnabled],
      ['formInteractionsEnabled', settings.formInteractionsEnabled],
    ]

    let needsUpdate = false
    for (const [key, value] of checks) {
      if (value) {
        console.log(`  OK: ${key}`)
      } else {
        console.log(`  ${dryRun ? 'WOULD ENABLE' : 'ENABLING'}: ${key}`)
        needsUpdate = true
      }
    }

    if (needsUpdate && !dryRun) {
      await client.updateEnhancedMeasurementSettings({
        enhancedMeasurementSettings: {
          name: `${webStream.name}/enhancedMeasurementSettings`,
          streamEnabled: true,
          scrollsEnabled: true,
          outboundClicksEnabled: true,
          siteSearchEnabled: true,
          pageChangesEnabled: true,
          formInteractionsEnabled: true,
        },
        updateMask: {
          paths: [
            'stream_enabled',
            'scrolls_enabled',
            'outbound_clicks_enabled',
            'site_search_enabled',
            'page_changes_enabled',
            'form_interactions_enabled',
          ],
        },
      })
      console.log('  Updated!')
    }
  }
} catch (err) {
  console.error(`  ERROR: Enhanced Measurement — ${err.message}`)
}

console.log('\n完了!')
