# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
PWA でスマホ・ブラウザから利用可能。Electron デスクトップ版もあり。

**PWA（スマホ・ブラウザ）:** https://ip-san.github.io/claude-code-quiz/

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **フロントエンド:** React + TypeScript + Vite + Tailwind CSS + Zustand
- **配信:** PWA / GitHub Pages（メイン）+ Electron（デスクトップ）
- **アナリティクス:** GTM + GA4（15イベント計測）+ MCP サーバー（Claude Code から GA4 データをクエリ）
- **品質自動化:** `/quality-loop`（GA4分析 → コードレビュー → クイズ生成 → クイズ検証の自動化ループ）
- **テスト:** Vitest（408テスト）+ Playwright E2E（46テスト）
- **CI/CD:** GitHub Actions → GitHub Pages 自動デプロイ（GTM ID は Secret 管理）
- **クイズデータ:** 668問（58ドキュメントページをカバー）
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
├── stores/           # Zustand 状態管理
│   ├── quizStore.ts  # メインストア（facade）
│   └── slices/       # bookmarkSlice, progressSlice, resumeSlice, sessionSlice, viewSlice
├── config/           # アプリ設定（locale, theme, locales/）
├── components/       # React UIコンポーネント（63ファイル）
│   ├── Quiz/         # QuizCard, Feedback, QuizResult + chapter/, diagrams/, hooks/, overlays/, result/
│   ├── Menu/         # ModeSelection, StudyFirstView, ChapterProgressMap, DailySnapshot, QuizSearch
│   ├── Progress/     # ProgressDashboard, LearningRecommendation, WeakPointInsight, CategoryTrendChart
│   ├── Reader/       # ExplanationReader, ReaderCard, ReaderFilters
│   └── Layout/       # WelcomeScreen, TutorialScreen, PWAUpdatePrompt, ErrorBoundary
├── lib/              # ユーティリティ（platformAPI, analytics, haptics, useSwipe, theme）
└── data/             # クイズデータ（JSON、668問）+ scenarios.ts
e2e/                  # E2E + Visual Regression テスト（Playwright）
gtm/                  # GTM/GA4 自動化（events.json, deploy-gtm.mjs, setup-ga4.mjs）
mcp/                  # MCP サーバー（ga4-server.mjs — GA4 Data API 接続）
docs/                 # ドキュメント（設計判断、アーキテクチャ、セットアップ、品質ループ等）
```

## 開発コマンド

```bash
# Electron（デスクトップ）
bun run dev           # 開発サーバー起動
bun run build         # プロダクションビルド

# PWA（Web版）
bun run dev:web        # Web版開発サーバー起動
bun run build:web      # Web版プロダクションビルド
bun run preview:web    # Web版プレビュー

# 品質チェック
bun run check         # 型チェック + lint + 408テスト + 668問チェック（一括）
bun test              # ユニット + Store テスト（408テスト、Vitest）
bun run test:e2e      # E2E + Visual Regression テスト（46テスト、Playwright）
bun run test:e2e:ui   # E2E をビジュアルUIで実行（デバッグ用）

# クイズ管理
bun run quiz:stats    # クイズ統計（カテゴリ・難易度・correctIndex分布）
bun run quiz:coverage # ドキュメントページ別カバレッジ
bun run quiz:check    # クイズ品質チェック（ID重複、偏り、構造）
bun run quiz:randomize # correctIndex ランダム化
bun run quiz:post-add  # 問題追加後の一括処理（randomize → check → test → stats）

# ドキュメント検証
bun run docs:validate  # CLAUDE.md の統計値が実装と一致しているか自動検証
bun run check:all      # check + docs:validate（CI用フルチェック）

# 品質監視
bun run size           # バンドルサイズチェック（size-limit）
bun run lighthouse     # Lighthouse CI（Performance / a11y / SEO / Best Practices）
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
| 全体像モード | 6チャプター構成36問の学習パス（初心者推奨） | 毎問表示 |
| 実力テスト | 全カテゴリ100問、60分制限 | **全問終了後に一括表示**（deferFeedback） |
| カテゴリ別学習 | 選択カテゴリの全問 | 毎問表示 |
| ランダム20問 | 20問をランダム出題 | 毎問表示 |
| 60秒チェック | SRS期限到来3問を即確認（忙しい日用） | 毎問表示 |
| 苦手克服モード | SRS優先度順で正答率の低い問題 | 毎問表示 |
| 後で学ぶ | ブックマーク済み問題 | 毎問表示 |
| 間違い復習 | 間違えた問題を解説付きで復習 | 毎問表示 |
| 実践シナリオ | 実務シナリオに沿ってClaude Codeを学ぶ | 毎問表示 |
| 未回答チャレンジ | カテゴリ別に未回答問題のみ出題 | 毎問表示 |

**読んでから解く（studyFirst）:** クイズモードではなく UI フロー。解説を先に読んでからクイズに挑戦する学習パス。メニューの「読んでから解く」から開始し、内部的には全体像モードのクイズセッションを起動する。

### 実力テスト（deferFeedback モード）

- 回答後にフィードバック・解説を表示しない
- 問題ドットインジケーターで全体の回答状況を一覧
- ドットタップ・◀▶ボタンで自由にナビゲーション
- 「テスト終了」ボタンで結果画面へ（スコアは answerHistory から再計算）
- タイマーは回答済み問題の閲覧中は停止

### ナビゲーション

- **◀▶ ボタン:** 常時表示。回答前でもスキップ可能（最終問題のみ回答後に次へ進む）
- **スワイプ:** 左=次、右=前（回答前でもスキップ可能。最終問題は回答後に次へ）
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

- **実践シナリオ（scenarioSelect）:** 実務に即したストーリー形式で既存問題を出題（14シナリオ）
- **キーワード検索（QuizSearch）:** 668問から検索、解説をその場で展開可能。10件超は全件表示画面
- **解説リーダー（ExplanationReader）:** 668問の解説をクイズなしで閲覧。カテゴリ・難易度・ステータスフィルタ + ドキュメントページ別サブフィルタ
- **「後で学ぶ」ブックマーク:** 検索結果・解説リーダーから1タップで保存 → ハンバーガーメニューからまとめて学習
- 身につけたスキル表示（SkillsAcquired）: 正解カテゴリ→実務能力変換
- チーム共有ガイド（TeamShareGuide）: Slack提案メッセージのワンタップコピー
- 「明日やること」アクションアイテム: チャプター別の具体的行動指示
- 学習レコメンドエンジン（LearningRecommendation）: 弱点分析→次の行動提案
- 弱点パターン可視化（WeakPointInsight）: 正答率<70%カテゴリの復習ボタン
- 教えられるカテゴリ表示: 正答率90%以上のカテゴリを可視化（学習進捗画面）
- 修了証（CertificateGenerator）: 全体像モード70%+ / 実力テスト80%+ / AI活用レベル到達（4段階: 基礎修了証→実践者認定証→推進者認定証→マスター認定証）

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
| Domain | 312 | Vitest | entities, services, valueObjects |
| Infrastructure | 66 | Vitest | validation（Zod スキーマ、コンテンツ品質） |
| Store | 15 | Vitest | initialize, startSession, submitAnswer, navigation |
| Data | 15 | Vitest | scenarios（シナリオ構造・問題参照の整合性） |
| E2E | 17 | Playwright | ユーザーフロー（ウェルカム→クイズ→結果）+ a11y |
| Visual Regression | 4 | Playwright | スクリーンショット比較（ライト/ダーク × 2画面 × 7デバイス） |

```bash
bun run check         # 型 + lint + 408テスト + 668問（~5秒）
bun test              # Unit + Store（408テスト、~2秒）
bun run test:e2e      # E2E + Visual（46テスト、~40秒）
```

Visual Regression ベースライン更新: `npx playwright test --update-snapshots`

## カスタムスキル

このプロジェクトでは、Claude Code のスキル機能を使ってクイズ品質・コード品質・ユーザー体験の改善を自動化している。

### スキルの棲み分け方針

| スコープ | 配置場所 | 方針 | 例 |
|---------|---------|------|-----|
| ユーザーレベル（全プロジェクト共通） | `~/.claude/skills/` | **カスタムしない**。外部から導入した汎用スキル | `/code-review`, `/accessibility`, `/performance` |
| プロジェクトレベル（このプロジェクト固有） | `.claude/skills/` | プロジェクト固有の教訓・ワークフローを記述 | `/self-review`, `/quiz-refine`, `/quality-loop` |

**原則:**
- ユーザーレベルスキルにプロジェクト固有の記述を追加しない
- プロジェクト固有の要件はプロジェクトスキルが内部でユーザーレベルスキルを呼び出す形で統合する
- 例: `/self-review` が内部で `/code-review`（汎用）を呼び出した後、プロジェクト固有チェック（ダークモード、ハードコード検出等）を実行

**品質改善の自動化フロー:**
```
GA4（PWAユーザーの行動データ）
  ↓ MCP 経由で取得
/analytics-insight（ユーザー行動分析・改善提案）
  ↓
/self-review（/code-review 汎用レビュー + プロジェクト固有チェック10項目）
  ↓
/generate-quiz-data + quiz:stats（不足カテゴリの問題を自動生成）
  ↓
/quiz-refine（全問題を公式ドキュメントと照合・修正）
  ↓
CLAUDE.md 統計値同期（docs:validate → 自動更新）
  ↓
最終ゲート（check:all + size + E2E）
  ↓
GitHub Actions → GitHub Pages（PWAに自動配信）
  ↓
GA4 で改善効果を測定 → ループ
```

この一連のフローは `/quality-loop` で一括実行できる。`/loop 1h /quality-loop` で定期実行も可能。詳細は [docs/quality-loop.md](docs/quality-loop.md) を参照。

### /generate-quiz-data

公式ドキュメントを読み込み、クイズ問題を自動生成するスキル。

**使用方法:**
```
/generate-quiz-data        # 16問のサンプルを生成（各カテゴリ2問）
/generate-quiz-data 50     # 50問を生成
```

**生成後の必須手順:**
```bash
bun run quiz:post-add   # randomize → check → test → stats を一括実行
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

### /self-review

プロジェクト固有の過去ミスパターンを自動検出するセルフレビュースキル。

**使用方法:**
```
/self-review          # チェックのみ（報告）
/self-review --fix    # 検出した問題を自動修正
```

**チェック項目:** ダークモード `dark:` 漏れ、ハードコード残存、未使用 import、正規表現文字クラス、TDZ 前方参照、クイズ ID 重複、ドキュメント整合性

**`/code-review` との棲み分け:**
- `/code-review`: ユーザーレベルスキル（`~/.claude/skills/`）。汎用的なコード品質レビュー
- `/self-review`: プロジェクトスキル（`.claude/skills/`）。このプロジェクト固有の教訓に基づくチェック

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

### /quality-loop

GA4分析 + コードレビュー + クイズ追加判定 + クイズ検証を一括実行する統合スキル。

**使用方法:**
```
/quality-loop                    # 全ステップ実行
/quality-loop --skip-analytics   # GA4分析をスキップ
/quality-loop --skip-review      # code-review をスキップ
/quality-loop --skip-generate    # クイズ追加判定をスキップ
/quality-loop --skip-refine      # quiz-refine をスキップ
/quality-loop --skip-gate        # 統計同期 + 最終ゲートをスキップ
/quality-loop --dry-run          # クイズ追加は分析のみ（生成しない）
```

**実行順序:**
0. `/analytics-insight` — GA4データからユーザー行動分析・改善提案
1. `/code-review` — 未コミットの変更をレビュー・修正
2. クイズ追加判定 — `quiz:stats` + GA4分析結果で偏り分析、必要なら生成
3. `/quiz-refine` — 追加分も含めてクイズ検証・修正
4. CLAUDE.md 統計同期 — `docs:validate` で差分検出 → 自動更新
5. 最終ゲート — `check:all` + `size` + `test:e2e` で全変更の整合性を保証

**定期実行:** `/loop 1h /quality-loop` で1時間ごとの自動実行が可能

### /analytics-insight

GA4データからユーザー行動を分析し、改善アクションを提案するスキル。

**使用方法:**
```
/analytics-insight              # 直近7日間の全体分析
/analytics-insight 30           # 直近30日間
/analytics-insight --focus quiz  # クイズ完了・正答率に特化
/analytics-insight --focus tutorial  # チュートリアル・オンボーディングに特化
/analytics-insight --focus retention # 継続率・リテンションに特化
```

**分析内容:** ユーザーファネル、モード別利用状況、正答率、チュートリアルスキップ率、プラットフォーム比較、離脱ポイント

**MCP依存:** GA4 MCP サーバー（`mcp/ga4-server.mjs`）が必要。未接続時はスキップ

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
- correctIndex は追加後に `bun run quiz:randomize` でランダム化する
- `tags` フィールドでクロスカテゴリのグループ化が可能（例: 全体像モード）

## タグシステム

`tags` フィールドを使って問題をクロスカテゴリでグループ化できる。
問題は元のカテゴリに所属したまま、タグで別のモードにも登場させられる。

- `overview`: 全体像モード対象問題（現在36問）
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
