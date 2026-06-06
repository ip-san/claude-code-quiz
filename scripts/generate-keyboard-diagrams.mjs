#!/usr/bin/env node

/**
 * Generate keyboard-diagram data for shortcut questions.
 *
 * keyboard/session/commands カテゴリのうち「物理キー操作」を教える問題に対し、
 * 正答に紐づくショートカットを Haiku に抽出させ keyboard ダイアグラム JSON を生成する。
 * /command・設定ファイル・概念問題など物理キーでないものは null（スキップ）。
 *
 * Usage:
 *   node scripts/generate-keyboard-diagrams.mjs --limit 6   # 先頭6問でドライ生成
 *   node scripts/generate-keyboard-diagrams.mjs             # 全候補
 *   node scripts/generate-keyboard-diagrams.mjs --resume    # 既存出力に追記
 * Output: .claude/tmp/keyboard-diagrams.json  { items: { id: <KeyboardDiagram|null> } }
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { isValidKbDiagram } from './keyboard-diagram-validate.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')
const OUT_PATH = resolve(__dirname, '../.claude/tmp/keyboard-diagrams.json')

const args = process.argv.slice(2)
const intArg = (flag, fallback) => {
  const i = args.indexOf(flag)
  if (i < 0) return fallback
  const n = Number(args[i + 1])
  return Number.isInteger(n) && n > 0 ? n : fallback // 整数のみ（小数でバッチ境界がずれるのを防ぐ）
}
const LIMIT = intArg('--limit', null)
const BATCH_SIZE = intArg('--batch', 6) // 不正値(--batch 値なし/非数値)でも NaN→無限ループにしない
const RESUME = args.includes('--resume')
const MODEL = args.includes('--sonnet') ? 'sonnet' : 'haiku'

const quizFile = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
const allQuizzes = quizFile.quizzes

// 候補抽出は広め(偽陽性は Claude の厳格 null 判定が除外する)。Tab/Enter 単独も許容。
// 単独英単語キー(Esc/Tab/Enter/Backspace)は語境界を要求し「Enterprise」等の部分一致を除外する。
const KEY_RE =
  /Ctrl[+-][A-Za-z]|Cmd[+-]|⌘|Shift\+Tab|Shift\+Enter|Alt[+-][A-Za-z]|矢印キー|(?<![A-Za-z])(?:Esc|Tab|Enter|Backspace)(?![A-Za-z])/
const correctText = (q) => q.options?.[q.correctIndex]?.text ?? ''
const candidates = allQuizzes.filter((q) => {
  if ((q.diagrams || []).some((d) => d.type === 'keyboard')) return false // 既存 keyboard 図は除外（冪等）
  // keyboard カテゴリ: 設問/解説/正答のいずれかにキーがあれば対象
  // (設問が概念表現で正答がキー操作の問題 例: key-025 Tab/Enter を取りこぼさない)
  if (q.category === 'keyboard') return KEY_RE.test(`${q.question} ${q.explanation || ''} ${correctText(q)}`)
  // commands/session: キーが「設問文自体」にある場合のみ（解説の言及だけの /command 問題を除外）
  if (q.category === 'commands' || q.category === 'session') return KEY_RE.test(q.question)
  return false
})

let existing = {}
if (RESUME && existsSync(OUT_PATH)) {
  try {
    existing = JSON.parse(readFileSync(OUT_PATH, 'utf8')).items || {}
  } catch {
    /* ignore */
  }
}
let targets = candidates.filter((q) => !RESUME || !(q.id in existing))
if (LIMIT) targets = targets.slice(0, LIMIT)

console.log(`[start] model=${MODEL} 候補=${candidates.length} 対象=${targets.length}`)
if (targets.length === 0) {
  console.log('[done] 対象なし')
  process.exit(0)
}

function buildPrompt(batch) {
  const items = batch.map((q) => {
    const correct = q.options?.[q.correctIndex]?.text ?? ''
    return {
      id: q.id,
      question: q.question.replace(/\n/g, ' ').slice(0, 220),
      correctAnswer: correct.slice(0, 160),
      explanation: (q.explanation || '')
        .replace(/\{\{diagram:\d+\}\}/g, '')
        .replace(/\n/g, ' ')
        .slice(0, 320),
    }
  })

  return `あなたは Claude Code クイズの解説に添える「キーボード図」のデータを作るアシスタントです。
各問題が教える物理キーのショートカットを、正答(correctAnswer)に基づいて JSON で表現してください。

## 出力スキーマ（KeyboardDiagram）
{ "combos": [ { "keys": [ { "label": "Ctrl" }, { "label": "C", "highlight": true } ], "caption": "中断" } ], "sequence": false, "caption": "任意の補足" }
- keys: 同時押しするキー。修飾キー(Ctrl/Shift/Alt/Cmd)は highlight 無し、操作の主役キーに "highlight": true
- combos: 同時押しの組を配列で。順番に押す手順(連打/シーケンス)なら "sequence": true（例 Esc を2回）
- 比較(例 Ctrl+D と Ctrl+C の違い)は combos に複数入れ "sequence": false。各 combo の caption に役割
- caption は12文字以内、日本語。なくてもよい
- ラベル表記: "Ctrl" "⇧ Shift" "Alt" "⌘ Cmd" "Esc" "Tab" "Enter" "C" "R" "K" 等。Mac記号は任意

## 重要な判定（厳格に）
- 「そのショートカット自体が設問の主題」で「正答がそのキー操作の内容」である場合のみ図を作る。
- 次は必ず null にする（誤った図は無い方がマシ）:
  - /スラッシュコマンド（/model, /plan, /theme, /tasks, /compact 等）の挙動が主題で、キーは付随的な言及にすぎないもの
  - モード・概念・効果の説明が主題（キーは脇役）
  - 設定ファイル/キーバインド定義の編集、kill ring 等の概念説明
  - 正答にそのキー操作が直接含まれないもの
- 「キーが文中に出てくる」だけでは作らない。設問が問うているのがキー操作そのものか、を基準にする。
- 少しでも迷ったら null。

## 出力フォーマット（JSONのみ。説明文なし）
{ "items": [ { "id": "key-003", "diagram": { ...KeyboardDiagram... } }, { "id": "cmd-006", "diagram": null } ] }

## 対象
${JSON.stringify(items, null, 2)}`
}

function callClaude(prompt) {
  const tmp = resolve(__dirname, '../.claude/tmp/.kbgen-prompt.txt')
  if (!existsSync(dirname(tmp))) mkdirSync(dirname(tmp), { recursive: true })
  writeFileSync(tmp, prompt)
  const result = execSync(`claude -p --model ${MODEL} --output-format json < "${tmp}"`, {
    timeout: 120_000,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let text = result
  try {
    const wrapper = JSON.parse(result)
    text = typeof wrapper === 'string' ? wrapper : wrapper.result || wrapper.content || JSON.stringify(wrapper)
  } catch {
    /* not wrapper */
  }
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  return parseJsonLoose(text)
}

/**
 * `from`(='{') から対応する閉じ '}' までの balanced な部分文字列を返す（無ければ null）。
 * 文字列リテラル内の波括弧・エスケープは無視する。1スタートあたり O(n) の線形スキャン。
 */
function extractBalancedObject(text, from) {
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = from; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return text.slice(from, i + 1)
  }
  return null
}

/**
 * 緩いJSON抽出: 各 `{` 開始位置から balanced object を1つ取り出して JSON.parse する。
 * 貪欲な /\{[\s\S]*\}/ と違い「前置きの散文/スキーマ復唱に波括弧が含まれる」「本JSONの後ろに
 * 追記テキストや別オブジェクトがある」いずれの場合も正しい範囲を取り出せる。
 * 旧実装(開始×終了の総当たり)は壊れた大応答で JSON.parse が O(brace²) 爆発したが、
 * balanced 抽出により各スタート O(n)・JSON.parse はスタートあたり1回に抑える。
 * 期待スキーマは top-level `items` 配列を持つため、items を持つ object を優先して返す。
 */
function parseJsonLoose(text) {
  let fallback = null
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    const candidate = extractBalancedObject(text, start)
    if (!candidate) continue
    try {
      const obj = JSON.parse(candidate)
      if (obj && typeof obj === 'object' && Array.isArray(obj.items)) return obj // 望むものを優先
      if (fallback === null) fallback = obj
    } catch {
      /* try the next start position */
    }
  }
  if (fallback !== null) return fallback
  throw new Error('no parseable JSON object in response')
}

// 構造ガード isValidKbDiagram は keyboard-diagram-validate.mjs に集約（generate/apply で共有、
// Zod の下限・上限と同期）。combos/keys/label を満たさない図は null(スキップ)扱いにする。

const items = { ...existing }
let ok = 0
let errs = 0
let succeeded = 0 // 正常完了したバッチ数（全null 正当スキップも成功に数える）
for (let i = 0; i < targets.length; i += BATCH_SIZE) {
  const batch = targets.slice(i, i + BATCH_SIZE)
  const n = Math.floor(i / BATCH_SIZE) + 1
  const total = Math.ceil(targets.length / BATCH_SIZE)
  process.stdout.write(`[batch ${n}/${total}] ${batch.length}問... `)
  try {
    const res = callClaude(buildPrompt(batch))
    // items 配列が無い応答は失敗扱い（成功に紛れて対象IDが沈黙で欠損/再フェッチされ続けるのを防ぐ）
    if (!res || !Array.isArray(res.items)) throw new Error('response has no items array')
    // プロンプトのスキーマ例（id=key-003 等）を復唱した decoy JSON を掴んでいないか検証。
    // バッチ対象IDと1つも交差しない応答は誤抽出として失敗扱いにし、対象を欠損(=--resume対象)に残す。
    const batchIds = new Set(batch.map((q) => q.id))
    if (!res.items.some((e) => e && batchIds.has(e.id))) {
      throw new Error('response items do not match the requested batch ids (likely a schema-echo decoy)')
    }
    let hits = 0
    let dropped = 0
    const returnedIds = new Set()
    for (const entry of res.items) {
      if (!entry || !entry.id) continue // null/非オブジェクト要素は個別スキップ（バッチ全滅を防ぐ）
      returnedIds.add(entry.id)
      if (entry.diagram == null) {
        items[entry.id] = null
      } else if (isValidKbDiagram(entry.diagram)) {
        items[entry.id] = entry.diagram
        hits++
      } else {
        items[entry.id] = null // 不正構造は捨てて null（スキップ）扱い（id 記録済みのため --resume では再取得しない）
        dropped++
      }
    }
    // 応答に現れなかった対象ID（AI が省略）。これらは items 未記録なので --resume で再取得される。
    // （不正構造で null 化した ID は記録済みのため再取得対象外。再挑戦したい場合は該当 id を手動削除）
    const missing = batch.filter((q) => !returnedIds.has(q.id)).map((q) => q.id)
    ok += hits
    succeeded++
    console.log(
      `✓ ${hits}件に図を生成${dropped ? ` (不正構造 ${dropped}件を破棄)` : ''}${missing.length ? ` ⚠応答欠損 ${missing.length}件: ${missing.join(',')}` : ''}`
    )
    saveOutput(items)
  } catch (e) {
    errs++
    console.log(`✗ ${e.message}`)
  }
}

function saveOutput(it) {
  if (!existsSync(dirname(OUT_PATH))) mkdirSync(dirname(OUT_PATH), { recursive: true })
  const withDiagram = Object.values(it).filter(Boolean).length
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), model: MODEL, total: Object.keys(it).length, withDiagram, items: it },
      null,
      2
    )
  )
}

const nullCount = Object.values(items).filter((v) => v === null).length
console.log(`\n[done] 図生成=${ok} / null(スキップ)=${nullCount} / エラーバッチ=${errs}`)
console.log(`[output] ${OUT_PATH}`)
console.log(`次: node scripts/apply-keyboard-diagrams.mjs --dry-run で適用プレビュー`)

// 1バッチも正常完了しなかった場合のみ失敗終了（全null の正当スキップは成功扱い）。
// 自動化/パイプラインが総崩れ（CLI認証/モデル/レート制限）を検知できるように。
if (succeeded === 0 && errs > 0) {
  console.error('[fail] 全バッチがエラー。CLI認証/モデル/レート制限を確認してください')
  process.exit(1)
}
