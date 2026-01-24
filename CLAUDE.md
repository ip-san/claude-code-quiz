# Claude Code Quiz Desktop

Claude Code の機能と使い方を学習するためのデスクトップクイズアプリケーション。

## プロジェクト概要

- **アーキテクチャ:** ドメイン駆動設計（DDD）レイヤードアーキテクチャ
- **技術スタック:** Electron + Vite + React + TypeScript + Tailwind CSS + Zustand
- **テスト:** Vitest（195テスト）

## ディレクトリ構造

```
src/
├── domain/           # ドメイン層（ビジネスロジック）
│   ├── entities/     # Question, UserProgress, QuizSet
│   ├── valueObjects/ # Category, Difficulty, QuizMode
│   └── services/     # QuizSessionService
├── infrastructure/   # インフラ層（永続化、バリデーション）
├── stores/           # Zustand 状態管理
├── components/       # React UIコンポーネント
└── data/             # クイズデータ（JSON）
```

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm test         # テスト実行
npm run build    # プロダクションビルド
```

## カスタムスキル

### /generate-quiz-data

公式ドキュメントを読み込み、クイズ問題を自動生成するスキル。

**使用方法:**
```
/generate-quiz-data        # 16問のサンプルを生成（各カテゴリ2問）
/generate-quiz-data 100    # 100問を生成
```

**生成カテゴリ:** 既存の8カテゴリに準拠（memory, skills, tools, commands, extensions, session, keyboard, bestpractices）

詳細は `.claude/skills/generate-quiz-data/SKILL.md` を参照。

## クイズデータ形式

`src/data/quizzes.json` に準拠したJSON形式：

```json
{
  "id": "category-001",
  "category": "memory",
  "difficulty": "intermediate",
  "question": "問題文",
  "options": [
    { "text": "選択肢", "wrongFeedback": "誤りの理由" }
  ],
  "correctIndex": 0,
  "explanation": "解説",
  "referenceUrl": "https://..."
}
```

## 現在のカテゴリ

| ID | 名前 | アイコン | 比率 |
|----|------|----------|------|
| memory | Memory (CLAUDE.md) | 📝 | 15% |
| skills | Skills | ✨ | 15% |
| tools | Tools | 🔧 | 15% |
| commands | Commands | 💻 | 15% |
| extensions | Extensions | 🧩 | 15% |
| session | Session & Context | 📚 | 10% |
| keyboard | Keyboard & UI | ⌨️ | 10% |
| bestpractices | Best Practices | 💡 | 5% |
