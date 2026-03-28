#!/usr/bin/env node
/**
 * GTM コンテナ設定ビルダー
 *
 * events.json（人間が読む定義）→ container-config.json（GTMインポート用）を生成。
 * --import オプション付きで .env の Measurement ID を注入した container-import.json も生成。
 *
 * 使い方:
 *   node gtm/build-container.mjs           # テンプレート生成のみ
 *   node gtm/build-container.mjs --import  # + .env から Measurement ID を注入
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// events.json 読み込み
const events = JSON.parse(readFileSync(resolve(__dirname, 'events.json'), 'utf-8'))

// 全イベントから使われるパラメータを収集（ユニーク）
const allParams = [...new Set(events.events.flatMap((e) => e.params))]

// データレイヤー変数を生成
function buildVariable(paramName) {
  return {
    accountId: '0',
    containerId: '0',
    name: `DLV - ${paramName}`,
    type: 'v',
    parameter: [
      { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
      { type: 'TEMPLATE', key: 'name', value: paramName },
    ],
  }
}

// Measurement ID 定数変数
function buildMeasurementIdVariable(measurementId) {
  return {
    accountId: '0',
    containerId: '0',
    name: 'GA4 Measurement ID',
    type: 'c',
    parameter: [{ type: 'TEMPLATE', key: 'value', value: measurementId }],
  }
}

// カスタムイベントトリガーを生成
function buildTrigger(eventName) {
  return {
    accountId: '0',
    containerId: '0',
    triggerId: `${eventName}_trigger`,
    name: `CE - ${eventName}`,
    type: 'CUSTOM_EVENT',
    customEventFilter: [
      {
        type: 'EQUALS',
        parameter: [
          { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
          { type: 'TEMPLATE', key: 'arg1', value: eventName },
        ],
      },
    ],
  }
}

// GA4 イベントタグを生成
function buildTag(event) {
  return {
    accountId: '0',
    containerId: '0',
    name: `GA4 Event - ${event.name}`,
    type: 'gaawe',
    parameter: [
      { type: 'TEMPLATE', key: 'eventName', value: event.name },
      { type: 'TAG_REFERENCE', key: 'measurementId', value: 'GA4 - Config' },
      {
        type: 'LIST',
        key: 'eventParameters',
        list: event.params.map((param) => ({
          type: 'MAP',
          map: [
            { type: 'TEMPLATE', key: 'name', value: param },
            { type: 'TEMPLATE', key: 'value', value: `{{DLV - ${param}}}` },
          ],
        })),
      },
    ],
    firingTriggerId: [`${event.name}_trigger`],
    tagFiringOption: 'ONCE_PER_EVENT',
  }
}

// GA4 Config タグ
function buildConfigTag() {
  return {
    accountId: '0',
    containerId: '0',
    name: 'GA4 - Config',
    type: 'gaaw',
    parameter: [{ type: 'TEMPLATE', key: 'measurementId', value: '{{GA4 Measurement ID}}' }],
    firingTriggerId: ['2147483647'],
    tagFiringOption: 'ONCE_PER_EVENT',
  }
}

// コンテナ JSON を組み立て
function buildContainer(measurementId) {
  return {
    exportFormatVersion: 2,
    exportTime: new Date().toISOString().split('T')[0],
    containerVersion: {
      tag: [buildConfigTag(), ...events.events.map(buildTag)],
      trigger: events.events.map((e) => buildTrigger(e.name)),
      variable: [buildMeasurementIdVariable(measurementId), ...allParams.map(buildVariable)],
    },
  }
}

// テンプレート版（Measurement ID = プレースホルダー）を生成
const template = buildContainer('G-XXXXXXXXXX')
const templatePath = resolve(__dirname, 'container-config.json')
writeFileSync(templatePath, JSON.stringify(template, null, 2) + '\n')
console.log(`Generated: ${templatePath}`)
console.log(`  ${events.events.length} events, ${allParams.length} variables`)

// --import オプション: .env から Measurement ID を注入
if (process.argv.includes('--import')) {
  const envPath = resolve(rootDir, '.env')
  let envContent
  try {
    envContent = readFileSync(envPath, 'utf-8')
  } catch {
    console.error('Error: .env not found. Run: cp .env.example .env')
    process.exit(1)
  }

  const match = envContent.match(/^GA4_MEASUREMENT_ID=(.+)$/m)
  if (!match || !match[1].trim()) {
    console.error('Error: GA4_MEASUREMENT_ID is not set in .env')
    process.exit(1)
  }

  const measurementId = match[1].trim()
  const importConfig = buildContainer(measurementId)
  const importPath = resolve(__dirname, 'container-import.json')
  writeFileSync(importPath, JSON.stringify(importConfig, null, 2) + '\n')
  console.log(`Generated: ${importPath}`)
  console.log(`  Measurement ID: ${measurementId}`)
  console.log()
  console.log('GTM にインポートする手順:')
  console.log('  1. tagmanager.google.com を開く')
  console.log('  2. 管理 → コンテナをインポート')
  console.log(`  3. ${importPath} を選択`)
  console.log('  4. ワークスペース: 既存（Default Workspace）')
  console.log('  5. オプション: 「統合」を選択')
  console.log('  6. 「確認」→ インポート完了')
  console.log('  7. プレビューで動作確認後、「公開」')
}
