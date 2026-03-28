# GTM (Google Tag Manager) + GA4 設定ガイド

## 概要

```
PWA / Electron ユーザー
  ↓ (dataLayer イベント)
GTM (タグ管理)
  ↓
GA4 (データ蓄積・分析)
  ↓ (将来)
MCP Server (GA4 API → Claude Code)
```

## 初期セットアップ

### ステップ 1: GTM コンテナ作成

[tagmanager.google.com](https://tagmanager.google.com/) にアクセス

1. 「アカウントを作成」をクリック
2. 以下を入力:

| 項目 | 値 |
|------|-----|
| アカウント名 | `Claude Code Quiz` |
| 国 | `日本` |
| コンテナ名 | `cc-quiz-web` |
| ターゲットプラットフォーム | **ウェブ** |

3. 「作成」→ 利用規約に同意
4. **コンテナ ID**（`GTM-XXXXXXX`）をメモ

### ステップ 2: GA4 アカウント・プロパティ作成

[analytics.google.com](https://analytics.google.com/) にアクセス

#### 初めて GA を使う場合（アカウント作成から）

1. 「測定を開始」をクリック
2. アカウント設定:

| 項目 | 値 |
|------|-----|
| アカウント名 | 自分の名前や組織名。アカウントは複数プロダクトで共有するため、プロダクト名ではなくオーナー名にする |
| データ共有設定 | デフォルトのままでOK |

3. 「次へ」

#### アカウントがある場合（プロパティ追加）

1. 左下の歯車（管理）→「プロパティを作成」

#### プロパティ設定（共通）

2. プロパティ設定:

| 項目 | 値 |
|------|-----|
| プロパティ名 | `Claude Code Quiz` |
| タイムゾーン | `日本` |
| 通貨 | `日本円 (JPY)` |

3. ビジネスの説明:

| 項目 | 値 |
|------|-----|
| 業種 | `その他` |
| ビジネスの規模 | `小規模` |

4. ビジネス目標: 「ユーザー行動の調査」を選択
5. 「作成」
6. データストリームを作成:

| 項目 | 値 |
|------|-----|
| プラットフォーム | **ウェブ** |
| URL | `ip-san.github.io/claude-code-quiz` |
| ストリーム名 | `CC Quiz Web` |

7. **Measurement ID**（`G-XXXXXXXXXX`）をメモ

### ステップ 3: GTM に GA4 基本タグを設定

GTM 管理画面に戻る:

1. 「タグ」→「新規」
2. タグの種類: **Google タグ**
3. タグ ID: ステップ 2 の `G-XXXXXXXXXX` を入力
4. トリガー: **All Pages** を選択
5. タグ名: `GA4 - Config` で保存

### ステップ 4: 環境変数を設定

```bash
cp .env.example .env
```

`.env` を編集:
```
VITE_GTM_ID=GTM-XXXXXXX
```

### ステップ 5: 動作確認

1. `npm run dev:web` で開発サーバー起動
2. GTM 管理画面で「プレビュー」をクリック
3. 開発サーバーの URL を入力して接続
4. Tag Assistant でイベントが送信されていることを確認
5. 問題なければ GTM で「公開」

## イベント一覧

全イベントに `platform` パラメータ（`electron` / `pwa`）が自動付与されます。

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

### パラメータ詳細

**`quiz_mode` の値:**
`overview`, `full`, `category`, `random`, `quick`, `weak`, `bookmark`, `review`, `scenario`, `custom`, `unanswered`

**`action` の値（イベント別）:**
- `tutorial_progress`: `complete`, `skip`
- `chapter_progress`: `start`, `complete`
- `study_first`: `start_reading`, `finish_reading`, `start_quiz`
- `bookmark`: `add`, `remove`

**`platform` の値:**
- `electron` — デスクトップアプリ（Electron）
- `pwa` — PWA / ブラウザ

## GTM タグ・トリガー設定

### カスタムイベントタグの設定手順（各イベント共通）

1. **変数の作成**（初回のみ）
   - 「変数」→「ユーザー定義変数」→「新規」
   - 変数タイプ: **データレイヤーの変数**
   - 以下を1つずつ作成:

| 変数名 | データレイヤー変数名 |
|--------|---------------------|
| `DLV - platform` | `platform` |
| `DLV - quiz_mode` | `quiz_mode` |
| `DLV - accuracy` | `accuracy` |
| `DLV - score` | `score` |
| `DLV - total` | `total` |
| `DLV - question_count` | `question_count` |
| `DLV - duration_sec` | `duration_sec` |
| `DLV - action` | `action` |
| `DLV - chapter_id` | `chapter_id` |
| `DLV - category` | `category` |
| `DLV - slide_index` | `slide_index` |
| `DLV - result_count` | `result_count` |
| `DLV - method` | `method` |

2. **トリガーの作成**（イベントごと）
   - 「トリガー」→「新規」
   - トリガータイプ: **カスタム イベント**
   - イベント名: 上記テーブルのイベント名（例: `quiz_complete`）
   - トリガー名: `CE - quiz_complete`

3. **タグの作成**（イベントごと）
   - 「タグ」→「新規」
   - タグタイプ: **Google アナリティクス: GA4 イベント**
   - 設定タグ: `GA4 - Config`（ステップ 3 で作成済み）
   - イベント名: トリガーと同じ（例: `quiz_complete`）
   - イベントパラメータ: 該当する変数を追加
   - トリガー: 対応するカスタムイベントトリガーを選択

### 推奨タグ設定例

**quiz_complete タグ:**
| パラメータ名 | 値 |
|-------------|-----|
| `quiz_mode` | `{{DLV - quiz_mode}}` |
| `score` | `{{DLV - score}}` |
| `total` | `{{DLV - total}}` |
| `accuracy` | `{{DLV - accuracy}}` |
| `duration_sec` | `{{DLV - duration_sec}}` |
| `platform` | `{{DLV - platform}}` |

**tutorial_progress タグ:**
| パラメータ名 | 値 |
|-------------|-----|
| `action` | `{{DLV - action}}` |
| `slide_index` | `{{DLV - slide_index}}` |
| `platform` | `{{DLV - platform}}` |

## GA4 カスタムディメンション登録

GA4 管理画面 →「カスタム定義」→「カスタムディメンションを作成」

以下を登録すると、レポートやセグメントで使えるようになります:

| ディメンション名 | イベントパラメータ | 範囲 |
|-----------------|-------------------|------|
| プラットフォーム | `platform` | イベント |
| クイズモード | `quiz_mode` | イベント |
| カテゴリ | `category` | イベント |
| アクション | `action` | イベント |
| チャプター | `chapter_id` | イベント |

カスタム指標:

| 指標名 | イベントパラメータ | 測定単位 |
|--------|-------------------|---------|
| 正答率 | `accuracy` | 標準 |
| スコア | `score` | 標準 |
| 所要時間(秒) | `duration_sec` | 秒 |
| 問題数 | `question_count` | 標準 |

## プラットフォーム別分析

GA4 で以下のセグメントを作ると、Electron vs PWA の比較ができます:

- **セグメント条件:** `platform` が `electron` と完全一致
- **セグメント条件:** `platform` が `pwa` と完全一致

## セキュリティ

| 項目 | 管理方法 |
|------|---------|
| GTM コンテナ ID | `.env`（`VITE_GTM_ID`）— リポジトリ外 |
| GA4 Measurement ID | GTM 管理画面内 — リポジトリ外 |
| GA4 API キー（MCP用） | `.env`（将来追加）— リポジトリ外 |
| GCP サービスアカウント | `.env` or ローカルファイル — リポジトリ外 |

- `.env` は `.gitignore` に含まれており、リポジトリにコミットされない
- `.env.example` にはキー名のテンプレートのみ記載（値なし）
- `VITE_GTM_ID` が未設定の場合、アナリティクスは自動的に無効化（no-op）
- CSP（Content Security Policy）は GTM と GA4 のドメインのみ許可

## MCP 経由での分析（将来）

GA4 Data API を使って Claude Code から直接分析データを取得する場合:

1. GCP プロジェクトで GA4 Data API を有効化
2. サービスアカウントを作成し、GA4 プロパティへの閲覧権限を付与
3. サービスアカウントキー（JSON）をダウンロード
4. `.env` に追加:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   GA4_PROPERTY_ID=123456789
   ```
5. MCP サーバーを設定して GA4 Data API に接続
6. Claude Code から「先週のクイズ完了率は？」のようなクエリが可能に

## トラブルシューティング

### イベントが送信されない
- `.env` に `VITE_GTM_ID` が設定されているか確認
- 開発サーバーを再起動（環境変数は起動時に読み込まれる）
- ブラウザのコンソールで `window.dataLayer` を確認

### GTM プレビューで認識されない
- CSP がブロックしている可能性 → ブラウザのコンソールでエラー確認
- GTM コンテナが「公開」されているか確認

### Electron 版でイベントが送信されない
- Electron でもインターネット接続が必要
- `VITE_GTM_ID` が Electron 用の `.env` にも設定されているか確認
