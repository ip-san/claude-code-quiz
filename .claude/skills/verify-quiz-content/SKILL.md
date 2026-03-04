---
name: verify-quiz-content
description: クイズ内容と公式ドキュメントの整合性をチェックする。クイズ検証、ドキュメントチェック、quiz verify、内容確認
allowed-tools: WebFetch, Read, Glob, Grep, Task, Bash
---

# Quiz Content Verification Skill

あなたはクイズコンテンツの品質保証担当者です。

## Role

`src/data/quizzes.json` の内容が最新の公式ドキュメント (code.claude.com) と整合しているかを検証し、差異を報告します。

## Step 0: 機械的 lint + 構造チェック + 差分抽出（並列実行）

4つの独立したチェックを **同時に Bash ツールで並列実行** する。

**Bash ツール 1:**
```bash
npm run quiz:lint                # バッククォート自動修正 + URL アンカー検証 + 用語チェック
```

**Bash ツール 2（同時に呼び出す）:**
```bash
npm run quiz:check
```

**Bash ツール 3（同時に呼び出す）:**
```bash
npm run verify:diff              # 差分モード（通常）
npm run verify:diff:full         # フルスキャン（定期的に実行）
npm run verify:diff -- memory    # 特定カテゴリのみ
```

**Bash ツール 4（同時に呼び出す）:**
```bash
rm -f .claude/tmp/verify_*.json
```

> **旧レポートクリアの理由:** サブエージェントは問題なしの場合にレポートファイルを書かないことがある。旧ファイルが残ると、主エージェントが前回スキャンの結果を「今回の結果」と誤認する。スキャン開始時に全削除することで「存在するファイル = 今回のスキャンが書いたファイル」が保証される。

### quiz:lint の結果処理

`quiz:lint` はバッククォート不足を **自動修正** し、URL アンカーと用語の問題を **レポート** する。

- **Backtick**: 自動修正済み。修正があった場合はログに表示される
- **URL Anchors**: レポートのみ。`invalid-anchor` や `unknown-page` があれば手動修正が必要
- **Terminology**: レポートのみ。`skipWrongOptions` 対象（不正解選択肢で意図的に使用）は無視してよい

**quiz:lint でバッククォートが自動修正された場合、LLM 検証（Step 2）ではチェックリスト E（バッククォート書式）の検出が大幅に減少する。** これにより偽陽性が削減され、検証精度が向上する。

### quiz:check が検証する項目

- ID重複、correctIndex の偏り（35%上限）、wrongFeedback の構造
- カテゴリの妥当性、問題文・解説の文字数、referenceUrl の形式、難易度分布

**注意: 複数選択問題（`type: "multi"`）は `correctIndex` の代わりに `correctIndices`（整数配列）を使用する。** このフォーマットは正規の仕様であり、`correctIndex` が存在しなくても構造バグではない。自動テストはこの形式を正しく処理する。

**構造チェックまたは quiz:lint の URL/用語チェックが失敗した場合は、差分抽出の結果に関わらずまず問題を修正してください。**

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
   - **サブエージェントモード (targets > 50)**: `npm test` を **バックグラウンドで起動**（`run_in_background: true`）し、タスク ID を記録して即座に Step 2 へ進む
   - **インラインモード (targets ≤ 50)**: `npm test` は **この時点では起動しない**。修正が発生した場合のみ Post-Verification で実行する

diff コマンドは同時にカテゴリ別クイズデータを `.claude/tmp/quizzes/{category}.json` に分割出力する。
各ファイルにはそのカテゴリの全問題が含まれ、検証対象の問題には `_needsVerification: true` フラグが付く。

## Step 2: Fact Verification

**検証対象の問題数に応じてモードを切り替える。**

### 2a. インライン検証モード（targets ≤ 50問）

検証対象が **50問以下** の場合、サブエージェントを起動せず **メインエージェントが直接検証** する。
サブエージェント起動のオーバーヘッド（コンテキスト構築 + API呼び出し + Read x N）を回避し、大幅に高速化。

手順:
1. 対象問題の JSON データを `node -e` で抽出表示
2. 対象カテゴリごとにドキュメントを取得:
   ```bash
   node scripts/fetch-docs.mjs --assemble {CATEGORY}
   ```
   この出力をドキュメント参照として使う（セクションの自動選択・結合済み）
3. `.claude/skills/verify-quiz-content/sub-agent-template.md` を Read し、検証チェックリスト（A〜E）とknown-issuesに沿って検証
4. 問題があれば Post-Verification セクションの形式で報告

### 2b. サブエージェント検証モード（targets > 50問）

**差分抽出で特定されたカテゴリのみサブエージェントを起動する。**

#### Step 2b-1: ドキュメントコンテンツの組み立て

各カテゴリの `{DOC_CONTENT}` は **Bash コマンド一発** で組み立てる:

```bash
node scripts/fetch-docs.mjs --assemble {CATEGORY}
```

このコマンドは `verify-targets.json` の `categorySectionMap` に従い、セクションファイルを読み込んで結合した結果を stdout に出力する。
出力をそのまま `{DOC_CONTENT}` プレースホルダーに埋め込む。

**例:** extensions カテゴリの場合
```bash
node scripts/fetch-docs.mjs --assemble extensions
# → hooks 全セクション + settings の一部セクション + mcp 全セクション + discover-plugins 全セクションを結合出力
```

#### Step 2b-2: サブエージェント起動

各カテゴリのサブエージェントには以下を prompt に含める：

1. **検証対象の問題データ（JSON を直接埋め込み）** — `{QUIZ_DATA}`
   - `_needsVerification: true` の問題のみ prompt に埋め込む
   - 同カテゴリの他の問題は `.claude/tmp/quizzes/{category}.json` のパスを記載（必要時のみ Read）
2. **ドキュメントコンテンツ（Step 2b-1 で組み立て済み）** — `{DOC_CONTENT}`
   - サブエージェントは `Read` / `WebFetch` を使わない（全コンテンツが prompt 内に存在）
3. **補助情報（テンプレートに埋め込み済み）**

```
# サブエージェント起動パターン
Task (subagent_type: general-purpose, model: "haiku", max_turns: 20) for each category with targets:
  1. 検証対象の問題データは prompt に埋め込み済み（Read 不要）
  2. ドキュメントコンテンツは prompt に埋め込み済み（Read 不要）
  3. `_needsVerification: true` の問題のみ検証
  4. 差異を報告
```

> **max_turns: 20 の理由:** `max_turns: 10` では大カテゴリで途中打ち切りになるが、全データが prompt に埋め込み済みのため Read 不要。20 で十分カバーでき、セッション時間を短縮できる。

**prompt 構築時のデータ抽出方法:**
```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('.claude/tmp/quizzes/{CATEGORY}.json','utf8'));
const targets = data.filter(q => q._needsVerification);
console.log(JSON.stringify(targets, null, 2));
"
```
この出力を prompt の `{QUIZ_DATA}` プレースホルダーに埋め込む。

引数で特定カテゴリが指定された場合は、そのカテゴリのみ実行。

**注意:** カテゴリごとに1サブエージェントを起動し、全カテゴリを同時に並列実行する（Haiku モデルのため8並列でもタイムアウトの問題はない）。

### サブエージェント用プロンプトテンプレート

**テンプレートは別ファイルに分離済み。サブエージェントモード時のみ Read すること。**

```
Read: .claude/skills/verify-quiz-content/sub-agent-template.md
```

テンプレート内の `{CATEGORY}`, `{DOC_CONTENT}`, `{QUIZ_DATA}` を置き換えてサブエージェントに渡す。
補助情報（known-issues, doc-references）はテンプレートに埋め込み済みなので、サブエージェントが別ファイルを Read する必要はない。

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
   - サブエージェントモード (2b, targets > 50): サブエージェント報告を照合（下記「サブエージェント報告の照合」参照）
   - インラインモード (2a, targets ≤ 50): メインエージェントが直接検証済みのため照合ステップは不要。そのまま修正へ
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
npm run quiz:lint        # バッククォート再修正 + URL/用語チェック
npm run quiz:randomize   # correctIndex 再ランダム化
npm run quiz:check       # 構造チェック
npm run verify:save      # 検証状態を保存（次回の差分用）
npm run quiz:stats       # 分布確認
```

**`npm test` の確認:**

- **サブエージェントモード (2b, targets > 50)**: Step 1b でバックグラウンド起動済み
  ```
  TaskOutput(task_id=<記録済みID>, block=false) で状態確認
    → 完了していた場合: 結果を確認。失敗があれば追加修正
    → まだ実行中の場合: TaskOutput(block=true, timeout=60000) で待機して結果を確認
    → タスクIDが不明/失敗した場合: npm test をフォアグラウンドで実行
  ```
- **インラインモード (2a, targets ≤ 50)**: 修正を適用した場合のみ `npm test` をフォアグラウンドで実行。修正なし（問題なし）の場合はスキップ
