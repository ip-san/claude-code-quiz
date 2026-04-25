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
| session | 10% | `settings,checkpointing,overview,quickstart,model-config,sandboxing,fast-mode,remote-control,desktop,devcontainer` |
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

### 暗記問題の禁止（最重要）

**単純暗記（デフォルト値・ショートカット・変数名の丸暗記）は NG。** 判断力・使い分け・問題解決・設計理由を問う問題のみ作成。

### 問題作成の指針

1. **「なぜ」「いつ」「どう使い分ける」を問う** — 機能の存在を知っているかではなく、適切に使えるかを問う
2. **実践シナリオを設定する** — 「〜したい場合、どうすべきか？」という実務的な状況を提示する
3. **誤解しやすいポイントを突く** — よくある勘違いや混同しやすい概念を選択肢に含める
4. **wrongFeedback で学びを提供する** — 単に「間違いです」ではなく、なぜそれが不適切かを説明する

### 実践シナリオ（`src/data/scenarios.ts`）の問題選定方針

シナリオは「意義に気づいてもらうためのもの」。問題選定の基準:

1. **「ユーザーが実際に直面する判断か？」が最初のフィルタ。** 内部実装の仕組みを問う問題でも、「知らなかったせいで遠回りした → 知ったら一発解決」という体験としてストーリーに組み込めるなら OK
2. **内部実装の問題を排除するのではなく、実務の壁として描く。** 例: stdio の仕組みは「MCP が動かない → ログを見たら stdin/stdout のエラー → 通信方式を理解したら原因が一目瞭然」なら自然
3. **誰もつまずかないことを大げさにストーリーにしない。** 連続する問題の 2 問目に無理にブリッジナラティブを入れると嘘くさくなる
4. **重複ゼロを維持する。** 全シナリオで同じ問題を使い回さない
5. **ゲーミフィケーション要素（StreakToast 等）はシナリオ中は非表示。** ナラティブの流れを壊す UI は `config.mode === 'scenario'` で除外済み

### 不正解選択肢の品質基準

**不正解選択肢はもっともらしいものにする。** 明らかに的外れな選択肢は学習効果が低い。

❌ **NG例（明らかに間違い）:**
- Bashモードのプレフィックス: `>`, `$`, `#`（開発者なら知識なしでも除外できる）
- 架空のコマンド名: `/magic-fix`, `/auto-solve`

✅ **OK例（もっともらしい）:**
- 類似する実在の機能名・コマンド名（混同しやすいもの）
- 他のツールでは正しいが Claude Code では異なる設定方法
- 一見正しそうだが重要な違いがあるアプローチ

### wrongFeedback の品質基準

wrongFeedback は「学びの機会」として活用する。具体的にドキュメントの該当箇所を参照しながら説明する。

❌ **NG例（弱い wrongFeedback）:**
- 「これは正しくありません」
- 「この機能は存在しません」
- 「このパスではありません」
- 「この選択肢は正しくありません。正解の解説を参照してください。」（学習効果ゼロ、絶対NG）
- 「〜は有効なモードです。」（一文で終わり、何をするかの説明なし）
- 「サポートされています。」（何が正しいかの情報なし）

✅ **OK例（具体的な wrongFeedback）:**
- 「`.config/`はXDG規約のディレクトリですが、Claude Codeは`.claude/`ディレクトリを使用します。プロジェクト設定は`.claude/settings.json`に配置します。」
- 「`--from-pr`は作業ツリーでのPRレビューではなく、特定のPRにリンクされたセッションを再開するオプションです。」
- 「`disallowedCommands`は旧APIの名前です。現在は`permissions.deny`で権限を管理します。」

### 重複・冗長の防止

生成前に必ず既存問題を確認し、以下を避ける：
- **完全重複:** 同じ概念を同じ角度から問う問題
- **類似重複:** 表現を変えただけで本質的に同じ問題
- **カバレッジ偏り:** 特定の機能に問題が集中しすぎる

```bash
# 既存問題の確認
npm run quiz:stats
npm run quiz:coverage
npm run quiz:search -- "キーワード"  # 特定トピックの既存問題をキーワード検索
```

### 事実正確性の確認ポイント

**検証対象は question・explanation・wrongFeedback の全フィールド。** 正解選択肢だけが正確でも不十分。

**フィールド別チェック:**

- **question（問題文）の前提を確認する**
  - 問題文に含まれる数値・名称・前提がドキュメントと一致しているか
  - 例: 「3つのレベル」という前提を書く場合、実際に3つか（→ 設定スコープは5段階）
  - 例: 問題文で言及するCLIフラグ・機能がドキュメントに存在するか

- **explanation の注記文・補足を確認する**
  - 「注意：〜」「ただし〜」「※〜」で始まる文も事実確認の対象
  - explanation 内で言及するCLIフラグ・環境変数がドキュメントに存在するか確認する
  - 例: 「注意：この環境変数は非公式」→ 公式記載の環境変数に対して書かないこと

- **wrongFeedback の批判内容を確認する**
  - 「〜ではありません」という批判が、ドキュメントと矛盾していないか
  - 正しい情報を「間違い」と批判するwrongFeedbackを作らないこと
  - 例: 正しいキー名を「キー名が異なります」と批判するケース → NG

**よくある誤りパターン：**

生成時に最も頻発する原則違反。**全フィールド（question・options・explanation・wrongFeedback）が対象。**

1. **存在しない機能・コマンドの記述:** CLI サブコマンド・スラッシュコマンド・環境変数・設定キーは必ずドキュメントで存在を確認する。環境変数は settings ページの env var テーブルで照合する
2. **数値の未検証断定:** スコープ数・イベント数・トークン数・デフォルト値等は変動する。ドキュメントに具体値がない場合は数値を含む問題設計を避ける
3. **外部知識の混入:** Claude Code docs に記載のない動作を Claude Code 固有の動作として断言しない
4. **設定の副作用の欠落:** 「何が有効になるか」だけでなく「何が無効化されるか」もドキュメントで確認して記載する
5. **組み合わせ必須フラグの単体提示:** `--fork-session` → 正しくは `--continue --fork-session`。パスの動的部分も省略しない
6. **存在しないフレーズの引用:** 「公式ドキュメントは『〜』を推奨」と書く場合、そのフレーズがドキュメント本文に実在するか確認する
7. **条件固有の動作の一般化:** ある条件での動作が別の条件にも適用できるとは限らない（例: Hook exit code 2 の送信先はイベントにより異なる）
8. **referenceUrl に新ページを使う場合:** `src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストに追加が必要（`npm test` が失敗する）

> 検証ラウンドで蓄積された具体例・教訓は quiz-refine スキルの `known-issues.md` を参照

**重要な確定値（2026-04-04 docs 再確認済み）:**

- **プラグインのソースタイプは5種類**: relative path, `github`, `url`, `git-subdir`, `npm`。`pip` は存在しない
- **`CLAUDE.md` のスコープは4段階**: Managed > Project > User > Local。`settings.json` の5段階（Managed > CLI > Local > Project > User）と混同しないこと
- **Hook イベントは26種類**: `PermissionDenied` を含む全26種
- **`defaultMode` の有効値は6つ**: `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`

### 内部一貫性チェック（生成直後に必ず確認）

問題を書いたら、フィールド間の矛盾がないか自己チェックする：

1. **question ↔ explanation の整合性**
   - 問題文が「〜について問う」内容と、explanation・正解が説明している内容が一致しているか
   - 例NG: question「Extended Thinkingの確認方法を問う」、正解「verbose出力に切り替える」→ 不一致

2. **explanation ↔ wrongFeedback の整合性**
   - explanation で述べている事実と wrongFeedback の内容が矛盾していないか
   - 例NG: explanation「他のツールは通常のパーミッション設定に従います」、wrongFeedback「リストにないツールも制限されます」→ 矛盾

3. **wrongFeedback 同士の整合性**
   - ある選択肢の wrongFeedback が別の選択肢の内容を肯定してしまっていないか

4. **既存クイズとのクロス一貫性**
   - 生成した問題が既存の別クイズの explanation・wrongFeedback と矛盾していないか
   - 例NG: 既存問題「`agent`フィールドの組み込みエージェントは3種類（`Explore`、`Plan`、`general-purpose`）」と矛盾する問題を新規作成する
   - 確認方法: 同カテゴリの既存問題を `Grep` で検索し、同じ概念（設定スコープ数・エージェント種別・Hook数等）の記述が統一されているか確認する

### referenceUrl のアンカー指定

referenceUrlにアンカー（`#fragment`）を付ける場合、実際のページ見出しと一致させること。アンカーはドキュメント更新で変わりうるため、WebFetchで再確認すること。

**memoryページの既知のアンカー（2026-03-01 確認済み）:**
- `#import-additional-files`（`@`インポート関連）
- `#choose-where-to-put-claudemd-files`（メモリ階層・スコープ関連）
- `#view-and-edit-with-memory`（`/memory`コマンド関連）
- `#how-claudemd-files-load`（サブディレクトリ検索・ロード順関連）
- `#user-level-rules`（ユーザールール関連）
- `#path-specific-rules`

**skillsページの既知のアンカー:**
- `#run-skills-in-a-subagent`（サブエージェント実行関連）

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
