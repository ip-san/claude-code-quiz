# 自動化ツール一覧

このプロジェクトで使用している自動化ツールとスクリプトの概要。

## 全体像

```
┌──────────────────────────────────────────────────┐
│                  開発ワークフロー                    │
├──────────┬──────────┬──────────┬─────────────────┤
│ コード品質 │ クイズ品質 │ アナリティクス│ デプロイ        │
├──────────┼──────────┼──────────┼─────────────────┤
│/code-    │/quiz-    │/analytics│ GitHub Actions  │
│ review   │ refine   │ -insight │ (自動)          │
│          │/generate-│          │                 │
│          │ quiz-data│          │                 │
├──────────┴──────────┴──────────┴─────────────────┤
│              /quality-loop (統合)                  │
└──────────────────────────────────────────────────┘
```

## スキル（Claude Code スラッシュコマンド）

### /quality-loop

| 項目 | 内容 |
|------|------|
| 目的 | 品質改善の全プロセスを一括実行 |
| 実行内容 | GA4分析 → コードレビュー → クイズ追加判定 → クイズ検証 |
| 定義ファイル | `.claude/skills/quality-loop/SKILL.md` |
| 定期実行 | `/loop 1h /quality-loop` |

### /analytics-insight

| 項目 | 内容 |
|------|------|
| 目的 | GA4 データからユーザー行動を分析し改善提案 |
| 依存 | GA4 MCP サーバー（`mcp/ga4-server.mjs`） |
| 定義ファイル | `.claude/skills/analytics-insight/SKILL.md` |

### /code-review

| 項目 | 内容 |
|------|------|
| 目的 | コード変更の多角的レビュー |
| 観点 | 品質 + React/TS + アクセシビリティ + パフォーマンス |
| 定義ファイル | `~/.claude/skills/code-review/SKILL.md`（ユーザーレベル） |

### /quiz-refine

| 項目 | 内容 |
|------|------|
| 目的 | クイズ問題を公式ドキュメントと照合・修正 |
| モード | 差分（デフォルト） / 全問スキャン（`--full`） |
| 定義ファイル | `.claude/skills/quiz-refine/SKILL.md` |

### /generate-quiz-data

| 項目 | 内容 |
|------|------|
| 目的 | 公式ドキュメントからクイズ問題を自動生成 |
| 後処理 | `npm run quiz:post-add`（randomize → check → test → stats） |
| 定義ファイル | `.claude/skills/generate-quiz-data/SKILL.md` |

### /spec-audit

| 項目 | 内容 |
|------|------|
| 目的 | CLAUDE.md の仕様記述と実装の整合性を監査 |
| 定義ファイル | `.claude/skills/spec-audit/SKILL.md` |

## GTM / GA4 自動化スクリプト

### gtm/build-container.mjs

GTM コンテナ設定を `events.json` から自動生成する。

```bash
# テンプレート生成
node gtm/build-container.mjs path/to/exported.json

# + .env の Measurement ID を注入してインポート用ファイル生成
node gtm/build-container.mjs path/to/exported.json --import
```

**入力:** `gtm/events.json`（人間が読むイベント定義）+ GTM エクスポート JSON
**出力:** `gtm/container-config.json`（テンプレート）+ `gtm/container-import.json`（インポート用）

### gtm/deploy-gtm.mjs

GTM API 経由でタグ・トリガー・変数を自動デプロイする。

```bash
# ドライラン（変更内容を確認）
node gtm/deploy-gtm.mjs

# 実際に適用して公開
node gtm/deploy-gtm.mjs --apply
```

**動作:** `events.json` の定義と GTM コンテナの現状を比較し、差分を適用。新規作成・更新・公開を自動実行。

### gtm/setup-ga4.mjs

GA4 カスタムディメンション・指標を自動登録する。

```bash
# プロパティ一覧表示
node gtm/setup-ga4.mjs

# ディメンション・指標を登録
node gtm/setup-ga4.mjs <property-id>

# ドライラン
node gtm/setup-ga4.mjs <property-id> --dry-run
```

**動作:** 既存のディメンション・指標をチェックし、未登録のものだけを作成。重複登録を回避。

### gtm/events.json

全イベントの定義ファイル。他のスクリプトが参照する Single Source of Truth。

```json
{
  "events": [
    {
      "name": "quiz_start",
      "description": "クイズ開始",
      "params": ["quiz_mode", "question_count", "category", "platform"]
    }
  ]
}
```

イベントを追加する場合はこのファイルを編集し、`deploy-gtm.mjs --apply` で GTM に反映する。

## MCP サーバー

### mcp/ga4-server.mjs

GA4 Data API に接続する MCP サーバー。Claude Code から直接 GA4 データをクエリできる。

**提供ツール:**

| ツール | 説明 |
|--------|------|
| `ga4_summary` | 直近 N 日間の KPI サマリー |
| `ga4_report` | カスタムレポート（ディメンション・指標・フィルタ指定） |
| `ga4_realtime` | リアルタイムデータ（過去30分） |

**設定場所:** `~/.claude/settings.json` の `mcpServers`

## npm スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run quiz:stats` | カテゴリ・難易度・correctIndex 分布 |
| `npm run quiz:coverage` | ドキュメントページ別カバレッジ |
| `npm run quiz:check` | 構造的品質チェック |
| `npm run quiz:randomize` | correctIndex ランダム化 |
| `npm run quiz:post-add` | 問題追加後の一括処理 |
| `npm run docs:validate` | CLAUDE.md の統計値検証 |
| `npm run check` | 型 + lint + テスト + 問題チェック |
| `npm run check:all` | check + docs:validate |

## CI/CD

### GitHub Actions（`.github/workflows/deploy.yml`）

`main` ブランチへの push で自動実行:

1. `bun install --frozen-lockfile`
2. `bun run check:all`（型 + lint + テスト + ドキュメント検証）
3. `bun run build:web`（`VITE_GTM_ID` を Secret から注入）
4. GitHub Pages にデプロイ

## ファイル構成

```
gtm/
├── events.json           # イベント定義（SSOT）
├── build-container.mjs   # GTM インポート JSON 生成
├── deploy-gtm.mjs        # GTM API 経由で自動デプロイ
├── setup-ga4.mjs         # GA4 ディメンション自動登録
├── container-config.json  # 生成済みテンプレート
├── container-import.json  # 生成済みインポートファイル（.gitignore）
└── README.md             # GTM セットアップ手順

mcp/
└── ga4-server.mjs        # GA4 MCP サーバー

.claude/skills/
├── quality-loop/         # 品質改善ループ統合スキル
├── analytics-insight/    # GA4 分析スキル
├── quiz-refine/          # クイズ検証スキル
├── generate-quiz-data/   # クイズ生成スキル
└── spec-audit/           # 仕様監査スキル

.env.example              # 環境変数テンプレート
.env                      # 実際の値（.gitignore）
```
