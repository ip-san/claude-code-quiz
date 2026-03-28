# アナリティクス セットアップガイド

PWA（GitHub Pages）で配信するクイズアプリのユーザー行動を GTM + GA4 で計測し、Claude Code から MCP 経由で分析データを取得するまでの手順。

## アーキテクチャ

```
スマホ / PC ブラウザ（PWA）
  │
  │ dataLayer.push({ event: 'quiz_start', ... })
  ↓
src/lib/analytics.ts  ← イベント送信の抽象レイヤー
  │
  │ GTM スクリプト（動的挿入）
  ↓
Google Tag Manager (GTM)
  │
  │ タグ → GA4 イベント送信
  ↓
Google Analytics 4 (GA4)
  │
  │ GA4 Data API
  ↓
MCP Server (mcp/ga4-server.mjs)
  │
  ↓
Claude Code から直接クエリ
```

**ポイント:**
- GTM ID は `.env` + GitHub Actions Secret で管理。リポジトリには含まれない
- PWA のビルド時に `VITE_GTM_ID` 環境変数として注入される
- Electron 版でも同じ仕組みで動作する（`platform` パラメータで区別）

## 前提条件

- Google アカウント
- GCP プロジェクト（無料枠で十分）
- GitHub Pages にデプロイ済みの PWA

## Step 1: GA4 プロパティ作成

[analytics.google.com](https://analytics.google.com/) にアクセス

1. アカウントがなければ「測定を開始」→ アカウント名は自分の名前や組織名（複数プロダクトで共有するため、プロダクト名にしない）
2. プロパティ作成:

| 項目 | 値 |
|------|-----|
| プロパティ名 | `Claude Code Quiz` |
| タイムゾーン | 日本 |
| 通貨 | 日本円 |
| 業種 | その他 |
| ビジネス目標 | ユーザー行動の調査 |

3. データストリーム作成（ウェブ）:

| 項目 | 値 | 備考 |
|------|-----|------|
| URL | `ip-san.github.io/claude-code-quiz` | GitHub Pages の URL |
| ストリーム名 | `CC Quiz PWA` | |

4. **Measurement ID**（`G-XXXXXXXXXX`）をメモ

## Step 2: GTM コンテナ作成

[tagmanager.google.com](https://tagmanager.google.com/) にアクセス

1. アカウント作成 → コンテナ作成:

| 項目 | 値 |
|------|-----|
| コンテナ名 | `cc-quiz-web` |
| プラットフォーム | ウェブ |

2. **コンテナ ID**（`GTM-XXXXXXX`）をメモ
3. GTM が表示するインストールコードは**貼り付け不要**（アプリ側で `src/lib/analytics.ts` から動的に読み込む）

## Step 3: GTM に GA4 Config タグを手動作成

GTM 管理画面で 1 つだけ手動作成が必要:

1. 「タグ」→「新規」
2. タグタイプ: **Google タグ**
3. タグ ID: Step 1 の Measurement ID
4. トリガー: **All Pages**
5. 名前: `GA4 - Config`
6. 保存

## Step 4: GTM コンテナをエクスポート

1. 「管理」→「コンテナをエクスポート」
2. 「最新のワークスペースの変更」を選択
3. JSON ファイルを保存

## Step 5: イベントタグを自動生成 & インポート

```bash
# エクスポートした JSON からインポート用ファイルを生成
node gtm/build-container.mjs path/to/exported.json --import

# 生成された container-import.json を GTM にインポート
# GTM管理画面 → 管理 → コンテナをインポート → 「統合」を選択
# インポート後「公開」
```

または、GTM API 経由で直接デプロイ（Step 7 のサービスアカウント設定後）:

```bash
node gtm/deploy-gtm.mjs --apply
```

## Step 6: 環境変数を設定

```bash
cp .env.example .env
```

`.env` を編集:
```
VITE_GTM_ID=GTM-XXXXXXX
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/claude-code-quiz-sa.json
```

## Step 7: GCP サービスアカウント（API 自動化用）

1. [console.cloud.google.com](https://console.cloud.google.com/) でプロジェクト作成
2. API を有効化:
   - Google Analytics Admin API
   - Google Analytics Data API
   - Tag Manager API
3. 「IAMと管理」→「サービスアカウント」→ 作成（名前: `ga4-automation`）
4. 「キー」タブ → JSON キーをダウンロード → `~/.config/gcloud/` に配置
5. GA4 管理画面でサービスアカウントに「編集者」権限を付与
6. GTM 管理画面でサービスアカウントに「公開」権限を付与

## Step 8: GA4 カスタムディメンション登録

```bash
# プロパティ一覧を表示
node gtm/setup-ga4.mjs

# ディメンション・指標を自動登録
node gtm/setup-ga4.mjs <property-id>
```

## Step 9: GitHub Actions に Secret 設定

PWA は GitHub Pages にデプロイされるため、ビルド時に GTM ID を注入する必要がある。

リポジトリの Settings → Secrets and variables → Actions:

| Name | Value |
|------|-------|
| `VITE_GTM_ID` | GTM コンテナ ID |

`main` への push で GitHub Actions が自動ビルド → デプロイし、PWA に GTM が組み込まれる。

## Step 10: 動作確認

### ローカルで確認

```bash
npm run dev:web
# http://localhost:5174/claude-code-quiz/ を開く
```

1. ブラウザの DevTools → Console で `window.dataLayer` を確認
2. クイズを開始して `quiz_start` イベントが送信されることを確認

### 本番 PWA で確認

1. GitHub Pages の URL にアクセス
2. GTM のプレビューモードで接続し、タグの発火を確認
3. GA4 のリアルタイムレポートでイベントが表示されることを確認

### スマホ（PWA インストール済み）で確認

ホーム画面から起動した PWA でも GTM は動作する。GA4 のリアルタイムレポートでデバイスカテゴリ「mobile」のイベントを確認。

## セキュリティ

| 情報 | 保管場所 | リポジトリに含まれるか |
|------|---------|----------------------|
| GTM コンテナ ID | `.env` / GitHub Secret | No |
| GA4 Measurement ID | GTM 管理画面内 | No |
| GA4 Property ID | `.env` | No |
| GCP サービスアカウントキー | `~/.config/gcloud/` | No |
| `.env.example`（テンプレート） | リポジトリ | Yes（値なし） |
| `gtm/events.json`（イベント定義） | リポジトリ | Yes |
| `gtm/container-config.json`（テンプレート） | リポジトリ | Yes（ID はプレースホルダー） |
