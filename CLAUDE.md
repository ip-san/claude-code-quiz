# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
PWA（ブラウザ・スマホ）と Electron（デスクトップ・AI連携）の 2 系統で配信。

**PWA:** https://ip-san.github.io/claude-code-quiz/

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **フロントエンド:** React + TypeScript + Vite + Tailwind CSS + Zustand
- **配信:** PWA（GitHub Pages）+ Electron（デスクトップ）— 用途に応じて使い分け
- **アナリティクス:** GTM + GA4 + MCP サーバー（`mcp/ga4-server.mjs`）
- **テスト:** Vitest（1100テスト）+ Playwright E2E（120テスト）
- **AIパイプライン:** Script→Haiku→Script→Sonnet（+Opus 5トリガー）、年間~$6
- **CI/CD:** GitHub Actions → GitHub Pages 自動デプロイ（GTM ID は Secret 管理）
- **クイズデータ:** 1057問（158ドキュメントページをカバー）

## 開発コマンド

```bash
# Electron / PWA
bun run dev           # Electron 開発サーバー
bun run dev:web       # Web版開発サーバー
bun run build:web     # Web版プロダクションビルド

# 品質チェック
bun run check         # 型チェック + lint + 1100テスト + 1057問チェック（一括）
bun run check:all     # check + docs:validate + cpd（CI用フルチェック）
bun test              # ユニット + Store テスト（1100テスト、Vitest）
bun run test:e2e      # E2E + Visual Regression テスト（120テスト、Playwright）
bun run cpd           # コードクローン検出（jscpd、2%以下）

# クイズ管理
bun run quiz:stats    # クイズ統計（カテゴリ・難易度・correctIndex分布）
bun run quiz:coverage # ドキュメントページ別カバレッジ
bun run quiz:check    # クイズ品質チェック（ID重複、偏り、構造）
bun run quiz:post-add # 問題追加後の一括処理（randomize → check → test → stats）

# 品質監視
bun run size           # バンドルサイズチェック（size-limit）
bun run skills:check   # スキル・エージェントのベストプラクティスチェック
bun run lighthouse     # Lighthouse CI
```

## 仕様の参照先

- 学習改善機能（XP、アダプティブ難易度、レコメンド、Opus トリガー、クイズ検証の判定層）の仕様: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#学習改善機能v451)
- 判定層のモデルは `node scripts/resolve-model.mjs fable opus sonnet` で解決する（Fable 5 → Opus → Sonnet）

## 詳細ルール（path-scoped）

特定ファイル編集時のみロードされる詳細ルール:
- [.claude/rules/quiz-data.md](.claude/rules/quiz-data.md) — `src/data/quizzes.json` / クイズスクリプト編集時
- [.claude/rules/session-state.md](.claude/rules/session-state.md) — `SessionRepository` / `resumeSlice` / `sessionSlice` 編集時
- [.claude/rules/url-sync.md](.claude/rules/url-sync.md) — `src/lib/urlSync*.ts` 編集時
- [.claude/rules/skill-scoping.md](.claude/rules/skill-scoping.md) — `.claude/{skills,agents,commands}/` 編集時

## Compact Instructions

コンテキスト圧縮後も次のルールを守る。多くはテストや CI で検出される。

- 未正解判定には `UserProgress.isCorrectlyAnswered()` を使う（`!p || p.attempts === 0 || !p.lastCorrect` をインラインで書かない）
- スコアしきい値は `ScoreThresholds.ts` の `PASSING_SCORE` / `CERTIFICATE_THRESHOLDS` / `SCORE_COLORS` を参照する（`>= 70` などをハードコードしない）
- コンポーネント内の日本語文字列は `src/config/locales/ja.ts` に定義し、`locale.*` 経由で参照する
- `QuizSessionState` にフィールドを追加したら、`SessionRepository` / `resumeSlice` / `saveSessionSnapshot` の3か所を同時に更新する
- UI に表示する問題数は `startSession` に渡す `questionCount` と一致させる（`SpecConsistency.test.ts` が検出）
- 全体像モードのチャプター状態は `OverviewChapterState`（ドメイン層）で管理し、QuizCard の `useState` で持たない
- ダイアグラムは `…` や文中の `...` を使わず、途中で切れた文を作らない（詳細ルールは [.claude/rules/quiz-data.md](.claude/rules/quiz-data.md)、`quiz:check` / CI が検出）
- 仕様バグ防止の詳細: [docs/bug-prevention.md](docs/bug-prevention.md)
