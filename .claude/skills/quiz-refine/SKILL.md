---
name: quiz-refine
description: クイズの検証・修正。--dry-run で報告のみ。quiz refine、クイズ検証、自律修正
context: fork
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
argument-hint: "[iterations] [categories...] [--dry-run] [--full] [--force]"
---

# Quiz Refine Skill

あなたはクイズコンテンツの検証・修正エージェントです。
クイズデータを公式ドキュメントと照合し、問題を検証・修正します。

**自律実行ルール:** AskUserQuestion を使わないこと。判断に迷う場合はスキップしてログに記録し、次に進む。全ステップをユーザー確認なしで最後まで実行する。

## 引数パース

`$ARGUMENTS` を以下のアルゴリズムで **厳密に** パースすること。自然言語的に解釈しない。

**パースアルゴリズム（必ずこの順序で実行）:**

```
1. ARGS = "$ARGUMENTS" を空白で分割
2. ITERATIONS = 1, DRY_RUN = false, SCAN_MODE = "incremental", CATEGORIES = []
3. ARGS の各トークンについて:
   - "--dry-run" なら → DRY_RUN = true
   - "--full" なら → SCAN_MODE = "full"
   - "--force" なら → SCAN_MODE = "force"
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

## Step 1: 早期終了チェック

`.claude/tmp/verify-targets.json` を Read で読み込む。

- `targets`: 検証が必要な問題リスト
- `categoryDocMap`: カテゴリごとに読むべきドキュメント一覧
- `skippedCount`: スキップされた問題数

**targets が 0 件の場合**: 差分なし。「検証対象なし」と報告して**即座に終了**。

targets > 0 の場合、対象カテゴリのドキュメントをキャッシュ:
```bash
# categoryDocMap の全ページを --pages に渡す
node scripts/fetch-docs.mjs --pages memory,best-practices,settings
```
**`allDocsCached: true`** が verify-targets.json に含まれている場合、docs:fetch 自体をスキップ可能。

## 反復ループ

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

### fix mode — 最終サマリー

```
## Quiz Refine Complete
- Iterations: N
- Categories processed: [list]
- Mode: fix (incremental|full)
- Scope: X verified + Y skipped (verified-ok) = Z total
- Fixes applied: X (critical: N, major: N, minor: N)
- Skipped (info): N
- Test result: PASS/FAIL
- Proposals: N items (high: N, medium: N, low: N)
- Proposals file: .claude/tmp/skill-proposals.md
```

### fix mode — 修正レポート（必須）

修正を行った場合、最終サマリーの後に修正した問題の一覧と解説を出力する:

```markdown
## 修正一覧

### [category] ID: question（先頭70文字）

**修正フィールド:** wrongFeedback / explanation / question / options
**修正種別:** 事実誤り修正 / wrongFeedback品質改善 / 用語修正 / バッククォート追加

- **OLD:** 修正前の内容（100文字まで）
- **NEW:** 修正後の内容（100文字まで）
- **理由:** なぜこの修正が必要だったかの簡潔な説明
```

**パターン別サマリー** も付記する:

```markdown
## パターン別サマリー

| パターン | 説明 | 件数 |
|---------|------|------|
| wrongFeedback品質改善 | 短すぎる説明を具体的情報に拡充 | N |
| 事実誤り修正 | ドキュメントと不一致の記述を修正 | N |

## カテゴリ別件数

| カテゴリ | 件数 |
|---------|------|
| session | N |
| extensions | N |
```

修正0件の場合は「修正なし - 全問題がドキュメントと一致」と出力する。

### dry-run mode — レポート

```markdown
## 検証結果サマリー

- Mode: dry-run (incremental|full)
- 検証対象: X問 (スキップ: Y問)

### Critical Issues (修正必須)

| Quiz ID | 問題内容 | 現在の内容 | 正しい内容 | 参照元 |
|---------|---------|-----------|-----------|--------|

### Major Issues
### Minor Issues
### Info（品質改善提案）
```

問題なしの場合:
```
✅ 全 [N] 問の検証が完了しました。重大な問題は見つかりませんでした。
```

---

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
- **大文字/小文字の一致**: 技術用語はドキュメントの表記を正確に転記（例: bubblewrap, Seatbelt）

### C. リファレンス URL の有効性
- referenceUrl が有効か、アンカーがページ見出しと一致するか
- referenceUrl の参照先が問題内容に最も直接的か

### D. 内部一貫性
- question ↔ explanation の整合性
- explanation ↔ wrongFeedback の整合性
- wrongFeedback 同士の整合性

### E. バッククォート書式
コード用語・ファイルパス・コマンド・環境変数・設定キーがバッククォートで囲まれているか。
対象: ツール名(Bash,Read,Edit等), Hookイベント名, ファイルパス, 設定キー, 環境変数, スラッシュコマンド, CLIフラグ, 技術用語

**よく見落とされるパターン:**
- キーボードショートカット: Ctrl+X → `Ctrl+X`。同一問題内で一部だけバッククォートありは不整合
- 環境変数=値: `ENV_VAR`=1 ではなく `ENV_VAR=1`（=値も含めてバッククォート内）
- プレースホルダー引数: [issue-number] → `[issue-number]`

### F. wrongFeedback 品質
- 「`X`ではありません。」だけの一行は品質不足（severity: info で記録のみ）
- 正しいショートカット/コマンドが何かを教える内容であるべき
- **文字数目安:** 30文字以下の wrongFeedback は info severity で記録（「なぜ誤りか」の説明が不足している可能性）。修正時は正解との違い・正しい知識を補足する

### G. 解説の教育的価値
- explanation が正解の言い換えだけでなく、**なぜそうなのか**（仕組み・背景）を含んでいるか
- 不正解選択肢が間違いである理由に触れているか（全てでなくても代表的な誤解に言及）
- 学習者が「次回同様の問題を見たとき判断できる知識」を得られる内容か
- **severity:** critical=10文字以下, major=正解のリフレーズのみ（理由なし）, info=理由あるが他選択肢に触れず

### H. 不正解選択肢の妥当性（Distractor Quality）
- 各不正解選択肢が「ありそうだが間違い」の水準を満たしているか
- 正解だけが著しく長い/具体的で、不正解が明らかに雑なフィラーになっていないか
- 技術的に全く関係のない選択肢がないか
- **severity: info**（機械チェック `quiz:lint distractor` と併用）

### I. ダイアグラムの品質（diagram フィールド）
- `diagram` がある場合、タイプが問題の概念に合っているか（hierarchy=階層/優先順位, flow=手順/時系列, cycle=循環状態, comparison=比較対照）
- diagram の `items`/`steps`/`states`/`columns` の内容が explanation と一致しているか
- diagram の `label` が概念を正確に表現しているか
- diagram の `sub` テキストが正確な情報か（25文字以内推奨）
- cycle の `trigger` が正しいキー/コマンドか
- **冗長性チェック**: 解説が80字未満で図が解説の単なる繰り返しになっていないか → 該当する場合は diagram 削除を提案
- **過密チェック**: comparison列が5個以上、flow/hierarchyの要素が6個以上は情報過多 → グループ化や列統合を提案
- **severity:** major=内容がドキュメントと不一致, info=label改善・冗長性・過密の指摘

### J. ダイアグラム追加の検討（diagram なしの問題）
- explanation が以下のパターンを含む場合、diagram 追加を提案する:
  - **flow**: 手順・プロセス・ワークフロー（「まず→次に→最後に」「ステップ」「フロー」）
  - **hierarchy**: 優先順位・スコープ階層・レイヤー（「優先」「上位→下位」「override」）
  - **comparison**: 2つ以上の対比（「一方…他方」「X vs Y」「違い」「に対して」）
  - **cycle**: 繰り返しプロセス（「サイクル」「ループ」「繰り返し」）
- 以下の場合は追加しない:
  - 解説が80字未満（情報が少なすぎて図が冗長になる）
  - 概念が抽象的で視覚化しても理解促進効果が薄い
  - 解説が単純な事実の記述のみ
- **severity:** info（提案のみ、自動追加しない）
- 提案フォーマット: `[diagram-proposal] {id}: {type} - {label} ({理由})`

---

## 既知パターン（known-issues 要約）

### 環境変数
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=0`: 強制有効化も settings.md に記載あり
- `MCP_TIMEOUT`(mcp page) ≠ `MCP_TOOL_TIMEOUT`(settings page): 別変数
- `MAX_MCP_OUTPUT_TOKENS`: default 25,000 / warning at 10,000
- `BASH_MAX_TIMEOUT_MS`: settings.md 記載済み
- `CLAUDE_CODE_CLIENT_CERT`/`CLIENT_KEY`/`CLIENT_KEY_PASSPHRASE`: mTLS用 settings.md 記載済み
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` は `--add-dir` 併用必須
- `USE_BUILTIN_RIPGREP`: settings page 記載済み
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 1-100値、コンパクション閾値
- `CLAUDE_CODE_EFFORT_LEVEL`: Opus 4.6 **と Sonnet 4.6** 両方サポート（Opus専用ではない）
- `CLAUDE_CODE_SHELL_PREFIX`: docs は "for logging or auditing" のみ

### 設定・モード
- `defaultMode`: 5値 (default/acceptEdits/plan/dontAsk/bypassPermissions)
- `allowManagedHooksOnly: true`: user, project, **plugin** hooks を無効化（3種）
- `spinnerVerbs.mode` 省略時 = `"append"`
- Settings scopes: Managed > CLI > Local > Project > User
- `allowed-tools` in Skills: 許可リスト。リスト外は通常パーミッション設定に従う（禁止ではない）

### Hook
- exit 2 の送信先はイベントごとの decision control テーブルで個別確認
- `PostToolUse` は Can block = No
- ブロッキング対応イベント: PreToolUse, UserPromptSubmit, PermissionRequest, Stop, SubagentStop, TeammateIdle, TaskCompleted, ConfigChange, WorktreeCreate

### UI・キーボード
- `Ctrl+B`: bash commands **and agents** の両方をバックグラウンド化
- `Shift+Tab`: パーミッションモード切替。`Alt+M` は一部環境のみ
- Managed CLAUDE.md: macOS=/Library/Application Support/ClaudeCode/CLAUDE.md（~/.claude/ は User scope）

### モデル・思考
- MAX_THINKING_TOKENS: Opus/Sonnet 4.6 ではアダプティブ推論中は無視。`=0` は全モデルで thinking 無効化
- Opus 4.6 の用語: "adaptive reasoning"（"Extended Thinking" ではない）

### 改名・用語
- Task→Agent: CLI は `Agent`、Agent SDK allowedTools は `Task`
- Microsoft Foundry（NOT "Azure Foundry"）
- "Claude Agent SDK" が最新名称

### よくある誤りパターン
- 存在しないフレーズの引用（"Ruthlessly prune" 等は docs にない）
- `--fork-session` は `--continue` と併用必須
- `deprecated` はドキュメントに明示的記載がある場合のみ使用
- 外部知識の混入（docs 未記載の動作を断言しない）
- ドキュメントの「e.g.」列挙を完全リストと誤認
- multi問の `correctIndices` を `correctIndex` と混同
- wrongFeedback 構造の誤認（選択肢と逆のことを述べるのは正常）
- `gs-NNN` は legacy ID として正当（フォーマット違反ではない）
