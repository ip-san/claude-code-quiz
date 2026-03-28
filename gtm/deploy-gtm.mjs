#!/usr/bin/env node
/**
 * GTM コンテナ自動デプロイ
 *
 * events.json の定義を GTM API 経由でコンテナに反映し、公開する。
 * 手動インポート不要で、events.json を変更するだけで GTM が更新される。
 *
 * 使い方:
 *   node gtm/deploy-gtm.mjs              # ドライラン（変更内容を表示）
 *   node gtm/deploy-gtm.mjs --apply      # 実際に適用して公開
 *
 * 環境変数（.env）:
 *   GOOGLE_APPLICATION_CREDENTIALS - サービスアカウントキー
 *   VITE_GTM_ID - GTMコンテナの公開ID（例: GTM-KRDHH2T2）
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
    if (match) process.env[match[1]] = match[2].trim().replace(/^~/, homedir())
  }
} catch {
  console.error('Error: .env not found')
  process.exit(1)
}

const apply = process.argv.includes('--apply')

// Google Auth
const { GoogleAuth } = await import('google-auth-library')
const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
    'https://www.googleapis.com/auth/tagmanager.publish',
  ],
})
const client = await auth.getClient()

const GTM_API = 'https://tagmanager.googleapis.com/tagmanager/v2'

// events.json 読み込み
const events = JSON.parse(readFileSync(resolve(__dirname, 'events.json'), 'utf-8'))
const allParams = [...new Set(events.events.flatMap((e) => e.params))]

// GTM アカウント・コンテナを検索
async function findContainer() {
  const gtmId = process.env.VITE_GTM_ID
  if (!gtmId) {
    console.error('Error: VITE_GTM_ID not set in .env')
    process.exit(1)
  }

  const { data: accounts } = await client.request({ url: `${GTM_API}/accounts` })
  for (const account of accounts.account ?? []) {
    const { data: containers } = await client.request({
      url: `${GTM_API}/${account.path}/containers`,
    })
    for (const container of containers.container ?? []) {
      if (container.publicId === gtmId) {
        return container
      }
    }
  }
  console.error(`Error: Container ${gtmId} not found`)
  process.exit(1)
}

// ワークスペース取得（Default Workspace）
async function getWorkspace(containerPath) {
  const { data } = await client.request({ url: `${GTM_API}/${containerPath}/workspaces` })
  return data.workspace?.[0]
}

// 既存のタグ・トリガー・変数を取得
async function getExisting(workspacePath) {
  const [tagsRes, triggersRes, variablesRes] = await Promise.all([
    client.request({ url: `${GTM_API}/${workspacePath}/tags` }),
    client.request({ url: `${GTM_API}/${workspacePath}/triggers` }),
    client.request({ url: `${GTM_API}/${workspacePath}/variables` }),
  ])
  return {
    tags: tagsRes.data.tag ?? [],
    triggers: triggersRes.data.trigger ?? [],
    variables: variablesRes.data.variable ?? [],
  }
}

// データレイヤー変数を作成/更新
async function syncVariable(workspacePath, paramName, existing) {
  const name = `DLV - ${paramName}`
  const found = existing.find((v) => v.name === name)
  const body = {
    name,
    type: 'v',
    parameter: [
      { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
      { type: 'TEMPLATE', key: 'name', value: paramName },
    ],
  }

  if (found) {
    console.log(`  SKIP (existing): ${name}`)
    return found
  }

  console.log(`  ${apply ? 'CREATE' : 'WOULD CREATE'}: ${name}`)
  if (!apply) return null

  const { data } = await client.request({
    url: `${GTM_API}/${workspacePath}/variables`,
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

// カスタムイベントトリガーを作成/更新
async function syncTrigger(workspacePath, eventName, existing) {
  const name = `CE - ${eventName}`
  const found = existing.find((t) => t.name === name)
  const body = {
    name,
    type: 'customEvent',
    customEventFilter: [
      {
        type: 'equals',
        parameter: [
          { type: 'template', key: 'arg0', value: '{{_event}}' },
          { type: 'template', key: 'arg1', value: eventName },
        ],
      },
    ],
  }

  if (found) {
    console.log(`  SKIP (existing): ${name}`)
    return found
  }

  console.log(`  ${apply ? 'CREATE' : 'WOULD CREATE'}: ${name}`)
  if (!apply) return { triggerId: 'dry-run' }

  const { data } = await client.request({
    url: `${GTM_API}/${workspacePath}/triggers`,
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

// GA4 イベントタグを作成/更新
async function syncEventTag(workspacePath, event, triggerId, configTagName, existing) {
  const name = `GA4 Event - ${event.name}`
  const found = existing.find((t) => t.name === name)
  const body = {
    name,
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
  }

  if (found) {
    // パラメータが変わっている場合は更新
    const existingParams = found.parameter
      ?.find((p) => p.key === 'eventParameters')
      ?.list?.map((item) => item.map?.find((m) => m.key === 'name')?.value)
      ?.filter(Boolean)
      ?.sort() ?? []
    const newParams = [...event.params].sort()

    if (JSON.stringify(existingParams) === JSON.stringify(newParams)) {
      console.log(`  SKIP (existing): ${name}`)
      return found
    }

    console.log(`  ${apply ? 'UPDATE' : 'WOULD UPDATE'}: ${name} (params changed)`)
    if (!apply) return found

    const { data } = await client.request({
      url: `${GTM_API}/${found.path}`,
      method: 'PUT',
      body: JSON.stringify({ ...body, fingerprint: found.fingerprint }),
    })
    return data
  }

  console.log(`  ${apply ? 'CREATE' : 'WOULD CREATE'}: ${name}`)
  if (!apply) return null

  const { data } = await client.request({
    url: `${GTM_API}/${workspacePath}/tags`,
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

// バージョン作成 & 公開
async function publishVersion(workspacePath) {
  console.log('\nCreating version...')
  const { data: version } = await client.request({
    url: `${GTM_API}/${workspacePath}:create_version`,
    method: 'POST',
    body: JSON.stringify({ name: `Auto-deploy ${new Date().toISOString().split('T')[0]}` }),
  })

  if (version.containerVersion) {
    console.log('Publishing...')
    await client.request({
      url: `${GTM_API}/${version.containerVersion.path}:publish`,
      method: 'POST',
    })
    console.log(`Published version: ${version.containerVersion.containerVersionId}`)
  }
}

// メイン処理
async function main() {
  console.log(apply ? 'Mode: APPLY (changes will be made)\n' : 'Mode: DRY RUN (no changes)\n')

  const container = await findContainer()
  console.log(`Container: ${container.name} (${container.publicId})`)

  const workspace = await getWorkspace(container.path)
  console.log(`Workspace: ${workspace.name}\n`)

  const existing = await getExisting(workspace.path)

  // GA4 Config タグを探す
  const configTag = existing.tags.find((t) => t.name === 'GA4 - Config')
  if (!configTag) {
    console.error('Error: GA4 - Config tag not found. Create it manually in GTM first.')
    process.exit(1)
  }

  // 変数の同期
  console.log('=== Variables ===')
  for (const param of allParams) {
    await syncVariable(workspace.path, param, existing.variables)
  }

  // トリガーの同期
  console.log('\n=== Triggers ===')
  const triggerMap = {}
  for (const event of events.events) {
    const trigger = await syncTrigger(workspace.path, event.name, existing.triggers)
    triggerMap[event.name] = trigger?.triggerId
  }

  // タグの同期
  console.log('\n=== Tags ===')
  for (const event of events.events) {
    await syncEventTag(workspace.path, event, triggerMap[event.name], configTag.name, existing.tags)
  }

  // 公開
  if (apply) {
    await publishVersion(workspace.path)
  }

  console.log(apply ? '\nDone! GTM container updated and published.' : '\nDry run complete. Use --apply to make changes.')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
