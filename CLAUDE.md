# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
PWA でスマホ・ブラウザから利用可能。Electron デスクトップ版もあり。

**PWA:** https://ip-san.github.io/claude-code-quiz/

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **フロントエンド:** React + TypeScript + Vite + Tailwind CSS + Zustand
- **配信:** PWA / GitHub Pages（メイン）+ Electron（デスクトップ）
- **アナリティクス:** GTM + GA4 + MCP サーバー（`mcp/ga4-server.mjs`）
- **テスト:** Vitest（410テスト）+ Playwright E2E（46テスト）
- **CI/CD:** GitHub Actions → GitHub Pages 自動デプロイ（GTM ID は Secret 管理）
- **クイズデータ:** 732問（68ドキュメントページをカバー）

## 開発コマンド

```bash
# Electron / PWA
bun run dev           # Electron 開発サーバー
bun run dev:web       # Web版開発サーバー
bun run build:web     # Web版プロダクションビルド

# 品質チェック
bun run check         # 型チェック + lint + 410テスト + 732問チェック（一括）
bun test              # ユニット + Store テスト（410テスト、Vitest）
bun run test:e2e      # E2E + Visual Regression テスト（46テスト、Playwright）

# クイズ管理
bun run quiz:stats    # クイズ統計（カテゴリ・難易度・correctIndex分布）
bun run quiz:coverage # ドキュメントページ別カバレッジ
bun run quiz:check    # クイズ品質チェック（ID重複、偏り、構造）
bun run quiz:post-add # 問題追加後の一括処理（randomize → check → test → stats）

# ドキュメント検証
bun run docs:validate  # CLAUDE.md の統計値が実装と一致しているか自動検証
bun run check:all      # check + docs:validate（CI用フルチェック）

# 品質監視
bun run size           # バンドルサイズチェック（size-limit）
bun run lighthouse     # Lighthouse CI
```

## セッション永続化の注意点

- `answerHistory` を `answerRecords` 配列として localStorage に保存
- `retryQuestion` は UI 状態をリセットし、再回答時に**差分スコアで計算**（二重カウント防止）
- `finishTest` は answerHistory からスコアを再計算（整合性保証）

## カスタムスキルの棲み分け

| スコープ | 配置場所 | 方針 |
|---------|---------|------|
| 全プロジェクト共通 | `~/.claude/skills/` | **カスタムしない** |
| プロジェクト固有 | `.claude/skills/` | 固有の教訓・ワークフロー |

- ユーザーレベルスキルにプロジェクト固有の記述を追加しない
- `/self-review` は内部で `/code-review`（汎用）を呼び出した後、プロジェクト固有チェックを実行
- `/quality-loop` で GA4分析 → レビュー → クイズ生成 → 検証 → 統計同期 → 最終ゲートを一括実行。詳細は [docs/quality-loop.md](docs/quality-loop.md)
- `/recommend` で利用履歴からAIが問題を選定。詳細は [docs/usage-recommend.md](docs/usage-recommend.md)
- その他: `/generate-quiz-data`（問題自動生成）、`/quiz-refine`（検証・修正）、`/analytics-insight`（GA4分析）、`/spec-audit`（仕様整合性監査）

## クイズデータ形式

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
  "explanation": "解説",
  "referenceUrl": "https://code.claude.com/docs/ja/..."
}
```

**IMPORTANT:**
- 正解選択肢に `wrongFeedback` を付けない
- 不正解選択肢には必ず `wrongFeedback` を付ける
- correctIndex は追加後に `bun run quiz:randomize` でランダム化する

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
