# 利用履歴レコメンド機能

Claude Code のセッション履歴を解析し、その日の作業内容に基づいたクイズ問題を自動レコメンドする機能。

## 概要

ユーザーが Claude Code で実際に使った機能・トピックを解析し、以下の2種類のレコメンドを生成する：

1. **使った機能の復習** — 今日のセッションでよく使ったカテゴリから5問ずつ（最大3カテゴリ）
2. **使っていない機能の発見** — 今日使わなかったカテゴリから初級問題3問ずつ（最大2カテゴリ）

## アーキテクチャ

```
Claude Code セッション（複数プロジェクト・複数同時並行）
  ↓ SessionStart hook（今日の全セッション一括スキャン）
  ↓ SessionEnd hook（終了セッション個別収集）
  ↓
~/.claude-quiz-recommend/
├── sessions/2026-04-03.json   ← 日別マージ済みデータ
└── latest-recommend.json      ← 最新のレコメンド（ID + URL + トピック）
  ↓
Desktop アプリ起動時に自動読込 → レコメンドカードを即表示
  or
bun run recommend → CLI で URL 生成 → PWA でクイズ開始
```

## データ収集

### 収集スクリプト: `scripts/collect-session.mjs`

セッション JSONL を解析して以下を抽出する：

| データ | 収集方法 |
|--------|---------|
| ツール使用 | `tool_use` メッセージから `name` を集計 |
| ユーザープロンプト | `type: "user"` メッセージの `content` |
| Bash コマンド | `tool_use` の `input.command` |
| トピック検出 | プロンプト内のキーワードマッチ（11トピック） |
| カテゴリスコア | キーワード出現回数で8カテゴリをスコアリング |

### 収集タイミング

| タイミング | トリガー | モード |
|-----------|---------|-------|
| SessionStart | hook (async) | `--scan-all-today`: 今日の全セッションを一括再スキャン |
| SessionEnd | hook (async) | 単一セッション追記（重複は session ID で排除） |
| CLI 手動 | `bun run recommend` | 直近N日分を解析 |

### 複数セッションのマージ

同日に複数のプロジェクト・複数のセッション（開きっぱなし含む）で作業した場合、全てが `sessions/{date}.json` にマージされる：

- **ツール使用**: 全セッションの合計
- **カテゴリスコア**: 全セッションの合計
- **トピック**: 最大ヒット数
- **プロンプトサンプル**: 各セッションから最新3件、合計10件まで

## セットアップ

### CLI（開発者向け）

```bash
bun run setup:hooks          # ~/.claude/settings.json にフックを追加
bun run setup:hooks --remove # フックを削除
```

### Desktop アプリ（エンドユーザー向け）

初回起動時にセットアップバナーが表示される。「有効にする」をタップするだけ。

## レコメンドのロジック

### カテゴリスコアリング

8カテゴリ × キーワードリスト（各5〜10語）でプロンプト全文をスキャン：

| カテゴリ | キーワード例 |
|---------|------------|
| memory | CLAUDE.md, /memory, /init, @import |
| skills | SKILL.md, /batch, /loop, frontmatter |
| tools | Read, Write, Edit, Bash, Grep, Glob |
| commands | /compact, /clear, /branch, --bare |
| extensions | MCP, hook, plugin, subagent, Agent |
| session | コンテキスト, token, compact, worktree |
| keyboard | Ctrl+, Shift+, Esc, vim |
| bestpractices | plan mode, verify, test, IMPORTANT |

### トピック検出

11トピック × キーワードリスト でより具体的な作業内容を検出：

CLAUDE.mdの書き方、コンテキスト管理、MCP、Hooks、サブエージェント、Skills、デバッグ、テスト、CI/CD、セキュリティ、コスト管理

### フレンドリーなフィードバック

各カテゴリに「使った場合」「使わなかった場合」の2種類のメッセージを用意（16パターン）。トピック検出結果で更に具体化。

例：
- 「MCPに取り組んでいたようです。関連知識を確認しましょう」
- 「ショートカットを覚えると、マウスなしで爆速操作ができます」

## GA4 トラッキング

イベント `usage_recommend`:
- `recommend_action`: analyze / view_list / start_quiz
- `top_categories`: 上位3カテゴリ
- `question_count`: レコメンド問題数

## ファイル一覧

| ファイル | 役割 |
|---------|------|
| `scripts/collect-session.mjs` | セッション収集（hook から呼ばれる） |
| `scripts/recommend.mjs` | CLI レコメンド生成 |
| `scripts/setup-hooks.mjs` | グローバルフックセットアップ |
| `src/components/Menu/UsageRecommend.tsx` | Desktop UI コンポーネント |
| `electron/main.ts` | IPC ハンドラー (analyzeUsage, getCachedRecommend, setupGlobalHooks) |
