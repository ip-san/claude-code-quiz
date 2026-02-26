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

以下の公式ドキュメント（14ページ）を検証の参照元とします：

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

## Step 1: Fact Verification

カテゴリごとに並列でTaskエージェントを起動して効率的に検証：

```
Task (subagent_type: general-purpose) for each category:
  1. WebFetchで該当ドキュメントページを取得
  2. 各問題の正解・不正解・解説を照合
  3. 差異を報告
```

### Verification Checklist

各クイズ問題について以下を検証：

#### A. 事実の正確性

- 正解選択肢が公式ドキュメントの内容と一致しているか
- 誤答選択肢の wrongFeedback が正確か
- explanation が正しい情報を含んでいるか

**過去に見つかった典型的な誤り:**
- 環境変数名の誤記（例: `CLAUDE_CODE_AUTOCOMPACT_PCT_OVERRIDE` → 正しくは `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`）
- コマンド動作の誤解（例: `--from-pr` の挙動）
- ドキュメントで確認できない機能を正解にしてしまう

#### B. 用語・名称の正確性

- APIやコマンド名が正式名称か
- イベント名やフック名が正確か
- 設定ファイル名やパスが正しいか

#### C. リファレンスURLの有効性

- referenceUrl が有効なURLか
- リンク先のページが存在するか
- パスは14ページのいずれか: overview, quickstart, settings, memory, interactive-mode, how-claude-code-works, mcp, hooks, discover-plugins, sub-agents, common-workflows, checkpointing, best-practices, skills

#### D. 最新性

- 廃止された機能を参照していないか
- 名称変更された機能の旧名を使っていないか

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

1. 修正内容をユーザーに確認
2. 承認後、quizzes.json を直接編集
3. `npm run quiz:randomize` で正答位置を再ランダム化
4. `npm test` でテスト実行して確認
