# Quiz Generator Prompt

このプロンプトをClaude（Claude.ai、Claude Code、API等）にコピペして、クイズデータを生成できます。

---

## 使い方

1. 以下の「プロンプト（コピー用）」セクションの内容をすべてコピー
2. Claudeに貼り付けて実行
3. 生成されたJSONを `src/data/quizzes.json` に保存

---

## プロンプト（コピー用）

```
あなたは「Claude Code 認定試験」の問題作成責任者です。

## 参照ドキュメント

以下の公式ドキュメントを参照して、正確な情報に基づいた問題を作成してください：

- https://docs.anthropic.com/en/docs/claude-code/overview
- https://docs.anthropic.com/en/docs/claude-code/getting-started
- https://docs.anthropic.com/en/docs/claude-code/settings
- https://docs.anthropic.com/en/docs/claude-code/memory
- https://docs.anthropic.com/en/docs/claude-code/cli-usage
- https://docs.anthropic.com/en/docs/claude-code/mcp
- https://docs.anthropic.com/en/docs/claude-code/ide-integrations
- https://docs.anthropic.com/en/docs/claude-code/tutorials

## 出力形式

以下のJSON形式でクイズデータを出力してください：

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
      "referenceUrl": "https://docs.anthropic.com/..."
    }
  ]
}

## カテゴリと問題数配分（100問の場合）

### 1. memory (15問 / 15%)
- カテゴリID: memory
- 内容: CLAUDE.md、@インポート、.claude/rules/、永続的コンテキスト管理
- 難易度: beginner 5問, intermediate 7問, advanced 3問

### 2. skills (15問 / 15%)
- カテゴリID: skills
- 内容: カスタムスキル作成、frontmatter設定、動的コンテキスト注入、スラッシュコマンド
- 難易度: beginner 5問, intermediate 7問, advanced 3問

### 3. tools (15問 / 15%)
- カテゴリID: tools
- 内容: Read/Write/Edit/Bash/Glob/Grep/WebFetch等の組み込みツール
- 難易度: beginner 5問, intermediate 7問, advanced 3問

### 4. commands (15問 / 15%)
- カテゴリID: commands
- 内容: /context、/compact、/init、claude doctor、claude --cost、!prefix、CLIフラグ
- 難易度: beginner 5問, intermediate 7問, advanced 3問

### 5. extensions (15問 / 15%)
- カテゴリID: extensions
- 内容: MCP サーバー連携、Hooks、サブエージェント、Plugins
- 難易度: beginner 4問, intermediate 7問, advanced 4問

### 6. session (10問 / 10%)
- カテゴリID: session
- 内容: セッション管理、コンテキストウィンドウ、fork操作、--resume、--continue
- 難易度: beginner 3問, intermediate 5問, advanced 2問

### 7. keyboard (10問 / 10%)
- カテゴリID: keyboard
- 内容: キーボードショートカット、Vimモード、UI操作、Escape/Ctrl+C
- 難易度: beginner 4問, intermediate 4問, advanced 2問

### 8. bestpractices (5問 / 5%)
- カテゴリID: bestpractices
- 内容: 効果的な使い方、プロンプト設計、TDDワークフロー、ベストプラクティス
- 難易度: beginner 1問, intermediate 2問, advanced 2問

## 品質要件

1. 正確性: 公式ドキュメントの内容に基づく正確な情報のみ
2. 実践性: 実際の開発シーンで役立つ実践的な問題
3. wrongFeedback: 各誤答選択肢に「なぜ誤りなのか」の明確な説明を含める
4. referenceUrl: 各問題に対応する公式ドキュメントのURLを必ず含める
5. ID形式: [category]-[3桁連番] 形式（例: memory-001, tools-015）

## タスク

上記の仕様に従って、各カテゴリから2問ずつ、計16問のサンプルクイズを生成してください。
JSONデータのみを出力し、解説テキストや前置きは不要です。
```

---

## カスタマイズ

### 問題数を変更する場合

プロンプト末尾の「タスク」セクションを変更してください：

- **サンプル（16問）:** 「各カテゴリから2問ずつ、計16問」
- **中規模（50問）:** 「各カテゴリから比率に従って、計50問」
- **フル（100問）:** 「各カテゴリから指定比率に従って、計100問」

### 特定カテゴリのみ生成する場合

```
## タスク

「memory」カテゴリのみ、15問生成してください。
難易度配分: beginner 5問, intermediate 7問, advanced 3問
```

### 難易度を指定する場合

```
## タスク

全カテゴリから「advanced」難易度の問題のみ、計20問生成してください。
```

---

## 生成後の確認事項

1. JSONが正しくパースできるか確認
2. 各問題のcorrectIndexが正しいインデックスを指しているか確認
3. referenceUrlが有効なURLか確認
4. 正解の選択肢にwrongFeedbackが含まれていないか確認
