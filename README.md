# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
PWA でスマホ・ブラウザからいつでも学習でき、Electron デスクトップ版もあります。

**PWA:** https://ip-san.github.io/claude-code-quiz/

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
| 全体像モード | 6チャプター構成の初心者向け学習パス（修了証あり） |
| 実力テスト | 100問を60分で解く本格モード |
| カテゴリ別 | 特定のカテゴリに絞って学習 |
| ランダム20問 | 手軽に復習したい時に |
| 60秒チェック | SRS期限到来の3問を即確認 |
| 苦手克服 | 正答率の低い問題を重点的に出題 |
| 読んでから解く | 解説を先に読んでからクイズに挑戦（初心者向け） |
| 実践シナリオ | 実務シナリオに沿ってClaude Codeを学ぶ |

### 8つのカテゴリ（658問）

| カテゴリ | 問題数 | 内容 |
|---------|--------|------|
| Memory | 46問 | CLAUDE.md、@import、メモリシステム |
| Skills | 56問 | カスタムスキル、スラッシュコマンド |
| Tools | 60問 | Read, Edit, Bash, Glob, Grep |
| Commands | 91問 | CLI コマンド、フラグ |
| Extensions | 152問 | MCP、Hooks、サブエージェント、プラグイン |
| Session | 146問 | セッション管理、コンテキスト、履歴 |
| Keyboard | 43問 | ショートカット、Vim モード |
| Best Practices | 64問 | 効果的な使い方、プロンプト設計 |

### 初心者サポート

- **チュートリアル:** Claude Code の基本を4画面で紹介（初回表示、いつでも再閲覧可能）
- **チャプター導入画面:** 各チャプター開始時に学ぶ内容・実例を表示
- **読んでから解く:** 解説を先に読んでからクイズに挑戦できるモード

### その他

- 進捗トラッキング（回答履歴、正答率、連続学習日数、AI活用レベル）
- SRS（間隔反復）による効率的な復習
- 250問にアニメーション付き解説図
- キーワード検索、ブックマーク、解説リーダー
- エクスポート/インポート、修了証発行
- ダークモード、キーボード操作、スマホ最適化

## クイックスタート

### PWA（推奨）

https://ip-san.github.io/claude-code-quiz/ にアクセスするだけ。スマホのホーム画面に追加でアプリとして使えます。

### 開発

```bash
git clone git@github.com:ip-san/claude-code-quiz.git
cd claude-code-quiz
bun install

# PWA 開発サーバー
bun run dev:web

# Electron 開発サーバー
bun run dev
```

### ビルド

```bash
# PWA ビルド（dist-web/ に出力）
bun run build:web

# Electron ビルド（release/ に出力）
bun run build
```

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | React + TypeScript + Vite + Tailwind CSS + Zustand |
| 配信 | PWA / GitHub Pages（メイン）+ Electron（デスクトップ） |
| アナリティクス | GTM + GA4 + MCP サーバー |
| テスト | Vitest（378テスト）+ Playwright E2E（18テスト） |
| バリデーション | Zod スキーマ |
| CI/CD | GitHub Actions → GitHub Pages 自動デプロイ |

## 品質の自動化

Claude Code のスキル機能を使って、品質改善を自動化しています。

```
GA4（PWAユーザーの行動データ）
  ↓ MCP 経由で取得
/analytics-insight（ユーザー行動分析）
  ↓
/code-review（コード品質レビュー）
  ↓
/generate-quiz-data（不足カテゴリの問題を自動生成）
  ↓
/quiz-refine（公式ドキュメントと照合・修正）
  ↓
GitHub Actions → GitHub Pages → PWA 自動配信
```

`/quality-loop` で一括実行。`/loop 1h /quality-loop` で定期実行も可能。

詳細は [docs/quality-loop.md](docs/quality-loop.md) を参照。

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [アナリティクス セットアップ](docs/analytics-setup.md) | GTM + GA4 + GCP の設定手順 |
| [イベント定義](docs/analytics-events.md) | 計測イベントとデータフロー |
| [品質改善ループ](docs/quality-loop.md) | 自動化された改善サイクルの仕組み |
| [自動化ツール一覧](docs/automation.md) | スクリプト・MCP・CI/CD の全体像 |

## ライセンス

MIT

## 貢献

Issue や Pull Request は歓迎です。問題の追加・修正、機能改善など、お気軽にどうぞ。
