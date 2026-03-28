# アナリティクス イベント定義

アプリから GA4 に送信されるイベントの一覧と、データの流れ。

## データフロー

```
ユーザー操作
  ↓
React コンポーネント
  ↓ trackXxx() を呼び出し
src/lib/analytics.ts
  ↓ window.dataLayer.push()
GTM (タグ → GA4)
  ↓
GA4 カスタムディメンション / 指標
  ↓
MCP Server → Claude Code
```

## 共通パラメータ

全イベントに自動付与されるパラメータ:

| パラメータ | 型 | 値 | 説明 |
|-----------|-----|-----|------|
| `platform` | string | `electron` / `pwa` | 実行プラットフォーム |

## イベント一覧

### tutorial_progress

チュートリアル画面の完了またはスキップ。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `action` | string | `complete` / `skip` |
| `slide_index` | number | スキップ時のスライド番号（0始まり） |

**送信元:** `src/components/Layout/TutorialScreen.tsx`

**分析用途:** チュートリアルの有効性を測る。スキップ率が高い場合はコンテンツ改善が必要。

### quiz_start

クイズセッションの開始。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `quiz_mode` | string | `overview`, `full`, `category`, `random`, `quick`, `weak`, `bookmark`, `review`, `scenario`, `custom`, `unanswered` |
| `question_count` | number | セッションの問題数 |
| `category` | string? | カテゴリ別学習時のカテゴリ ID |

**送信元:** `src/stores/quizStore.ts` (`startSession`)

**分析用途:** どのモードが人気か、カテゴリ別の利用頻度。

### quiz_complete

クイズセッションの完了。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `quiz_mode` | string | 開始時と同じモード |
| `score` | number | 正解数 |
| `total` | number | 回答した問題数 |
| `accuracy` | number | 正答率（0-100） |
| `duration_sec` | number | セッション所要時間（秒） |

**送信元:** `src/stores/quizStore.ts` (`recordCompletedSession`)

**分析用途:** モード別の正答率・完了率・所要時間。学習効果の測定。

### chapter_progress

全体像モードのチャプター開始。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `chapter_id` | number | チャプター番号（1-6） |
| `action` | string | `start` / `complete` |
| `accuracy` | number? | 完了時の正答率 |

**送信元:** `src/components/Quiz/ChapterIntro.tsx`

**分析用途:** チャプター別の進捗・離脱率。どのチャプターで挫折するか。

### study_first

「読んでから解く」モードの利用。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `chapter_id` | number | チャプター番号 |
| `action` | string | `start_reading` / `finish_reading` / `start_quiz` |

**送信元:** `src/components/Menu/StudyFirstView.tsx`

**分析用途:** 読んでから解くモードの利用率。解説を読んだ後のクイズ開始率。

### bookmark

ブックマーク操作。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `action` | string | `add` / `remove` |

**送信元:** （未接続 — 将来実装）

### quiz_search

検索機能の利用。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `result_count` | number | 検索結果件数 |

**送信元:** （未接続 — 将来実装）

### reader_open

解説リーダーの利用。

**送信元:** （未接続 — 将来実装）

### share_result

結果のシェア。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `method` | string | シェア方法（`clipboard`, `share_api` 等） |

**送信元:** （未接続 — 将来実装）

### certificate_download

修了証のダウンロード。

| パラメータ | 型 | 値 |
|-----------|-----|-----|
| `quiz_mode` | string | `overview` / `full` |

**送信元:** （未接続 — 将来実装）

## GA4 カスタム定義

### カスタムディメンション

| ディメンション名 | パラメータ名 | 範囲 | 用途 |
|-----------------|-------------|------|------|
| プラットフォーム | `platform` | イベント | Electron vs PWA の比較 |
| クイズモード | `quiz_mode` | イベント | モード別の分析 |
| カテゴリ | `category` | イベント | カテゴリ別の利用頻度 |
| アクション | `action` | イベント | 完了/スキップ等の区分 |
| チャプター | `chapter_id` | イベント | チャプター別の分析 |

### カスタム指標

| 指標名 | パラメータ名 | 測定単位 | 用途 |
|--------|-------------|---------|------|
| 正答率 | `accuracy` | 標準 | 学習効果の測定 |
| スコア | `score` | 標準 | 正解数の集計 |
| 所要時間 | `duration_sec` | 秒 | セッション時間の分析 |
| 問題数 | `question_count` | 標準 | モード別の問題数 |

## イベント追加手順

新しいイベントを追加する場合:

### 1. イベント定義を追加

`gtm/events.json`:
```json
{
  "name": "new_event_name",
  "description": "イベントの説明",
  "params": ["param1", "param2", "platform"]
}
```

### 2. TypeScript 関数を追加

`src/lib/analytics.ts`:
```typescript
export function trackNewEvent(param1: string, param2: number): void {
  pushEvent('new_event_name', { param1, param2 })
}
```

### 3. コンポーネントから呼び出し

```typescript
import { trackNewEvent } from '@/lib/analytics'

// 適切なタイミングで
trackNewEvent('value1', 42)
```

### 4. GTM に反映

```bash
# API 経由で自動デプロイ
node gtm/deploy-gtm.mjs --apply
```

### 5. GA4 カスタムディメンション（必要な場合）

```bash
# setup-ga4.mjs にディメンション/指標を追加して再実行
node gtm/setup-ga4.mjs <property-id>
```
