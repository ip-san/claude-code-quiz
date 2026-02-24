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

1. **正確性:** 公式ドキュメントの内容に基づく正確な情報のみ
2. **実践性:** 実際の開発シーンで役立つ実践的な問題
3. **wrongFeedback:** 正解選択肢にはwrongFeedbackを付けない。不正解選択肢には必ず「なぜ誤りなのか」の説明を含める
4. **referenceUrl:** 各問題に `https://code.claude.com/docs/en/` で始まるURLを必ず含める
5. **日本語:** 問題文・選択肢・解説・wrongFeedbackはすべて日本語
6. **選択肢4つ:** 各問題に正確に4つの選択肢を含める

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
