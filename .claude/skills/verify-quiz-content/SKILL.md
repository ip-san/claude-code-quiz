---
name: verify-quiz-content
description: クイズ内容と公式ドキュメントの整合性をチェックする。クイズ検証、ドキュメントチェック、quiz verify、内容確認
allowed-tools: WebFetch, Read, Glob, Grep, Task
---

# Quiz Content Verification Skill

あなたはクイズコンテンツの品質保証担当者です。

## Role

`src/data/quizzes.json` の内容が最新の公式ドキュメント (code.claude.com) と整合しているかを検証し、差異を報告します。

## Official Documentation Sources

以下の公式ドキュメントを検証の参照元とします：

### Core Documentation
- https://code.claude.com/docs/en/overview
- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/interactive-mode
- https://code.claude.com/docs/en/how-claude-code-works

### Extension & Integration
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/discover-plugins

### Advanced Topics
- https://code.claude.com/docs/en/common-workflows
- https://code.claude.com/docs/en/checkpointing
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/best-practices

## Verification Process

### Step 1: Load Quiz Data
```
Read src/data/quizzes.json
```

### Step 2: Categorize and Distribute Verification
カテゴリごとに並列でTaskエージェントを起動して効率的に検証：

```
Task (subagent_type: Explore) for each category:
- memory: CLAUDE.md, メモリ階層, @インポート
- skills: カスタムスキル, frontmatter, スラッシュコマンド
- tools: 組み込みツール (Read/Write/Edit/Bash等)
- commands: CLIコマンド, /context, /compact等
- extensions: MCP, Hooks, Plugins
- session: セッション管理, --resume, --continue
- keyboard: キーボードショートカット, Vimモード
- bestpractices: ベストプラクティス, 効果的な使い方
```

### Step 3: Verification Checklist

各クイズ問題について以下を検証：

1. **事実の正確性**
   - 正解選択肢が公式ドキュメントの内容と一致しているか
   - 誤答選択肢の wrongFeedback が正確か
   - explanation が正しい情報を含んでいるか

2. **用語・名称の正確性**
   - APIやコマンド名が正式名称か
   - イベント名やフック名が正確か
   - 設定ファイル名やパスが正しいか

3. **リファレンスURLの有効性**
   - referenceUrl が有効なURLか
   - リンク先のページが存在するか

4. **最新性**
   - 廃止された機能を参照していないか
   - 名称変更された機能の旧名を使っていないか

## Output Format

検証結果を以下の形式で報告：

### 問題なしの場合
```
## 検証結果サマリー

✅ 全 [N] 問の検証が完了しました。
- memory: 15問 OK
- skills: 15問 OK
- tools: 15問 OK
...

重大な問題は見つかりませんでした。
```

### 問題ありの場合
```
## 検証結果サマリー

⚠️ [N] 件の問題が見つかりました。

### Critical Issues (修正必須)

| Quiz ID | 問題内容 | 現在の内容 | 正しい内容 | 参照元 |
|---------|---------|-----------|-----------|--------|
| ext-003 | イベント名が間違い | PreToolExecution | PreToolUse | hooks.md |

### Minor Issues (推奨修正)

| Quiz ID | 問題内容 | 詳細 |
|---------|---------|------|
| mem-011 | 数値が古い可能性 | "200行" → 最新値を確認 |

### 修正コマンド

以下のコマンドで自動修正できます:
[修正用のEdit tool呼び出し例を提示]
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

## Automation Tips

大規模な検証を効率的に行うため：

1. **並列実行**: 各カテゴリをTaskエージェントで並列検証
2. **キャッシュ活用**: WebFetchはキャッシュされるため、同一ドキュメントの再取得は高速
3. **差分フォーカス**: 前回検証からの変更点に注目

## Post-Verification

検証完了後、問題が見つかった場合は：

1. 修正内容をユーザーに確認
2. 承認後、quizzes.json を直接編集
3. ビルドテストを実行して確認
