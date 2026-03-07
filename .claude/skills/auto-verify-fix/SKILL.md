---
name: auto-verify-fix
description: クイズの自律検証・修正・スキル改善提案。反復回数を指定して実行。auto verify fix、自律検証
context: fork
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

# Auto Verify & Fix Skill

あなたはクイズコンテンツの自律検証・修正エージェントです。
クイズデータを公式ドキュメントと照合し、問題を**直接修正**し、スキル改善を提案します。

## 引数パース

`$ARGUMENTS` を以下のように解釈する:

```
/auto-verify-fix 3          → iterations=3, categories=全カテゴリ
/auto-verify-fix 2 memory   → iterations=2, categories=[memory]
/auto-verify-fix 1 memory tools → iterations=1, categories=[memory, tools]
```

- 最初の数値 = 反復回数（必須、1-5）
- 残り = カテゴリフィルタ（省略時は全8カテゴリ）
- 有効カテゴリ: memory, skills, tools, commands, extensions, session, keyboard, bestpractices

引数が不正な場合はエラーメッセージを返して終了。

## Step 0: 前処理

以下を **並列で** 実行:

**Bash 1:**
```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && npm run quiz:lint
```

**Bash 2:**
```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && npm run quiz:check
```

**Bash 3:**
```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && rm -f .claude/tmp/verify_*.json .claude/tmp/skill-proposals.md
```

lint 完了後に:
```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && npm run verify:diff:full
```

次に、対象カテゴリに必要なドキュメントをキャッシュ:
```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && npm run docs:fetch
```

## 反復ループ

```
For iteration = 1..N:
  For each target category (順次処理):
    1. カテゴリ別クイズデータ読み込み
    2. 関連ドキュメント取得
    3. 検証チェックリスト A-F 適用
    4. 問題を直接修正
    5. 修正内容と学習パターンをメモ
  End for

  npm run quiz:randomize
  npm run quiz:check
  反復サマリー出力
End for
```

### カテゴリ処理の詳細

**1. クイズデータ読み込み:**
```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && cat .claude/tmp/quizzes/{CATEGORY}.json
```
ファイルが存在しない場合は `npm run verify:diff:full` を再実行。

**2. ドキュメント取得:**
```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && node scripts/fetch-docs.mjs --assemble {CATEGORY}
```
stdout にドキュメント内容が出力される。

**3. 検証 → 修正:**
各問題について検証チェックリスト A-F を適用。
- **critical/major**: `Edit` ツールで `src/data/quizzes.json` を直接修正
- **minor**: 修正するが、判断に迷う場合はスキップしてログに記録
- **info**: ログに記録のみ（修正しない）

**修正時の注意:**
- `Edit` ツールは `old_string` がファイル内でユニークである必要がある
- 問題の `"id": "xxx-NNN"` の前後を含めて十分なコンテキストを指定する
- 1問ずつ修正する（バッチ修正しない）
- 正解選択肢に `wrongFeedback` を付けない
- 不正解選択肢には必ず `wrongFeedback` を付ける

### 反復間の再検証

iteration 2 以降では:
- 前回修正した問題を重点的に再チェック（修正が新たな矛盾を生んでいないか）
- 前回スキップした minor 問題を再評価
- 新しいパターンを発見したら学習メモに追記

## Step Final: 後処理

全イテレーション完了後:

```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && npm run quiz:randomize && npm run quiz:check && npm test
```

```bash
cd /Users/sesoko/Desktop/workspace/claude-code-quiz-desktop && npm run verify:save
```

テストが失敗した場合は原因を調査して修正を試みる。

最後に **スキル改善提案** を `.claude/tmp/skill-proposals.md` に書き出す。

## スキル改善提案の書き出し

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
- **対象ファイル**: generate-quiz-data/SKILL.md | verify-quiz-content/known-issues.md | verify-quiz-content/sub-agent-template.md
- **汎用性**: [高/中/低] — 今後の生成・検証でも再発が予想されるか
  - 高: 構造的なパターン（生成ルールの欠如、チェックリスト項目の不足）
  - 中: 特定ドキュメントの変更に起因（ドキュメント更新時に再確認が必要）
  - 低: 個別の事実誤認（1回限りの修正で解決）

### Fix Log
| ID | Severity | Type | Field | Summary |
|----|----------|------|-------|---------|
| xxx-NNN | critical | fact | explanation | 修正概要 |
```

**重要**: 汎用性「低」の提案は参考情報として記録するだけで、スキル更新は不要。
汎用性「高」「中」のみがスキル更新の候補。

## 最終サマリー

処理完了後、以下を出力:

```
## Auto Verify & Fix Complete
- Iterations: N
- Categories processed: [list]
- Fixes applied: X (critical: N, major: N, minor: N)
- Skipped (info): N
- Test result: PASS/FAIL
- Proposals: N items (high: N, medium: N, low: N)
- Proposals file: .claude/tmp/skill-proposals.md
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
