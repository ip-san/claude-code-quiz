# ドキュメント

Claude Code Quiz プロジェクトのドキュメント一覧。

## 読書ガイド

目的に合わせて、以下の順序で読むことを推奨します。

### 初めてプロジェクトに触る人

1. [インストールガイド](INSTALLATION.md) — 環境構築とビルド
2. [開発ガイド](DEVELOPMENT.md) — 開発サーバー起動、テスト、コードスタイル
3. [アーキテクチャ](ARCHITECTURE.md) — DDD レイヤー構成、PWA / Electron の仕組み

### 設計思想を理解したい人

1. [設計判断の記録](decisions.md) — なぜ DDD か、なぜ GTM 経由か、なぜ MCP か（8 つの ADR）
2. [アーキテクチャ](ARCHITECTURE.md) — 構成図とコード例

### クイズを追加・編集する人

1. [クイズ管理](QUIZ_MANAGEMENT.md) — データ構造、追加手順、スキルによる自動生成・検証
2. [インポートテスト](IMPORT_TESTING_CHECKLIST.md) — インポート機能のテストチェックリスト

### アナリティクスを理解・運用する人

1. [アナリティクス セットアップ](analytics-setup.md) — GA4 + GTM + GCP の初期設定
2. [イベント定義](analytics-events.md) — 全イベントのパラメータと送信元
3. [API・MCP 運用ガイド](analytics-api-guide.md) — GTM/GA4 の API 管理と MCP サーバーの使い方

### 品質自動化を理解する人

1. [品質改善ループ](quality-loop.md) — GA4 分析 → レビュー → クイズ生成 → 検証の自動サイクル
2. [自動化ツール一覧](automation.md) — スキル、スクリプト、CI/CD の全体像

## 全ドキュメント一覧

### プロジェクト基盤

| ドキュメント | 内容 |
|-------------|------|
| [設計判断の記録](decisions.md) | 主要な技術選定・アーキテクチャ判断の背景と理由 |
| [アーキテクチャ](ARCHITECTURE.md) | DDD レイヤー構成、PWA / Electron、状態管理、セキュリティ |
| [開発ガイド](DEVELOPMENT.md) | セットアップ、開発サーバー、テスト、デバッグ |
| [インストールガイド](INSTALLATION.md) | Electron デスクトップアプリのビルドとインストール |

### クイズコンテンツ

| ドキュメント | 内容 |
|-------------|------|
| [クイズ管理](QUIZ_MANAGEMENT.md) | データ構造、追加・編集手順、自動生成・検証スキル |
| [インポートテスト](IMPORT_TESTING_CHECKLIST.md) | インポート機能の手動テストチェックリスト |

### アナリティクス

| ドキュメント | 内容 |
|-------------|------|
| [セットアップ](analytics-setup.md) | GA4 プロパティ作成、GTM コンテナ作成、GCP サービスアカウント |
| [イベント定義](analytics-events.md) | 全イベントのパラメータ、送信元、分析用途 |
| [API・MCP 運用](analytics-api-guide.md) | GTM API デプロイ、GA4 ディメンション登録、MCP サーバーの使い方 |

### 品質自動化

| ドキュメント | 内容 |
|-------------|------|
| [品質改善ループ](quality-loop.md) | GA4 分析 → コードレビュー → クイズ生成 → 検証の自動サイクル |
| [自動化ツール一覧](automation.md) | スキル、スクリプト、CI/CD パイプラインの全体像 |

## 関連リソース

- [CLAUDE.md](../CLAUDE.md) — プロジェクトの全体仕様（Claude Code が参照する指示書）
- [gtm/README.md](../gtm/README.md) — GTM クイックリファレンス
- `.claude/skills/` — Claude Code スキル定義（quality-loop, quiz-refine, analytics-insight 等）
