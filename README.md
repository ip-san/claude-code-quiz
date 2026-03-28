# Claude Code Quiz

Claude Code の機能と使い方を学習するためのクイズアプリケーション。
PWA でスマホ・ブラウザからいつでも学習でき、Electron デスクトップ版もあります。

**PWA:** https://ip-san.github.io/claude-code-quiz/

<img src="build/icon.svg" alt="Claude Code Quiz" width="64" height="64">

## なぜ AI コーディングツールの「学習」が必要なのか

Claude Code を導入しても、チームが使いこなせなければ投資対効果は出ません。

多くの組織が直面する課題:
- **ツールを入れたが使われない** — 「何ができるか」を知らないので、従来の手作業に戻ってしまう
- **一部のメンバーだけが詳しい** — 属人化が進み、チーム全体の生産性は上がらない
- **公式ドキュメントを読む時間がない** — 日々の業務に追われ、体系的な学習機会がない

このアプリは、**スマホで1日5分、クイズに答えるだけ**で Claude Code の機能を体系的に習得できるツールです。

「覚える」のではなく、**脳内インデックス**を作ることが目的です。「こういう機能があったはず」「確かあのコマンドで...」と思い出せれば、必要な時にすぐ調べられます。**アクティブリコール（能動的な想起）** と **間隔反復（SRS）** の学習理論に基づき、効率的に知識を定着させます。

**導入のハードル:**
- URL を共有するだけ（PWA なのでインストール不要）
- AI の知識ゼロから始められる初心者向けガイド付き
- 進捗・正答率を可視化。チーム全体の習熟度を把握可能

## 問題品質へのこだわり

クイズアプリにおいて最も重要なのは問題の正確さです。Claude Code は頻繁にアップデートされるため、昨日正しかった情報が今日は古くなっている可能性があります。

このアプリでは、**問題の品質維持を自動化**しています:

1. **公式ドキュメントとの自動照合** — Claude Code のスキル（`/quiz-refine`）が公式ドキュメントを読み込み、全問題の事実関係を検証。ドキュメントが更新されれば、影響を受ける問題を自動検出して修正します。

2. **ユーザー行動に基づく改善** — GA4 で収集した学習データ（正答率、離脱率、モード利用状況）を MCP 経由で分析し、正答率が極端に低い問題の見直しや、利用頻度の高い分野への問題追加を行います。

3. **継続的な品質ループ** — これらを `/quality-loop` という1つのコマンドにまとめ、定期的に実行。分析 → レビュー → 生成 → 検証 → デプロイのサイクルが自動で回り続けます。

つまり、**このアプリの問題は「作って終わり」ではなく、公式ドキュメントの変更とユーザーの学習状況の両面から常に改善され続けています。**

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

### アプリケーション

| パッケージ | 用途 |
|-----------|------|
| [React](https://react.dev/) 18 | UI フレームワーク |
| [TypeScript](https://www.typescriptlang.org/) 5 | 型安全な開発 |
| [Vite](https://vite.dev/) 5 | ビルドツール + 開発サーバー |
| [Tailwind CSS](https://tailwindcss.com/) 3 | ユーティリティファーストの CSS |
| [Zustand](https://zustand.docs.pmnd.rs/) 4 | 軽量な状態管理 |
| [Zod](https://zod.dev/) 3 | スキーマバリデーション |
| [Lucide React](https://lucide.dev/) | アイコンライブラリ |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA / Service Worker 生成 |

### 配信

| 技術 | 用途 |
|------|------|
| GitHub Pages | PWA ホスティング（メイン） |
| [Electron](https://www.electronjs.org/) 31 | デスクトップアプリ |
| GitHub Actions | CI/CD（自動ビルド・デプロイ） |

### アナリティクス

| パッケージ / サービス | 用途 |
|---------------------|------|
| Google Tag Manager | タグ管理（イベント → GA4 ルーティング） |
| Google Analytics 4 | ユーザー行動データの収集・分析 |
| [@google-analytics/data](https://www.npmjs.com/package/@google-analytics/data) | GA4 Data API（MCP サーバーから利用） |
| [@google-analytics/admin](https://www.npmjs.com/package/@google-analytics/admin) | GA4 カスタムディメンション自動登録 |
| [google-auth-library](https://www.npmjs.com/package/google-auth-library) | GCP サービスアカウント認証（GTM API） |

### テスト・品質

| パッケージ | 用途 |
|-----------|------|
| [Vitest](https://vitest.dev/) 4 | ユニットテスト（394テスト） |
| [Playwright](https://playwright.dev/) | E2E + Visual Regression テスト（18テスト） |
| [Biome](https://biomejs.dev/) | Lint + フォーマッター |
| [type-coverage](https://github.com/nicolo-ribaudo/type-coverage) | TypeScript 型カバレッジ（99.5%） |
| [knip](https://knip.dev/) | 未使用コード・依存の検出 |
| [jscpd](https://github.com/kucherenko/jscpd) | コードクローン検出 |

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
