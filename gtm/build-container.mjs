#!/usr/bin/env node
/**
 * GTM コンテナ設定ビルダー
 *
 * events.json（人間が読む定義）+ GTMエクスポートJSON（ベース）→ インポート用JSONを生成。
 * GA4 Config タグはGTM管理画面で手動作成済みの前提。イベントタグ・トリガー・変数を追加する。
 *
 * 使い方:
 *   node gtm/build-container.mjs <exported.json>            # テンプレート生成
 *   node gtm/build-container.mjs <exported.json> --import   # + .env からMeasurement ID注入
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const doImport = process.argv.includes('--import')

if (args.length === 0) {
  console.error('使い方: node gtm/build-container.mjs <exported-container.json> [--import]')
  console.error('')
  console.error('  GTM管理画面でGA4 Configタグを作成後、コンテナをエクスポートしたJSONを指定。')
  process.exit(1)
}

// ベースJSON読み込み
const base = JSON.parse(readFileSync(resolve(args[0]), 'utf-8'))
const cv = base.containerVersion
const accountId = cv.accountId
const containerId = cv.containerId

// GA4 Config タグが含まれているか確認
const configTag = (cv.tag ?? []).find((t) => t.name === 'GA4 - Config')
if (!configTag) {
  console.error('Error: GA4 - Config タグが見つかりません。GTM管理画面で先に作成してください。')
  process.exit(1)
}
const configTagName = configTag.name

// events.json 読み込み
const events = JSON.parse(readFileSync(resolve(__dirname, 'events.json'), 'utf-8'))
const allParams = [...new Set(events.events.flatMap((e) => e.params))]

const fp = () => String(Date.now() + Math.floor(Math.random() * 1000))

// 既存の最大IDを取得してそこから続番
const existingTagIds = (cv.tag ?? []).map((t) => Number(t.tagId))
const existingTriggerIds = [] // トリガーは新規のみ
const existingVariableIds = (cv.variable ?? []).map((v) => Number(v.variableId))

let nextTagId = Math.max(10, ...existingTagIds) + 1
let nextTriggerId = 10
let nextVariableId = Math.max(10, ...existingVariableIds) + 1

function buildVariable(paramName) {
  return {
    accountId,
    containerId,
    variableId: String(nextVariableId++),
    name: `DLV - ${paramName}`,
    type: 'v',
    parameter: [
      { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
      { type: 'TEMPLATE', key: 'name', value: paramName },
    ],
    fingerprint: fp(),
  }
}

function buildTrigger(eventName) {
  const id = String(nextTriggerId++)
  return {
    obj: {
      accountId,
      containerId,
      triggerId: id,
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
      fingerprint: fp(),
    },
    id,
  }
}

function buildEventTag(event, triggerId) {
  return {
    accountId,
    containerId,
    tagId: String(nextTagId++),
    name: `GA4 Event - ${event.name}`,
    type: 'gaawe',
    parameter: [
      { type: 'TEMPLATE', key: 'eventName', value: event.name },
      { type: 'TAG_REFERENCE', key: 'measurementId', value: configTagName },
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
    firingTriggerId: [triggerId],
    tagFiringOption: 'ONCE_PER_EVENT',
    monitoringMetadata: { type: 'MAP' },
    consentSettings: { consentStatus: 'NOT_SET' },
    fingerprint: fp(),
  }
}

function buildContainer() {
  nextTagId = Math.max(10, ...existingTagIds) + 1
  nextTriggerId = 10
  nextVariableId = Math.max(10, ...existingVariableIds) + 1

  const triggerResults = events.events.map((e) => buildTrigger(e.name))
  const triggers = triggerResults.map((r) => r.obj)
  const triggerIdMap = Object.fromEntries(events.events.map((e, i) => [e.name, triggerResults[i].id]))

  const newTags = events.events.map((e) => buildEventTag(e, triggerIdMap[e.name]))
  const variables = allParams.map(buildVariable)

  return {
    exportFormatVersion: 2,
    exportTime: new Date().toISOString().replace('T', ' ').split('.')[0],
    containerVersion: {
      ...cv,
      tag: [...(cv.tag ?? []), ...newTags],
      trigger: [...(cv.trigger ?? []), ...triggers],
      variable: [...(cv.variable ?? []), ...variables],
      fingerprint: fp(),
    },
  }
}

// テンプレート生成
const template = buildContainer()
const templatePath = resolve(__dirname, 'container-config.json')
writeFileSync(templatePath, JSON.stringify(template, null, 4) + '\n')
console.log(`Generated: ${templatePath}`)
console.log(`  ${events.events.length} event tags + ${configTagName} (existing)`)
console.log(`  ${events.events.length} triggers, ${allParams.length} variables`)

if (doImport) {
  const importPath = resolve(__dirname, 'container-import.json')
  writeFileSync(importPath, JSON.stringify(template, null, 4) + '\n')
  console.log(`Generated: ${importPath}`)
  console.log()
  console.log('GTM にインポートする手順:')
  console.log('  1. tagmanager.google.com → 管理 → コンテナをインポート')
  console.log(`  2. ${importPath} を選択`)
  console.log('  3. ワークスペース: Default Workspace')
  console.log('  4. オプション: 「統合」を選択（GA4 Configタグを保持）')
  console.log('  5. 「確認」→ インポート完了')
  console.log('  6. プレビューで確認後「公開」')
}
