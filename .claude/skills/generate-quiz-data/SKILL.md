---
name: generate-quiz-data
description: Claude Code公式ドキュメントからクイズ問題を自動生成する。クイズ生成、問題作成、試験問題、quiz generate
allowed-tools: WebFetch, Read, Write, Glob, Grep, Bash
---

# Quiz Generator Skill

あなたは「Claude Code 認定試験」の問題作成責任者です。

## Role

公式ドキュメントに基づいた、実践的で高品質なクイズ問題を生成します。

## Current State

まず現在のクイズデータの状態を確認してください：

```bash
node scripts/quiz-utils.mjs stats
node scripts/quiz-utils.mjs coverage
```

現在のIDの最大値を確認：
```
Read src/data/quizzes.json
```

IDは既存の最大番号の続きから採番してください。

## Input Source

以下の公式ドキュメント（14ページ）を参照してください：

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
- https://code.claude.com/docs/en/skills（未追加の場合）

## Output Format

`src/data/quizzes.json` の既存データに追記する形式で出力してください：

```json
{
  "id": "[category]-[number]",
  "category": "[category_id]",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "question": "問題文（日本語）",
  "options": [
    { "text": "選択肢1", "wrongFeedback": "この選択肢が誤りである理由" },
    { "text": "選択肢2（正解）" },
    { "text": "選択肢3", "wrongFeedback": "この選択肢が誤りである理由" },
    { "text": "選択肢4", "wrongFeedback": "この選択肢が誤りである理由" }
  ],
  "correctIndex": 1,
  "explanation": "正解の詳細な解説（日本語）",
  "referenceUrl": "https://code.claude.com/docs/en/..."
}
```

## Categories (8 categories)

| ID | 名前 | Weight | 主なドキュメントページ |
|----|------|--------|----------------------|
| memory | Memory (CLAUDE.md) | 15% | memory |
| skills | Skills | 15% | skills, how-claude-code-works |
| tools | Tools | 15% | how-claude-code-works, settings |
| commands | Commands | 15% | interactive-mode, quickstart, overview |
| extensions | Extensions | 15% | mcp, hooks, discover-plugins, sub-agents |
| session | Session & Context | 10% | settings, checkpointing, overview, quickstart |
| keyboard | Keyboard & UI | 10% | interactive-mode |
| bestpractices | Best Practices | 10% | best-practices, common-workflows, quickstart |

## ID Conventions

- `mem-NNN`, `skill-NNN`, `tool-NNN`, `cmd-NNN`, `ext-NNN`, `ses-NNN`, `key-NNN`, `bp-NNN`
- 既存の最大番号の続きから採番（重複禁止）

## Quality Requirements

### 基本ルール

1. **正確性:** 公式ドキュメントの内容に基づく正確な情報のみ
2. **実践性:** 実際の開発シーンで役立つ実践的な問題
3. **wrongFeedback:** 正解選択肢にはwrongFeedbackを付けない。不正解選択肢には必ず「なぜ誤りなのか」の説明を含める
4. **referenceUrl:** 各問題に `https://code.claude.com/docs/en/` で始まるURLを必ず含める。パスは以下の14ページのいずれか: overview, quickstart, settings, memory, interactive-mode, how-claude-code-works, mcp, hooks, discover-plugins, sub-agents, common-workflows, checkpointing, best-practices, skills
5. **日本語:** 問題文・選択肢・解説・wrongFeedbackはすべて日本語
6. **選択肢4つ:** 各問題に正確に4つの選択肢を含める

### 暗記問題の禁止（最重要）

**単純暗記を問う問題は作成しない。** 以下のパターンは NG：

❌ **NG例（暗記型）:**
- 「〜のデフォルト値は何ですか？」（数値やパスの暗記）
- 「〜のキーボードショートカットは？」（キーの丸暗記）
- 「〜の環境変数名は何ですか？」（変数名の暗記）
- 「〜のコマンド名は？」（名前の暗記）

✅ **OK例（理解・シナリオ型）:**
- 「コンテキストが膨大になった場合、最も効果的な対処法はどれですか？」（判断力）
- 「プロジェクト固有のルールをチーム全員に共有したい場合、どのファイルに記述すべきですか？」（使い分け）
- 「自動コンパクト機能が意図しないタイミングで発動する場合、どのように調整しますか？」（問題解決）
- 「MCPサーバーをプロジェクト単位で設定する理由として最も適切なものはどれですか？」（設計理由の理解）

### 問題作成の指針

1. **「なぜ」「いつ」「どう使い分ける」を問う** — 機能の存在を知っているかではなく、適切に使えるかを問う
2. **実践シナリオを設定する** — 「〜したい場合、どうすべきか？」という実務的な状況を提示する
3. **誤解しやすいポイントを突く** — よくある勘違いや混同しやすい概念を選択肢に含める
4. **wrongFeedback で学びを提供する** — 単に「間違いです」ではなく、なぜそれが不適切かを説明する

### 重複・冗長の防止

生成前に必ず既存問題を確認し、以下を避ける：
- **完全重複:** 同じ概念を同じ角度から問う問題
- **類似重複:** 表現を変えただけで本質的に同じ問題
- **カバレッジ偏り:** 特定の機能に問題が集中しすぎる

```bash
# 既存問題の確認
npm run quiz:stats
npm run quiz:coverage
```

### 事実正確性の確認ポイント

過去に見つかった典型的な誤り：
- **環境変数名の誤記:** 例）`CLAUDE_CODE_AUTOCOMPACT_PCT_OVERRIDE` → 正しくは `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- **コマンド動作の誤解:** 例）`--from-pr` はワークツリーでのPRレビューではなくセッションリンク
- **存在しない機能の記述:** ドキュメントで確認できない機能を正解にしない
- 生成後に必ずドキュメントと照合し、正解選択肢の根拠を確認すること

## Post-Generation Steps（重要）

問題追加後、以下を必ず実行してください：

1. **correctIndex をランダム化:**
   ```bash
   npm run quiz:randomize
   ```

2. **品質チェック:**
   ```bash
   npm run quiz:check
   ```

3. **テスト実行:**
   ```bash
   npm test
   ```

4. **統計確認:**
   ```bash
   npm run quiz:stats
   npm run quiz:coverage
   ```

## Arguments

- `$ARGUMENTS` に数値が指定された場合、その問題数だけ生成（例: `/generate-quiz-data 20` で20問生成）
- 引数なしの場合は、各カテゴリから均等に計16問（各カテゴリ2問）のサンプルを生成
- 生成数に応じてカテゴリ比率を維持すること
- カバレッジの低いドキュメントページを優先的にカバーすること
