---
name: analytics-insight
description: GA4データからユーザー行動を分析し、改善アクションを提案する。分析、アナリティクス、GA4、ユーザー行動
allowed-tools: Read, Bash, Grep, Glob, mcp__ga4-analytics__ga4_summary, mcp__ga4-analytics__ga4_report, mcp__ga4-analytics__ga4_realtime
argument-hint: "[days] [--focus quiz|tutorial|retention|all]"
---

# Analytics Insight Skill

GA4 の分析データからユーザー行動を分析し、改善アクションを提案するスキル。

## 引数

`$ARGUMENTS` をパースする:
- 数値（1-90）→ 分析期間（日数、デフォルト: 7）
- `--focus quiz` → クイズ完了・正答率に特化
- `--focus tutorial` → チュートリアル・オンボーディングに特化
- `--focus retention` → 継続率・リテンションに特化
- `--focus all` → 全領域（デフォルト）

## 分析手順

### Step 1: データ取得

MCP ツールを使って GA4 からデータを取得する。

**重要:** `ga4_report` の `dimensions` で `customEvent:` プレフィックスを使う場合、必ず以下のパラメータリファレンスに存在する名前を使うこと。存在しないパラメータ名は `INVALID_ARGUMENT` エラーになる。

#### イベント・パラメータリファレンス（`gtm/events.json` 準拠）

| イベント名 | 説明 | パラメータ（`customEvent:` で指定） |
|-----------|------|-----------------------------------|
| tutorial_progress | チュートリアル完了/スキップ | action, slide_index, platform |
| quiz_start | クイズ開始 | quiz_mode, question_count, category, platform |
| quiz_complete | クイズ完了 | quiz_mode, score, total, accuracy, duration_sec, platform |
| chapter_progress | チャプター進捗（全体像モード） | chapter_id, action, accuracy, platform |
| study_first | 読んでから解くモード | chapter_id, action, platform |
| bookmark | ブックマーク操作 | action, platform |
| quiz_search | 検索利用 | result_count, platform |
| reader_open | 解説リーダー利用 | platform |
| share_result | 結果シェア | method, platform |
| certificate_download | 修了証ダウンロード | quiz_mode, platform |
| app_error | アプリエラー | error_message, error_source, platform |

GA4 組み込みディメンション（`customEvent:` 不要）: `eventName`, `date`, `deviceCategory`, `city`

1. `ga4_summary` で直近N日間の全体概要を取得
2. 必要に応じて `ga4_report` で詳細データを取得:
   - モード別クイズ完了数と正答率
   - チュートリアルの完了率 vs スキップ率
   - プラットフォーム別（Electron vs PWA）利用状況
   - チャプター別の離脱率
   - 「読んでから解く」モードの利用率
   - 検索利用頻度とブックマーク率
   - **エラー発生状況（error_source 別、頻出 error_message）**

### Step 2: 分析と洞察

取得したデータから以下を分析する:

#### ユーザーファネル
```
アクセス → チュートリアル完了 → 初回クイズ開始 → クイズ完了 → 2回目以降
```
各ステップの転換率を算出し、ボトルネックを特定する。

#### クイズ品質指標
- **正答率が極端に低いモード**（< 40%）→ 問題の難易度調整が必要
- **完了率が低いモード**（開始 vs 完了の比率）→ UXまたは問題量の問題
- **特定カテゴリの正答率偏り** → 問題の質・難易度バランス

#### エンゲージメント指標
- **チュートリアルスキップ率** → 高い場合はチュートリアル改善 or スキップ後の代替導線
- **「読んでから解く」利用率** → 低い場合は導線改善
- **ブックマーク率** → 学習意欲の指標
- **セッション時間** → 適切な学習量か

#### プラットフォーム比較
- Electron vs PWA のユーザー数・行動差異
- プラットフォーム固有の問題がないか

#### エラー分析
- **app_error イベントの有無を必ず確認する**
- `ga4_report(dimensions: ["customEvent:error_source", "customEvent:error_message"], metrics: ["eventCount"], dimensionFilter: {dimension: "eventName", value: "app_error"})` で取得
- **頻出エラー** → 即時修正が必要なバグ
- **error_source 別の傾向** → react_boundary（レンダリング）vs window_error（JS例外）vs unhandled_rejection（非同期）
- **プラットフォーム別** → PWA 固有のエラーがないか
- エラーが 0 件の場合は「エラーなし」と報告

### Step 3: アクション提案

分析結果を以下のカテゴリに分類して提案する:

| 優先度 | カテゴリ | 例 |
|--------|---------|-----|
| **最高** | **バグ修正** | **app_error で検出されたエラーの修正** |
| 高 | クイズ品質 | 正答率が低すぎるカテゴリの問題を見直し |
| 高 | UX改善 | 離脱率が高いステップの UI 改善 |
| 中 | コンテンツ追加 | 利用率の高いモードに問題を追加 |
| 中 | 導線改善 | 利用率の低い機能の発見性向上 |
| 低 | 新機能検討 | データから見えるユーザーニーズ |

## 出力フォーマット

```markdown
## Analytics Insight（直近N日間）

### サマリー
- アクティブユーザー: X
- セッション数: X
- イベント総数: X

### ファネル分析
| ステップ | 数 | 転換率 |
|---------|-----|--------|
| アクセス | X | - |
| チュートリアル完了 | X | X% |
| クイズ開始 | X | X% |
| クイズ完了 | X | X% |

### エラー状況
- app_error: N件（または「エラーなし ✅」）
- 頻出: `error_message` (N回, source)

### 注目ポイント
- [ポジティブ] ...
- [要改善] ...

### アクション提案
1. **[最高]** （app_error があれば最優先で修正提案）
2. **[高]** ...
3. **[中]** ...
4. **[低]** ...

### quality-loop への入力
以下の情報をクイズ追加判定（ステップ2）に渡す:
- 追加推奨カテゴリ: ...（正答率・利用率ベース）
- 問題難易度調整: ...
- 新規モード/機能: ...
```

## データなしの場合

GA4にまだデータが蓄積されていない場合（デプロイ直後など）:
- 「データ蓄積中（GA4 は反映に24-48時間かかります）」と報告
- アクション提案はスキップ
- quality-loop への入力は「データ不足のためスキップ」

## MCP サーバーが利用不可の場合

MCP ツール（ga4_summary 等）が見つからない場合:
- 「GA4 MCP サーバーが未設定です。次のセッションで利用可能になります」と報告
- セットアップ手順を案内
