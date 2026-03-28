# 品質改善ループ

コード品質・クイズ品質・ユーザー体験を継続的に改善するための自動化されたフィードバックループ。

## 概念

```
         ┌─────────────────────────────────────────┐
         │            /quality-loop                  │
         │                                           │
    ┌────┴────┐   ┌──────────┐   ┌────────┐   ┌────┴────┐
    │ Step 0  │──→│ Step 1   │──→│ Step 2 │──→│ Step 3  │
    │ GA4分析 │   │ コード   │   │ クイズ │   │ クイズ  │
    │         │   │ レビュー │   │ 追加   │   │ 検証    │
    └────┬────┘   └──────────┘   └────┬───┘   └─────────┘
         │                            │
         │    分析結果を入力    　      │
         └────────────────────────────┘
```

## 4つのステップ

### Step 0: GA4 ユーザー行動分析（`/analytics-insight`）

GA4 の MCP サーバー経由でユーザー行動データを取得し、改善ポイントを特定する。

**分析内容:**
- ユーザーファネル（アクセス → チュートリアル → クイズ開始 → 完了）
- モード別の利用頻度と正答率
- チュートリアルのスキップ率
- チャプター別の離脱率
- プラットフォーム比較（Electron vs PWA）

**出力:** 改善アクション提案 → Step 2 のクイズ追加判定に入力

**依存:** GA4 MCP サーバー。未接続時は自動スキップ。

### Step 1: コードレビュー（`/code-review`）

未コミットの変更がある場合、コードレビューを実行する。

**レビュー観点:**
- コード品質（重複、不要な複雑さ）
- React / TypeScript パターン（useEffect 乱用、状態管理）
- アクセシビリティ（aria-label、フォーカス管理、タップターゲット）
- パフォーマンス（バンドルサイズ、不要な再レンダリング）

**出力:** Critical / High の指摘は自動修正。Suggestion は報告のみ。

### Step 2: クイズ追加判定・生成

クイズデータの偏りやカバレッジ不足を検出し、必要に応じて新しい問題を自動生成する。

**判定基準:**
| 基準 | 閾値 | データソース |
|------|------|-------------|
| カテゴリ偏り | Weight 15 のカテゴリが全体の 8% 未満 | `quiz:stats` |
| カバレッジ不足 | ドキュメントページが 5問未満 | `quiz:coverage` |
| 正答率の偏り | 特定カテゴリの正答率が極端に低い | GA4 分析（Step 0） |
| 新機能対応 | 新しい Claude Code 関連の概念追加 | `git diff` |

**生成フロー:** `/generate-quiz-data N` → `quiz:post-add`（randomize → check → test → stats）

### Step 3: クイズ検証・修正（`/quiz-refine`）

全クイズ問題を公式ドキュメントと照合し、事実誤りや古い情報を検出・修正する。

**検証内容:**
- 公式ドキュメントとの事実整合性
- 選択肢の正確性（wrongFeedback 含む）
- ドキュメント更新による陳腐化
- 構造的な品質（ID 重複、correctIndex 偏り）

**差分モード:** 変更があった問題・ドキュメントのみを再検証（全問スキャンは `--full`）

## 使い方

### 手動実行

```bash
# 全ステップ実行
/quality-loop

# 特定ステップをスキップ
/quality-loop --skip-analytics   # GA4分析なし
/quality-loop --skip-review      # コードレビューなし
/quality-loop --skip-generate    # クイズ追加なし
/quality-loop --skip-refine      # クイズ検証なし

# ドライラン（クイズ追加は分析のみ）
/quality-loop --dry-run
```

### 定期実行

```bash
# 1時間ごとに自動実行（セッション中のみ）
/loop 1h /quality-loop
```

### 個別スキル

```bash
# GA4 分析だけ
/analytics-insight
/analytics-insight 30              # 直近30日間
/analytics-insight --focus quiz     # クイズに特化

# コードレビューだけ
/code-review

# クイズ検証だけ
/quiz-refine
/quiz-refine --dry-run             # 報告のみ
/quiz-refine --full                # 全問スキャン
```

## 結果レポート

実行後に以下のフォーマットで結果が報告される:

```
## Quality Loop 結果

| ステップ | 結果 | 詳細 |
|---------|------|------|
| 0. GA4分析 | 完了 | ユーザー数 X, チュートリアルスキップ率 Y% |
| 1. code-review | スキップ | 未コミットの変更なし |
| 2. クイズ追加 | 追加済み(10問) | 対象: memory +5, tools +5 |
| 3. quiz-refine | 完了 | 658問スキャン, 3件修正 |
```

## データの流れ

```
GA4 (ユーザー行動)
  ↓ MCP
/analytics-insight
  ↓ 「正答率が低い: memory カテゴリ」
/quality-loop Step 2
  ↓ memory カテゴリの問題を優先生成
/generate-quiz-data
  ↓ 新問題追加
/quiz-refine
  ↓ 公式ドキュメントと照合・修正
デプロイ
  ↓
ユーザーが改善された問題を回答
  ↓
GA4 (改善効果を測定)
```

## ツール関係図

```
/quality-loop (統合オーケストレーター)
  ├── /analytics-insight
  │   └── GA4 MCP Server (mcp/ga4-server.mjs)
  │       ├── ga4_summary
  │       ├── ga4_report
  │       └── ga4_realtime
  ├── /code-review
  │   ├── /simplify
  │   ├── /typescript-react-reviewer
  │   ├── /accessibility
  │   └── /performance
  ├── /generate-quiz-data
  │   └── quiz:post-add (randomize → check → test → stats)
  └── /quiz-refine
      └── verify:diff (差分検出)
```
