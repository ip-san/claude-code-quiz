---
name: quality-loop
description: GA4分析 + コードレビュー + クイズ追加判定 + クイズ検証 + 統計同期 + 最終検証を一括実行。品質ループ、定期チェック、quality loop
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill
argument-hint: "[--skip-analytics] [--skip-review] [--skip-generate] [--skip-refine] [--skip-gate] [--dry-run] [--team]"
---

# Quality Loop Skill

GA4分析・コード品質・クイズ品質を一括でチェックし、最終検証ゲートで整合性を保証する統合スキル。
`--team` フラグで独立ステップをエージェントチームで並列実行し、大幅に高速化する。

## 引数

`$ARGUMENTS` を空白で分割し、以下のフラグを認識する:

- `--skip-analytics`: ステップ0（GA4分析）をスキップ
- `--skip-review`: ステップ1（code-review）をスキップ
- `--skip-generate`: ステップ2（クイズ追加判定・生成）をスキップ
- `--skip-refine`: ステップ3（quiz-refine）をスキップ
- `--skip-gate`: ステップ4・5（統計同期・最終検証ゲート）をスキップ
- `--dry-run`: ステップ2で追加推奨の分析のみ行い、実際の生成はしない
- `--team`: エージェントチームモード（独立ステップを並列実行）

フラグなしの場合は全ステップを逐次実行する。

---

## 実行モード

### 逐次モード（デフォルト）

```
Step 0 → Step 1 → Step 2 → Step 3 → Step 4 → Step 5
```

### チームモード（`--team`）

独立したステップをフェーズにまとめて並列実行する:

```
Phase 1（並列）: [GA4分析] [コードレビュー] [統計ベースライン]
    ↓ 結果集約
Phase 2（逐次）: クイズ追加判定・生成
    ↓
Phase 3（並列）: クイズ検証 ×N カテゴリ
    ↓
Phase 4（逐次）: 統計同期
    ↓
Phase 5（並列）: [check:all] [size] [E2E]
```

**チームモードの並列実行指示:**

Phase 1, 3, 5 では Agent ツールを使って複数エージェントを **同一メッセージ内で同時に** `run_in_background: true` で起動する。全エージェントの完了通知を待ってから次のフェーズに進む。

---

## Phase 1 / ステップ 0+1: 分析・レビュー

### ステップ0: GA4 分析

**スキップ条件:** `--skip-analytics` フラグ、または GA4 MCP ツールが利用不可

1. `/analytics-insight` スキルを実行する（直近7日間）
2. 分析結果からクイズ改善の示唆を抽出:
   - 正答率が低いカテゴリ → ステップ2のクイズ追加候補
   - チュートリアルスキップ率 → UI改善の示唆
   - 離脱率の高いチャプター → コンテンツ改善の示唆
   - **app_error があれば最優先でバグ修正**（ステップ1の前に対応）
3. 分析結果のアクション提案をステップ2に引き継ぐ
4. **app_error が検出された場合:** エラーメッセージからコード内の原因箇所を特定し、ステップ1（コードレビュー）で修正対象に含める

**MCP未接続時の動作:** GA4 MCP ツール（ga4_summary 等）が見つからない場合は「MCP未接続」と報告してスキップ。エラーにはしない。

### ステップ1: コードレビュー

**スキップ条件:** `--skip-review` フラグ、または `git diff --name-only` が空（未コミットの変更なし）

1. `/self-review --fix` を実行する（内部で `/code-review` 汎用レビュー + プロジェクト固有チェック7項目を統合実行）
2. 修正後に `npx tsc --noEmit` で型チェックを確認する

### チームモードでの Phase 1 並列化

`--team` 指定時、以下の3エージェントを同時起動:

**エージェント A: ga4-analyzer**
- `/analytics-insight` を実行し、結果をテキストで報告
- app_error の有無を明示的に報告

**エージェント B: code-reviewer**
- `/self-review --fix` を実行し、修正内容を報告
- 型チェック結果を報告

**エージェント C: stats-baseline**
- `bun run quiz:stats` と `bun run quiz:coverage` を実行
- カテゴリ別問題数と Weight 比率、カバレッジ不足ページを報告

**集約:** 3エージェント完了後、GA4 の app_error があればコードレビュー結果と合わせて対応を判断。stats-baseline の結果はステップ2に引き継ぐ。

---

## Phase 2 / ステップ2: 新規クイズの必要性検討と生成

**スキップ条件:** `--skip-generate` フラグ

### 分析

1. `bun run quiz:stats` を実行し、カテゴリ別問題数を取得（チームモードでは Phase 1 の stats-baseline 結果を使用）
2. `bun run quiz:coverage` を実行し、ドキュメントページ別カバレッジを取得（同上）
3. 以下の基準で追加推奨を判定:
   - **カテゴリ偏り:** Weight に対する問題数比率を計算。Weight 15 のカテゴリが全体の 8% 未満なら不足
   - **カバレッジ不足:** 5問未満のドキュメントページを特定
   - **新機能対応:** 直近の変更で新しいClaude Code関連の概念が追加されたか確認（UIのみの変更は対象外）
   - **GA4分析結果:** ステップ0の分析で正答率が低いカテゴリや離脱率の高いチャプターがあれば、そのカテゴリの問題改善を優先

### 生成（`--dry-run` でない場合）

追加推奨の場合:
1. 不足が大きいカテゴリから優先して生成（1回あたり最大20問）
2. `/generate-quiz-data N` スキルで生成する（スキルが使えない場合はAgentで代替）
3. `bun run quiz:post-add` を実行（randomize → check → test → stats）
4. テストが通ることを確認

### 報告

- 「追加不要」「追加推奨（--dry-run のため未実行）」「追加済み（N問、カテゴリ: ...）」のいずれかを出力

---

## Phase 3 / ステップ3: クイズ検証・修正

**スキップ条件:** `--skip-refine` フラグ

### 逐次モード

1. `bun run docs:discover` で新規ドキュメントページを検出し、`topic-config.mjs` に追加
2. `bun run docs:fetch` で期限切れキャッシュをリフレッシュ（rate limit 時はスキップ）
3. `/quiz-refine --full` スキルを実行する（フルスキャンモード）
4. ステップ2で追加した問題も含めて全問スキャンされる

### チームモードでの Phase 3 並列化

`--team` 指定時、カテゴリ別に検証エージェントを並列起動する:

**前処理（逐次）:**
1. `bun run docs:discover && bun run docs:fetch` を実行
2. `bun run verify:diff` で検証対象を抽出
3. `.claude/tmp/verify-targets.json` を読み、カテゴリ別の対象問題数を確認

**並列検証:**

対象問題があるカテゴリごとに `quiz-verifier` エージェントを起動（最大8並列）:

各エージェントへのプロンプト:
```
カテゴリ「{category}」の doc-changed / new 問題を検証してください。
対象問題: {id_list}
手順:
1. node scripts/fetch-docs.mjs --assemble {category}
2. .claude/tmp/quizzes/{category}.json を Read
3. .claude/skills/quiz-refine/known-issues.md を Read
4. チェックリスト A-H を適用
5. JSON形式で結果を報告（修正は行わない）
```

**集約・修正（逐次）:**

全検証エージェント完了後:
1. 各エージェントの報告を集約
2. critical/major の問題を `node scripts/quiz-utils.mjs edit` で修正
3. `bun run quiz:randomize && bun run quiz:check` を実行

---

## Phase 4 / ステップ4: CLAUDE.md 統計値同期

**スキップ条件:** `--skip-gate` フラグ、またはステップ2・3で変更がなかった場合

ステップ2（クイズ追加）・ステップ3（クイズ修正）でクイズデータが変わると CLAUDE.md の統計値（問題数、テスト数、ドキュメントページ数等）がズレる。

1. `bun run docs:validate` を実行して CLAUDE.md の統計値と実装の差分を検出
2. **差分がある場合:** CLAUDE.md の該当数値を自動更新する
   - 問題数（例: 668問 → 678問）
   - ドキュメントページ数
   - テスト数（テストファイル追加があった場合）
   - ダイアグラム付き問題数
3. 更新後、再度 `bun run docs:validate` を実行して PASS を確認

---

## Phase 5 / ステップ5: 最終検証ゲート

**スキップ条件:** `--skip-gate` フラグ

全ステップの変更が互いに矛盾しないことを検証する最終ゲート。ここが通らなければ push してはならない。

### 逐次モード

a → b → c の順に実行。

### チームモードでの Phase 5 並列化

`--team` 指定時、3つのチェックを同時起動:

**エージェント X: full-check**
```bash
bun run check:all    # 型 + lint + Vitest + type-coverage + quiz:check + docs:validate + docs:links
```

**エージェント Y: bundle-size**
```bash
bun run size         # size-limit による閾値チェック
```

**エージェント Z: e2e-test**
```bash
bun run test:e2e     # Playwright E2E + Visual Regression
```

### a. フルチェック
```bash
bun run check:all    # 型 + lint + Vitest + type-coverage + quiz:check + docs:validate + docs:links
```
ステップ1〜4の全変更が統合された状態で一括テスト。ステップ3の修正がステップ2のテストを壊していないか等を検出。

### b. バンドルサイズ
```bash
bun run size         # size-limit による閾値チェック
```
ステップ1のコード修正でバンドルが肥大化していないか検証。PWA の初期ロード速度に直結する。超過時は警告を報告（自動修正はしない）。

### c. E2E テスト
```bash
bun run test:e2e     # Playwright E2E + Visual Regression
```
ユーザーフロー（ウェルカム → クイズ → 結果）が壊れていないか、画面表示が退行していないかを検証。ユニットテストでは検出できないインテグレーション問題を捕捉する。

### ゲート結果の判定

| チェック | 失敗時の対応 |
|---------|-------------|
| check:all | **ブロック。** 結果レポートに NG 理由を記載し、修正を促す |
| size | **警告。** 超過量を報告。即座のブロックはしないが改善を推奨 |
| test:e2e | **ブロック。** 失敗テスト名と理由を報告。Visual Regression のスクリーンショット差分がある場合は意図的変更かどうか確認を求める |

---

## 結果レポート

全フェーズの結果を以下の形式でまとめて報告する:

```
## Quality Loop 結果

| ステップ | 結果 | 詳細 |
|---------|------|------|
| 0. GA4分析 | 完了/スキップ/MCP未接続 | ユーザー数, 主要指標, アクション提案 |
| 1. code-review | 完了/スキップ | Critical N件, High N件 修正 |
| 2. クイズ追加 | 追加不要/追加済み(N問)/スキップ | 対象カテゴリ: ... |
| 3. quiz-refine | 完了/スキップ | N問スキャン, N件修正 |
| 4. 統計同期 | 更新あり/変更なし/スキップ | CLAUDE.md: 問題数 N→M 等 |
| 5. 最終ゲート | ✅ ALL PASS / ❌ NG | check:all ✅, size ✅(+2KB), E2E ✅ |

### 実行モード
- 逐次 / チーム（Phase 1: Ns, Phase 3: Ns, Phase 5: Ns, 合計: Ns）
```

`--team` 使用時は各フェーズの並列実行時間と、逐次実行との推定比較を記載する。
