---
paths:
  - "src/data/quizzes.json"
  - "scripts/quiz-utils.mjs"
  - "scripts/pre-lint-quiz.mjs"
  - "src/infrastructure/validation/QuizValidator.ts"
  - "src/infrastructure/validation/quizContentQuality.test.ts"
---

# クイズデータ形式

`src/data/quizzes.json` に準拠：

```json
{
  "id": "category-001",
  "category": "memory",
  "difficulty": "intermediate",
  "question": "問題文",
  "options": [
    { "text": "正解選択肢" },
    { "text": "不正解選択肢", "wrongFeedback": "誤りの理由" }
  ],
  "correctIndex": 0,
  "explanation": "概念の説明。\n{{diagram:0}}\n詳細や補足。",
  "referenceUrl": "https://code.claude.com/docs/ja/...",
  "diagrams": [{ "type": "terminal", "lines": [...] }]
}
```

**IMPORTANT:**
- 正解選択肢に `wrongFeedback` を付けない
- 不正解選択肢には必ず `wrongFeedback` を付ける
- correctIndex は追加後に `bun run quiz:randomize` でランダム化する
- `diagrams` は配列（最大3つ）。`explanation` 中の `{{diagram:N}}` で挿入位置を指定
- `diagram`（単数）も後方互換で対応するが、新規追加は `diagrams` を使用

## タグシステム

`tags` フィールドで問題をクロスカテゴリにグループ化。問題は元のカテゴリに所属したまま。

- `overview`: 全体像モード対象問題（36問）
- `overview-ch-N`: チャプター割り当て（ch-1〜ch-6）
- `overview-NNN`: 出題順序（010, 020, ... グローバルユニーク）

## ID命名規則

| カテゴリ | Prefix | 例 |
|---------|--------|-----|
| memory | mem- | mem-001 |
| skills | skill- | skill-001 |
| tools | tool- | tool-001 |
| commands | cmd- | cmd-001 |
| extensions | ext- | ext-001 |
| session | ses- | ses-001 |
| keyboard | key- | key-001 |
| bestpractices | bp- | bp-001 |
| sdk | sdk- | sdk-001 |
