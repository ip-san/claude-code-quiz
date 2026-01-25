# クイズ問題の管理

クイズ問題の追加、編集、検証方法について説明します。

## 目次

- [問題データの構造](#問題データの構造)
- [問題の追加・編集](#問題の追加編集)
- [カテゴリの管理](#カテゴリの管理)
- [Claude Code スキル](#claude-code-スキル)
- [問題のインポート](#問題のインポート)
- [ベストプラクティス](#ベストプラクティス)

## 問題データの構造

### ファイル場所

```
src/data/quizzes.json
```

### スキーマ

```json
{
  "title": "Claude Code Master Quiz",
  "version": "1.0.0",
  "quizzes": [
    {
      "id": "category-001",
      "category": "memory",
      "difficulty": "beginner",
      "question": "問題文をここに記述",
      "options": [
        { "text": "選択肢1", "wrongFeedback": "不正解時のフィードバック" },
        { "text": "選択肢2（正解）" },
        { "text": "選択肢3", "wrongFeedback": "なぜこれが間違いか" },
        { "text": "選択肢4", "wrongFeedback": "なぜこれが間違いか" }
      ],
      "correctIndex": 1,
      "explanation": "正解の詳細な解説",
      "referenceUrl": "https://code.claude.com/docs/en/...",
      "aiPrompt": "（任意）AIへの追加質問プロンプト"
    }
  ]
}
```

### フィールド説明

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `id` | ✓ | ユニークな識別子（例: `memory-001`） |
| `category` | ✓ | カテゴリID（後述） |
| `difficulty` | ✓ | `beginner` / `intermediate` / `advanced` |
| `question` | ✓ | 問題文 |
| `options` | ✓ | 選択肢の配列（2〜4個） |
| `options[].text` | ✓ | 選択肢のテキスト |
| `options[].wrongFeedback` | | 不正解時のフィードバック（正解には不要） |
| `correctIndex` | ✓ | 正解のインデックス（0始まり） |
| `explanation` | ✓ | 正解の解説 |
| `referenceUrl` | | 公式ドキュメントへのリンク |
| `aiPrompt` | | AI への追加質問用プロンプト |

### カテゴリ一覧

| ID | 名前 | 説明 |
|----|------|------|
| `memory` | Memory | CLAUDE.md、メモリシステム |
| `skills` | Skills | カスタムスキル、スラッシュコマンド |
| `tools` | Tools | Read, Edit, Bash などのツール |
| `commands` | Commands | CLI コマンド、フラグ |
| `extensions` | Extensions | MCP、Hooks、サブエージェント |
| `session` | Session | セッション管理、履歴 |
| `keyboard` | Keyboard | ショートカット、Vim モード |
| `bestpractices` | Best Practices | 効果的な使い方 |

### 難易度ガイドライン

| 難易度 | 対象者 | 問題例 |
|--------|--------|--------|
| `beginner` | 初心者 | 基本的なコマンド、用語の意味 |
| `intermediate` | 中級者 | 応用的な使い方、オプション |
| `advanced` | 上級者 | 内部動作、エッジケース |

## 問題の追加・編集

### 手動で追加

1. `src/data/quizzes.json` を開く
2. `quizzes` 配列に新しい問題を追加

```json
{
  "id": "memory-016",
  "category": "memory",
  "difficulty": "intermediate",
  "question": "CLAUDE.md で外部ファイルをインポートする構文は？",
  "options": [
    { "text": "#include <file>", "wrongFeedback": "これは C/C++ の構文です" },
    { "text": "@path/to/file" },
    { "text": "import './file'", "wrongFeedback": "これは JavaScript の構文です" },
    { "text": "{{file}}", "wrongFeedback": "この構文はサポートされていません" }
  ],
  "correctIndex": 1,
  "explanation": "@path/to/file 形式で他のファイルをインポートできます。相対パスと絶対パスの両方をサポートし、最大5階層まで再帰的に解決されます。",
  "referenceUrl": "https://code.claude.com/docs/en/memory#importing-files"
}
```

### ID の命名規則

```
<category>-<number>

例:
- memory-001
- skills-015
- tools-003
```

番号は連番で、カテゴリごとに管理します。

## カテゴリの管理

### 新しいカテゴリの追加

1. `src/domain/valueObjects/Category.ts` を編集

```typescript
export const PREDEFINED_CATEGORIES: Category[] = [
  // 既存のカテゴリ...

  Category.create({
    id: 'newcategory',
    name: '新カテゴリ',
    description: 'カテゴリの説明',
    icon: '🆕',
    color: 'purple',
    weight: 10,  // 出題比率（%）
  }),
]
```

2. 問題を追加

## Claude Code スキル

Claude Code を使用している場合、以下のスキルで問題の生成・検証ができます。

### 問題の自動生成

```bash
# 16問のサンプルを生成（各カテゴリ2問）
/generate-quiz-data

# 100問を生成
/generate-quiz-data 100
```

公式ドキュメント（code.claude.com）を読み込んで、クイズ問題を自動生成します。

**生成される問題の特徴:**
- 公式ドキュメントに基づいた正確な内容
- 適切な難易度分布
- 詳細な解説とリファレンス URL

### 問題の検証

```bash
# 全カテゴリを検証
/verify-quiz-content

# 特定カテゴリのみ検証
/verify-quiz-content memory

# 複数カテゴリを検証
/verify-quiz-content memory skills tools
```

**検証項目:**
- 事実の正確性（正解・解説が公式ドキュメントと一致するか）
- 用語・名称の正確性（API名、イベント名など）
- リファレンス URL の有効性
- 最新性（廃止・名称変更された機能がないか）

**出力例:**
```
## 検証結果サマリー

✅ 全 100 問の検証が完了しました。
- memory: 15問 OK
- skills: 15問 OK
...

⚠️ 2 件の問題が見つかりました。

| Quiz ID | 問題内容 | 現在の内容 | 正しい内容 |
|---------|---------|-----------|-----------|
| ext-003 | イベント名 | PreToolExecution | PreToolUse |
```

## 問題のインポート

### アプリ内からインポート

1. アプリの「データセット管理」パネルを開く
2. 「インポート」ボタンをクリック
3. JSON ファイルを選択

### JSON フォーマット

```json
{
  "title": "カスタムクイズ",
  "quizzes": [
    {
      "id": "custom-001",
      "category": "memory",
      "difficulty": "beginner",
      "question": "問題文",
      "options": [
        { "text": "選択肢1" },
        { "text": "選択肢2" }
      ],
      "correctIndex": 0,
      "explanation": "解説"
    }
  ]
}
```

### バリデーション

インポート時に以下が検証されます：

- 必須フィールドの存在
- ID のユニーク性
- カテゴリの有効性
- correctIndex の範囲
- URL の形式

## ベストプラクティス

### 問題作成のコツ

1. **明確な問題文**
   - 何を問うているか一目でわかる
   - 曖昧さを排除

2. **魅力的な誤答**
   - もっともらしい誤答を用意
   - 単なる間違いではなく、よくある誤解を反映

3. **教育的なフィードバック**
   - なぜ間違いなのか説明
   - 正解へのヒントを含める

4. **詳細な解説**
   - 背景知識も含める
   - 関連する機能への言及

5. **公式ドキュメントへのリンク**
   - 常に referenceUrl を設定
   - 最新のドキュメント URL を使用

### 例: 良い問題

```json
{
  "id": "memory-002",
  "category": "memory",
  "difficulty": "intermediate",
  "question": "CLAUDE.md ファイル内で別のファイルをインポートする正しい構文はどれですか？",
  "options": [
    {
      "text": "#include <path/to/file>",
      "wrongFeedback": "これは C/C++ のプリプロセッサ構文です。Claude Code では使用しません。"
    },
    {
      "text": "import \"./path/to/file\"",
      "wrongFeedback": "これは JavaScript/TypeScript の import 構文です。"
    },
    { "text": "@path/to/file" },
    {
      "text": "{{include: path/to/file}}",
      "wrongFeedback": "この構文は CLAUDE.md ではサポートされていません。"
    }
  ],
  "correctIndex": 2,
  "explanation": "@path/to/file の形式で他のファイルをインポートできます。相対パスと絶対パスの両方をサポートし、最大5階層まで再帰的に解決されます。コードブロック内の @ はインポートとして解釈されないので安全です。",
  "referenceUrl": "https://code.claude.com/docs/en/memory#importing-files"
}
```

### 避けるべきパターン

- ❌ 「正しいものを選べ」だけの曖昧な問題文
- ❌ 明らかにおかしい誤答（例: 「わかりません」）
- ❌ フィードバックなしの誤答
- ❌ 解説なし、または「正解は X です」だけの解説
- ❌ 古い/無効なドキュメント URL

---

スキルの詳細については `.claude/skills/` 内の各 SKILL.md を参照してください。
