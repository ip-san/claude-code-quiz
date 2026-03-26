# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
デスクトップ（Electron）とスマホ（PWA）の両方で利用可能。

**PWA（スマホ・ブラウザ）:** https://ip-san.github.io/claude-code-quiz/

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **技術スタック:** Electron + Vite + React + TypeScript + Tailwind CSS + Zustand
- **デプロイ:** Electron（デスクトップ）+ PWA / GitHub Pages（スマホ・ブラウザ）
- **テスト:** Vitest（375テスト）+ Playwright E2E（18テスト）
- **クイズデータ:** 638問（58ドキュメントページをカバー）
- **ダイアグラム:** 250問にアニメーション付き解説図（flow/comparison/hierarchy/cycle）

## ディレクトリ構造

```
src/
├── domain/           # ドメイン層（ビジネスロジック）
│   ├── entities/     # Question, UserProgress, QuizSet
│   ├── repositories/ # IProgressRepository, IQuizRepository
│   ├── valueObjects/ # Category, Difficulty, QuizMode
│   └── services/     # QuizSessionService, ProgressExportService, SpacedRepetitionService
├── infrastructure/   # インフラ層（永続化、バリデーション）
│   ├── validation/   # Zod スキーマ、品質テスト
│   └── persistence/  # localStorage リポジトリ
├── stores/           # Zustand 状態管理（quizStore + テスト）
├── components/       # React UIコンポーネント（56ファイル）
│   ├── Quiz/         # QuizCard, Feedback, OptionButton, QuizResult, ScoreRing, etc.
│   ├── Menu/         # ModeSelection, QuizSearch, MasteryRoadmap, DailySnapshot, etc.
│   ├── Progress/     # ProgressDashboard, LearningRecommendation, WeakPointInsight
│   ├── Reader/       # ExplanationReader, ReaderCard, ReaderFilters
│   └── Layout/       # WelcomeScreen, PWAUpdatePrompt, ErrorBoundary, etc.
├── lib/              # ユーティリティ（platformAPI, haptics, useSwipe, theme）
└── data/             # クイズデータ（JSON、638問）
e2e/                  # E2E + Visual Regression テスト（Playwright）
```

## 開発コマンド

```bash
# Electron（デスクトップ）
npm run dev           # 開発サーバー起動
npm run build         # プロダクションビルド

# PWA（Web版）
npm run dev:web        # Web版開発サーバー起動
npm run build:web      # Web版プロダクションビルド
npm run preview:web    # Web版プレビュー

# 品質チェック
npm run check         # 型チェック + lint + 375テスト + 638問チェック（一括）
npm test              # ユニット + Store テスト（375テスト、Vitest）
npm run test:e2e      # E2E + Visual Regression テスト（13テスト、Playwright）
npm run test:e2e:ui   # E2E をビジュアルUIで実行（デバッグ用）

# クイズ管理
npm run quiz:stats    # クイズ統計（カテゴリ・難易度・correctIndex分布）
npm run quiz:coverage # ドキュメントページ別カバレッジ
npm run quiz:check    # クイズ品質チェック（ID重複、偏り、構造）
npm run quiz:randomize # correctIndex ランダム化
npm run quiz:post-add  # 問題追加後の一括処理（randomize → check → test → stats）

# ドキュメント検証
npm run docs:validate  # CLAUDE.md の統計値が実装と一致しているか自動検証
npm run check:all      # check + docs:validate（CI用フルチェック）
```

## PWA / GitHub Pages

**URL: https://ip-san.github.io/claude-code-quiz/**

### スマホへのインストール手順

#### iPhone（iOS Safari）

1. Safari で上記 URL を開く（Chrome や他のブラウザでは不可）
2. 画面下部の **共有ボタン**（四角＋矢印のアイコン）をタップ
3. メニューを下にスクロールし、**「ホーム画面に追加」** をタップ
4. アプリ名を確認して **「追加」** をタップ
5. ホーム画面に「CC Quiz」アイコンが追加される
6. アイコンからの起動で、アドレスバーなしのフルスクリーン表示になる

#### Android（Chrome）

1. Chrome で上記 URL を開く
2. 画面上部に **「アプリをインストール」** バナーが表示されたらタップ
3. バナーが出ない場合：右上の **三点メニュー（⋮）** → **「アプリをインストール」** または **「ホーム画面に追加」**
4. 確認ダイアログで **「インストール」** をタップ
5. ホーム画面とアプリドロワーに追加される

#### PC（Chrome / Edge）

1. Chrome または Edge で上記 URL を開く
2. アドレスバー右端の **インストールアイコン**（＋マーク付きモニター）をクリック
3. 確認ダイアログで **「インストール」** をクリック

### 技術仕様

| 項目 | 詳細 |
|------|------|
| デプロイ | `main` への push で GitHub Actions が自動デプロイ |
| オフライン | Service Worker でアセット＋クイズデータをプリキャッシュ（autoUpdate で自動反映） |
| 更新 | autoUpdate + cleanupOutdatedCaches で自動適用。controllerchange でリロードバナー表示 |
| アイコン | 全面オレンジ塗りつぶし「CC Quiz」。maskable対応でiOS/Android黒縁なし |
| レスポンシブ | モバイルファースト設計、Safe Area対応、ネイティブ風タップフィードバック |
| ダークモード | Tailwind `dark:` prefix で全画面完全対応。テーマ切替はスムーズ transition |
| コード分割 | quiz-data / vendor / 画面別チャンク。初期ロード 189KB（80%削減） |
| プラットフォーム抽象化 | `src/lib/platformAPI.ts` で Electron/Web を自動切替 |
| ビルド設定 | `vite.config.web.ts`（Electron用 `vite.config.ts` と分離） |
| 画面縦ロック | PWA manifest で `orientation: portrait` |

## クイズモード

| モード | 説明 | フィードバック |
|--------|------|--------------|
| 全体像モード | 6チャプター構成56問の学習パス（初心者推奨） | 毎問表示 |
| 実力テスト | 全カテゴリ100問、60分制限 | **全問終了後に一括表示**（deferFeedback） |
| カテゴリ別学習 | 選択カテゴリの全問 | 毎問表示 |
| ランダム20問 | 20問をランダム出題 | 毎問表示 |
| 60秒チェック | SRS期限到来3問を即確認（忙しい日用） | 毎問表示 |
| 苦手克服モード | SRS優先度順で正答率の低い問題 | 毎問表示 |
| 後で学ぶ | ブックマーク済み問題 | 毎問表示 |
| 間違い復習 | 間違えた問題を解説付きで復習 | 毎問表示 |
| フラッシュカード | 問題を見て考え、タップで正解を確認。自己評価で記録 | 毎問表示 |
| 実践シナリオ | 実務シナリオに沿ってClaude Codeを学ぶ | 毎問表示 |

### 実力テスト（deferFeedback モード）

- 回答後にフィードバック・解説を表示しない
- 問題ドットインジケーターで全体の回答状況を一覧
- ドットタップ・◀▶ボタンで自由にナビゲーション
- 「テスト終了」ボタンで結果画面へ（スコアは answerHistory から再計算）
- タイマーは回答済み問題の閲覧中は停止

### ナビゲーション

- **◀▶ ボタン:** 常時表示。回答前でもスキップ可能
- **スワイプ:** 左=次、右=前（回答前でもスキップ可能）
- **前の問題に戻る:** 選択状態を復元（解説は非表示）
- **再回答:** スコアは差分計算（二重カウントなし）
- **ブラウザ戻るボタン:** メニューに直帰（進捗自動保存）

## UI / UX

### アニメーション

- 正解時: 筆跡チェックマーク（3層SVGストロークドロー、画面中央160px）
- 選択肢: チェック/✕のポップイン+ストロークドロー
- 正解カード: 緑ボーダーパルス、不正解: 赤フラッシュ
- 問題切替: 右からスライドイン
- 画面遷移: フェードアップ（0.25s）
- 結果画面: 円形スコアリング（SVGリング）、80%以上で紙吹雪
- 全ボタン: tap-highlight（active:scale-[0.97]）

### ネイティブ感

- Safe Area 対応（ノッチ、ホームインジケーター）
- システムフォント（-apple-system, Hiragino Sans）
- オーバースクロール抑止、タップハイライト無効
- スティッキーヘッダー（backdrop-blur）
- ボトムシートダイアログ（iOS風）
- 触覚フィードバック（navigator.vibrate）
- ステータスバー色動的変更（theme-color）
- プログレスバーにグラデーション

### メニュー画面

- **ハンバーガーメニュー（☰）:** クイズモード一覧、後で学ぶ、学習進捗、解説リーダー、ダークモード切替、更新確認
- **ヘッダーバッジ:** 連続学習日数（🔥ピル）+ デイリーゴール進捗（SVGリング）
- **デイリースナップショット（DailySnapshot）:** 1日1回「今日のプラン」表示 + SRS復習予報（今後6日分）
- **チャプター進捗マップ（ChapterProgressMap）:** 全体像モード6チャプターの完了状態・正答率を可視化、タップでそのチャプターから開始
- **カテゴリフィルタ:** チャプターマップと統一されたカードスタイル（プログレスバー・正答率・バッジ付き）

### ゲーミフィケーション & エンゲージメント

- 5段階AI活用レベル（🌱入門者→📚学習者→🚀実践者→⚡推進者→👑牽引役）— 学習進捗画面に表示
- 連続学習バッジ: ヘッダーにコンパクト表示（🔥N日）+ 復帰ユーザー歓迎メッセージ
- カテゴリ別理解度バッジ（🏆90%+ ⭐70%+）
- カテゴリ自己ベスト更新バッジ（CategoryBreakthroughBadge）
- 連続正解トースト（StreakToast: 3/5/10/15/20問）
- 連続不正解時の励まし（EncouragementToast）
- ストリークマイルストーンバッジ（3, 7, 14, 30, 60, 100日）
- デイリーゴール達成バッジ
- Web Share API で結果シェア
- 初回セッション完了時の特別メッセージ

### 学習支援

- **知識マップ（KnowledgeMap）:** 8カテゴリの関連をSVGノードグラフで可視化。正答率で色分け、タップでカテゴリ学習開始
- **フラッシュカード:** 問題を見て考え、タップで正解確認。自己評価（知ってた/あやしい/知らなかった）でSRS連携
- **実践シナリオ（scenarioSelect）:** 実務に即したストーリー形式で既存問題を出題（3シナリオ）
- **キーワード検索（QuizSearch）:** 638問から検索、解説をその場で展開可能。10件超は全件表示画面
- **解説リーダー（ExplanationReader）:** 638問の解説をクイズなしで閲覧。カテゴリ・難易度・ステータスフィルタ + ドキュメントページ別サブフィルタ
- **「後で学ぶ」ブックマーク:** 検索結果・解説リーダーから1タップで保存 → ハンバーガーメニューからまとめて学習
- 身につけたスキル表示（SkillsAcquired）: 正解カテゴリ→実務能力変換
- チーム共有ガイド（TeamShareGuide）: Slack提案メッセージのワンタップコピー
- 「明日やること」アクションアイテム: チャプター別の具体的行動指示
- 学習レコメンドエンジン（LearningRecommendation）: 弱点分析→次の行動提案
- 弱点パターン可視化（WeakPointInsight）: 正答率<70%カテゴリの復習ボタン
- 教えられるカテゴリ表示: 正答率90%以上のカテゴリを可視化（学習進捗画面）
- 修了証（CertificateGenerator）: 全体像モード70%+ / 実力テスト80%+

### 学習進捗画面

- **常に表示:** 全体統計（総回答数・正解数・正答率・セッション数）、おすすめの学習、弱点インサイト、苦手問題に挑戦ボタン
- **折りたたみ「正答率の推移」:** セッション履歴グラフ + カテゴリ別推移チャート（CategoryTrendChart）+ 最高正答率・成長トレンド + 最近のセッション一覧
- **折りたたみ「カテゴリ別進捗」:** 教えられるカテゴリ + 全8カテゴリの詳細プログレスバー
- **折りたたみ「データ管理」:** エクスポート/インポート/CSV/リセット

## セッション永続化

- `answerHistory` を `answerRecords` 配列として localStorage に保存
- セッション復帰時に完全復元（選択状態、スコア、回答済み問題ドット）
- `retryQuestion` は UI 状態をリセットし、再回答時に差分スコアで計算
- `finishTest` は answerHistory からスコアを再計算（整合性保証）

## テスト戦略

| レイヤー | テスト数 | ツール | 内容 |
|---------|---------|--------|------|
| Domain | 300 | Vitest | entities, services, valueObjects |
| Infrastructure | 60 | Vitest | validation（Zod スキーマ、コンテンツ品質） |
| Store | 15 | Vitest | initialize, startSession, submitAnswer, navigation |
| E2E | 7 | Playwright | ユーザーフロー（ウェルカム→クイズ→結果） |
| Visual Regression | 6 | Playwright | スクリーンショット比較（ライト/ダーク × 3画面） |

```bash
npm run check         # 型 + lint + 375テスト + 638問（~5秒）
npm test              # Unit + Store（375テスト、~2秒）
npm run test:e2e      # E2E + Visual（13テスト、~22秒）
```

Visual Regression ベースライン更新: `npx playwright test --update-snapshots`

## カスタムスキル

### /generate-quiz-data

公式ドキュメントを読み込み、クイズ問題を自動生成するスキル。

**使用方法:**
```
/generate-quiz-data        # 16問のサンプルを生成（各カテゴリ2問）
/generate-quiz-data 50     # 50問を生成
```

**生成後の必須手順:**
```bash
npm run quiz:post-add   # randomize → check → test → stats を一括実行
```

### /quiz-refine

クイズの検証・修正スキル。`context: fork` で独立エージェントとして実行。

**使用方法:**
```
/quiz-refine                    # 1回, 全カテゴリ, 差分検証+修正
/quiz-refine 3                  # 3回反復, 全カテゴリ
/quiz-refine 2 memory tools     # 2回反復, 指定カテゴリのみ
/quiz-refine --dry-run          # 報告のみ（修正しない）
/quiz-refine --full             # 全件スキャン（差分ではなく全問）
/quiz-refine --dry-run --full   # 全件スキャン+報告のみ
```

**完了後の手順:**
1. `git diff` で修正内容をレビュー
2. `.claude/tmp/skill-proposals.md` を確認
3. 汎用性の高い提案のみスキルファイルに反映

### /spec-audit

CLAUDE.md の仕様記述と実装の意味的な整合性を監査するスキル。

**使用方法:**
```
/spec-audit              # 全セクションを監査
/spec-audit modes        # クイズモード設定のみ監査
/spec-audit navigation   # ナビゲーション動作のみ監査
```

**監査セクション:** structure, modes, navigation, ui, persistence, tags, categories, commands

**`docs:validate` との違い:**
- `docs:validate`: 数値の自動検証（スクリプト、CI で実行）
- `/spec-audit`: コードを読んで意味的な不一致を検出（スキル、手動で実行）

## クイズデータ形式

`src/data/quizzes.json` に準拠したJSON形式：

```json
{
  "id": "category-001",
  "category": "memory",
  "difficulty": "intermediate",
  "question": "問題文",
  "options": [
    { "text": "正解選択肢" },
    { "text": "不正解選択肢", "wrongFeedback": "誤りの理由" }
  ],
  "correctIndex": 0,
  "explanation": "解説",
  "referenceUrl": "https://code.claude.com/docs/ja/..."
}
```

**重要ルール:**
- 正解選択肢に `wrongFeedback` を付けない
- 不正解選択肢には必ず `wrongFeedback` を付ける
- correctIndex は追加後に `npm run quiz:randomize` でランダム化する
- `tags` フィールドでクロスカテゴリのグループ化が可能（例: 全体像モード）

## タグシステム

`tags` フィールドを使って問題をクロスカテゴリでグループ化できる。
問題は元のカテゴリに所属したまま、タグで別のモードにも登場させられる。

- `overview`: 全体像モード対象問題（現在56問）
- `overview-ch-N`: チャプター割り当て（ch-1〜ch-6）
- `overview-NNN`: 全体像モード内の出題順序（010, 020, ... で管理、グローバルユニーク）

## 現在のカテゴリ

| ID | 名前 | アイコン | Weight |
|----|------|----------|--------|
| memory | Memory (CLAUDE.md) | 📝 | 15 |
| skills | Skills | ✨ | 15 |
| tools | Tools | 🔧 | 15 |
| commands | Commands | 💻 | 15 |
| extensions | Extensions | 🧩 | 15 |
| session | Session & Context | 📚 | 10 |
| keyboard | Keyboard & UI | ⌨️ | 10 |
| bestpractices | Best Practices | 💡 | 10 |

## ID命名規則

| カテゴリ | Prefix | 例 |
|---------|--------|-----|
| memory | mem- | mem-001 |
| skills | skill- | skill-001 |
| tools | tool- | tool-001 |
| commands | cmd- | cmd-001 |
| extensions | ext- | ext-001 |
| session | ses- | ses-001 |
| keyboard | key- | key-001 |
| bestpractices | bp- | bp-001 |
| (legacy) | gs- | gs-001 |
