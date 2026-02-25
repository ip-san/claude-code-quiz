# Claude Code Quiz Desktop

Claude Code の機能と使い方を学習するためのデスクトップクイズアプリケーション。

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **技術スタック:** Electron + Vite + React + TypeScript + Tailwind CSS + Zustand
- **テスト:** Vitest（369テスト）
- **クイズデータ:** 464問（14ドキュメントページをカバー）

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
npm test              # テスト実行（369テスト）
npm run build         # プロダクションビルド
npm run quiz:stats    # クイズ統計（カテゴリ・難易度・correctIndex分布）
npm run quiz:coverage # ドキュメントページ別カバレッジ
npm run quiz:check    # クイズ品質チェック（ID重複、偏り、構造）
npm run quiz:randomize # correctIndex ランダム化
```

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

### /verify-quiz-content

クイズ内容と公式ドキュメントの整合性を検証するスキル。

**使用方法:**
```
/verify-quiz-content              # 全カテゴリ検証
/verify-quiz-content memory       # 特定カテゴリのみ
```

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
- `tags` フィールドでクロスカテゴリのグループ化が可能（例: はじめてモード）

## タグシステム

`tags` フィールドを使って問題をクロスカテゴリでグループ化できる。
問題は元のカテゴリに所属したまま、タグで別のモードにも登場させられる。

- `getting-started`: はじめてモード対象問題
- `getting-started-NNN`: はじめてモード内の出題順序（010, 020, ... で管理）

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
| gettingstarted | gs- | gs-001 |
