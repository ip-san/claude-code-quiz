# Claude Code Quiz Desktop

Claude Code の機能と使い方を効率的に学習するためのデスクトップクイズアプリケーションです。

<img src="build/icon.svg" alt="Claude Code Quiz" width="64" height="64">

## 作成のモチベーション

Claude Code を勉強しています。

最近は「覚えるよりも調べる能力が大事」「AIに聞けばいい」とよく言われます。それは正しいと思います。しかし、調べるにしてもAIに聞くにしても、**何を調べればいいのか**、**何を聞けばいいのか**がわからなければ始まりません。

公式ドキュメントの内容を一通り頭に入れている人は強いと感じます。全てを暗記している必要はありませんが、「こういう機能があったはず」「確かあのコマンドで...」という**脳内インデックス**があれば、必要な時にすぐ調べられるし、AIにも的確な質問ができます。

**アクティブリコール（能動的な想起）** と **スペーシング効果（分散学習）** を活用し、繰り返し問題を解くことで脳内インデックスを構築する。間違えた問題を重点的に出題する「苦手問題モード」で、効率的に知識を定着させる。そんなツールです。

## 機能

### クイズモード

| モード | 説明 |
|--------|------|
| 全問チャレンジ | 100問を60分で解く本格モード |
| カテゴリ別 | 特定のカテゴリに絞って学習 |
| ランダム20問 | 手軽に復習したい時に |
| 苦手問題 | 正答率の低い問題を重点的に出題 |
| カスタム | カテゴリと難易度を自由に組み合わせ |

### 8つのカテゴリ（448問）

| カテゴリ | 問題数 | 内容 |
|---------|--------|------|
| Memory | 31問 | CLAUDE.md、メモリシステム |
| Skills | 34問 | カスタムスキル、スラッシュコマンド |
| Tools | 46問 | Read, Edit, Bash, Glob, Grep |
| Commands | 63問 | CLI コマンド、フラグ |
| Extensions | 110問 | MCP、Hooks、サブエージェント |
| Session | 93問 | セッション管理、履歴 |
| Keyboard | 26問 | ショートカット、Vim モード |
| Best Practices | 45問 | 効果的な使い方 |

### その他

- 進捗トラッキング（回答履歴、正答率、連続学習日数）
- エクスポート/インポート
- タイマー表示
- キーボード操作対応
- AI プロンプト生成機能

## クイックスタート

### インストール

```bash
git clone git@github.com:ip-san/claude-code-quiz-desktop.git
cd claude-code-quiz-desktop
npm install
```

### 開発モード

```bash
npm run dev
```

### アプリのビルド

```bash
npm run build
```

`release/` フォルダにインストーラーが生成されます。

詳しいインストール手順は **[docs/INSTALLATION.md](docs/INSTALLATION.md)** を参照してください。

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [インストールガイド](docs/INSTALLATION.md) | ビルド、インストール、トラブルシューティング |
| [開発ガイド](docs/DEVELOPMENT.md) | 開発環境、ワークフロー、テスト |
| [アーキテクチャ](docs/ARCHITECTURE.md) | 設計思想、技術スタック、セキュリティ |
| [クイズ管理](docs/QUIZ_MANAGEMENT.md) | 問題の追加・編集、Claude Code スキル |

## 技術スタック

- **Electron** - デスクトップアプリケーション
- **React** + **TypeScript** - UI
- **Vite** - ビルドツール
- **Tailwind CSS** - スタイリング
- **Zustand** - 状態管理
- **Zod** - バリデーション
- **Vitest** - テスト

## Claude Code スキル

Claude Code ユーザー向けに、問題の自動生成・検証スキルを用意しています。

```bash
# 問題を自動生成
/generate-quiz-data 100

# 問題を公式ドキュメントと照合・修正
/quiz-refine
```

詳細は [docs/QUIZ_MANAGEMENT.md](docs/QUIZ_MANAGEMENT.md) を参照してください。

## ライセンス

MIT

## 貢献

Issue や Pull Request は歓迎です。問題の追加・修正、機能改善など、お気軽にどうぞ。
