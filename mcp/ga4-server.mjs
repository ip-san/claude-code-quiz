#!/usr/bin/env node
/**
 * GA4 Analytics MCP Server
 *
 * Claude Code から GA4 の分析データを直接クエリできる MCP サーバー。
 * 公式 @modelcontextprotocol/sdk を使用した stdio transport。
 *
 * 提供するツール:
 *   - ga4_report: カスタムレポートを実行（ディメンション・指標・日付範囲を指定）
 *   - ga4_realtime: リアルタイムデータを取得
 *   - ga4_summary: 直近N日間のサマリー（よく使うレポートのプリセット）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// ============================================================
// Event Parameter Type Registry
// ============================================================
// GA4 では数値パラメータは metric としてのみ、文字列パラメータは dimension としてのみ使用可能。
// customEvent: プレフィックス付きで指定する場合のバリデーションに使用。

const NUMERIC_PARAMS = new Set([
  'accuracy',
  'score',
  'total',
  'duration_sec',
  'question_count',
  'result_count',
  'slide_index',
])

const STRING_PARAMS = new Set([
  'action',
  'quiz_mode',
  'category',
  'platform',
  'chapter_id',
  'method',
  'error_message',
  'error_source',
])

function validateCustomEventUsage(dimensions, metrics) {
  const errors = []
  for (const dim of dimensions ?? []) {
    const match = dim.match(/^customEvent:(.+)$/)
    if (match && NUMERIC_PARAMS.has(match[1])) {
      errors.push(`"${dim}" は数値パラメータのため dimension に指定できません。metrics に移動してください`)
    }
  }
  for (const met of metrics ?? []) {
    const match = met.match(/^customEvent:(.+)$/)
    if (match && STRING_PARAMS.has(match[1])) {
      errors.push(`"${met}" は文字列パラメータのため metrics に指定できません。dimensions に移動してください`)
    }
  }
  if (errors.length > 0) {
    throw new Error(`パラメータ型エラー:\n${errors.join('\n')}`)
  }
}

// .env 読み込み
const envPath = resolve(rootDir, '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/)
    if (match) process.env[match[1]] = match[2].trim().replace(/^~/, homedir())
  }
} catch {
  // .env がなくても起動は許可（エラーはツール実行時に返す）
}

const PROPERTY_ID = process.env.GA4_PROPERTY_ID

// GA4 クライアント（遅延初期化）
let analyticsClient = null
async function getClient() {
  if (analyticsClient) return analyticsClient
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data')
  analyticsClient = new BetaAnalyticsDataClient()
  return analyticsClient
}

// ============================================================
// GA4 Report Functions
// ============================================================

async function runReport(args) {
  if (!PROPERTY_ID) throw new Error('GA4_PROPERTY_ID が .env に設定されていません')

  validateCustomEventUsage(args.dimensions, args.metrics)

  const client = await getClient()

  const request = {
    property: `properties/${PROPERTY_ID}`,
    dimensions: (args.dimensions ?? []).map((name) => ({ name })),
    metrics: (args.metrics ?? []).map((name) => ({ name })),
    dateRanges: [
      {
        startDate: args.startDate ?? '7daysAgo',
        endDate: args.endDate ?? 'today',
      },
    ],
    limit: args.limit ?? 100,
  }

  if (args.dimensionFilter) {
    request.dimensionFilter = {
      filter: {
        fieldName: args.dimensionFilter.dimension,
        stringFilter: { value: args.dimensionFilter.value },
      },
    }
  }

  try {
    const [response] = await client.runReport(request)
    return formatReport(response)
  } catch (err) {
    if (err.code === 3 || err.message?.includes('INVALID_ARGUMENT')) {
      throw new Error(
        `GA4 API エラー: リクエストが不正です。\n` +
          `dimensions: ${JSON.stringify(args.dimensions)}\n` +
          `metrics: ${JSON.stringify(args.metrics)}\n` +
          `ヒント: 数値パラメータ（accuracy, score 等）は metrics に、文字列パラメータ（quiz_mode, platform 等）は dimensions に指定してください。\n` +
          `原因: ${err.message}`
      )
    }
    throw err
  }
}

async function runRealtime(args) {
  if (!PROPERTY_ID) throw new Error('GA4_PROPERTY_ID が .env に設定されていません')
  const client = await getClient()

  const [response] = await client.runRealtimeReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: (args.dimensions ?? ['eventName']).map((name) => ({ name })),
    metrics: (args.metrics ?? ['activeUsers', 'eventCount']).map((name) => ({ name })),
  })
  return formatReport(response)
}

async function runSummary(args) {
  if (!PROPERTY_ID) throw new Error('GA4_PROPERTY_ID が .env に設定されていません')
  const client = await getClient()

  const days = args.days ?? 7
  const startDate = `${days}daysAgo`
  const property = `properties/${PROPERTY_ID}`

  const [overview, modeBreakdown, platformBreakdown, eventCounts] = await Promise.all([
    client.runReport({
      property,
      dimensions: [],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'eventCount' }],
      dateRanges: [{ startDate, endDate: 'today' }],
    }),
    client.runReport({
      property,
      dimensions: [{ name: 'customEvent:quiz_mode' }],
      metrics: [{ name: 'eventCount' }, { name: 'customEvent:accuracy' }],
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'quiz_complete' },
        },
      },
      limit: 20,
    }),
    client.runReport({
      property,
      dimensions: [{ name: 'customEvent:platform' }],
      metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
      dateRanges: [{ startDate, endDate: 'today' }],
      limit: 10,
    }),
    client.runReport({
      property,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dateRanges: [{ startDate, endDate: 'today' }],
      limit: 20,
    }),
  ])

  return {
    period: `${startDate} ~ today`,
    overview: formatReport(overview[0]),
    quiz_completion_by_mode: formatReport(modeBreakdown[0]),
    users_by_platform: formatReport(platformBreakdown[0]),
    event_counts: formatReport(eventCounts[0]),
  }
}

function formatReport(response) {
  if (!response || !response.rows || response.rows.length === 0) {
    return { rows: [], message: 'データなし' }
  }

  const dimensionHeaders = (response.dimensionHeaders ?? []).map((h) => h.name)
  const metricHeaders = (response.metricHeaders ?? []).map((h) => h.name)
  const headers = [...dimensionHeaders, ...metricHeaders]

  const rows = response.rows.map((row) => {
    const obj = {}
    ;(row.dimensionValues ?? []).forEach((v, i) => {
      obj[dimensionHeaders[i]] = v.value
    })
    ;(row.metricValues ?? []).forEach((v, i) => {
      obj[metricHeaders[i]] = v.value
    })
    return obj
  })

  return { headers, rows, rowCount: response.rowCount ?? rows.length }
}

// ============================================================
// MCP Server Setup (official SDK)
// ============================================================

const server = new McpServer({
  name: 'ga4-analytics',
  version: '1.0.0',
})

server.tool(
  'ga4_report',
  'GA4 カスタムレポートを実行する。ディメンション・指標・日付範囲・フィルタを指定して分析データを取得。',
  {
    dimensions: z
      .array(z.string())
      .describe(
        'ディメンション名の配列（文字列パラメータのみ）。例: ["eventName", "customEvent:quiz_mode", "customEvent:platform", "date", "city", "deviceCategory"]。注意: 数値パラメータ（accuracy, score, total, duration_sec 等）は dimensions に指定不可、metrics に指定すること'
      ),
    metrics: z
      .array(z.string())
      .describe(
        '指標名の配列（数値パラメータ可）。例: ["eventCount", "activeUsers", "sessions", "customEvent:accuracy", "customEvent:score"]。注意: 文字列パラメータ（quiz_mode, platform, action 等）は metrics に指定不可、dimensions に指定すること'
      ),
    startDate: z
      .string()
      .default('7daysAgo')
      .describe('開始日（YYYY-MM-DD or "7daysAgo", "30daysAgo", "yesterday", "today"）'),
    endDate: z.string().default('today').describe('終了日（YYYY-MM-DD or "today", "yesterday"）'),
    dimensionFilter: z
      .object({
        dimension: z.string(),
        value: z.string(),
      })
      .optional()
      .describe('ディメンションフィルタ。例: {"dimension": "eventName", "value": "quiz_complete"}'),
    limit: z.number().default(100).describe('結果の最大行数（デフォルト: 100）'),
  },
  async (args) => {
    const result = await runReport(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

server.tool(
  'ga4_realtime',
  'GA4 リアルタイムレポートを取得する。過去30分間のアクティブユーザーとイベントを表示。',
  {
    dimensions: z
      .array(z.string())
      .default(['eventName'])
      .describe('ディメンション。例: ["eventName", "customEvent:platform"]'),
    metrics: z
      .array(z.string())
      .default(['eventCount'])
      .describe('指標。例: ["eventCount"]。注意: activeUsers は dimensions 指定なしの時のみ使用可能'),
  },
  async (args) => {
    const result = await runRealtime(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

server.tool(
  'ga4_summary',
  '直近N日間の主要KPIサマリーを取得する。モード別利用状況、完了率、プラットフォーム別ユーザー数など。',
  {
    days: z.number().default(7).describe('集計日数（デフォルト: 7）'),
  },
  async (args) => {
    const result = await runSummary(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

// Start
const transport = new StdioServerTransport()
await server.connect(transport)
