---
name: quiz-refine
description: クイズの検証・修正。--dry-run で報告のみ。quiz refine、クイズ検証、自律修正
context: fork
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Agent
argument-hint: "[iterations] [categories...] [--dry-run] [--full] [--force] [--team]"
---

# Quiz Refine Skill

あなたはクイズコンテンツの検証・修正エージェントです。
クイズデータを公式ドキュメントと照合し、問題を検証・修正します。

**自律実行ルール:** AskUserQuestion を使わないこと。判断に迷う場合はスキップしてログに記録し、次に進む。全ステップをユーザー確認なしで最後まで実行する。

## 関連ドキュメント（必要時に Read）

- **検証チェックリスト A-J**: `.claude/skills/quiz-refine/checklist.md` — 各問題の検証基準
- **コンテンツ選定基準**: `.claude/skills/quiz-refine/content-criteria.md` — overview/scenario の含める/含めない問題、実践シナリオの品質基準
- **既知パターン**: `.claude/skills/quiz-refine/known-issues.md` — 判定済みの false-positive/真陽性

## 引数パース

`$ARGUMENTS` を以下のアルゴリズムで **厳密に** パースすること。自然言語的に解釈しない。

**パースアルゴリズム（必ずこの順序で実行）:**

```
1. ARGS = "$ARGUMENTS" を空白で分割
2. ITERATIONS = 1, DRY_RUN = false, SCAN_MODE = "incremental", CATEGORIES = [], TEAM = false
3. ARGS の各トークンについて:
   - "--dry-run" なら → DRY_RUN = true
   - "--full" なら → SCAN_MODE = "full"
   - "--force" なら → SCAN_MODE = "force"
   - "--team" なら → TEAM = true
   - 数値（1-10）なら → ITERATIONS = その値
   - 有効カテゴリ名なら → CATEGORIES に追加
4. CATEGORIES が空なら → 全8カテゴリ
```

**例:**
```
""                    → iterations=1, scan=incremental, fix
"3"                   → iterations=3, scan=incremental, fix
"2 memory tools"      → iterations=2, scan=incremental, fix, categories=[memory,tools]
"--dry-run"           → iterations=1, scan=incremental, report only
"--force"             → iterations=1, scan=force, fix
"10 --force"          → iterations=10, scan=force, fix
"5 --full"            → iterations=5, scan=full, fix
"--dry-run --full"    → iterations=1, scan=full, report only
```

**SCAN_MODE の違い:**
- `incremental`: 変更があった問題のみ（デフォルト）
- `full`: verified-ok で変更なしの問題はスキップ、それ以外を全件
- `force`: verifyResults を完全無視、全問を対象にする

有効カテゴリ: memory, skills, tools, commands, extensions, session, keyboard, bestpractices
引数が不正な場合はエラーメッセージを返して終了。

**パース結果を最初に出力して確認すること:**
```
Parsed: iterations=N, scan=MODE, dry_run=BOOL, categories=[...]
```

## Step 0: 前処理

**重要:** すべての Bash コマンドはプロジェクトルート（`package.json` がある場所）で実行すること。
フルパスをハードコードせず、カレントディレクトリまたは相対パスを使用する。

### Step 0a: lint + check + 旧レポートクリア + 差分抽出（1コマンド）

**以下を1つの Bash 呼び出しにまとめて実行する（許可プロンプト削減）:**

```bash
npm run quiz:lint && npm run quiz:check && rm -f .claude/tmp/verify_*.json .claude/tmp/verify_*.md .claude/tmp/skill-proposals.md 2>/dev/null; VERIFY_CMD="verify:diff"; if [ "$SCAN_MODE" = "full" ]; then VERIFY_CMD="verify:diff:full"; elif [ "$SCAN_MODE" = "force" ]; then VERIFY_CMD="verify:diff:force"; fi; npm run $VERIFY_CMD
```

**重要: SCAN_MODE は上記パースアルゴリズムの結果を使う。実際のコマンドは以下から選択:**
- SCAN_MODE=incremental → `npm run verify:diff`
- SCAN_MODE=full → `npm run verify:diff:full`
- SCAN_MODE=force → `npm run verify:diff:force`

カテゴリ指定がある場合は末尾に追加:
```bash
npm run verify:diff -- memory tools
```

### quiz:lint の結果処理

- **Backtick**: 自動修正済み。修正があった場合はログに表示される
- **URL Anchors**: レポートのみ。`invalid-anchor` や `unknown-page` があれば手動修正が必要
- **Terminology**: レポートのみ。`skipWrongOptions` 対象は無視してよい

**構造チェックまたは quiz:lint の URL/用語チェックが失敗した場合は、差分抽出の結果に関わらずまず問題を修正してください。**

**注意: 複数選択問題（`type: "multi"`）は `correctIndex` の代わりに `correctIndices`（整数配列）を使用する。** このフォーマットは正規の仕様であり、構造バグではない。

### Step 0b: MEMORY→known-issues 同期チェック

MEMORY.md の「Verified Facts」セクションと `known-issues.md` を比較し、MEMORY に記載されているがknown-issues に未反映の事実があれば known-issues.md に追記する。これにより検証エージェントが最新の確認済み事実を参照できる。

## Step 0c: 決定論的 lint 前処理（推奨）

対象が10問以上ある場合、LLM 不要の決定論的チェックで事前に flag を絞る:

```bash
node scripts/pre-lint-quiz.mjs
```

出力: `.claude/tmp/pre-verify-results.json`
- `matched`: lint クリア → Sonnet 検証で A-B-D-G のみに絞る（C/E/F/H スキップ可）
- `flagged`: backtick / distractor / factCheck 等で要注意 → A-H 全検証 + lint 指摘重点
- `sonnetTargets`: flagged + autofix を除いた問題の ID リスト（Sonnet 検証対象）

**品質保証**: lint は決定論的なので見逃しリスクなし。Sonnet 検証は matched でも最低限動く。

**対象が10問未満の場合**: skip して全問 Sonnet 検証（少量なら直接の方が速い）。

## Step 0d: Opus バッチ監査（オプション）

`scripts/audit-critical-quiz.mjs` が存在する場合、Haiku/Sonnet の判定を Opus が独立監査する運用（現在は未使用）。将来的な再有効化に備えた予約ステップ。

## Step 1: 早期終了チェック

`.claude/tmp/verify-targets.json` を Read で読み込む。

- `targets`: 検証が必要な問題リスト
- `categoryDocMap`: カテゴリごとに読むべきドキュメント一覧
- `skippedCount`: スキップされた問題数

**targets が 0 件の場合**: 差分なし。「検証対象なし」と報告して**即座に終了**。

`.claude/tmp/pre-verify-results.json` が存在する場合:
- `sonnetTargets` のIDのみを検証対象とする（Haiku確認済み + Opus監査済みの問題はスキップ）
- Opus 監査でデモートされた問題は自動的に `sonnetTargets` に含まれる
- 「Pre-verify: N問スキップ（Haiku確認済み + Opus監査済み）」とログ出力

targets > 0 の場合、対象カテゴリのドキュメントをキャッシュ:
```bash
# categoryDocMap の全ページを --pages に渡す
node scripts/fetch-docs.mjs --pages memory,best-practices,settings
```
**`allDocsCached: true`** が verify-targets.json に含まれている場合、docs:fetch 自体をスキップ可能。

## 反復ループ

### 逐次モード（デフォルト）

```
For iteration = 1..N:
  For each target category (順次処理):
    1. カテゴリ別クイズデータ読み込み
    2. 関連ドキュメント取得
    3. 検証チェックリスト A-H 適用
    4. [fix mode] 問題を直接修正 / [dry-run] レポートに蓄積
    5. 修正内容と学習パターンをメモ
  End for

  [fix mode] `npm run quiz:randomize && npm run quiz:check`（1回の Bash 呼び出し）
  反復サマリー出力
End for
```

### チームモード（`--team`）

`--team` 指定時、カテゴリ別に `quiz-verifier` エージェントを**最大8並列**で起動する。

**フォールバック運用:** スキルが forked 実行中で Agent ツールが実質利用できない場合（forked コンテキストでは Task/Agent 呼び出しが失敗する環境がある）、以下の順で段階的にフォールバックする:

1. **決定論的修正のみ適用** — `quiz-lint.mjs backtick` / difficulty 再分類 / URL アンカー / distractor autofix。LLM 不要。今回のフルスキャンで difficulty 55件を自動修正したパターン
2. **fact-tier のスポットチェック** — pre-lint の fact tier のうち、`factCheck:slash` / `factCheck:flags` / `factCheck:env` のような具体性の高いものから 10〜20 問を Read で直接検証（ドキュメントキャッシュから該当 page を grep）
3. **大規模 LLM 検証は `/quality-loop --monthly` に委譲** — 月次の Opus 1M context で全問横断判定。forked 内で無理に並列化しない

この分離により、`--team --full` が forked 環境で失敗しても決定論的価値を提供でき、LLM コストは月次に集約される。

```
For iteration = 1..N:
  Phase A: 全カテゴリの quiz-verifier エージェントを同時起動（run_in_background: true）
    各エージェントへのプロンプト:
    - カテゴリ「{category}」の問題を検証してください
    - .claude/tmp/pre-verify-results.json があれば参照し、matched はチェック A-B スキップ
    - .claude/tmp/quizzes/{category}.json を Read
    - node scripts/fetch-docs.mjs --assemble {category} でドキュメント取得
    - .claude/skills/quiz-refine/known-issues.md を Read
    - チェックリスト A-H を適用
    - JSON 形式で結果を報告（修正は行わない）

  Phase B: 全エージェント完了を待機

  Phase C: 結果集約・修正（逐次）
    1. 各エージェントの報告を集約
    2. needsOpusReview: true の issue を Opus エージェントで最終確認（偽陽性防止）
    3. [fix mode] critical/major を node scripts/quiz-utils.mjs edit で修正
    4. [dry-run] レポートに蓄積
    5. bun run quiz:randomize && bun run quiz:check

  反復サマリー出力
End for
```

**チームモードの利点:** 8カテゴリ逐次で約10分 → 並列で約2分（実測77%短縮）。
**注意:** 検証エージェントは報告のみ。修正はメインエージェントが集約後に実行（競合防止）。

### カテゴリ処理の詳細

**1. クイズデータ読み込み:**
Read ツールで `.claude/tmp/quizzes/{CATEGORY}.json` を読む（Bash 不要）。
ファイルが存在しない場合は `npm run verify:diff:full` を再実行。

**2. ドキュメント取得:**
```bash
node scripts/fetch-docs.mjs --assemble {CATEGORY}
```
stdout にドキュメント内容が出力される。

**3. 検証 → 修正/報告:**
各問題について検証チェックリスト A-H を適用。

**fix mode:**
- **critical/major**: `quiz:edit` コマンドで修正
- **minor**: 修正するが、判断に迷う場合はスキップしてログに記録
- **info**: ログに記録のみ（修正しない）

**dry-run mode:**
- 全 severity をレポートに蓄積（ファイル変更なし）
- `.claude/tmp/verify_{CATEGORY}.json` にレポート保存

**修正コマンド（fix mode）:**
```bash
# フィールド別の修正例
node scripts/quiz-utils.mjs edit {ID} question "新しい問題文"
node scripts/quiz-utils.mjs edit {ID} explanation "新しい解説"
node scripts/quiz-utils.mjs edit {ID} referenceUrl "https://code.claude.com/docs/en/..."
node scripts/quiz-utils.mjs edit {ID} option.2 "新しい選択肢テキスト"
node scripts/quiz-utils.mjs edit {ID} wrongFeedback.1 "新しいフィードバック"
```

**修正時の注意:**
- 1問ずつ修正する（バッチ修正しない）
- 正解選択肢に `wrongFeedback` を付けない
- 不正解選択肢には必ず `wrongFeedback` を付ける
- コマンドは変更前後の diff を自動出力する

### 反復間の再検証

iteration 2 以降では:
- 前回修正した問題を重点的に再チェック（修正が新たな矛盾を生んでいないか）
- 前回スキップした minor 問題を再評価
- 新しいパターンを発見したら学習メモに追記

## Step Final: 後処理

### fix mode

全イテレーション完了後、**1つの Bash 呼び出し** にまとめる:

```bash
npm run quiz:randomize && npm run quiz:check && npm test && npm run verify:save
```

テストが失敗した場合は原因を調査して修正を試みる。

最後に **スキル改善提案** を `.claude/tmp/skill-proposals.md` に書き出し、高・中汎用性の提案を自動マージ:

```bash
node scripts/quiz-utils.mjs merge-proposals
```

### dry-run mode

修正は行わないため `randomize`/`check`/`test`/`verify:save` は不要。
レポートを出力して終了。

---

## スキル改善提案の書き出し（fix mode のみ）

全イテレーションで観察したパターンを分析し、以下の形式で書き出す:

```markdown
# Skill Improvement Proposals
## Date: {today}
## Iterations: {N}
## Categories: {processed categories}
## Summary: {total fixes} fixes applied, {total skipped} skipped

### Proposal 1: [パターン名]
- **観察**: どのような誤りパターンを発見したか（具体的な問題IDを含む）
- **頻度**: 何件の問題で確認されたか
- **提案**: SKILL.md / known-issues.md にどう反映すべきか
- **対象ファイル**: quiz-refine/SKILL.md | quiz-refine/known-issues.md | generate-quiz-data/SKILL.md
- **汎用性**: [高/中/低]
  - 高: 構造的なパターン（生成ルールの欠如、チェックリスト項目の不足）
  - 中: 特定ドキュメントの変更に起因（ドキュメント更新時に再確認が必要）
  - 低: 個別の事実誤認（1回限りの修正で解決）

### Fix Log
| ID | Severity | Type | Field | Summary |
|----|----------|------|-------|---------|
| xxx-NNN | critical | fact | explanation | 修正概要 |
```

**重要**: 汎用性「低」の提案は参考情報として記録するだけで、スキル更新は不要。

---

## 出力形式

**fix mode:** `## Quiz Refine Complete` サマリー（iterations, fixes, test result）+ 修正一覧（ID, OLD→NEW, 理由）+ パターン別・カテゴリ別件数

**dry-run mode:** `## 検証結果サマリー` + Critical/Major/Minor/Info の4段階テーブル（Quiz ID, 問題内容, 現在→正しい内容, 参照元）

---

## 検証チェックリスト・既知パターン

- チェックリスト A-J の詳細: `.claude/skills/quiz-refine/checklist.md` を Read
- 既知 false-positive/真陽性: `.claude/skills/quiz-refine/known-issues.md` を Read
- overview/scenario 選定基準: `.claude/skills/quiz-refine/content-criteria.md` を Read
