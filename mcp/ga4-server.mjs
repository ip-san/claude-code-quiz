#!/usr/bin/env node
/**
 * GA4 Analytics MCP Server
 *
 * Claude Code から GA4 の分析データを直接クエリできる MCP サーバー。
 * stdin/stdout で JSON-RPC メッセージをやり取りする（MCP stdio transport）。
 *
 * 提供するツール:
 *   - ga4_report: カスタムレポートを実行（ディメンション・指標・日付範囲を指定）
 *   - ga4_realtime: リアルタイムデータを取得
 *   - ga4_summary: 直近N日間のサマリー（よく使うレポートのプリセット）
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// .env 読み込み
const envPath = resolve(rootDir, '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/)
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
// MCP Protocol
// ============================================================

const TOOLS = [
  {
    name: 'ga4_report',
    description:
      'GA4 カスタムレポートを実行する。ディメンション・指標・日付範囲・フィルタを指定して分析データを取得。',
    inputSchema: {
      type: 'object',
      properties: {
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description:
            'ディメンション名の配列。例: ["eventName", "customEvent:quiz_mode", "customEvent:platform", "date", "city", "deviceCategory"]',
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description:
            '指標名の配列。例: ["eventCount", "activeUsers", "sessions", "customEvent:accuracy", "customEvent:score"]',
        },
        startDate: {
          type: 'string',
          description: '開始日（YYYY-MM-DD or "7daysAgo", "30daysAgo", "yesterday", "today"）',
          default: '7daysAgo',
        },
        endDate: {
          type: 'string',
          description: '終了日（YYYY-MM-DD or "today", "yesterday"）',
          default: 'today',
        },
        dimensionFilter: {
          type: 'object',
          description: 'ディメンションフィルタ。例: {"dimension": "eventName", "value": "quiz_complete"}',
          properties: {
            dimension: { type: 'string' },
            value: { type: 'string' },
          },
        },
        limit: {
          type: 'number',
          description: '結果の最大行数（デフォルト: 100）',
          default: 100,
        },
      },
      required: ['dimensions', 'metrics'],
    },
  },
  {
    name: 'ga4_realtime',
    description: 'GA4 リアルタイムレポートを取得する。過去30分間のアクティブユーザーとイベントを表示。',
    inputSchema: {
      type: 'object',
      properties: {
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'ディメンション。例: ["eventName", "customEvent:platform"]',
          default: ['eventName'],
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: '指標。例: ["activeUsers", "eventCount"]',
          default: ['activeUsers', 'eventCount'],
        },
      },
    },
  },
  {
    name: 'ga4_summary',
    description:
      '直近N日間の主要KPIサマリーを取得する。モード別利用状況、完了率、プラットフォーム別ユーザー数など。',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: '集計日数（デフォルト: 7）',
          default: 7,
        },
      },
    },
  },
]

// ツール実行
async function handleToolCall(name, args) {
  if (!PROPERTY_ID) {
    return { error: 'GA4_PROPERTY_ID が .env に設定されていません' }
  }

  const client = await getClient()

  switch (name) {
    case 'ga4_report':
      return await runReport(client, args)
    case 'ga4_realtime':
      return await runRealtime(client, args)
    case 'ga4_summary':
      return await runSummary(client, args)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

async function runReport(client, args) {
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

  const [response] = await client.runReport(request)
  return formatReport(response)
}

async function runRealtime(client, args) {
  const [response] = await client.runRealtimeReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: (args.dimensions ?? ['eventName']).map((name) => ({ name })),
    metrics: (args.metrics ?? ['activeUsers', 'eventCount']).map((name) => ({ name })),
  })
  return formatReport(response)
}

async function runSummary(client, args) {
  const days = args.days ?? 7
  const startDate = `${days}daysAgo`
  const property = `properties/${PROPERTY_ID}`

  // 並列で複数レポートを実行
  const [overview, modeBreakdown, platformBreakdown, eventCounts] = await Promise.all([
    // 1. 全体概要
    client.runReport({
      property,
      dimensions: [],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'eventCount' },
      ],
      dateRanges: [{ startDate, endDate: 'today' }],
    }),
    // 2. モード別クイズ完了
    client.runReport({
      property,
      dimensions: [{ name: 'customEvent:quiz_mode' }],
      metrics: [
        { name: 'eventCount' },
        { name: 'customEvent:accuracy' },
      ],
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'quiz_complete' },
        },
      },
      limit: 20,
    }),
    // 3. プラットフォーム別
    client.runReport({
      property,
      dimensions: [{ name: 'customEvent:platform' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'eventCount' },
      ],
      dateRanges: [{ startDate, endDate: 'today' }],
      limit: 10,
    }),
    // 4. イベント別カウント
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
// MCP JSON-RPC over stdio
// ============================================================

const rl = createInterface({ input: process.stdin })
let buffer = ''

function send(response) {
  const json = JSON.stringify(response)
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`)
}

function handleMessage(message) {
  const { id, method, params } = message

  switch (method) {
    case 'initialize':
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'ga4-analytics', version: '1.0.0' },
        },
      })
      break

    case 'notifications/initialized':
      // No response needed for notifications
      break

    case 'tools/list':
      send({
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      })
      break

    case 'tools/call':
      handleToolCall(params.name, params.arguments ?? {})
        .then((result) => {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
            },
          })
        })
        .catch((err) => {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Error: ${err.message}` }],
              isError: true,
            },
          })
        })
      break

    default:
      if (id) {
        send({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        })
      }
  }
}

// Content-Length based message parsing
rl.on('line', (line) => {
  buffer += line + '\n'

  // Try to parse complete messages
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n')
    if (headerEnd === -1) {
      // Also try \n\n
      const altEnd = buffer.indexOf('\n\n')
      if (altEnd === -1) break

      const header = buffer.slice(0, altEnd)
      const lengthMatch = header.match(/Content-Length:\s*(\d+)/i)
      if (!lengthMatch) {
        // No content-length header, try parsing as raw JSON
        try {
          const msg = JSON.parse(buffer.trim())
          buffer = ''
          handleMessage(msg)
        } catch {
          // Not yet complete
        }
        break
      }

      const contentLength = parseInt(lengthMatch[1], 10)
      const bodyStart = altEnd + 2
      const body = buffer.slice(bodyStart, bodyStart + contentLength)

      if (Buffer.byteLength(body) < contentLength) break

      buffer = buffer.slice(bodyStart + contentLength)
      try {
        handleMessage(JSON.parse(body))
      } catch {
        // skip malformed messages
      }
      continue
    }

    const header = buffer.slice(0, headerEnd)
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i)
    if (!lengthMatch) break

    const contentLength = parseInt(lengthMatch[1], 10)
    const bodyStart = headerEnd + 4
    const body = buffer.slice(bodyStart, bodyStart + contentLength)

    if (Buffer.byteLength(body) < contentLength) break

    buffer = buffer.slice(bodyStart + contentLength)
    try {
      handleMessage(JSON.parse(body))
    } catch {
      // skip malformed messages
    }
  }
})

// Keep process alive
process.stdin.resume()
