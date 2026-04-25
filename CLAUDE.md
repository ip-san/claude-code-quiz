# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
PWA（ブラウザ・スマホ）と Electron（デスクトップ・AI連携）の 2 系統で配信。

**PWA:** https://ip-san.github.io/claude-code-quiz/

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **フロントエンド:** React + TypeScript + Vite + Tailwind CSS + Zustand
- **配信:** PWA（GitHub Pages）+ Electron（デスクトップ）— 用途に応じて使い分け
- **アナリティクス:** GTM + GA4 + MCP サーバー（`mcp/ga4-server.mjs`）
- **テスト:** Vitest（1056テスト）+ Playwright E2E（120テスト）
- **AIパイプライン:** Script→Haiku→Script→Sonnet（+Opus 5トリガー）、年間~$6
- **CI/CD:** GitHub Actions → GitHub Pages 自動デプロイ（GTM ID は Secret 管理）
- **クイズデータ:** 762問（72ドキュメントページをカバー）

## 開発コマンド

```bash
# Electron / PWA
bun run dev           # Electron 開発サーバー
bun run dev:web       # Web版開発サーバー
bun run build:web     # Web版プロダクションビルド

# 品質チェック
bun run check         # 型チェック + lint + 1056テスト + 762問チェック（一括）
bun run check:all     # check + docs:validate + cpd（CI用フルチェック）
bun test              # ユニット + Store テスト（1056テスト、Vitest）
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

## 学習改善機能（v4.51+）

- **XP システム:** 回答ごとに XP 付与（正解10、不正解2、SRS復習+5、シナリオ完走+50）。マスタリーレベルに統合表示
- **アダプティブ難易度:** `AdaptiveDifficultyService` がカテゴリ別正答率に応じて出題順を調整
- **記憶定着度バー:** `MemoryRetentionBar` で SRS ストリークの定着度を可視化
- **成長コーチング:** Sonnet がコーチングメッセージを生成（`coachingMessage`）。`GrowthTrackingService` はパターン diff 計算のみ
- **レコメンドパイプライン:** `scripts/session-analysis.mjs`（決定論的苦戦シグナル: repeatedPrompts, consecutiveErrors, frustrationHits, resetSignals）→ `scripts/classify-prompts.mjs`（Haiku分類+苦戦ヒント注入+aiStyle+developerRole+suggestedScenarios）→ `scripts/aggregate-classifications.mjs`（集計+Opus分析統合、入力15KB圧縮）→ `/recommend` スキル（Sonnet判断+コーチング）→ `reasons.json`（AI選定理由、正のデータ）→ `mergeReasons`（Zod検証+メタデータ統合）→ `latest-recommend.json` → レコメンドセッション完了時に `recordRecommendFeedback`（GA4 `recommend_feedback`+localStorage、直近30件）
- **レコメンド堅牢化:** 事前チェック（CLI/認証/モデル）→ reasons.json 分離出力 → stale検出 → stdout フォールバック → 軽量リトライ（Haiku、1時間Rate Limit）→ SessionEnd上書き保護 → キャッシュ復元（allQuestions読込待ち）→ GrowthInsight永続化（再起動後も改善レポート維持）→ DMG/exe PATH補完（パッケージ版CLI検出）。レコメンド専用テスト223件
- **テスタビリティ:** `scripts/session-analysis.mjs`（セッション分析純粋関数6本）、`electron/recommend-handlers.ts`（IPC ハンドラ DI パターン）に抽出。`scripts/__tests__/` でスクリプトもテスト対象化
- **Opus トリガー（5種）:** initial（初回プロファイリング）/ stagnation（停滞介入）/ breakthrough（急成長分析）/ mastery（カテゴリ制覇）/ monthly（月次レビュー）。Opus 利用不可時は Sonnet で自動代替
- **クイズ検証フィルタ:** `scripts/pre-lint-quiz.mjs`（決定論的lint）→ `quiz-verifier` エージェント（Sonnet精査）→ `scripts/audit-critical-quiz.mjs`（Opus偽陽性フィルタ、任意）

## 詳細ルール（path-scoped）

特定ファイル編集時のみロードされる詳細ルール:
- [.claude/rules/quiz-data.md](.claude/rules/quiz-data.md) — `src/data/quizzes.json` / クイズスクリプト編集時
- [.claude/rules/session-state.md](.claude/rules/session-state.md) — `SessionRepository` / `resumeSlice` / `sessionSlice` 編集時
- [.claude/rules/url-sync.md](.claude/rules/url-sync.md) — `src/lib/urlSync*.ts` 編集時
- [.claude/rules/skill-scoping.md](.claude/rules/skill-scoping.md) — `.claude/{skills,agents,commands}/` 編集時

## Compact Instructions

IMPORTANT: コンテキスト圧縮後も以下のルールを必ず守ること。

- **YOU MUST** 未正解判定には `UserProgress.isCorrectlyAnswered()` を使う。`!p || p.attempts === 0 || !p.lastCorrect` のインライン記述禁止
- **YOU MUST** スコアしきい値は `ScoreThresholds.ts` の `PASSING_SCORE`, `CERTIFICATE_THRESHOLDS`, `SCORE_COLORS` を参照する。`>= 70` や `>= 80` のハードコード禁止
- **YOU MUST** コンポーネント内の日本語文字列は `src/config/locales/ja.ts` に定義し `locale.*` 経由で参照する
- **YOU MUST** `QuizSessionState` にフィールド追加時は `SessionRepository` + `resumeSlice` + `saveSessionSnapshot` の3点を同時更新する
- **YOU MUST** UI に表示する問題数 = `startSession` に渡す `questionCount`。不一致は `SpecConsistency.test.ts` で検出される
- **YOU MUST** 全体像モードのチャプター状態は `OverviewChapterState`（ドメイン層）で管理する。QuizCard の `useState` での管理禁止
- **YOU MUST** ダイアグラム本文に `…` や文中の `...` を入れない。`bun run quiz:check-ellipsis`（`quiz:check` 経由で CI 実行）が fail する。`comparison.items` は完全文 80 字以内、長い説明は `hierarchy.items[].sub` を使う
- 仕様バグ防止の詳細: [docs/bug-prevention.md](docs/bug-prevention.md)
