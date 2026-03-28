# GTM (Google Tag Manager) 設定

## セットアップ手順

### 1. GTM コンテナ作成

1. [GTM](https://tagmanager.google.com/) で新しいコンテナを作成（Web）
2. コンテナ ID（`GTM-XXXXXXX`）を取得

### 2. GA4 プロパティ作成

1. [Google Analytics](https://analytics.google.com/) で GA4 プロパティを作成
2. Measurement ID（`G-XXXXXXXXXX`）を取得
3. GTM で「GA4 設定」タグを作成し、Measurement ID を設定

### 3. 環境変数設定

```bash
cp .env.example .env
```

`.env` を編集:
```
VITE_GTM_ID=GTM-XXXXXXX
```

### 4. GTM にカスタムイベントタグを設定

以下のイベントが dataLayer に送信されます。GTM でトリガーとタグを設定してください。

## イベント一覧

| イベント名 | 説明 | パラメータ |
|-----------|------|-----------|
| `tutorial_progress` | チュートリアル完了/スキップ | `action`, `slide_index` |
| `quiz_start` | クイズ開始 | `quiz_mode`, `question_count`, `category` |
| `quiz_complete` | クイズ完了 | `quiz_mode`, `score`, `total`, `accuracy`, `duration_sec` |
| `chapter_progress` | チャプター進捗 | `chapter_id`, `action`, `accuracy` |
| `study_first` | 読んでから解くモード | `chapter_id`, `action` |
| `bookmark` | ブックマーク操作 | `action` |
| `quiz_search` | 検索利用 | `result_count` |
| `reader_open` | 解説リーダー利用 | - |
| `share_result` | 結果シェア | `method` |
| `certificate_download` | 修了証DL | `quiz_mode` |

## GTM 推奨設定

### トリガー

各イベントに対して「カスタムイベント」トリガーを作成:
- イベント名: 上記テーブルの `イベント名` 列の値
- 例: イベント名が `quiz_complete` と等しいとき

### タグ

GA4 イベントタグを作成:
- タグタイプ: Google Analytics: GA4 イベント
- 設定タグ: GA4 設定タグ（Measurement ID 設定済み）
- イベント名: トリガーのイベント名と一致させる
- イベントパラメータ: dataLayer 変数から取得

### 変数

必要に応じてデータレイヤー変数を作成:
- `quiz_mode` → データレイヤー変数名: `quiz_mode`
- `accuracy` → データレイヤー変数名: `accuracy`
- 他のパラメータも同様

## プラットフォーム識別

全イベントに `platform` パラメータが自動付与されます:
- `electron` — デスクトップアプリ
- `pwa` — PWA / ブラウザ

GA4 でセグメントやフィルタを作成して、プラットフォーム別の分析が可能です。

## セキュリティ

- GTM ID は `.env` で管理し、リポジトリにコミットしない
- `.env.example` にはキー名のテンプレートのみ記載
- GTM ID 未設定時はアナリティクスが自動的に無効化される
- CSP は GTM と GA4 のドメインのみ許可

## MCP 経由での分析（将来）

GA4 Data API を使って Claude Code から直接分析データを取得する場合:

1. GCP プロジェクトで GA4 Data API を有効化
2. サービスアカウントキーを取得
3. `.env` に追加:
   ```
   GA4_MEASUREMENT_ID=G-XXXXXXXXXX
   GA4_API_SECRET=your-api-secret
   ```
4. MCP サーバーを設定して GA4 API に接続
