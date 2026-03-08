# Doc References — プロジェクト固有のドキュメント参照データ

> このファイルは検証で使用する **URL マッピング・アンカー・用語リスト** など、
> ドキュメント構成の変化に伴い更新が必要な時点データです。

## referenceUrl マッピング（機能別の推奨ページ）

以下は実際の検証から得られた推奨マッピング。referenceUrl が正しいページを指しているか確認する際に使用する。

| 機能カテゴリ | 推奨ページ | 備考 |
|-------------|-----------|------|
| 環境変数（`BASH_DEFAULT_TIMEOUT_MS`, `CLAUDE_CODE_SHELL_PREFIX` 等） | `settings` | `how-claude-code-works` ではない |
| CLIワークフロー（パイプ `\|`, CI/CD, Gitコミット, fork-session） | `common-workflows` | |
| 組み込みスラッシュコマンド（`/login`, `/compact`, `/model` 等） | `interactive-mode` | |
| Claude Codeのコア動作（ツールカテゴリ・Compact Instructions・セッション管理・アジェンティックループ） | `how-claude-code-works` | 非常に包括的なページ。安易に「不足」とflagしないこと |
| ベストプラクティス・スケールアップ（CLAUDE.md書き方・サブエージェント活用・並列実行・Plan Mode） | `best-practices` | |
| 「Delegate, don't dictate」（委任 vs 指示のアプローチ論） | `how-claude-code-works` | `best-practices` ではない |
| CLAUDE.md の刈り込み指針 | `best-practices` | `memory` ではなく "Write an effective CLAUDE.md" セクション |
| セッションピッカーのキーバインド・フォーク済みセッションのグループ化 | `common-workflows` | "Use the session picker" セクション |
| 画像添付・クリップボード操作（ドラッグ＆ドロップ、`Ctrl+V`） | `interactive-mode` | `how-claude-code-works` ではない |
| プラン/プラットフォーム限定コマンド（`/teleport` 等） | `interactive-mode` | |
| Hook ワークフロー・ユースケース | `hooks-guide` | `hooks`（リファレンス）と使い分け |
| プラグイン作成 | `plugins` | `discover-plugins`（利用側）とは別 |
| プラグインAPI・設定キー | `plugins-reference` | プラグインの詳細仕様 |
| プラグインマーケットプレイス | `plugin-marketplaces` | マーケットプレイス構築 |
| エージェントチーム・オーケストレーション | `agent-teams` | `sub-agents`（個別エージェント）とは別 |
| ヘッドレス/プログラマティック実行 | `headless` | SDK/CI での非対話利用 |
| キーバインドカスタマイズ | `keybindings` | `interactive-mode`（デフォルトキー）とは別 |
| 出力スタイル | `output-styles` | 出力形式のカスタマイズ |
| ステータスライン | `statusline` | ターミナルステータスラインのカスタマイズ |
| ターミナル設定 | `terminal-config` | ターミナル最適化 |
| 高速モード | `fast-mode` | 応答速度の最適化 |
| VS Code 固有機能 | `vs-code` | @メンション、インラインdiff等 |
| JetBrains 固有機能 | `jetbrains` | JetBrains プラグイン |
| デスクトップアプリ固有機能 | `desktop` | ビジュアルdiff、スケジュール等 |
| Chrome 拡張 | `chrome` | ウェブデバッグ統合 |
| Slack 統合 | `slack` | Slack ボット連携 |
| GitHub Actions | `github-actions` | GH Actions でのCI/CD |
| GitLab CI/CD | `gitlab-ci-cd` | GitLab でのCI/CD |
| スケジュールタスク | `scheduled-tasks` | 定期実行 |
| リモートコントロール | `remote-control` | 別デバイスからの継続 |
| サーバー管理設定 | `server-managed-settings` | エンタープライズ設定管理 |
| 開発コンテナ | `devcontainer` | Dev Container 設定 |

### referenceUrl の危険パターン

- `overview` / `quickstart` は特定機能を問う問題の referenceUrl として不適切なことが多い
- これらが referenceUrl になっている問題は優先的に確認し、機能専用ページへの修正を検討すること

## 有効なドメインとパス

- `https://code.claude.com/docs/en/{page}` — 43ページ:
  - Core: overview, quickstart, settings, memory
  - Interactive: interactive-mode, how-claude-code-works
  - Extensions: mcp, hooks, hooks-guide, discover-plugins, plugins, plugins-reference, plugin-marketplaces, sub-agents, agent-teams, skills
  - Advanced: common-workflows, checkpointing, best-practices, model-config, sandboxing, headless
  - Customization: keybindings, output-styles, statusline, terminal-config, fast-mode
  - Platforms: vs-code, jetbrains, desktop, chrome, slack
  - CI/CD: github-actions, gitlab-ci-cd, scheduled-tasks, remote-control
  - Enterprise: server-managed-settings, devcontainer
  - Supplementary: permissions, cli-reference, setup, features-overview, desktop-quickstart, authentication
- `https://platform.claude.com/docs/en/agent-sdk/overview` — Agent SDK 関連

### ページリスト同期チェック（新規ドキュメントページ追加時）

ドキュメントページを追加・削除した場合、以下の4箇所を同期更新すること:

1. **このファイル** (`doc-references.md`): 上記の43ページリスト
2. **`generate-quiz-data/SKILL.md`**: ページ数とカテゴリ→ドキュメントマッピング表
3. **`scripts/quiz-constants.mjs`**: `CATEGORY_DOC_MAP` と `SUPPLEMENTARY_DOCS`
4. **`src/infrastructure/validation/quizContentQuality.test.ts`**: `VALID_DOC_PAGES` 配列

いずれか1つだけ更新すると、検証カバレッジに漏れが生じる。

### 補足参照ページ（referenceUrl には使用不可だがファクトチェックに有用）

- `https://code.claude.com/docs/en/permissions` — パーミッション設定の完全リファレンス。`defaultMode` 有効値の完全リスト、パーミッションルール構文、managed-only設定の詳細
- `https://code.claude.com/docs/en/setup` — インストール・アップデート詳細
- `https://code.claude.com/docs/en/features-overview` — 機能一覧ページ
- `https://code.claude.com/docs/en/desktop-quickstart` — デスクトップアプリ導入ガイド
- `https://code.claude.com/docs/en/authentication` — 認証方法

## 既知の正しいアンカー

> ドキュメント更新で変わりうるため、検証時に WebFetch で再確認すること。

### memory ページ（2026-03-01 確認済み、ページ大幅再構成後）

- `#import-additional-files`（`@` インポート関連）
- `#choose-where-to-put-claudemd-files`（メモリ階層・スコープ関連）
- `#view-and-edit-with-memory`（`/memory` コマンド関連）
- `#how-claudemd-files-load`（サブディレクトリ検索・ロード順関連）
- `#user-level-rules`（ユーザールール関連）
- `#path-specific-rules`

**無効な古いアンカー（ページ再構成で消滅）:**
`#claudemd-imports`, `#determine-memory-type`, `#directly-edit-memories-with-memory`, `#how-claude-looks-up-memories`

### skills ページ

- `#run-skills-in-a-subagent`（サブエージェント実行関連）

## バッククォート対象用語リスト

以下のカテゴリに属する用語は、question・options・explanation・wrongFeedback 内でバッククォートで囲む。

### ツール名
`Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `WebFetch`, `WebSearch`, `NotebookEdit`, `AskUserQuestion`, `Task`, `TodoWrite`

### Hook イベント名
`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `Stop` 等

### ファイルパス
`settings.json`, `CLAUDE.md`, `CLAUDE.local.md`, `.mcp.json`, `managed-mcp.json`, `.claude/settings.json`, `~/.claude/settings.json`

### 設定キー
`permissions.allow`, `permissions.deny`, `output_mode`, `run_in_background`, `old_string`, `new_string`, `edit_mode`, `autoMemoryEnabled` 等

### 環境変数
`ALL_CAPS_WITH_UNDERSCORES` パターン（例: `CLAUDE_CODE_EFFORT_LEVEL`, `BASH_DEFAULT_TIMEOUT_MS`）

### スラッシュコマンド
`/compact`, `/clear`, `/resume`, `/memory`, `/model`, `/doctor`, `/init`, `/rewind` 等

### CLI フラグ
`--dangerously-skip-permissions`, `--from-pr`, `--continue`, `--worktree` 等

### 技術用語
`ripgrep`, `bypassPermissions`, `acceptEdits`, `dontAsk`, `JSON-RPC`, `stdio`, `SSE`, `mTLS`
