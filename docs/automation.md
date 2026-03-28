# 自動化ツール一覧

PWA のビルド・デプロイ・品質管理・アナリティクスを支える自動化ツールの全体像。

## 全体像

```
┌──────────────────────────────────────────────────────────┐
│                     開発ワークフロー                        │
├───────────┬───────────┬────────────┬─────────────────────┤
│ コード品質  │ クイズ品質  │ アナリティクス│ デプロイ            │
├───────────┼───────────┼────────────┼─────────────────────┤
│ /code-    │ /quiz-    │ /analytics │ GitHub Actions      │
│  review   │  refine   │  -insight  │  → GitHub Pages     │
│           │ /generate-│            │  → PWA 自動更新     │
│           │  quiz-data│            │                     │
├───────────┴───────────┴────────────┴─────────────────────┤
│                /quality-loop (統合オーケストレーター)        │
└──────────────────────────────────────────────────────────┘
```

## スキル（Claude Code スラッシュコマンド）

### /quality-loop — 品質改善の統合実行

| 項目 | 内容 |
|------|------|
| 実行内容 | GA4分析 → コードレビュー → クイズ追加判定 → クイズ検証 |
| 定義 | `.claude/skills/quality-loop/SKILL.md` |
| 定期実行 | `/loop 1h /quality-loop` |

### /analytics-insight — GA4 ユーザー行動分析

| 項目 | 内容 |
|------|------|
| 分析内容 | PWA ユーザーのファネル、モード利用率、離脱率、正答率 |
| 依存 | GA4 MCP サーバー（`mcp/ga4-server.mjs`） |
| 定義 | `.claude/skills/analytics-insight/SKILL.md` |

### /code-review — 多層コード品質レビュー

| 項目 | 内容 |
|------|------|
| 定義 | `~/.claude/skills/code-review/SKILL.md`（ユーザーレベル） |
| 統合スキル | `/simplify` + `/typescript-react-reviewer` + `/accessibility` + `/performance` |

4つの専門スキルを統合した包括的チェック:

| レイヤー | チェック内容 | 重大度例 |
|---------|------------|---------|
| コード品質 | 重複、不要な複雑さ、効率の悪いパターン | High: N+1ループ |
| React/TS | Hook ルール違反、state mutation、依存配列 | Critical: useEffect内の派生状態 |
| アクセシビリティ | aria-label、フォーカス管理、タップターゲット | High: 48px未満のボタン |
| パフォーマンス | バンドルサイズ、re-render、SW キャッシュ | Suggestion: 仮想スクロール検討 |

Critical は自動修正、High は修正案提示、Suggestion は報告のみ。

### /quiz-refine — クイズ検証・修正

| 項目 | 内容 |
|------|------|
| 内容 | 公式ドキュメントと照合し事実誤りを修正 |
| モード | 差分（デフォルト） / 全問スキャン（`--full`） |
| 定義 | `.claude/skills/quiz-refine/SKILL.md` |

### /generate-quiz-data — クイズ自動生成

| 項目 | 内容 |
|------|------|
| 内容 | 公式ドキュメントからクイズ問題を自動生成 |
| 後処理 | `npm run quiz:post-add` |
| 定義 | `.claude/skills/generate-quiz-data/SKILL.md` |

### /spec-audit — 仕様整合性監査

| 項目 | 内容 |
|------|------|
| 内容 | CLAUDE.md の仕様記述と実装コードの意味的な整合性チェック |
| 定義 | `.claude/skills/spec-audit/SKILL.md` |

## GTM / GA4 自動化スクリプト

### gtm/events.json — イベント定義（Single Source of Truth）

PWA から送信する全イベントの定義。他のスクリプトが参照する。

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

### gtm/build-container.mjs — GTM インポート JSON 生成

`events.json` + GTM エクスポート JSON → GTM にインポート可能な JSON を生成。

```bash
node gtm/build-container.mjs path/to/exported.json --import
```

### gtm/deploy-gtm.mjs — GTM API 自動デプロイ

`events.json` の定義を GTM API 経由でコンテナに反映し公開する。

```bash
node gtm/deploy-gtm.mjs          # ドライラン
node gtm/deploy-gtm.mjs --apply  # 適用 & 公開
```

### gtm/setup-ga4.mjs — GA4 ディメンション自動登録

GA4 のカスタムディメンション・指標を API 経由で一括登録。

```bash
node gtm/setup-ga4.mjs                    # プロパティ一覧
node gtm/setup-ga4.mjs <property-id>      # 登録実行
```

## MCP サーバー

### mcp/ga4-server.mjs — GA4 分析データ取得

Claude Code から GA4 Data API に直接クエリできる MCP サーバー。

| ツール | 説明 | 使用例 |
|--------|------|--------|
| `ga4_summary` | 直近 N 日間の KPI サマリー | 「先週のユーザー数は？」 |
| `ga4_report` | カスタムレポート | 「モード別の正答率を教えて」 |
| `ga4_realtime` | リアルタイムデータ | 「今アクティブなユーザーは？」 |

設定: `~/.claude/settings.json` の `mcpServers` に登録済み。

## npm スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev:web` | PWA 開発サーバー起動 |
| `npm run build:web` | PWA プロダクションビルド |
| `npm run preview:web` | ビルド結果のプレビュー |
| `npm run check` | 型 + lint + テスト + 問題チェック |
| `npm run check:all` | check + ドキュメント検証（CI で使用） |
| `npm run quiz:stats` | カテゴリ・難易度・correctIndex 分布 |
| `npm run quiz:coverage` | ドキュメントページ別カバレッジ |
| `npm run quiz:check` | 構造的品質チェック |
| `npm run quiz:post-add` | 問題追加後の一括処理 |
| `npm run docs:validate` | CLAUDE.md の統計値検証 |

## CI/CD

### GitHub Actions → GitHub Pages

`.github/workflows/deploy.yml`:

```
main への push
  ↓
bun install --frozen-lockfile
  ↓
bun run check:all（型 + lint + テスト + ドキュメント検証）
  ↓
bun run build:web（VITE_GTM_ID を Secret から注入）
  ↓
GitHub Pages にデプロイ
  ↓
PWA ユーザーに Service Worker 経由で自動配信
```

## ファイル構成

```
docs/
├── analytics-setup.md    # セットアップ手順（このガイド群）
├── analytics-events.md   # イベント定義
├── quality-loop.md       # 品質改善ループ
└── automation.md         # 自動化ツール一覧（本ファイル）

gtm/
├── events.json           # イベント定義（SSOT）
├── build-container.mjs   # GTM インポート JSON 生成
├── deploy-gtm.mjs        # GTM API 自動デプロイ
├── setup-ga4.mjs         # GA4 ディメンション自動登録
├── container-config.json  # テンプレート（リポジトリ管理）
├── container-import.json  # インポート用（.gitignore）
└── README.md             # セットアップ手順（簡易版）

mcp/
└── ga4-server.mjs        # GA4 MCP サーバー

src/lib/
└── analytics.ts          # イベント送信の抽象レイヤー

.claude/skills/
├── quality-loop/         # 品質改善ループ
├── analytics-insight/    # GA4 分析
├── quiz-refine/          # クイズ検証
├── generate-quiz-data/   # クイズ生成
└── spec-audit/           # 仕様監査

.env.example              # 環境変数テンプレート（リポジトリ管理）
.env                      # 実際の値（.gitignore）
.github/workflows/
└── deploy.yml            # PWA 自動デプロイ
```
