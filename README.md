# Claude Code Quiz Desktop

Claude Code の機能と使い方を効率的に学習するためのデスクトップクイズアプリケーションです。

## 作成のモチベーション

Claude Code を勉強しています。

最近は「覚えるよりも調べる能力が大事」「AIに聞けばいい」とよく言われます。それは正しいと思います。しかし、調べるにしてもAIに聞くにしても、**何を調べればいいのか**、**何を聞けばいいのか**がわからなければ始まりません。

公式ドキュメントの内容を一通り頭に入れている人は強いと感じます。全てを暗記している必要はありませんが、「こういう機能があったはず」「確かあのコマンドで...」という**脳内インデックス**があれば、必要な時にすぐ調べられるし、AIにも的確な質問ができます。

Claude Code は機能が多岐にわたります。メモリシステム、ツール群、スラッシュコマンド、キーボードショートカット、MCP連携...。ドキュメントを一度読んだだけでは、とても全ては覚えられません。

そこで、4択問題が連なったクイズアプリを作りたいと思いました。

**アクティブリコール（能動的な想起）** と **スペーシング効果（分散学習）** を活用し、繰り返し問題を解くことで脳内インデックスを構築する。間違えた問題を重点的に出題する「苦手問題モード」で、効率的に知識を定着させる。そんなツールです。

## 機能

### クイズモード
- **全問チャレンジ**: 100問を60分で解く本格モード
- **カテゴリ別**: 特定のカテゴリに絞って学習
- **ランダム20問**: 手軽に復習したい時に
- **苦手問題**: 正答率の低い問題を重点的に出題
- **カスタム**: カテゴリと難易度を自由に組み合わせ

### 8つのカテゴリ（100問）
| カテゴリ | 問題数 | 内容 |
|---------|--------|------|
| Memory | 15問 | CLAUDE.md、メモリシステム、コンテキスト管理 |
| Skills | 15問 | スラッシュコマンド、カスタムスキル |
| Tools | 15問 | Read, Edit, Bash, Glob, Grepなどのツール |
| Commands | 15問 | CLIコマンド、フラグ、設定 |
| Extensions | 15問 | MCP、Hooks、サブエージェント |
| Session | 10問 | セッション管理、履歴、コンテキスト |
| Keyboard | 10問 | ショートカット、Vimモード |
| Best Practices | 5問 | 効果的な使い方、ベストプラクティス |

### その他の機能
- **進捗トラッキング**: 回答履歴、正答率、連続学習日数を記録
- **エクスポート/インポート**: 学習データのバックアップ・復元
- **タイマー**: 制限時間モードでの残り時間表示
- **キーボード操作**: 矢印キー、数字キー、Enterで操作可能
- **AIプロンプト生成**: 間違えた問題をClaude等で深掘りするためのプロンプトをコピー

## インストール

### 必要環境
- Node.js 18以上
- npm または yarn

### セットアップ

```bash
# リポジトリをクローン
git clone git@github.com:ip-san/claude-code-quiz-desktop.git
cd claude-code-quiz-desktop

# 依存パッケージをインストール
npm install
```

## 実行方法

### 開発モード

```bash
npm run dev
```

Vite開発サーバーが起動し、Electronウィンドウが開きます。ホットリロードが有効なので、コードを変更すると自動的に反映されます。

### プロダクションビルド

```bash
# ビルド
npm run build

# macOS用DMGパッケージが release/ に生成される
```

### プレビュー（ビルド後の確認）

```bash
npm run preview
```

## 問題のメンテナンス

### 問題ファイルの構造

問題は `src/data/questions/` ディレクトリにカテゴリごとに分かれています：

```
src/data/questions/
├── index.ts          # 全問題を集約
├── memory.ts         # Memoryカテゴリ
├── skills.ts         # Skillsカテゴリ
├── tools.ts          # Toolsカテゴリ
├── commands.ts       # Commandsカテゴリ
├── extensions.ts     # Extensionsカテゴリ
├── session.ts        # Sessionカテゴリ
├── keyboard.ts       # Keyboardカテゴリ
└── bestpractices.ts  # Best Practicesカテゴリ
```

### 問題の形式

各問題は以下の形式で定義されています：

```typescript
{
  id: 'memory-001',              // ユニークID（カテゴリ-連番）
  category: 'memory',            // カテゴリID
  difficulty: 'intermediate',    // beginner | intermediate | advanced
  question: '問題文をここに記述',
  options: [
    {
      text: '選択肢1',
      wrongFeedback: '不正解時に表示するフィードバック（正解の選択肢には不要）'
    },
    {
      text: '選択肢2（正解）'
      // wrongFeedbackは不要
    },
    // ... 4つの選択肢
  ],
  correctIndex: 1,               // 正解の選択肢のインデックス（0始まり）
  explanation: '正解の解説。なぜその答えが正しいのかを詳しく説明',
  referenceUrl: 'https://docs.anthropic.com/...',  // 公式ドキュメントへのリンク（任意）
  aiPrompt: 'AIに質問する際の追加プロンプト（任意）'
}
```

### 新しい問題を追加する

1. 該当カテゴリのファイル（例: `src/data/questions/memory.ts`）を開く
2. 配列に新しい問題オブジェクトを追加
3. IDはユニークになるよう連番を更新

```typescript
// memory.ts
export const memoryQuestions: QuizItem[] = [
  // 既存の問題...

  // 新しい問題を追加
  {
    id: 'memory-016',
    category: 'memory',
    difficulty: 'advanced',
    question: '新しい問題文',
    options: [
      { text: '選択肢A', wrongFeedback: 'Aが不正解な理由' },
      { text: '選択肢B', wrongFeedback: 'Bが不正解な理由' },
      { text: '選択肢C' },  // 正解
      { text: '選択肢D', wrongFeedback: 'Dが不正解な理由' },
    ],
    correctIndex: 2,
    explanation: 'この問題の解説...',
    referenceUrl: 'https://docs.anthropic.com/...',
  },
]
```

### 新しいカテゴリを追加する

1. `src/data/questions/` に新しいファイルを作成（例: `newcategory.ts`）
2. `src/data/questions/index.ts` でエクスポートを追加
3. `src/config/quizConfig.ts` の `CATEGORIES` 配列にカテゴリ定義を追加

```typescript
// quizConfig.ts
export const CATEGORIES: CategoryConfig[] = [
  // 既存のカテゴリ...
  {
    id: 'newcategory',
    name: '新カテゴリ',
    icon: '🆕',
    color: 'purple',
  },
]
```

### JSONファイルからのインポート

アプリ内の「インポート」ボタンから、外部のJSONファイルを読み込むこともできます。形式は `example-quiz.json` を参照してください。

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

## 技術スタック

- **Electron**: デスクトップアプリケーションフレームワーク
- **Vite**: ビルドツール
- **React**: UIライブラリ
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: スタイリング
- **Zustand**: 状態管理
- **Zod**: ランタイムバリデーション

## ライセンス

MIT

## 貢献

Issue や Pull Request は歓迎です。問題の追加・修正、機能改善など、お気軽にどうぞ。
