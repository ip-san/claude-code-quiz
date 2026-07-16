---
name: generate-quiz-data
description: Claude Code公式ドキュメントからクイズ問題を自動生成する。クイズ生成、問題作成、試験問題、quiz generate
context: fork
disable-model-invocation: true
allowed-tools: WebFetch, Read, Write, Glob, Grep, Bash
argument-hint: "[count]"
---

# Quiz Generator Skill

あなたは「Claude Code 認定試験」の問題作成責任者です。

## Role

公式ドキュメントに基づいた、実践的で高品質なクイズ問題を生成します。

## Current State

まず現在のクイズデータの状態を確認してください：

```bash
node scripts/quiz-utils.mjs stats
node scripts/quiz-utils.mjs coverage
```

現在のIDの最大値をカテゴリごとに確認：
```bash
node -e "
const q = require('./src/data/quizzes.json').quizzes;
const prefixes = { memory:'mem', skills:'skill', tools:'tool', commands:'cmd', extensions:'ext', session:'ses', keyboard:'key', bestpractices:'bp', sdk:'sdk' };
for (const [cat, prefix] of Object.entries(prefixes)) {
  const ids = q.filter(x=>x.id.startsWith(prefix+'-')).map(x=>parseInt(x.id.split('-')[1])).sort((a,b)=>b-a);
  console.log(prefix + '-' + String(ids[0]+1).padStart(3,'0') + ' (next available for ' + cat + ')');
}
"
```

**ID 重複防止:** 必ず上記コマンドで次の空き ID を確認してから採番すること。既存 ID と重複すると `npm run quiz:check` が FAIL する。

## Input Source

### ドキュメント取得

**`--assemble --pages` コマンドでカテゴリに必要なドキュメントを一括取得する。** セクション分割済みキャッシュから効率的に読み込むため、大ファイルの Read 失敗が発生しない。

```bash
# キャッシュが古い場合のみ実行（24h TTL）
npm run docs:fetch          # 全ページ取得（キャッシュ済みはスキップ）
npm run docs:status         # キャッシュ状態を確認
```

**カテゴリごとのドキュメント取得:**
```bash
node scripts/fetch-docs.mjs --assemble --pages memory
node scripts/fetch-docs.mjs --assemble --pages mcp,hooks,discover-plugins,sub-agents
node scripts/fetch-docs.mjs --assemble --pages settings,checkpointing,overview,quickstart
```

このコマンドはセクション分割済みキャッシュ（`.claude/tmp/docs/sections/`）から必要な内容を結合して stdout に出力する。出力をそのままドキュメント参照として使用する。

### カテゴリ別ドキュメントページ対応表

| カテゴリ | Weight | `--pages` 引数 |
|---------|--------|---------------|
| memory | 15% | `memory,server-managed-settings` |
| skills | 15% | `skills,how-claude-code-works,agent-teams` |
| tools | 15% | `how-claude-code-works,settings,vs-code,jetbrains` |
| commands | 15% | `interactive-mode,quickstart,overview,cli-reference,headless,github-actions,gitlab-ci-cd,scheduled-tasks` |
| extensions | 15% | `mcp,hooks,hooks-guide,discover-plugins,plugins,plugins-reference,plugin-marketplaces,sub-agents,chrome,slack` |
| session | 10% | `settings,checkpointing,overview,quickstart,model-config,sandboxing,fast-mode,remote-control,desktop,devcontainer,gateways,llm-gateway-connect,desktop-linux,desktop-wsl,feature-availability` |
| keyboard | 10% | `interactive-mode,keybindings,statusline,terminal-config,output-styles` |
| bestpractices | 10% | `best-practices,common-workflows,quickstart` |
| sdk | 5% | `agent-sdk-overview,authentication,third-party-integrations` |

## Output Format

`src/data/quizzes.json` の既存データに追記する形式で出力してください：

```json
{
  "id": "[category]-[number]",
  "category": "[category_id]",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "question": "問題文（日本語）",
  "options": [
    { "text": "選択肢1", "wrongFeedback": "この選択肢が誤りである理由" },
    { "text": "選択肢2（正解）" },
    { "text": "選択肢3", "wrongFeedback": "この選択肢が誤りである理由" },
    { "text": "選択肢4", "wrongFeedback": "この選択肢が誤りである理由" }
  ],
  "correctIndex": 1,
  "explanation": "概念の説明。\n{{diagram:0}}\n詳細や補足。",
  "referenceUrl": "https://code.claude.com/docs/en/...",
  "diagrams": [{ ... }]
}
```

### `diagrams` フィールド（オプション）

構造的な概念を解説する問題には、`diagrams` 配列にダイアグラムを追加する。
解説テキスト中の `{{diagram:N}}` マーカー位置に挿入表示される（N は diagrams 配列のインデックス）。

**マーカールール:**
- `{{diagram:0}}` は `diagrams[0]` を挿入
- マーカーは独立した行に配置（前後に改行 `\n`）
- 解説を「導入/概念説明」と「詳細/補足」の間に配置
- マーカーなしの場合は解説末尾にまとめて表示
- 1問に最大3つまで

**14のタイプ:**

| タイプ | 用途 | フィールド |
|--------|------|----------|
| `hierarchy` | スコープ優先順位・階層（ピラミッド型） | `items: [{text, sub}]` |
| `flow` | 時系列・手順・パイプライン | `steps: [{text, sub}]` |
| `cycle` | 循環状態遷移 | `trigger`, `states: [{text, sub}]` |
| `comparison` | 比較・対照（2〜4カラム） | `columns: [{heading, items}]` |
| `terminal` | コマンド実行例 | `lines: [{type, text}]` |
| `config` | 設定ファイル例 | `filepath`, `lines: [{text, highlight?}]` |
| `network` | 接続関係・アーキテクチャ（ボックス＆アロー） | `nodes: [{id, text, sub}]`, `edges: [{from, to, label, dashed?}]` |
| `sequence` | アクター間メッセージの時系列 | `actors: [string]`, `messages: [{from, to, text, dashed?}]` |
| `layer` | 入れ子の包含関係（外側が上書き） | `layers: [{text, sub}]` |
| `swimlane` | 並列処理のタイムライン | `lanes: [{name, segments: [{start, end, text}]}]`, `totalSteps?` |
| `venn` | 集合の重なり・概念の共通点（2〜3集合） | `sets: [{text, items?}]`, `intersectionLabel?` |
| `matrix` | 2D Feature×条件グリッド（✓/✗/テキスト） | `rows: [string]`, `cols: [string]`, `cells: [[string]]`, `rowHeader?`, `colHeader?` |
| `tree` | ディレクトリ構造・ファイルツリー | `root: {text, sub?, children?: [{text, sub?, children?}]}` |
| `formula` | トークン計算・構成の内訳 | `result`, `components: [{text, sub?, highlight?}]`, `operator?` |

**タイプの使い分けガイド（迷った場合の優先）:**

- 接続関係 → `network` / 時系列メッセージ → `sequence`（複数アクター間） / 手順 → `flow`（単一プロセス）
- 包含・上書き関係 → `layer` / 重要度順 → `hierarchy` / 概念の重なり → `venn`
- 並列処理 → `swimlane` / 2軸グリッド → `matrix` / カラム比較 → `comparison`
- ディレクトリ構造 → `tree` / 計算式・内訳 → `formula`

構造的概念を含む問題にのみ追加。単純な事実確認には不要。
図+ターミナルなど、複数ダイアグラムの組み合わせも有効。

**JSON 例は `diagram-examples.md` を Read して参照。** network, sequence, layer, swimlane, venn, matrix, tree, formula の8タイプ分。

**ダイアグラム作成ルール（途中切れ禁止）:**

- **YOU MUST** ダイアグラム本文に `…`（日本語三点リーダー）や文中の `...` を**入れない**。`bun run quiz:check-ellipsis` が CI で fail する。
- terminal/config の末尾 `Loading...` `処理中…` のような進捗表示の `...`/`…` のみ許容。
- placeholder は具体値で書く: `{ ... }` `sk-...` `https://example.com/...` `{"key": ...}` などは NG。実際のサンプル値を入れる（`https://gitlab.com/group/project.git`、`{"session_id": "abc-123", "output": "done"}` など）。
- `comparison.columns[].items[]` は **完全文**で 80 文字以内に収める。長くなる説明文を載せたい場合は `comparison` ではなく `hierarchy`（`items: [{text, sub}]`）を使う。`sub` は長さ無制限。
- 過去事例: 「`comparison.items` を AI 生成時に文字数で切り詰めて `…` を残した」せいで 423 ダイアグラム × 1520 行を再生成する作業が発生（2026-04-25）。再発防止のため新規生成時もこのルールを守ること。

**ダイアグラム作成ルール（text/sub の意味論）:**

- **YOU MUST** `flow.steps[].text` と `sub` を**1つの文を 2 分割するために使わない**。
  - ❌ NG: `text: "サブエージェントのpermissionMod"` + `sub: "eはdefault、acceptEdits、a"`（単語 `permissionMode` を分断）
  - ❌ NG: `text: ".claude/agents/はプロジェクト"` + `sub: "スコープでバージョン管理にコミット..."`（一文を途中で分断）
  - ✅ OK: `text: "サブエージェントの permissionMode は5種類"` + `sub: "default / acceptEdits / auto / dontAsk / plan"`（text=完全な文、sub=技術名の列挙）
  - ✅ OK: `text: ".claude/agents/ はプロジェクトスコープ"` + `sub: "バージョン管理にコミット"`（text=ラベル、sub=短い補足）
- `sub` は **15字以内のテクニカルな補足**（型名・ファイル名・条件・短い例）。文の続きを `sub` に逃さない。
- 文を続けたい場合は **2 つの step に分ける** か、`text` を完全な文にして `sub` を省く。

**ダイアグラム作成ルール（hierarchy.items の長文禁止）:**

- **YOU MUST** `hierarchy.items[].text` は **40 字以内の短いラベル**。option 全文や wrongFeedback 全文を text に詰めない。
  - ❌ NG: `text: "frontmatterで\`memory: user\`を設定し、\`~/.claude/agent-memory/<name>/\`にクロスプロジェクトの知識を蓄積させる（正解）"`（86字、ピラミッド型レイアウトからはみ出す）
  - ✅ OK: `text: "memory: user で永続知識を蓄積（正解）"` + `sub: "~/.claude/agent-memory/<name>/ に保存..."`
- 長い説明を載せたい場合: `text` をキーフレーズに圧縮し、詳細は `sub` に置く（sub は長さ制限なし）。
- 過去事例: 1c3f9d4 で comparison→hierarchy 移行時に option 全文を `text` に詰めた結果、133 items でセルから文字がはみ出した（2026-04-25）。再発防止のため新規生成時も text ≤40 字を守ること。
- 検出: `bun run quiz:check-diagram-text` で flow split + hierarchy 長文の両方を一括チェック可能。

## ID Conventions

- `mem-NNN`, `skill-NNN`, `tool-NNN`, `cmd-NNN`, `ext-NNN`, `ses-NNN`, `key-NNN`, `bp-NNN`, `sdk-NNN`
- 既存の最大番号の続きから採番（重複禁止）

## Quality Requirements

### 基本ルール

1. **正確性:** 公式ドキュメントの内容に基づく正確な情報のみ
2. **実践性:** 実際の開発シーンで役立つ実践的な問題
3. **wrongFeedback:** 正解選択肢にはwrongFeedbackを付けない。不正解選択肢には必ず「なぜ誤りなのか」の説明を含める
4. **referenceUrl:** 各問題に正しいドメインで始まるURLを必ず含める
   - `https://code.claude.com/docs/en/{page}` — 43ページ（doc-references.md 参照）
   - `https://platform.claude.com/docs/en/agent-sdk/overview` — Agent SDK関連
   - **referenceUrl は問題内容に最も直接的なページを選ぶ:** `quickstart` や `overview` は概要ページであり、機能の詳細を問う問題には機能専用ページ（`memory`・`best-practices`・`discover-plugins`・`hooks` 等）を参照すること（例: CLAUDE.md 肥大化対処法の問題 → `memory` ページ。ベストプラクティスの問題 → `best-practices` ページ）
   - **`overview` / `quickstart` は使わないことを原則とする:** これらは機能の全体概要・導入手順ページであり、特定機能（セッション管理・フック・スキル・CI/CD統合・テレポート等）を問う問題には適さない。セッション再開なら `interactive-mode`、CI/CD統合なら `common-workflows`、CLAUDE.md なら `memory` のように機能専用ページを選ぶこと
   - **機能別 referenceUrl の推奨マッピング:** `.claude/skills/quiz-refine/doc-references.md` を参照
5. **日本語:** 問題文・選択肢・解説・wrongFeedbackはすべて日本語
6. **選択肢4つ:** 各問題に正確に4つの選択肢を含める
7. **バッククォート書式:** コード用語・パス・コマンド・環境変数・設定キーは全フィールドでバッククォート。URL途中への挿入禁止。同一問題内で不整合禁止。対象リスト: `.claude/skills/quiz-refine/doc-references.md`


> **詳細ルール（暗記禁止・問題指針・シナリオ選定・wrongFeedback 品質・重複防止・事実正確性チェック・内部一貫性・アンカー指定）は `quality-rules.md` を Read して参照。** 確定値（プラグイン 5 種・CLAUDE.md 4 段階・Hook 26 種・defaultMode 6 値）・既知のアンカー（memory/skills ページ）も同ファイルに収録。
## Post-Generation Steps（重要）

問題追加後、以下を必ず実行してください：

1. **correctIndex をランダム化:**
   ```bash
   npm run quiz:randomize
   ```

2. **品質チェック:**
   ```bash
   npm run quiz:check
   ```

3. **テスト実行:**
   ```bash
   npm test
   ```

4. **統計確認:**
   ```bash
   npm run quiz:stats
   npm run quiz:coverage
   ```

## Arguments

- `$ARGUMENTS` に数値が指定された場合、その問題数だけ生成（例: `/generate-quiz-data 20` で20問生成）
- 引数なしの場合は、各カテゴリから均等に計16問（各カテゴリ2問）のサンプルを生成
- 生成数に応じてカテゴリ比率を維持すること
- カバレッジの低いドキュメントページを優先的にカバーすること
