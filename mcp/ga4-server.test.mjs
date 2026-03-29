#!/usr/bin/env node
/**
 * Smoke test for GA4 MCP Server
 *
 * Run: node mcp/ga4-server.test.mjs
 *
 * Tests the env parser regex, MCP protocol handshake, tool listing,
 * and missing-PROPERTY_ID error path. No actual GA4 API calls are made.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVER_PATH = resolve(__dirname, 'ga4-server.mjs')

let passed = 0
let failed = 0

function test(name, fn) {
  return fn()
    .then(() => {
      console.log(`  PASS: ${name}`)
      passed++
    })
    .catch((err) => {
      console.error(`  FAIL: ${name}`)
      console.error(`        ${err.message}`)
      failed++
    })
}

// ============================================================
// Helper: MCP client over stdio with Content-Length framing
// ============================================================

function createMcpClient(serverPath, env) {
  const proc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env ?? process.env,
  })

  let buffer = Buffer.alloc(0)
  let resolveNext = null

  proc.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    drain()
  })

  function drain() {
    const str = buffer.toString('utf-8')
    const headerEnd = str.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    const header = str.slice(0, headerEnd)
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i)
    if (!lengthMatch) return

    const contentLength = parseInt(lengthMatch[1], 10)
    const bodyStart = Buffer.byteLength(header + '\r\n\r\n', 'utf-8')
    if (buffer.length < bodyStart + contentLength) return

    const body = buffer.slice(bodyStart, bodyStart + contentLength).toString('utf-8')
    buffer = buffer.slice(bodyStart + contentLength)

    if (resolveNext) {
      const r = resolveNext
      resolveNext = null
      r(JSON.parse(body))
    }
  }

  function send(obj) {
    const json = JSON.stringify(obj)
    proc.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`)
    return new Promise((resolve, reject) => {
      resolveNext = resolve
      setTimeout(() => reject(new Error('Timeout waiting for MCP response')), 5000)
    })
  }

  function close() {
    proc.stdin.end()
    proc.kill()
  }

  return { send, close }
}

// ============================================================
// 1. Env parser regex
// ============================================================

async function testEnvRegex() {
  const regex = /^([A-Z0-9_]+)=(.+)$/

  await test('regex matches GA4_PROPERTY_ID', async () => {
    const m = 'GA4_PROPERTY_ID=123456'.match(regex)
    assert.ok(m)
    assert.equal(m[1], 'GA4_PROPERTY_ID')
    assert.equal(m[2], '123456')
  })

  await test('regex matches GA4_MEASUREMENT_ID', async () => {
    const m = 'GA4_MEASUREMENT_ID=G-ABCDEF'.match(regex)
    assert.ok(m)
    assert.equal(m[1], 'GA4_MEASUREMENT_ID')
    assert.equal(m[2], 'G-ABCDEF')
  })

  await test('regex matches GOOGLE_APPLICATION_CREDENTIALS', async () => {
    const m = 'GOOGLE_APPLICATION_CREDENTIALS=~/keys/sa.json'.match(regex)
    assert.ok(m)
    assert.equal(m[1], 'GOOGLE_APPLICATION_CREDENTIALS')
    assert.equal(m[2], '~/keys/sa.json')
  })

  await test('regex matches VITE_GTM_ID', async () => {
    const m = 'VITE_GTM_ID=GTM-XXXX'.match(regex)
    assert.ok(m)
    assert.equal(m[1], 'VITE_GTM_ID')
    assert.equal(m[2], 'GTM-XXXX')
  })

  await test('regex ignores comments and blank lines', async () => {
    assert.equal('# comment'.match(regex), null)
    assert.equal(''.match(regex), null)
    assert.equal('  SPACES=bad'.match(regex), null)
  })
}

// ============================================================
// 2-3. MCP protocol: initialize + tools/list
// ============================================================

async function testMcpProtocol() {
  const client = createMcpClient(SERVER_PATH)

  try {
    await test('initialize returns correct server info', async () => {
      const res = await client.send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '0.1.0' },
        },
      })
      assert.equal(res.jsonrpc, '2.0')
      assert.equal(res.id, 1)
      assert.equal(res.result.protocolVersion, '2024-11-05')
      assert.equal(res.result.serverInfo.name, 'ga4-analytics')
      assert.equal(res.result.serverInfo.version, '1.0.0')
      assert.deepEqual(res.result.capabilities, { tools: {} })
    })

    await test('tools/list returns 3 tools (ga4_report, ga4_realtime, ga4_summary)', async () => {
      const res = await client.send({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      })
      assert.equal(res.id, 2)
      const names = res.result.tools.map((t) => t.name).sort()
      assert.deepEqual(names, ['ga4_realtime', 'ga4_report', 'ga4_summary'])
    })
  } finally {
    client.close()
  }
}

// ============================================================
// 4. Missing PROPERTY_ID error
//    Copy the server to a temp dir (no .env in parent) and spawn
//    it with GA4_PROPERTY_ID stripped from the environment.
// ============================================================

async function testMissingPropertyId() {
  // Create temp dir: <tmp>/mcp/ga4-server.mjs
  // The server resolves .env from resolve(__dirname, '..') which
  // will be <tmp>/ -- no .env there, so PROPERTY_ID stays unset.
  const tmpDir = mkdtempSync(join(tmpdir(), 'mcp-test-'))
  const mcpDir = join(tmpDir, 'mcp')
  const tmpServer = join(mcpDir, 'ga4-server.mjs')

  // Copy the server file
  cpSync(SERVER_PATH, tmpServer, { recursive: true })

  // Spawn with a clean env (no GA4_PROPERTY_ID, no .env to load)
  const env = { ...process.env }
  delete env.GA4_PROPERTY_ID

  const client = createMcpClient(tmpServer, env)

  try {
    // Initialize first (required by protocol)
    await client.send({
      jsonrpc: '2.0',
      id: 10,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0.1.0' } },
    })

    await test('tools/call returns error when GA4_PROPERTY_ID is not set', async () => {
      const res = await client.send({
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'ga4_report',
          arguments: { dimensions: ['eventName'], metrics: ['eventCount'] },
        },
      })
      assert.equal(res.id, 11)
      const text = res.result.content[0].text
      const parsed = JSON.parse(text)
      assert.ok(parsed.error, `Expected error property, got: ${text}`)
      assert.ok(parsed.error.includes('GA4_PROPERTY_ID'), `Error should mention GA4_PROPERTY_ID: ${parsed.error}`)
    })
  } finally {
    client.close()
  }
}

// ============================================================
// Run all tests
// ============================================================

console.log('\nGA4 MCP Server - Smoke Tests\n')

console.log('[Env parser regex]')
await testEnvRegex()

console.log('\n[MCP protocol]')
await testMcpProtocol()

console.log('\n[Missing PROPERTY_ID]')
await testMissingPropertyId()

console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
