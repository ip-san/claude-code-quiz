#!/usr/bin/env node

/**
 * One-off transformation: rewrite mid-sentence/mid-word split flow steps in
 * subagent-related quizzes (skill-*, ext-*, cmd-*, bp-*).
 *
 * Background: Past generators clipped flow `text` at a fixed character count
 * and stuffed the continuation into `sub`, producing things like
 *   text: "サブエージェントのpermissionMod"  sub: "eはdefault..."
 * which displays as visibly broken text in the answer card.
 *
 * This script applies a hand-curated map of (id, diagramIndex, stepIndex) →
 * { text, sub? } so each touched step becomes a complete sentence (sub
 * optional, used only for genuine clarifications).
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUIZ_PATH = resolve(__dirname, '../src/data/quizzes.json')

const fixes = [
  // skill-013: 組み込みエージェントタイプ
  ['skill-013', 1, 0, { text: 'agentフィールドで指定可能', sub: 'Explore / Plan / general-purpose' }],
  ['skill-013', 1, 1, { text: '省略時は general-purpose が使用される', sub: undefined }],
  ['skill-013', 1, 2, { text: '.claude/agents/ 配下のカスタムサブエージェントも指定可能', sub: undefined }],

  // skill-016: スコープに応じた配置
  ['skill-016', 1, 0, { text: 'サブエージェントはスコープに応じた配置が可能', sub: undefined }],
  [
    'skill-016',
    1,
    1,
    { text: '.claude/agents/ はプロジェクトスコープ', sub: 'バージョン管理にコミットしてチーム共有' },
  ],
  ['skill-016', 1, 2, { text: '~/.claude/agents/ はユーザースコープ', sub: '個人の全プロジェクトから利用可能' }],

  // skill-019: permissionMode の値
  [
    'skill-019',
    1,
    0,
    { text: 'サブエージェントの permissionMode は5種類', sub: 'default / acceptEdits / auto / dontAsk / plan' },
  ],
  ['skill-019', 1, 2, { text: 'auto はバックグラウンド分類器がパーミッション判断を行う', sub: undefined }],

  // cmd-022: worktree 隔離
  ['cmd-022', 1, 0, { text: 'サブエージェントの worktree 隔離は2通り', sub: undefined }],
  ['cmd-022', 1, 1, { text: 'カスタムサブエージェントのフロントマターに isolation: worktree を追加', sub: undefined }],

  // skill-022: Explore サブエージェント
  ['skill-022', 1, 1, { text: 'Haikuモデルで高速動作', sub: 'Glob / Grep / Read など読み取り専用ツール' }],
  ['skill-022', 1, 2, { text: 'スキルから agent: Explore で指定できる', sub: undefined }],

  // skill-023: tools / disallowedTools
  ['skill-023', 1, 0, { text: 'tools は許可リスト方式', sub: '指定したツールのみ使用可能' }],
  ['skill-023', 1, 2, { text: 'リサーチ専用なら tools: Read, Grep, Glob で許可リスト指定', sub: undefined }],

  // skill-032: Sub-agents の隔離
  [
    'skill-032',
    1,
    1,
    {
      text: 'Sub-agents は独立した Claude インスタンスが隔離コンテキストでツールを使う',
      sub: '結果はメインに要約返却',
    },
  ],

  // skill-035: context: fork の動作
  ['skill-035', 1, 0, { text: 'context: fork はスキルをサブエージェントの分離コンテキストで実行', sub: undefined }],
  ['skill-035', 1, 1, { text: 'スキルの内容がプロンプトとなり、会話履歴にはアクセスできない', sub: undefined }],
  ['skill-035', 1, 2, { text: 'agent フィールドで実行環境を指定', sub: 'Explore / Plan / general-purpose' }],

  // skill-038: skillsフィールドとの違い
  [
    'skill-038',
    1,
    1,
    {
      text: '一方、skills フィールドはサブエージェント自身のシステムプロンプトに注入される',
      sub: 'Skill は参考資料扱い',
    },
  ],

  // skill-044: 親からの継承
  ['skill-044', 1, 0, { text: 'サブエージェントは親から CLAUDE.md と git ステータスを引き継ぐ', sub: undefined }],

  // bp-051: コンテキスト隔離
  ['bp-051', 1, 0, { text: 'サブエージェントはそれぞれ独立した新しいコンテキストで実行される', sub: undefined }],
  ['bp-051', 1, 2, { text: '結果のみが要約されてメインセッションに返される', sub: 'コンテキスト肥大化を防止' }],

  // bp-078: ベストプラクティス
  [
    'bp-078',
    1,
    0,
    { text: 'ベストプラクティス: サブエージェントを「調査」と「実装後レビュー」に活用', sub: undefined },
  ],
  ['bp-078', 1, 1, { text: '別コンテキストで実行され要約のみ返るため、メイン会話を圧迫しない', sub: undefined }],

  // ext-058: Explore の特徴
  ['ext-058', 1, 0, { text: 'Explore は高速・低コストの Haiku モデルを使用', sub: '読み取り専用ツールのみ' }],
  ['ext-058', 1, 1, { text: 'コードベース探索に最適化', sub: 'thoroughness: quick / medium / very thorough' }],

  // ext-059: General-purpose vs Plan
  [
    'ext-059',
    1,
    0,
    { text: '両者ともメイン会話のモデルを継承', sub: 'General-purpose は全ツール、Plan は読み取り専用' },
  ],
  ['ext-059', 1, 1, { text: 'Plan はプランモード中のリサーチに使用される', sub: undefined }],

  // ext-070: メイン会話の方が適切なケース
  [
    'ext-070',
    1,
    0,
    { text: 'メイン会話が向くのは①頻繁な対話・反復修正', sub: '②大量のコンテキスト共有 ③素早い変更 ④レイテンシ重視' },
  ],

  // ext-134: フック type: prompt vs agent
  ['ext-134', 1, 0, { text: 'type: "prompt" は単一の LLM 呼び出しで判断', sub: 'フック入力データのみで完結する用途' }],
  [
    'ext-134',
    1,
    1,
    { text: 'type: "agent" はサブエージェントを生成', sub: 'ファイル読み取り・コード検索・コマンド実行が可能' },
  ],
  ['ext-134', 1, 2, { text: '例: テスト通過確認後に Claude を停止させたい場合は agent フックが適切', sub: undefined }],

  // ── 第二弾: 漢字続きの単語分割を追加修復 ───────────────────────────────
  [
    'skill-022',
    1,
    0,
    { text: 'Explore はコードベースの読み取り専用探索・分析に特化した組み込みサブエージェント', sub: undefined },
  ],
  [
    'skill-022',
    1,
    3,
    { text: '組み込みエージェント: Explore（探索特化）/ Plan（計画特化）/ general-purpose（汎用）', sub: undefined },
  ],
  ['skill-023', 1, 1, { text: 'disallowedTools は拒否リスト方式', sub: '継承した全ツールから特定のものを除外' }],
  [
    'skill-038',
    1,
    0,
    { text: 'context: fork は Skill の内容がサブエージェントのタスク（プロンプト）になる', sub: undefined },
  ],
  [
    'cmd-022',
    1,
    2,
    { text: '各サブエージェントは独自の worktree を取得し、変更なしで終了すれば自動クリーンアップ', sub: undefined },
  ],
  [
    'ext-070',
    1,
    2,
    { text: 'また、スキルはメイン会話コンテキスト内の再利用可能プロンプトとしても検討できる', sub: undefined },
  ],
  ['skill-032', 1, 3, { text: 'AI推論を伴う処理→ Sub-agents、外部サービス接続→ MCP と覚える', sub: undefined }],
  [
    'bp-051',
    1,
    1,
    {
      text: 'メインのコンテキストを消費せず、内部のファイル読み取りやツール出力もサブエージェント側に閉じる',
      sub: undefined,
    },
  ],
  [
    'skill-041',
    1,
    0,
    { text: 'サブエージェント（sub-agents）は個別のタスクを委任する仕組みで、カスタム可能', sub: undefined },
  ],

  // ── 第三弾: 残った括弧分断・文分断 ─────────────────────────────────────
  [
    'skill-032',
    1,
    2,
    { text: 'MCPサーバーは外部サービス（API・DB等）へのツール接続を提供', sub: '結果の解釈はメイン側で行う' },
  ],
  [
    'skill-041',
    1,
    1,
    { text: 'エージェントチーム（agent-teams）はリードが複数サブエージェントを統率する仕組み', sub: undefined },
  ],
]

const data = JSON.parse(readFileSync(QUIZ_PATH, 'utf8'))
const arr = data.quizzes

let applied = 0
let missing = 0

for (const [id, di, si, repl] of fixes) {
  const q = arr.find((x) => x.id === id)
  if (!q || !q.diagrams || !q.diagrams[di] || q.diagrams[di].type !== 'flow') {
    console.error(`MISSING: ${id} diagrams[${di}]`)
    missing++
    continue
  }
  const step = q.diagrams[di].steps[si]
  if (!step) {
    console.error(`MISSING: ${id} diagrams[${di}].steps[${si}]`)
    missing++
    continue
  }
  step.text = repl.text
  if (repl.sub === undefined) {
    delete step.sub
  } else {
    step.sub = repl.sub
  }
  applied++
}

console.log(`Applied: ${applied}, Missing: ${missing}`)

if (missing === 0 && applied > 0) {
  writeFileSync(QUIZ_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log('Wrote', QUIZ_PATH)
}
