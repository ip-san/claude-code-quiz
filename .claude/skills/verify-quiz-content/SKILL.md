---
name: verify-quiz-content
description: クイズ内容と公式ドキュメントの整合性をチェックする。クイズ検証、ドキュメントチェック、quiz verify、内容確認
allowed-tools: WebFetch, Read, Glob, Grep, Task, Bash
---

# Quiz Content Verification Skill

あなたはクイズコンテンツの品質保証担当者です。

## Role

`src/data/quizzes.json` の内容が最新の公式ドキュメント (code.claude.com) と整合しているかを検証し、差異を報告します。

## Step 0+1a: 構造チェック + 差分抽出（並列実行）

`quiz:check` と `verify:diff` は独立しているため、**2つの Bash ツールを同時に呼び出して並列実行** する。

**Bash ツール 1:**
```bash
npm run quiz:check
```

**Bash ツール 2（同時に呼び出す）:**
```bash
npm run verify:diff              # 差分モード（通常）
npm run verify:diff:full         # フルスキャン（定期的に実行）
npm run verify:diff -- memory    # 特定カテゴリのみ
```

`quiz:check` が検証する項目：
- ID重複、correctIndex の偏り（35%上限）、wrongFeedback の構造
- カテゴリの妥当性、問題文・解説の文字数、referenceUrl の形式、難易度分布

**注意: 複数選択問題（`type: "multi"`）は `correctIndex` の代わりに `correctIndices`（整数配列）を使用する。** このフォーマットは正規の仕様であり、`correctIndex` が存在しなくても構造バグではない。自動テストはこの形式を正しく処理する。

**構造チェックが失敗した場合は、差分抽出の結果に関わらずまず構造問題を修正してください。**

`npm test`（全テスト）は後のステップで実行する。

## Step 1: 早期終了チェック → 並列準備

verify:diff の差分モードは以下の3条件で再検証対象を判定：
1. **新規問題**: 前回検証時に存在しなかった問題
2. **内容変更**: question/options/explanation/referenceUrl のハッシュが変化
3. **ドキュメント変更**: その問題のカテゴリが参照するドキュメントが更新された

結果は `.claude/tmp/verify-targets.json` に保存される。

**`--full` フラグ**: エージェント見落としのキャッチ用。バージョンアップ時や定期的に実行を推奨。

### 1a. 早期終了チェック

`.claude/tmp/verify-targets.json` を Read で読み込む。

- `targets`: 検証が必要な問題リスト
- `categoryDocMap`: カテゴリごとに読むべきドキュメント一覧
- `skippedCount`: スキップされた問題数

**targets が 0 件の場合**: 差分なし。`npm test` も `docs:fetch` も不要。「検証対象なし」と報告して**即座に終了**。

### 1b. ドキュメントキャッシュ + npm test

targets > 0 の場合、以下を実行する：

1. **`docs:fetch` を対象ページのみ指定してフォアグラウンド実行**（キャッシュを参照するため、先に完了が必要）
   - `categoryDocMap` の全ページ名を重複排除・結合して `--pages` に渡す
   - 例: `node scripts/fetch-docs.mjs --pages memory,best-practices,settings`
   - これにより全19ページではなく必要なページのみフェッチし、大幅に短縮
   - **`allDocsCached: true`** が verify-targets.json に含まれている場合、docs:fetch 自体をスキップ可能
2. **`npm test` の起動タイミングはモードで分岐:**
   - **サブエージェントモード (targets > 5)**: `npm test` を **バックグラウンドで起動**（`run_in_background: true`）し、タスク ID を記録して即座に Step 2 へ進む
   - **インラインモード (targets ≤ 5)**: `npm test` は **この時点では起動しない**。修正が発生した場合のみ Post-Verification で実行する

diff コマンドは同時にカテゴリ別クイズデータを `.claude/tmp/quizzes/{category}.json` に分割出力する。
各ファイルにはそのカテゴリの全問題が含まれ、検証対象の問題には `_needsVerification: true` フラグが付く。

## Step 2: Fact Verification

**検証対象の問題数に応じてモードを切り替える。**

### 2a. インライン検証モード（targets ≤ 5問）

検証対象が **5問以下** の場合、サブエージェントを起動せず **メインエージェントが直接検証** する。
サブエージェント起動のオーバーヘッド（コンテキスト構築 + API呼び出し）を回避し、大幅に高速化。

手順:
1. 対象問題の JSON データを `node -e` で抽出表示
2. `.claude/tmp/docs/` から対象カテゴリのドキュメントを Read
3. サブエージェント用テンプレートの検証チェックリスト（A〜E）に沿って検証
4. 問題があれば Post-Verification セクションの形式で報告

### 2b. サブエージェント検証モード（targets > 5問）

**差分抽出で特定されたカテゴリのみサブエージェントを起動する。**

各カテゴリのサブエージェントには以下を prompt に含める：

1. **カテゴリ別クイズファイルのパス**（`.claude/tmp/quizzes/{category}.json` — 全体450KBではなく30〜120KB）
2. **読むべきドキュメント一覧**（categoryDocMap から取得）
3. **補助情報（後述の「サブエージェント用プロンプトテンプレート」参照）**

```
# サブエージェント起動パターン
Task (subagent_type: general-purpose, model: "sonnet", max_turns: 20) for each category with targets:
  1. `.claude/tmp/quizzes/{category}.json` を Read（全体JSONではなくカテゴリ分のみ）
  2. `.claude/tmp/docs/` から categoryDocMap に指定されたドキュメントのみ Read
     （キャッシュが存在しない場合のみ WebFetch でフォールバック）
  3. `_needsVerification: true` の問題のみ検証（他は一貫性チェックの参照用）
  4. 差異を報告
```

引数で特定カテゴリが指定された場合は、そのカテゴリのみ実行。

**注意:** 一度に起動するサブエージェントは最大4つまで。5カテゴリ以上ある場合は2ラウンドに分けて実行する（8並列は接続タイムアウトやAPI負荷の原因になる）。

### サブエージェント用プロンプトテンプレート

以下のテンプレートの `{CATEGORY}`, `{DOC_PAGES}` を置き換えてサブエージェントに渡す。
**補助情報（known-issues, doc-references）はテンプレートに埋め込み済みなので、サブエージェントが別ファイルを Read する必要はない。**

````
あなたは "{CATEGORY}" カテゴリのクイズ検証エージェントです。

重要: このエージェントは問題を報告するだけです。quizzes.jsonへの直接修正は行わないこと。
検証レポートは .claude/tmp/verify_{CATEGORY}.json に保存すること。

## データ読み込み（重要: 全体JSONではなくカテゴリ別ファイルを使用）
1. `.claude/tmp/quizzes/{CATEGORY}.json` を Read（カテゴリ分のみ、30〜120KB）
   - `_needsVerification: true` の問題が検証対象
   - それ以外の問題はクロスクイズ一貫性チェックの参照用
2. **`src/data/quizzes.json` は読まないこと**（450KBの全体ファイルは不要）

## ドキュメント参照
まず `.claude/tmp/docs/` のキャッシュ済みファイルを Read で読むこと。
キャッシュが存在しない場合のみ WebFetch でフォールバック。
必要なページ: {DOC_PAGES}

## 検証チェックリスト

### A. 事実の正確性
検証対象フィールドは **question・options[].text・explanation・options[].wrongFeedback の全て**。
- question に含まれる前提・数値・機能名がドキュメントと一致しているか
- 正解選択肢がドキュメントの内容と一致しているか
- explanation が正しい情報を含んでいるか
- wrongFeedback がドキュメントと矛盾していないか

### B. 用語・名称の正確性
- API やコマンド名が正式名称か
- 設定ファイル名やパスが正しいか
- サードパーティプロバイダー名は専用ドキュメントページの H1 タイトルを最終権威として確認
- **大文字/小文字の一致**: 技術用語はドキュメントの表記を正確に転記（例: bubblewrap, Seatbelt — 固有名詞の大小文字をドキュメントで確認）

### C. リファレンス URL の有効性
- referenceUrl が有効か、アンカーがページ見出しと一致するか
- referenceUrl の参照先が問題内容に最も直接的か

### D. 内部一貫性
- question ↔ explanation の整合性
- explanation ↔ wrongFeedback の整合性
- wrongFeedback 同士の整合性

### E. バッククォート書式
コード用語・ファイルパス・コマンド・環境変数・設定キーがバッククォートで囲まれているか。
対象: ツール名(Bash,Read,Edit等), Hookイベント名, ファイルパス, 設定キー, 環境変数, スラッシュコマンド, CLIフラグ, 技術用語(ripgrep,bypassPermissions等)

**よく見落とされるパターン（毎回検出される再発項目）:**
- キーボードショートカット: Ctrl+X → `Ctrl+X`。同一問題内で一部だけバッククォートありは不整合
- 環境変数=値: `ENV_VAR`=1 ではなく `ENV_VAR=1`（=値も含めてバッククォート内）
- プレースホルダー引数: [issue-number] → `[issue-number]`。コード要素としてバッククォート必要

## よくある誤りパターン
- ドキュメントで確認できない機能を含めてしまう
- 列挙の「数」が古い（設定スコープ・Hookイベント等）
- 環境変数の逆値動作の断定（`VAR=1` の動作 → `VAR=0` で逆とは限らない）
- ドキュメントに記載のない数値の断定
- デフォルト動作の誤断言
- CLIフラグの組み合わせ省略（`--fork-session` は `--continue` と併用必須）
- 存在しないフレーズの引用
- 外部知識の混入（Claude Code docs に記載のない動作を固有動作として断言）
- ドキュメントの例示を完全リストと誤認（「e.g.」で列挙されているものは例示）
- 「など」「等」で不完全な列挙を隠蔽（実際の件数をドキュメントで確認し、正確な数を記載するか、列挙を省略しない）

## プロジェクト固有の既知パターン（known-issues 要約）
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` で無効化OK、`=0` で有効化は根拠なし
- `BASH_DEFAULT_TIMEOUT_MS` のデフォルト値: "Not specified"
- `spinnerVerbs.mode` 省略時は `"append"`（`"replace"` ではない）
- `USE_BUILTIN_RIPGREP`: settings ページ記載済み（2026-03-03 確認）。`MCP_TIMEOUT`: mcp ページに記載あり
- `defaultMode` は5値: default/acceptEdits/plan/dontAsk/bypassPermissions（permissions ページ参照）
- `allowManagedHooksOnly: true` は user, project, **plugin** hooks を無効化（3種）
- `Ctrl+B`: "Backgrounds bash commands **and agents**"
- Managed CLAUDE.md パス: macOS=/Library/Application Support/ClaudeCode/CLAUDE.md（~/.claude/CLAUDE.md は User scope）
- best-practices 強調キーワード: "IMPORTANT" と "YOU MUST" のみ記載。ALWAYS/NEVER は未記載
- `CLAUDE_CODE_SHELL_PREFIX`: docs は "for logging or auditing" のみ
- CLI ツール学習: ユーザーが `--help` 使用を指示（自動学習ではない）
- Task→Agent 改名: CLI は `Agent`、Agent SDK `allowedTools` は `Task`

## referenceUrl マッピング
| 機能カテゴリ | 推奨ページ |
|-------------|-----------|
| 環境変数 | settings |
| CLIワークフロー | common-workflows |
| スラッシュコマンド | interactive-mode |
| コア動作（ツールカテゴリ等） | how-claude-code-works |
| ベストプラクティス | best-practices |
| CLAUDE.md 刈り込み | best-practices |
| 画像添付・クリップボード | interactive-mode |

## 既知の正しいアンカー（memory ページ）
- `#import-additional-files`, `#choose-where-to-put-claudemd-files`
- `#view-and-edit-with-memory`, `#how-claudemd-files-load`
- `#user-level-rules`, `#path-specific-rules`

## レポート形式
```json
{
  "category": "{CATEGORY}",
  "verified": ["id1", "id2"],
  "issues": [
    {
      "id": "xxx-NNN",
      "severity": "critical|major|minor|info",
      "type": "fact|terminology|url|consistency|backtick|quality",
      "field": "question|options|explanation|wrongFeedback|referenceUrl",
      "current": "現在の内容",
      "expected": "正しい内容",
      "reference": "参照ドキュメント"
    }
  ]
}
```
````

### サブエージェント報告の照合ガイド（主エージェント用）

検証チェックリストの詳細はサブエージェントテンプレートに埋め込み済み。
主エージェントは報告を受け取り、**修正適用前の照合** に集中する。

#### 照合時の注意点

- **バッククォート報告の偽陽性率が高い:** v4.39.4 では報告10件中7件が偽陽性。修正前に `Grep` で実際の JSON 内容を確認すること
- **修正で導入する否定文の検証:** 「〜ではありません」「〜専用です」等の否定・限定文を追加する場合、排他的に正確かドキュメントで確認
- **改名修正の波及確認:** 1箇所の名称修正後、同じ旧名称が他の問題に残っていないか `Grep` で全件検索
- **known-issues.md を参照:** 過去に繰り返し発生した偽陽性パターン・修正時の落とし穴を記録済み
- **doc-references.md を参照:** referenceUrl マッピング・既知アンカー・バッククォート対象用語のリスト

## Output Format

### 問題なしの場合
```
## 検証結果サマリー

✅ 全 [N] 問の検証が完了しました。
- 自動テスト: PASS
- ファクトチェック: memory 28問 OK, skills 26問 OK, ...
- モード: incremental (差分: X問検証, Y問スキップ)

重大な問題は見つかりませんでした。
```

### 問題ありの場合
```
## 検証結果サマリー

⚠️ [N] 件の問題が見つかりました。
- モード: incremental (差分: X問検証, Y問スキップ)

### Critical Issues (修正必須)

| Quiz ID | 問題内容 | 現在の内容 | 正しい内容 | 参照元 |
|---------|---------|-----------|-----------|--------|

### Minor Issues (推奨修正)
### 暗記問題（要リライト）
### 重複・冗長
### バッククォート書式
### wrongFeedback 品質
```

## Severity Levels

- **Critical**: 事実と異なる情報（正解が間違い、存在しない機能など）
- **Major**: 用語・名称の不一致（旧名称の使用、typo等）
- **Minor**: 数値の更新推奨、リンク切れの可能性
- **Info**: スタイルや表現の改善提案

## Arguments

- `$ARGUMENTS` にカテゴリ名を指定した場合、そのカテゴリのみ検証
  - 例: `/verify-quiz-content memory` → memory カテゴリのみ
  - 例: `/verify-quiz-content extensions tools` → 複数カテゴリ指定可能
- `--full` を含む場合はフルスキャン（差分なしで全問検証）
  - 例: `/verify-quiz-content --full`
  - 例: `/verify-quiz-content memory --full`
- 引数なしの場合は差分モードで全カテゴリを検証

## Post-Verification

検証完了後、問題が見つかった場合は：

1. **報告の実データ照合（修正前に必須）**
   - サブエージェントモード (2b): サブエージェント報告を照合（下記「サブエージェント報告の照合」参照）
   - インラインモード (2a): メインエージェントが直接検証済みのため照合ステップは不要。そのまま修正へ
2. 修正内容をユーザーに確認（修正範囲の選択肢を提示）
3. 承認後、修正を実施

### 検証サブエージェントは REPORT 専用にすること

**サブエージェントに `quizzes.json` を直接修正させてはいけない。** 複数のエージェントが同じ JSON ファイルを並列で書き換えると、バージョン番号の競合や内容の巻き戻しが発生する。

**正しいワークフロー:**
1. 検証エージェントは「報告のみ」を実施（ファイル変更禁止）
2. 主エージェント（このスキルを実行している Claude）が報告を受け取り、実データを照合してから修正を適用
3. バージョン番号のインクリメントも主エージェントが一括管理する

### サブエージェント報告の照合

サブエージェントが報告した Critical・Major の問題は、**修正を実施する前に必ず実際の JSON データを直接読み込んで照合すること**。

**バッククォート報告の偽陽性に注意:** サブエージェントのバッククォート報告は偽陽性率が高い（v4.39.4 では報告10件中7件が偽陽性）。過去の検証ラウンドで修正済みの箇所を再報告するケースが多いため、バッククォート修正を適用する前に必ず `Grep` で実際の JSON 内容を確認すること。

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('src/data/quizzes.json','utf8'));
const q = data.quizzes.find(q => q.id === 'XXX-NNN');
q.options.forEach((o,i) => {
  const marker = i === q.correctIndex ? '[CORRECT]' : '[wrong]';
  console.log(marker, o.text);
  if (o.wrongFeedback) console.log('  wF:', o.wrongFeedback);
});
console.log('explanation:', q.explanation);
"
```

### 修正後の必須手順

```bash
npm run quiz:randomize   # correctIndex 再ランダム化
npm run quiz:check       # 構造チェック
npm run verify:save      # 検証状態を保存（次回の差分用）
npm run quiz:stats       # 分布確認
```

**`npm test` の確認:**

- **サブエージェントモード (2b)**: Step 1b でバックグラウンド起動済み
  ```
  TaskOutput(task_id=<記録済みID>, block=false) で状態確認
    → 完了していた場合: 結果を確認。失敗があれば追加修正
    → まだ実行中の場合: TaskOutput(block=true, timeout=60000) で待機して結果を確認
    → タスクIDが不明/失敗した場合: npm test をフォアグラウンドで実行
  ```
- **インラインモード (2a)**: 修正を適用した場合のみ `npm test` をフォアグラウンドで実行。修正なし（問題なし）の場合はスキップ
