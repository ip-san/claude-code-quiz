---
paths:
  - ".claude/skills/**"
  - ".claude/agents/**"
  - ".claude/commands/**"
---

# カスタムスキルの棲み分け

| スコープ | 配置場所 | 方針 |
|---------|---------|------|
| 全プロジェクト共通 | `~/.claude/skills/` | **カスタムしない** |
| プロジェクト固有スキル | `.claude/skills/` | 固有の教訓・ワークフロー |
| プロジェクト固有エージェント | `.claude/agents/` | 並列検証・品質ゲート用 |

- ユーザーレベルスキルにプロジェクト固有の記述を追加しない
- `/self-review` は内部で `/code-review`（汎用）を呼び出した後、プロジェクト固有チェックを実行
- `/quality-loop` で GA4分析 → レビュー → クイズ生成 → 検証 → 統計同期 → 最終ゲートを一括実行。`--team` で並列実行。詳細は [docs/quality-loop.md](docs/quality-loop.md)
- `/recommend` で利用履歴からAIが問題を選定。詳細は [docs/usage-recommend.md](docs/usage-recommend.md)
- その他: `/generate-quiz-data`（問題自動生成）、`/quiz-refine`（検証・修正）、`/analytics-insight`（GA4分析）、`/spec-audit`（仕様整合性監査）
