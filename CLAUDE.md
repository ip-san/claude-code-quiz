# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
PWA（ブラウザ・スマホ）と Electron（デスクトップ・AI連携）の 2 系統で配信。

**PWA:** https://ip-san.github.io/claude-code-quiz/

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **フロントエンド:** React + TypeScript + Vite + Tailwind CSS + Zustand
- **配信:** PWA（GitHub Pages）+ Electron（デスクトップ）— 用途に応じて使い分け
- **アナリティクス:** GTM + GA4 + MCP サーバー（`mcp/ga4-server.mjs`）
- **テスト:** Vitest（969テスト）+ Playwright E2E（66テスト）
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
bun run check         # 型チェック + lint + 969テスト + 762問チェック（一括）
bun run check:all     # check + docs:validate + cpd（CI用フルチェック）
bun test              # ユニット + Store テスト（969テスト、Vitest）
bun run test:e2e      # E2E + Visual Regression テスト（66テスト、Playwright）
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

## セッション永続化の注意点

IMPORTANT: `QuizSessionState` に新フィールドを追加したら以下の3箇所を必ず同時更新すること。

1. `src/infrastructure/persistence/SessionRepository.ts` — `SavedSessionData` に保存フィールド追加
2. `src/stores/utils.ts` — `saveSessionSnapshot()` でシリアライズ
3. `src/stores/slices/resumeSlice.ts` — `resumeSession()` で復元

- `answerHistory` は `answerRecords` 配列として localStorage に保存
- `retryQuestion` は UI 状態をリセットし、再回答時に**差分スコアで計算**（二重カウント防止）
- `finishTest` は answerHistory からスコアを再計算（整合性保証）

## カスタムスキルの棲み分け

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

## Compact Instructions

IMPORTANT: コンテキスト圧縮後も以下のルールを必ず守ること。

- **YOU MUST** 未正解判定には `UserProgress.isCorrectlyAnswered()` を使う。`!p || p.attempts === 0 || !p.lastCorrect` のインライン記述禁止
- **YOU MUST** スコアしきい値は `ScoreThresholds.ts` の `PASSING_SCORE`, `CERTIFICATE_THRESHOLDS`, `SCORE_COLORS` を参照する。`>= 70` や `>= 80` のハードコード禁止
- **YOU MUST** コンポーネント内の日本語文字列は `src/config/locales/ja.ts` に定義し `locale.*` 経由で参照する
- **YOU MUST** `QuizSessionState` にフィールド追加時は `SessionRepository` + `resumeSlice` + `saveSessionSnapshot` の3点を同時更新する
- **YOU MUST** UI に表示する問題数 = `startSession` に渡す `questionCount`。不一致は `SpecConsistency.test.ts` で検出される
- **YOU MUST** 全体像モードのチャプター状態は `OverviewChapterState`（ドメイン層）で管理する。QuizCard の `useState` での管理禁止
- 仕様バグ防止の詳細: [docs/bug-prevention.md](docs/bug-prevention.md)
