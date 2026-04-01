# GTM / GA4 設定

PWA のユーザー行動を GTM + GA4 で計測する仕組み。

詳細なセットアップ手順は [docs/analytics-setup.md](../docs/analytics-setup.md) を参照。

## クイックリファレンス

### イベントを追加する

1. `gtm/events.json` にイベント定義を追加
2. `src/lib/analytics.ts` に `dataLayer.push` ラッパー関数を追加
3. **store/service 層から呼び出す**（コンポーネントの onClick に直接書かない）
4. `node gtm/deploy-gtm.mjs --apply` で GTM に反映

**配置の原則:**
- ビジネスロジック系（bookmark, answer, quit, resume）→ Zustand store slice
- ユーティリティ系（theme）→ lib 関数内
- 非同期完了系（share）→ Promise の `.then()` コールバック

### GTM タグを更新する

```bash
node gtm/deploy-gtm.mjs          # ドライラン
node gtm/deploy-gtm.mjs --apply  # 適用 & 公開
```

### GA4 ディメンションを追加する

```bash
node gtm/setup-ga4.mjs <property-id>
```

### 環境変数

```bash
cp .env.example .env
```

| 変数 | 用途 |
|------|------|
| `VITE_GTM_ID` | GTM コンテナ ID（PWA ビルド時に注入） |
| `GA4_MEASUREMENT_ID` | GA4 Measurement ID（MCP / スクリプト用） |
| `GA4_PROPERTY_ID` | GA4 プロパティ ID（スクリプト用） |
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP サービスアカウントキーのパス |

## ファイル

| ファイル | 説明 | リポジトリ |
|---------|------|-----------|
| `events.json` | イベント定義（SSOT） | Yes |
| `build-container.mjs` | GTM インポート JSON 生成 | Yes |
| `deploy-gtm.mjs` | GTM API 自動デプロイ | Yes |
| `setup-ga4.mjs` | GA4 ディメンション登録 | Yes |
| `container-config.json` | テンプレート | Yes |
| `container-import.json` | インポート用 | No（.gitignore） |
