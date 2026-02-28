---
name: verify-quiz-content
description: クイズ内容と公式ドキュメントの整合性をチェックする。クイズ検証、ドキュメントチェック、quiz verify、内容確認
allowed-tools: WebFetch, Read, Glob, Grep, Task, Bash
---

# Quiz Content Verification Skill

あなたはクイズコンテンツの品質保証担当者です。

## Role

`src/data/quizzes.json` の内容が最新の公式ドキュメント (code.claude.com) と整合しているかを検証し、差異を報告します。

## Step 0: Automated Quality Check (最初に実行)

まず自動テストで構造的な問題を検出：

```bash
npm test
npm run quiz:check
npm run quiz:stats
```

これにより以下が自動検証されます：
- ID重複
- correctIndex の偏り（35%上限）
- wrongFeedback の構造（正解に付いていないか、不正解に欠けていないか）
- カテゴリの妥当性
- 問題文・解説の文字数
- referenceUrl の形式
- 難易度分布

**自動テストが失敗した場合は、まずその問題を修正してください。**

## Official Documentation Sources

以下の公式ドキュメント（16ページ + Agent SDK）を検証の参照元とします：

### Core Documentation
- https://code.claude.com/docs/en/overview
- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/memory

### Interactive & Tools
- https://code.claude.com/docs/en/interactive-mode
- https://code.claude.com/docs/en/how-claude-code-works

### Extensions & Integration
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/discover-plugins
- https://code.claude.com/docs/en/sub-agents

### Advanced Topics
- https://code.claude.com/docs/en/common-workflows
- https://code.claude.com/docs/en/checkpointing
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/model-config

### Agent SDK（別ドメイン）
- https://platform.claude.com/docs/en/agent-sdk/overview

## Step 1: Fact Verification

**⚠️ レートリミット対策:** 8カテゴリ全てを同時に並列検証するとAPIレートリミットに抵触する可能性が高い。**2〜3カテゴリずつバッチで実行する**こと。

```
# バッチ1: memory, skills, tools (並列)
# バッチ2: commands, extensions (並列)
# バッチ3: session, keyboard, bestpractices (並列)

Task (subagent_type: general-purpose) for each category in batch:
  1. WebFetchで該当ドキュメントページを取得
  2. 各問題の正解・不正解・解説を照合
  3. 差異を報告
```

引数で特定カテゴリが指定された場合は、そのカテゴリのみ並列実行で問題ない。

### Verification Checklist

各クイズ問題について以下を検証：

#### A. 事実の正確性

- 正解選択肢が公式ドキュメントの内容と一致しているか
- 誤答選択肢の wrongFeedback が正確か
- explanation が正しい情報を含んでいるか

**検証の原則:**
- 数値（スコープ数、イベント数、モデル対応範囲など）は公式ドキュメントで都度確認する。過去の正解が最新とは限らない
- 環境変数名・設定キー名・コマンドフラグは正式名称をドキュメントと照合する
- wrongFeedback の内容もドキュメントと矛盾していないか確認する

**よくある誤りパターン:**
- 環境変数名の誤記（例: `CLAUDE_CODE_AUTOCOMPACT_*` → 正しくは `CLAUDE_AUTOCOMPACT_*`）
- コマンド動作の誤解（例: `--from-pr` はワークツリーでのPRレビューではなくセッションリンク）
- ドキュメントで確認できない機能を正解にしてしまう
- 設定キーの旧名称（例: `disallowedCommands` → 正しくは `permissions.deny`）
- スキル定義のキー名形式（アンダースコアではなくハイフン区切り）
- 設定スコープ・Hookイベント・ツールカテゴリ等の「数」が古い
- `MAX_THINKING_TOKENS`の対応モデル範囲が不完全（ドキュメントで最新を確認）
- キーバインド動作の未ドキュメント記述（例: `Ctrl+C` 2回で終了 — 未ドキュメント）

#### B. 用語・名称の正確性

- APIやコマンド名が正式名称か
- イベント名やフック名が正確か
- 設定ファイル名やパスが正しいか

#### C. リファレンスURLの有効性

- referenceUrl が有効なURLか
- リンク先のページが存在するか
- **アンカー（`#fragment`）が実際のページ見出しと一致するか** — アンカー不一致は頻出するため重点チェック
- 有効なドメインとパス：
  - `https://code.claude.com/docs/en/{page}` — 16ページ: overview, quickstart, settings, memory, interactive-mode, how-claude-code-works, mcp, hooks, discover-plugins, sub-agents, common-workflows, checkpointing, best-practices, skills, model-config
  - `https://platform.claude.com/docs/en/agent-sdk/overview` — Agent SDK関連

**既知の正しいアンカー（ドキュメント更新で変わりうるため、検証時にWebFetchで再確認すること）:**

memoryページ:
- `#claudemd-imports`（`@`インポート関連）
- `#determine-memory-type`（メモリ階層・スコープ関連）
- `#directly-edit-memories-with-memory`（`/memory`コマンド関連）
- `#how-claude-looks-up-memories`（サブディレクトリ検索関連）
- `#user-level-rules`（ユーザールール関連）
- `#path-specific-rules`

skillsページ:
- `#run-skills-in-a-subagent`（サブエージェント実行関連）

#### D. 最新性

- 廃止された機能を参照していないか
- 名称変更された機能の旧名を使っていないか

#### D2. バッククォート書式

- コード用語・ファイルパス・コマンド・環境変数・設定キーがバッククォートで囲まれているか
- question, options[].text, explanation, options[].wrongFeedback すべてが対象
- ディレクトリパス（`.claude/`）の末尾パターンに注意: `.claude/memory.txt` の途中で切れないこと

**バッククォートが必要な主要カテゴリ:**
- **ツール名:** `Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `WebFetch`, `WebSearch`, `NotebookEdit`, `AskUserQuestion`, `Task`, `TodoWrite`
- **Hookイベント名:** `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `Stop` 等
- **ファイルパス:** `settings.json`, `CLAUDE.md`, `CLAUDE.local.md`, `.mcp.json`, `managed-mcp.json`, `.claude/settings.json`, `~/.claude/settings.json`
- **設定キー:** `permissions.allow`, `permissions.deny`, `output_mode`, `run_in_background`, `old_string`, `new_string`, `edit_mode`, `autoMemoryEnabled` 等
- **環境変数:** `ALL_CAPS_WITH_UNDERSCORES`パターン（例: `CLAUDE_CODE_EFFORT_LEVEL`, `BASH_DEFAULT_TIMEOUT_MS`）
- **スラッシュコマンド:** `/compact`, `/clear`, `/resume`, `/memory`, `/model`, `/doctor`, `/init`, `/rewind` 等
- **CLIフラグ:** `--dangerously-skip-permissions`, `--from-pr`, `--continue`, `--worktree` 等
- **技術用語:** `ripgrep`, `bypassPermissions`, `acceptEdits`, `dontAsk`, `JSON-RPC`, `stdio`, `SSE`, `mTLS`

**ヒント:** バッククォート欠落は広範囲にわたることが多い。大量の場合は正規表現ベースの自動修正スクリプトで一括対応が効率的。

#### E. 問題の質（暗記問題チェック）

以下のパターンに該当する問題を「要リライト」として報告する：

- **丸暗記型:** デフォルト値・パス・キーバインド・環境変数名をそのまま問う
- **表面的:** 「〜とは何ですか」「〜の名前は」のような定義の暗記
- **シナリオなし:** 実務的な状況設定がなく、知識の有無だけで回答できる

**良い問題の基準:**
- 「なぜ」「いつ」「どう使い分ける」を問う
- 実践シナリオが設定されている
- 誤解しやすいポイントを突いている
- wrongFeedback が学びを提供している

#### E2. wrongFeedback の品質チェック

wrongFeedback が具体的で学習効果のある説明になっているか確認する。

**完全NGパターン（即修正）:**
- 「この選択肢は正しくありません。正解の解説を参照してください。」（学習効果ゼロ）

**要改善パターン:**
- 「これは正しくありません」「この機能は存在しません」（抽象的すぎる）
- 「このパスではありません」「不十分です」（理由がない）
- 「〜は有効なモードです。」「〜は組み込みエージェントです。」（一文で終わり、何をするかの説明なし）
- 「サポートされています。」「〜コマンドではありません。」（何が正しいかの情報なし）

**良い例:**
- 具体的にどの機能・設定と混同しやすいか説明
- 正しい情報を併記（「〜ではなく、実際は〜です」）
- ドキュメントの該当箇所を間接的に参照
- 2文以上で理由と正しい情報を提供

**傾向:** 完全NGパターンや一文型wrongFeedbackはtoolsカテゴリとextensionsカテゴリに特に多い傾向がある。

#### E3. 不正解選択肢のもっともらしさ

不正解選択肢が「明らかに間違い」ではなく「もっともらしい」ものになっているか確認する。
- 開発者の一般知識だけで除外できる選択肢は不適切
- Claude Code 固有の知識がないと判別できない選択肢が理想

#### F. 重複・冗長チェック

以下の観点で冗長な問題を特定する：

- **完全重複:** 同じ概念を同じ角度から問う
- **類似重複:** 表現を変えただけで本質的に同じ
- **カバレッジ偏り:** 特定の機能に問題が集中しすぎている

重複が見つかった場合は、どちらの問題を残すべきかを品質の高い方を基準に提案する。

## Output Format

### 問題なしの場合
```
## 検証結果サマリー

✅ 全 [N] 問の検証が完了しました。
- 自動テスト: PASS (14/14)
- ファクトチェック: memory 28問 OK, skills 26問 OK, ...

重大な問題は見つかりませんでした。
```

### 問題ありの場合
```
## 検証結果サマリー

⚠️ [N] 件の問題が見つかりました。

### Critical Issues (修正必須)

| Quiz ID | 問題内容 | 現在の内容 | 正しい内容 | 参照元 |
|---------|---------|-----------|-----------|--------|
| ext-003 | イベント名が間違い | PreToolExecution | PreToolUse | hooks |

### Minor Issues (推奨修正)

| Quiz ID | 問題内容 | 詳細 |
|---------|---------|------|
| mem-011 | 数値が古い可能性 | "200行" → 最新値を確認 |

### 暗記問題（要リライト）

| Quiz ID | 現在の問題文 | 問題点 | リライト案 |
|---------|-------------|--------|-----------|
| key-005 | 〜のショートカットキーは？ | キーの丸暗記 | シナリオ型に変更 |

### 重複・冗長

| Quiz ID (残す方) | Quiz ID (削除候補) | 重複内容 |
|------------------|-------------------|---------|
| ext-010 | ext-045 | MCP設定の同一観点 |

### バッククォート書式

| Quiz ID | フィールド | 対象テキスト | 修正内容 |
|---------|----------|-------------|---------|
| mem-005 | question | CLAUDE.md → `CLAUDE.md` | バッククォート追加 |

### wrongFeedback 品質

| Quiz ID | 現在のwrongFeedback | 問題点 | 改善案 |
|---------|-------------------|--------|--------|
| ext-020 | 「これは違います」 | 抽象的 | 具体的な理由を追記 |
```

## Severity Levels

- **Critical**: 事実と異なる情報（正解が間違い、存在しない機能など）
- **Major**: 用語・名称の不一致（旧名称の使用、typo等）
- **Minor**: 数値の更新推奨、リンク切れの可能性
- **Info**: スタイルや表現の改善提案

## Arguments

- `$ARGUMENTS` にカテゴリ名を指定した場合、そのカテゴリのみ検証
  - 例: `/verify-quiz-content memory` → memoryカテゴリのみ
  - 例: `/verify-quiz-content extensions tools` → 複数カテゴリ指定可能
- 引数なしの場合は全カテゴリを検証

## Post-Verification

検証完了後、問題が見つかった場合は：

1. 修正内容をユーザーに確認（修正範囲の選択肢を提示）
2. 承認後、修正を実施

### 修正の効率的なアプローチ

**少量（〜10件）:** 手動で `Edit` ツールで直接修正

**大量（10件以上）:** 一時的なNode.jsスクリプトで一括修正が効率的

```
scripts/fix-*.mjs パターンで一時スクリプトを作成
→ 実行して確認
→ 完了後にスクリプトを削除
```

**バッククォート修正（50件以上）:** 正規表現ベースの自動修正スクリプトが必須
- ツール名・環境変数・パス等をカテゴリ別に定義
- 二重バッククォート防止のガード（既にバッククォート内か確認）
- `--dry-run`オプションでプレビュー後に適用
- 冪等性を確認（2回目の実行で0件変更）

**暗記問題リライト:** `question`フィールドのみ変更（options/explanation は既存を維持）

**重複削除:** IDリストで `splice` → バージョン番号をインクリメント

### 修正後の必須手順

```bash
npm run quiz:randomize   # correctIndex 再ランダム化
npm run quiz:check       # 構造チェック
npm test                 # 全テスト通過確認
npm run quiz:stats       # 分布確認
```
