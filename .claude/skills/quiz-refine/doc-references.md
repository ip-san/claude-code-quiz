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
| LLM ゲートウェイ選定・比較 | `gateways` | Claude apps gateway vs 自前ゲートウェイの選択 |
| LLM ゲートウェイ接続設定 | `llm-gateway-connect` | 資格情報変数・base URL 設定手順 |
| LLM ゲートウェイ プロトコル・API仕様 | `llm-gateway-protocol` | attribution block・API formats・feature pass-through・model discovery |
| LLM ゲートウェイ全社展開 | `llm-gateway-rollout` | ロールアウト手順・forceLoginMethod等の配布時制約 |
| Linux デスクトップアプリ | `desktop-linux` | apt インストール・Linux ベータの制限 |
| WSL デスクトップアプリ | `desktop-wsl` | WSL セッションの制限・管理対象デバイス |
| プロバイダ別機能可用性 | `feature-availability` | サブスクリプション/プロバイダ別の機能対応表 |
| Claude apps gateway（セルフホスト） | `claude-apps-gateway` | OIDCサインイン・要件・enforced設定・availability |
| 企業向けプロセスラウンチャー | `corporate-launcher` | `CLAUDE_CODE_PROCESS_WRAPPER`のラウンチャー契約 |
| アクセシビリティ | `accessibility` | スクリーンリーダーモード・拡大鏡・キーボード操作支援 |
| モバイルアプリ（クラウドセッション/Remote Control/Dispatch） | `mobile` | スマホからのセッション操作・プッシュ通知・ローカル限定コマンド |
| Claude apps gateway の設定ファイル仕様 | `claude-apps-gateway-config` | `gateway.yaml` の各セクション・アップストリームのフェイルオーバー仕様 |
| Claude apps gateway の支出上限管理 | `claude-apps-gateway-spend-limits` | spend limits の設定・enforcement・Admin API |
| デスクトップアプリの iOS Simulator 連携 | `desktop-ios-simulator` | ローカル限定・デバイス許可とパーミッションモードの使い分け・デバイスライフサイクル |

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
  - Cloud & Gateway (2026-07-16 追加): gateways, llm-gateway-connect, desktop-linux, desktop-wsl, feature-availability
  - Cloud & Gateway (2026-07-17 追加): llm-gateway-protocol, llm-gateway-rollout, claude-apps-gateway, corporate-launcher, accessibility
  - Cloud & Gateway (2026-07-18 追加): mobile, claude-apps-gateway-config, claude-apps-gateway-spend-limits
  - Cloud & Gateway (2026-07-22 追加): desktop-ios-simulator
  - Cloud & Gateway (2026-08-03 追加): claude-security, glossary, cloud-environments, claude-apps-gateway-on-aws
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
