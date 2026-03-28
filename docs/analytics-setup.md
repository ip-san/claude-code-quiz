# アナリティクス セットアップガイド

GTM（Google Tag Manager）+ GA4（Google Analytics 4）の導入から動作確認までの手順。

## アーキテクチャ

```
PWA / Electron ユーザー
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

## 前提条件

- Google アカウント
- GCP プロジェクト（無料枠で十分）

## Step 1: GA4 プロパティ作成

1. [analytics.google.com](https://analytics.google.com/) にアクセス
2. アカウントがなければ「測定を開始」→ アカウント名は自分の名前や組織名
3. プロパティ作成:

| 項目 | 値 |
|------|-----|
| プロパティ名 | `Claude Code Quiz` |
| タイムゾーン | 日本 |
| 通貨 | 日本円 |
| 業種 | その他 |
| ビジネス目標 | ユーザー行動の調査 |

4. データストリーム作成（ウェブ）:

| 項目 | 値 |
|------|-----|
| URL | デプロイ先の URL |
| ストリーム名 | 任意 |

5. **Measurement ID**（`G-XXXXXXXXXX`）をメモ

## Step 2: GTM コンテナ作成

1. [tagmanager.google.com](https://tagmanager.google.com/) にアクセス
2. アカウント作成 → コンテナ作成:

| 項目 | 値 |
|------|-----|
| コンテナ名 | `cc-quiz-web` |
| プラットフォーム | ウェブ |

3. **コンテナ ID**（`GTM-XXXXXXX`）をメモ
4. GTM が表示するインストールコードは**貼り付け不要**（アプリ側で動的に読み込む）

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
3. サービスアカウント作成（名前: `ga4-automation`）
4. JSON キーをダウンロード → `~/.config/gcloud/` に配置
5. GA4 でサービスアカウントに「編集者」権限を付与
6. GTM でサービスアカウントに「公開」権限を付与

## Step 8: GA4 カスタムディメンション登録

```bash
# プロパティ一覧を表示
node gtm/setup-ga4.mjs

# ディメンション・指標を自動登録
node gtm/setup-ga4.mjs <property-id>
```

## Step 9: GitHub Actions に Secret 設定

リポジトリの Settings → Secrets and variables → Actions:

| Name | Value |
|------|-------|
| `VITE_GTM_ID` | GTM コンテナ ID |

## Step 10: 動作確認

```bash
npm run dev:web
```

1. ブラウザの DevTools → Console で `window.dataLayer` を確認
2. クイズを開始して `quiz_start` イベントが送信されることを確認
3. GTM のプレビューモードでタグの発火を確認
4. GA4 のリアルタイムレポートでイベントが表示されることを確認

## セキュリティ

| 情報 | 保管場所 | リポジトリに含まれるか |
|------|---------|----------------------|
| GTM コンテナ ID | `.env` | No（`.gitignore`） |
| GA4 Measurement ID | GTM 管理画面内 | No |
| GA4 Property ID | `.env` | No |
| GCP サービスアカウントキー | `~/.config/gcloud/` | No |
| GitHub Actions Secret | GitHub Settings | No |
| `.env.example`（テンプレート） | リポジトリ | Yes（値なし） |
| `gtm/events.json`（イベント定義） | リポジトリ | Yes |
| `gtm/container-config.json`（テンプレート） | リポジトリ | Yes（Measurement ID はプレースホルダー） |
