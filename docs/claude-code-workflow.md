# Claude Code の活用ワークフロー

このプロジェクトで Claude Code をどう活用しているかの実践ガイド。
技術的な設計判断は [decisions.md](decisions.md)、自動化ツールの一覧は [automation.md](automation.md) を参照。

## CLAUDE.md の工夫

プロジェクトルートの `CLAUDE.md` は Claude Code が最初に読むファイル。書き方で出力品質が大きく変わる。

### 意識していること

- **具体的に書く** — 「きれいなコードを書いて」ではなく「Biome のルールに従い、Tailwind の `dark:` プレフィックスを全色に付ける」
- **数値を入れる** — 「テストを書いて」ではなく「Vitest で 433 テスト、Playwright で 46 E2E テストが通る状態を維持」
- **`docs:validate` で数値を自動検証** — CLAUDE.md に書いた数値が実装とズレたら CI で落ちる。嘘の指示を防ぐ仕組み
- **ディレクトリ構造を明記** — Claude がファイルを探す時間を節約。新しいディレクトリを追加したら CLAUDE.md も更新する
- **ID 命名規則を書く** — クイズ ID の `mem-`, `skill-` 等のプレフィックスルールを明記。Claude が自動生成する時にルールに従う

### やっていないこと

- 曖昧な方針（「ベストプラクティスに従え」）— Claude が解釈に迷い、毎回違う結果になる
- 過度な制約 — 必要以上にルールを書くと Claude の判断力を殺す
- 秘密情報 — API キーや個人名は `.env` で管理し CLAUDE.md には含めない

## スキルの使い分け

### 日常の開発フロー

```
1. コードを書く
2. /self-review          → 問題があれば修正
3. bun run check         → 型 + lint + テスト + クイズチェック
4. git commit && push    → CI が自動デプロイ
```

`/self-review` は汎用の `/code-review` を内部で呼び出した後、プロジェクト固有のチェック（ダークモード漏れ、古いツール名の残留等）を実行する。過去に実際にやらかしたミスがチェック項目になっている。

### 定期的な品質改善

```
/quality-loop            → GA4 分析 + コードレビュー + クイズ生成 + クイズ検証
/quality-loop --team     → エージェントチームで並列実行（77%高速化）
/loop 1h /quality-loop   → 1時間ごとに自動実行
```

`/quality-loop` のステップ 0 で GA4 の `app_error` イベントを最優先チェックする。エラーが見つかれば即修正してデプロイ。ユーザーが報告する前にバグを潰す仕組み。

### クイズの品質維持

```
/quiz-refine             → 公式ドキュメントと全問を照合
/quiz-refine --dry-run   → 報告のみ（修正しない）
/quiz-refine --full      → 差分ではなく全問スキャン
```

Claude Code の公式ドキュメントは頻繁に更新されるため、クイズの正解が古くなる。`/quiz-refine` はドキュメントのキャッシュ（`.claude/tmp/docs/`）と照合し、変更があった問題だけを再検証する。

## スキル・エージェントの棲み分け

| 配置場所 | 用途 | 例 |
|---------|------|-----|
| `~/.claude/skills/` | 全プロジェクト共通の汎用スキル。**カスタムしない** | `/code-review`, `/accessibility` |
| `.claude/skills/` | **このプロジェクト固有**の教訓・ワークフロー | `/self-review`, `/quality-loop` |
| `.claude/agents/` | **エージェントチーム**の専門エージェント定義 | `quiz-verifier`, `domain-developer` |

プロジェクトスキルが汎用スキルを**内部で呼び出す**形で統合する。汎用スキルにプロジェクト固有の記述を混ぜない。

例: `/self-review` → 内部で `/code-review`（汎用）を実行 → その後プロジェクト固有チェック 10 項目を実行

## エージェントチーム

`--team` フラグで独立したステップを並列実行する。`.claude/agents/` に 14 体のエージェントを定義。

### 品質チーム（8体）

品質チェック・検証・分析を並列化する。

| エージェント | 役割 | 使用場面 |
|-------------|------|---------|
| `quiz-verifier` | カテゴリ別クイズ検証 | `/quiz-refine --team` で最大8並列 |
| `quality-gate` | テスト・サイズ品質ゲート | `/quality-loop --team` Phase 5 |
| `doc-watcher` | ドキュメント変更検出 | Phase 1 |
| `stats-syncer` | CLAUDE.md 統計値同期 | Phase 4 |
| `quiz-pipeline` | 生成→検証パイプライン | 問題追加時のフルオーケストレーション |
| `parallel-test-runner` | テスト並列実行 | Phase 5 |
| `facts-checker` | Verified Facts 鮮度チェック | 月次 |
| `difficulty-calibrator` | GA4 難易度キャリブレーション | 月次 |

### 開発チーム（6体）

DDD レイヤードアーキテクチャに沿って、機能開発を並列化する。

| エージェント | スクラムロール | 担当レイヤー |
|-------------|-------------|------------|
| `dev-orchestrator` | スクラムマスター | 全体オーケストレーション |
| `domain-developer` | バックエンド開発 | domain/（エンティティ、サービス） |
| `store-developer` | 状態管理開発 | stores/（Zustand スライス） |
| `ui-developer` | フロントエンド開発 | components/（React + Tailwind） |
| `test-developer` | QA | テスト並行作成（unit + E2E） |
| `code-reviewer-agent` | テックリード | リアルタイムレビュー（常駐） |

### 開発スプリントの流れ

```
Phase A: domain-developer がドメイン層を実装（基盤）
    ↓ worktree 統合
Phase B: store-developer + code-reviewer-agent（並列）
    ↓ worktree 統合
Phase C: ui-developer + test-developer（並列）
    ↓ worktree 統合
Phase D: check:all + E2E で最終検証
```

各エージェントは `isolation: worktree` で独立した作業コピーを使い、ファイル競合を防止する。

### 使い方

```
# 品質チームモード
/quality-loop --team           # Phase 1/3/5 を並列実行
/quiz-refine --team            # 8カテゴリ並列検証
/self-review --team            # レビュー項目を並列実行

# 開発チームモード（dev-orchestrator が自動調整）
「難易度カスタマイズ機能を追加して」
→ dev-orchestrator が Planning → Phase A → B → C → D を自動実行
```

### 実測効果

| 対象 | 逐次 | 並列 | 短縮率 |
|------|------|------|-------|
| quality-loop Phase 1 | 226秒 | 130秒 | 42% |
| quiz-refine 検証 | ~10分 | ~2分 | 77% |
| 最終ゲート（Phase 5） | 118秒 | 55秒 | 53% |
| Playwright E2E | 40.7秒 | 28.7秒 | 30% |
| check:all ローカル | ~35秒 | ~20秒 | 43% |

## MCP サーバーの活用

GA4 のデータを Claude Code から直接クエリできる MCP サーバー（`mcp/ga4-server.mjs`）を運用している。

### 使い方

```
「先週のユーザー数は？」       → ga4_summary(days: 7)
「モード別の正答率を教えて」   → ga4_report(dimensions, metrics)
「今アクティブなユーザーは？」 → ga4_realtime()
「エラーは出ている？」        → ga4_report(dimensionFilter: app_error)
```

### 品質ループとの連携

`/analytics-insight` スキルが MCP 経由で GA4 データを取得し、改善アクションを提案する。その提案が `/quality-loop` の次ステップ（クイズ追加判定、コードレビュー）に自動で引き継がれる。

## 教訓をスキルに取り込む

バグを修正したら「なぜ見逃したか」を考え、再発防止策をスキルに追加する。

### 実例

| バグ | 原因 | スキルへの反映 |
|------|------|-------------|
| Biome の warnings 15 件を見逃した | `grep '×'` で errors のみチェックしていた | `/self-review` に「warnings も 0 が目標」を追加 |
| DEVELOPMENT.md に npm が残っていた | bun 移行後にドキュメントを更新し忘れた | `/self-review` に古いツール参照チェックを追加 |
| シナリオ問題が内部実装寄りだった | 問題選定時に「ユーザーの実務判断か？」を考えなかった | `/generate-quiz-data` にシナリオ問題選定方針を追加 |

### やらないこと

- 一度のミスで過剰にルールを増やさない（スキルが肥大化する）
- 具体的な修正手順をスキルに書かない（その場で判断すればいい）
- 教訓の本質だけを簡潔に記録する

## 品質監視ツール

| ツール | コマンド | 用途 |
|--------|---------|------|
| axe-core | E2E 内自動実行 | WCAG 2.1 AA 違反の検出 |
| size-limit | `bun run size` | バンドルサイズが上限を超えたら警告 |
| Lighthouse CI | `bun run lighthouse` | Performance / a11y / SEO / Best Practices のスコア監視 |

これらは `/quality-loop` とは別サイクルで実行する（毎時間は不要、1 日 1 回で十分）。

## 関連ドキュメント

- [開発ガイド](DEVELOPMENT.md) — 環境セットアップ、テスト、デバッグ
- [設計判断の記録](decisions.md) — なぜこの技術を選んだかの ADR
- [品質改善ループ](quality-loop.md) — GA4 → レビュー → 生成 → 検証の自動サイクル
- [自動化ツール一覧](automation.md) — スキル、スクリプト、CI/CD の全体像
- [API・MCP 運用ガイド](analytics-api-guide.md) — GA4/GTM の API 管理と MCP サーバー
