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
- `practical`: 実務即戦力（明日から使える機能・操作・設定）。`practical` モードの対象
- `trivia`: 上級トリビア（細かい仕様・内部挙動・滅多に使わない機能）。`trivia` モードの対象
  - **YOU MUST**: 1問に `practical` と `trivia` を同時付与しない（`quizContentQuality.test.ts` で検出）
  - 付与は `scripts/classify-quiz-practicality.mjs`（Haiku 分類）→ `scripts/apply-practicality-tags.mjs` で行う。手動編集より分類パイプラインを優先
  - どちらでもない問題は無タグ（neutral 扱い）。迷ったら付けない（過剰分類より中立）

## 価値軸（value axis）— コスパ/タイパ最適化の単一情報源

「高価値スキルを優先的に習得させる」ための価値シグナルは**新フィールドを足さず**、既存の3層で表現する（二重管理を避ける）。

| レイヤ | 置き場所 | 意味 | 付与方法 |
|--------|---------|------|---------|
| 問題単位 | `tags` の `practical`/`trivia` | 実務直結度・エバーグリーン度。問題単位の細粒度シグナル | AI分類（Haiku）＋人手レビュー |
| カテゴリ単位 | `src/config/theme.ts` の `categories[].weight`（5/10/15） | カテゴリの粗い価値事前分布（coarse prior） | 手動（下記ルール） |
| 学習負荷 | `difficulty`（beginner/intermediate/advanced） | 価値とは別軸。報酬係数(XP)に流用 | 問題作成時 |

**主従関係はコンテキストで異なる**（チューニング時に注意）:
- SRS `valueFactor`（乗法）: カテゴリ weight が支配項、tags は微調整（±5%）。tag を増やしても復習順は大きく動かない。
- Adaptive `additiveValueScore`（加点）: タグ補正(+6/-4)はカテゴリ weight 全幅(10)・隣接 tier 差(5)と同オーダー。ただし価値が効くのは **difficultyScore が同値のバケット内 tie-break に限定**され、難易度順序は上書きしない（`b.score - a.score || b.value - a.value` の短絡）。
- レコメンド / 分類パイプライン: **tags（practical/trivia）が細粒度の主シグナル**。

価値スコアの補正値（weight 既定値・practical/trivia 補正）の単一情報源は `src/domain/valueObjects/ValueScore.ts`（`DEFAULT_CATEGORY_WEIGHT` / `VALUE_TAG_BONUS`）。`.mjs` 側（aggregate）は `scripts/value-constants.mjs` に同値を複製するが、`scripts/__tests__/value-constants.test.mjs` が TS 側を実 import して突合するため、片側だけの変更は CI で必ず検知される。

これらを参照する箇所（変更時は影響範囲に注意）:

価値軸（weight / tags）を消費する5箇所:
- `QuizSessionService.weightedSampleByCategory`（full モードの出題配分。weight を消費）
- `QuizSessionService.deprioritizeLowEngagement`（初学者 random/category の SDK・上級trivia 後回し。category/tags を消費）
- `AdaptiveDifficultyService.getValueScore`（random/category の同難易度内 tie-break。`additiveValueScore` 経由）
- `SpacedRepetitionService.valueFactor`（SRS 復習順の弱い tie-break。`categoryWeight` 経由）
- `scripts/aggregate-classifications.mjs`（レコメンド候補の価値 tie-break）

difficulty（価値とは別軸）を報酬係数に流用する箇所:
- `XpService.calculateAnswerXp`（difficulty 連動XP）

**YOU MUST**: `weight` はカテゴリの粗い価値プロキシ（5=ニッチ / 10=標準 / 15=高頻度・高インパクト）。変更する場合は PR に**根拠**を記載する。
**注意（実態）**: 現状 weight=15 が9カテゴリ中6つに集中し、カテゴリ間の価値差は粗い。**問題単位の細かい価値差は主に `tags`（practical/trivia）が担う**。カテゴリ価値を細かく効かせたい場合は weight の再分割を検討するが、tag 補正との二重調整に注意する。

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
