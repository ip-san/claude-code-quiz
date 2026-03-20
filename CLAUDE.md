# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
デスクトップ（Electron）とスマホ（PWA）の両方で利用可能。

**PWA（スマホ・ブラウザ）:** https://ip-san.github.io/claude-code-quiz-desktop/

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **技術スタック:** Electron + Vite + React + TypeScript + Tailwind CSS + Zustand
- **デプロイ:** Electron（デスクトップ）+ PWA / GitHub Pages（スマホ・ブラウザ）
- **テスト:** Vitest（347テスト）
- **クイズデータ:** 630問（57ドキュメントページをカバー）
- **ダイアグラム:** 247問にアニメーション付き解説図（flow/comparison/hierarchy/cycle）

## ディレクトリ構造

```
src/
├── domain/           # ドメイン層（ビジネスロジック）
│   ├── entities/     # Question, UserProgress, QuizSet
│   ├── valueObjects/ # Category, Difficulty, QuizMode
│   └── services/     # QuizSessionService, ProgressExportService
├── infrastructure/   # インフラ層（永続化、バリデーション）
│   ├── validation/   # Zod スキーマ、品質テスト
│   └── persistence/  # localStorage リポジトリ
├── stores/           # Zustand 状態管理
├── components/       # React UIコンポーネント
└── data/             # クイズデータ（JSON）
```

## 開発コマンド

```bash
npm run dev           # 開発サーバー起動
npm test              # テスト実行（347テスト）
npm run build         # プロダクションビルド
npm run quiz:stats    # クイズ統計（カテゴリ・難易度・correctIndex分布）
npm run quiz:coverage # ドキュメントページ別カバレッジ
npm run quiz:check    # クイズ品質チェック（ID重複、偏り、構造）
npm run quiz:randomize # correctIndex ランダム化
npm run dev:web        # Web版開発サーバー起動（PWA）
npm run build:web      # Web版プロダクションビルド
npm run preview:web    # Web版プレビュー
```

## PWA / GitHub Pages

**URL: https://ip-san.github.io/claude-code-quiz-desktop/**

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
| オフライン | Service Worker でアセット＋クイズデータをプリキャッシュ |
| 更新通知 | 新バージョン検出時に画面下部にバナー→「更新」で即反映 |
| レスポンシブ | モバイルファースト設計、Safe Area対応、ネイティブ風タップフィードバック |
| プラットフォーム抽象化 | `src/lib/platformAPI.ts` で Electron/Web を自動切替 |
| ビルド設定 | `vite.config.web.ts`（Electron用 `vite.config.ts` と分離） |

## カスタムスキル

### /generate-quiz-data

公式ドキュメントを読み込み、クイズ問題を自動生成するスキル。

**使用方法:**
```
/generate-quiz-data        # 16問のサンプルを生成（各カテゴリ2問）
/generate-quiz-data 50     # 50問を生成
```

**生成後の必須手順:**
1. `npm run quiz:randomize` で正答位置をランダム化
2. `npm run quiz:check` で品質チェック
3. `npm test` でテスト通過確認

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
  "referenceUrl": "https://code.claude.com/docs/en/..."
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

- `overview`: 全体像モード対象問題
- `overview-NNN`: 全体像モード内の出題順序（010, 020, ... で管理）

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
