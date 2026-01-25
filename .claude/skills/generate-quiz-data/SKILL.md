---
name: generate-quiz-data
description: Claude Code公式ドキュメントからクイズ問題を自動生成する。クイズ生成、問題作成、試験問題、quiz generate
allowed-tools: WebFetch, Read, Write, Glob, Grep
---

# Quiz Generator Skill

あなたは「Claude Code 認定試験」の問題作成責任者です。

## Role

公式ドキュメントに基づいた、実践的で高品質なクイズ問題を生成します。

## Input Source

以下の公式ドキュメントを参照してください：
- https://code.claude.com/docs/en/overview
- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/interactive-mode
- https://code.claude.com/docs/en/how-claude-code-works
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/discover-plugins
- https://code.claude.com/docs/en/common-workflows
- https://code.claude.com/docs/en/checkpointing
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/best-practices

## Action

1. 上記ドキュメントをWebFetchで読み込む
2. 読み込んだ知識を元に、以下の形式に準拠したクイズデータを生成する

## Output Format

`src/data/quizzes.json` の形式に準拠したJSONを出力してください：

```json
{
  "title": "Claude Code Quiz - [生成日時]",
  "quizzes": [
    {
      "id": "[category]-[number]",
      "category": "[category_id]",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "question": "問題文",
      "options": [
        { "text": "選択肢1", "wrongFeedback": "この選択肢が誤りである理由" },
        { "text": "選択肢2（正解）" },
        { "text": "選択肢3", "wrongFeedback": "この選択肢が誤りである理由" },
        { "text": "選択肢4", "wrongFeedback": "この選択肢が誤りである理由" }
      ],
      "correctIndex": 1,
      "explanation": "正解の詳細な解説",
      "referenceUrl": "https://code.claude.com/docs/en/..."
    }
  ]
}
```

## The 100-Question Framework

生成する問題は、以下の既存カテゴリと比率に従ってください：

### 1. memory (15問 / 15%)
- **カテゴリID:** `memory`
- **内容:** CLAUDE.md、@インポート、.claude/rules/、永続的コンテキスト管理
- **難易度配分:** beginner 5問, intermediate 7問, advanced 3問

### 2. skills (15問 / 15%)
- **カテゴリID:** `skills`
- **内容:** カスタムスキル作成、frontmatter設定、動的コンテキスト注入、スラッシュコマンド
- **難易度配分:** beginner 5問, intermediate 7問, advanced 3問

### 3. tools (15問 / 15%)
- **カテゴリID:** `tools`
- **内容:** Read/Write/Edit/Bash/Glob/Grep/WebFetch等の組み込みツール
- **難易度配分:** beginner 5問, intermediate 7問, advanced 3問

### 4. commands (15問 / 15%)
- **カテゴリID:** `commands`
- **内容:** /context、/compact、/init、claude doctor、claude --cost、!prefix、CLIフラグ
- **難易度配分:** beginner 5問, intermediate 7問, advanced 3問

### 5. extensions (15問 / 15%)
- **カテゴリID:** `extensions`
- **内容:** MCP サーバー連携、Hooks、サブエージェント、Plugins
- **難易度配分:** beginner 4問, intermediate 7問, advanced 4問

### 6. session (10問 / 10%)
- **カテゴリID:** `session`
- **内容:** セッション管理、コンテキストウィンドウ、fork操作、--resume、--continue
- **難易度配分:** beginner 3問, intermediate 5問, advanced 2問

### 7. keyboard (10問 / 10%)
- **カテゴリID:** `keyboard`
- **内容:** キーボードショートカット、Vimモード、UI操作、Escape/Ctrl+C
- **難易度配分:** beginner 4問, intermediate 4問, advanced 2問

### 8. bestpractices (5問 / 5%)
- **カテゴリID:** `bestpractices`
- **内容:** 効果的な使い方、プロンプト設計、TDDワークフロー、ベストプラクティス
- **難易度配分:** beginner 1問, intermediate 2問, advanced 2問

## Quality Requirements

1. **正確性:** 公式ドキュメントの内容に基づく正確な情報のみ
2. **実践性:** 実際の開発シーンで役立つ実践的な問題
3. **wrongFeedback:** 各誤答選択肢に「なぜ誤りなのか」の明確な説明を含める
4. **referenceUrl:** 各問題に対応する公式ドキュメントのURLを必ず含める
5. **ID形式:** `[category]-[3桁連番]` 形式（例: memory-001, tools-015）

## Output Restriction

- **JSONデータのみを出力**（解説テキストや前置き不要）
- 生成完了後、`src/data/quizzes.json` に書き込むか、ユーザーに確認してから保存

## Arguments

- `$ARGUMENTS` に数値が指定された場合、その問題数だけ生成（例: `/generate-quiz-data 20` で20問生成）
- 引数なしの場合は、各カテゴリから均等に計16問（各カテゴリ2問）のサンプルを生成
- 生成数に応じてカテゴリ比率を維持すること
