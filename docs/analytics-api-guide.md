# GA4 / GTM の API・MCP 運用ガイド

GA4 と GTM をコマンドラインと MCP 経由で管理・分析する方法をまとめたガイド。
初期セットアップは [analytics-setup.md](analytics-setup.md)、イベント定義は [analytics-events.md](analytics-events.md) を参照。

## 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│  データ収集（フロントエンド → クラウド）                              │
│                                                                 │
│  ユーザー操作                                                     │
│    ↓                                                            │
│  React コンポーネント → analytics.ts → dataLayer.push()           │
│    ↓                                                            │
│  GTM（タグ発火）→ GA4（データ蓄積）                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  管理・メンテナンス（API 経由）                                     │
│                                                                 │
│  events.json (SSOT)                                             │
│    ├─→ deploy-gtm.mjs ──→ GTM API（タグ・トリガー同期）            │
│    ├─→ build-container.mjs → container-import.json（手動用）      │
│    └─→ setup-ga4.mjs ──→ GA4 Admin API（ディメンション登録）        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  分析・活用（MCP 経由）                                            │
│                                                                 │
│  Claude Code                                                    │
│    ↓ MCP プロトコル（stdio）                                      │
│  ga4-server.mjs                                                 │
│    ↓ GA4 Data API                                               │
│  GA4 → レポート・リアルタイム・サマリー                               │
│    ↓                                                            │
│  /analytics-insight → /quality-loop                              │
└─────────────────────────────────────────────────────────────────┘
```

3 つの層に分かれている:

1. **データ収集:** PWA のユーザー操作を GTM 経由で GA4 に送信（自動）
2. **管理・メンテナンス:** イベント定義の変更を API 経由で GTM / GA4 に反映（手動 or スクリプト）
3. **分析・活用:** GA4 のデータを MCP 経由で Claude Code から直接クエリ（対話的）

## 前提条件

- GCP サービスアカウントキー（[セットアップ手順](analytics-setup.md#step-7-gcp-サービスアカウントapi-自動化用)）
- `.env` に環境変数を設定済み（`.env.example` を参照）

```bash
# .env の必要な変数
VITE_GTM_ID=GTM-XXXXXXX                              # GTM コンテナ ID
GA4_MEASUREMENT_ID=G-XXXXXXXXXX                       # GA4 測定 ID
GA4_PROPERTY_ID=123456789                             # GA4 プロパティ ID
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sa.json  # サービスアカウントキー
```

---

## 1. GTM の API 管理

### events.json — Single Source of Truth

`gtm/events.json` がすべてのイベント定義の原本。ここを変更すれば、他のスクリプトが GTM / GA4 に反映する。

```json
{
  "measurementId": "G-XXXXXXXXXX",
  "events": [
    {
      "name": "quiz_start",
      "description": "クイズ開始",
      "params": ["quiz_mode", "question_count", "category", "platform"]
    }
  ]
}
```

### deploy-gtm.mjs — GTM コンテナの自動デプロイ

`events.json` の定義を GTM API 経由でコンテナに反映し、公開する。

```bash
# ドライラン（変更内容を表示するだけ）
node gtm/deploy-gtm.mjs

# 適用して公開
node gtm/deploy-gtm.mjs --apply
```

**動作:**
1. GTM API でコンテナ内の既存タグ・トリガー・変数を取得
2. `events.json` と比較し、差分を検出
3. 不足しているタグ・トリガー・データレイヤー変数を作成
4. `--apply` の場合、バージョンを作成して公開

**必要な API:** Tag Manager API
**必要な権限:** サービスアカウントに GTM「公開」権限

**使い分け:**
| シナリオ | コマンド |
|---------|---------|
| イベント追加後の反映 | `node gtm/deploy-gtm.mjs --apply` |
| 変更内容の事前確認 | `node gtm/deploy-gtm.mjs` |
| GTM API が使えない環境 | `build-container.mjs` で JSON を生成して手動インポート |

### build-container.mjs — GTM インポート JSON 生成

GTM API を使わずに、管理画面から手動インポートするための JSON を生成する。API が使えない環境や、チームメンバーが手動で確認したい場合に使用。

```bash
# GTM 管理画面でコンテナをエクスポートした JSON を指定
node gtm/build-container.mjs path/to/exported.json --import
```

**動作:**
1. エクスポート JSON をベースに、`events.json` の全イベントのタグ・トリガー・変数を追加
2. `--import` フラグで `.env` の Measurement ID を自動注入
3. `gtm/container-import.json` を出力

**インポート手順:** GTM 管理画面 → 管理 → コンテナをインポート → 「統合」を選択 → 公開

---

## 2. GA4 の API 管理

### setup-ga4.mjs — カスタムディメンション・指標の自動登録

`events.json` のパラメータに対応するカスタムディメンション / カスタム指標を GA4 に一括登録する。

```bash
# GA4 プロパティ一覧を表示（ID がわからない場合）
node gtm/setup-ga4.mjs

# ディメンション・指標を登録
node gtm/setup-ga4.mjs 123456789

# プレビューのみ（実際には登録しない）
node gtm/setup-ga4.mjs 123456789 --dry-run
```

**登録されるディメンション:**

| パラメータ名 | 表示名 | 型 |
|-------------|--------|-----|
| `platform` | プラットフォーム | 文字列 |
| `quiz_mode` | クイズモード | 文字列 |
| `category` | カテゴリ | 文字列 |
| `action` | アクション | 文字列 |
| `chapter_id` | チャプター | 文字列 |

**登録されるカスタム指標:**

| パラメータ名 | 表示名 | 単位 |
|-------------|--------|------|
| `accuracy` | 正答率 | 標準 |
| `score` | スコア | 標準 |
| `duration_sec` | 所要時間 | 秒 |
| `question_count` | 問題数 | 標準 |
| `result_count` | 検索結果数 | 標準 |
| `slide_index` | スライド番号 | 標準 |

**必要な API:** Google Analytics Admin API
**必要な権限:** サービスアカウントに GA4「編集者」権限

**いつ実行するか:**
- 初回セットアップ時
- `events.json` に新しいパラメータを追加した時
- 既に登録済みのディメンション・指標はスキップされるため、何度実行しても安全

---

## 3. MCP サーバーによる GA4 データ分析

### ga4-server.mjs — GA4 MCP サーバー

Claude Code から GA4 Data API に直接クエリできる MCP サーバー。公式の `@modelcontextprotocol/sdk` を使用し、stdio transport で通信する。

### セットアップ

MCP サーバーの登録は `~/.claude/settings.json`（または `.mcp.json`）の `mcpServers` で行う:

```json
{
  "mcpServers": {
    "ga4-analytics": {
      "command": "node",
      "args": ["/path/to/project/mcp/ga4-server.mjs"]
    }
  }
}
```

登録後、Claude Code を再起動すると `ga4_report` / `ga4_realtime` / `ga4_summary` の 3 ツールが利用可能になる。

### 提供ツール

#### ga4_summary — KPI サマリー

直近 N 日間の主要 KPI をまとめて取得する。最もよく使うツール。

```
# Claude Code での呼び出し例
「先週のユーザー数とモード別完了率を教えて」
→ ga4_summary(days: 7)
```

**返すデータ:** アクティブユーザー / セッション数 / イベント総数 / モード別完了数と正答率 / プラットフォーム別ユーザー数 / イベント別件数

#### ga4_report — カスタムレポート

ディメンション・指標・日付範囲・フィルタを自由に指定してレポートを取得する。

```
# Claude Code での呼び出し例
「チャプター別の離脱率を分析して」
→ ga4_report(
    dimensions: ["customEvent:chapter_id", "customEvent:action"],
    metrics: ["eventCount"],
    dimensionFilter: { dimension: "eventName", value: "chapter_progress" }
  )
```

**パラメータ型の注意点:**

GA4 では文字列パラメータと数値パラメータを厳密に区別する。`customEvent:` プレフィックスで指定する場合:

| 指定先 | 使えるパラメータ | 例 |
|--------|----------------|-----|
| `dimensions`（文字列のみ） | action, quiz_mode, category, platform, chapter_id, method | `customEvent:quiz_mode` |
| `metrics`（数値のみ） | accuracy, score, total, duration_sec, question_count, result_count, slide_index | `customEvent:accuracy` |

間違えると `INVALID_ARGUMENT` エラーになる。MCP サーバーはこのバリデーションを内蔵しており、型が間違っている場合は GA4 API に送信する前にエラーメッセージを返す。

GA4 の組み込みディメンション（`customEvent:` 不要）: `eventName`, `date`, `deviceCategory`, `city`

#### ga4_realtime — リアルタイムデータ

過去 30 分間のアクティブユーザーとイベントを取得する。デプロイ直後の動作確認に便利。

```
# Claude Code での呼び出し例
「今アクティブなユーザーはいる？」
→ ga4_realtime()
```

### MCP サーバーのテスト

```bash
node mcp/ga4-server.test.mjs
```

GA4 API への実際のリクエストは行わず、以下を検証する:
- `.env` パーサーの正規表現
- MCP プロトコルのハンドシェイク（initialize → tools/list）
- `GA4_PROPERTY_ID` 未設定時のエラーハンドリング

---

## 4. Claude Code スキルとの連携

### /analytics-insight

MCP サーバーを使って GA4 データを取得・分析し、改善アクションを提案するスキル。

```bash
/analytics-insight              # 直近7日間の全体分析
/analytics-insight 30           # 直近30日間
/analytics-insight --focus quiz  # クイズ完了・正答率に特化
```

**分析内容:**
- ユーザーファネル（アクセス → チュートリアル完了 → クイズ開始 → 完了）
- モード別利用状況と完了率
- チャプター別の離脱率
- プラットフォーム比較（PWA vs Electron）
- 正答率の偏り

### /quality-loop

GA4 分析を含む品質改善ループの統合オーケストレーター。

```bash
/quality-loop                    # 全ステップ実行
/quality-loop --skip-analytics   # GA4分析をスキップ
```

**GA4 分析の位置づけ:** quality-loop の Step 0 で GA4 データを取得し、その結果を Step 2（クイズ追加判定）に入力する。例えば「特定カテゴリの正答率が極端に低い」→「そのカテゴリの beginner 問題を追加」という判断に使われる。

---

## 5. イベント追加の実践例

新しいユーザー操作のトラッキングを追加する場合の、エンドツーエンドの手順。

### 例: 「ヒント表示」イベントを追加

#### Step 1: events.json にイベントを追加

```json
{
  "name": "hint_view",
  "description": "ヒント表示",
  "params": ["question_id", "platform"]
}
```

#### Step 2: analytics.ts に送信関数を追加

```typescript
export function trackHintView(questionId: string): void {
  pushEvent('hint_view', { question_id: questionId })
}
```

#### Step 3: React コンポーネントから呼び出し

```typescript
import { trackHintView } from '@/lib/analytics'
trackHintView(question.id)
```

#### Step 4: GTM にタグを反映

```bash
node gtm/deploy-gtm.mjs --apply
```

#### Step 5: GA4 にカスタムディメンションを登録（新パラメータがある場合）

```bash
# setup-ga4.mjs に question_id を追加してから実行
node gtm/setup-ga4.mjs 123456789
```

#### Step 6: デプロイ

`main` に push → GitHub Actions が自動ビルド → GitHub Pages にデプロイ → PWA ユーザーに Service Worker 経由で配信

#### Step 7: 動作確認

```bash
# Claude Code から MCP 経由でリアルタイム確認
# → ga4_realtime() で hint_view イベントの発火を確認
```

---

## 6. トラブルシューティング

### MCP サーバーが接続できない

```
GA4 MCP サーバーが未設定です
```

**原因:** `~/.claude/settings.json` に `mcpServers` 設定がない、または Claude Code の再起動が必要。

**対処:**
1. `~/.claude/settings.json` の `mcpServers` に `ga4-analytics` を追加
2. Claude Code を再起動

### GA4_PROPERTY_ID エラー

```
GA4_PROPERTY_ID が .env に設定されていません
```

**対処:** `.env` に `GA4_PROPERTY_ID=123456789` を追加。GA4 管理画面 → プロパティ設定 → プロパティ ID をコピー。

### INVALID_ARGUMENT エラー

```
GA4 API エラー: リクエストが不正です
```

**原因:** 数値パラメータを `dimensions` に、または文字列パラメータを `metrics` に指定している。

**対処:** パラメータ型を確認:
- `dimensions` に指定できるのは文字列パラメータ（action, quiz_mode, category 等）
- `metrics` に指定できるのは数値パラメータ（accuracy, score, duration_sec 等）

### GTM デプロイが失敗する

```
Error: VITE_GTM_ID が未設定
```

**対処:** `.env` に `VITE_GTM_ID=GTM-XXXXXXX` を設定。GTM 管理画面のコンテナ ID を確認。

### GA4 にデータが表示されない

**確認手順:**
1. ブラウザの DevTools Console で `window.dataLayer` を確認 → イベントが push されているか
2. GTM のプレビューモード → タグが発火しているか
3. GA4 リアルタイムレポート → イベントが届いているか
4. カスタムディメンションが未登録 → `node gtm/setup-ga4.mjs <property-id>` を実行

**注意:** GA4 の標準レポートはデータ反映に 24〜48 時間かかる。リアルタイムレポートは即時確認可能。

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [analytics-setup.md](analytics-setup.md) | 初期セットアップ手順（GA4 プロパティ作成、GTM コンテナ作成、GCP サービスアカウント） |
| [analytics-events.md](analytics-events.md) | イベント定義（全イベントのパラメータ・送信元・分析用途） |
| [quality-loop.md](quality-loop.md) | 品質改善ループ（GA4 分析 → コードレビュー → クイズ追加 → 検証） |
| [automation.md](automation.md) | 自動化ツール一覧（スキル、スクリプト、CI/CD） |
| [gtm/README.md](../gtm/README.md) | GTM クイックリファレンス |
