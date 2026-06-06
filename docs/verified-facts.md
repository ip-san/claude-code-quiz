# Verified Facts — Claude Code ドキュメント照合済み事実

このファイルはチーム共有用の Verified Facts アーカイブです。クイズ内容の正確性を担保するための「ドキュメント照合済み事実」を集約しています。

**運用:**
- 個人ローカルの `~/.claude/projects/.../MEMORY.md` と対で更新する
- `/quality-loop --monthly` が drift を検出したら両方を更新
- 問題追加・修正時はこのファイルを参照（一次ソースは公式ドキュメント）

**最終更新:** 2026-06-06（10エージェント正解妥当性監査、正解の doc ドリフト/事実誤り 12問を修正。下記「2026-06-06 正解妥当性監査」参照）

---

### 2026-06-06 正解妥当性監査で確定した事実（正解そのものの誤り/ドリフトを修正）

| トピック | 正しい事実（現行 doc） | 出典 | 旧クイズ（誤）| 修正問 |
|---|---|---|---|---|
| タスクリスト表示 | `Ctrl+T` は **一度に最大5件**表示 | interactive-mode.md L304 | 「最大10件」 | key-010 |
| statusline 位置 | **Claude Code 画面下部のカスタマイズ可能なバー**（シェルスクリプト実行） | statusline.md L3 | 「ターミナルのウィンドウ/タブタイトル」 | key-031 |
| PR バッジ色 | **緑=承認/黄=レビュー待ち/赤=変更要求/グレー=ドラフトの4色**。**紫は無い**。マージ/クローズで**バッジ消失** | interactive-mode.md L317-320 | 「紫=マージ済み」を含む5色 | key-049, key-026 |
| Bash 出力超過 | デフォルト**30,000字**超で**全出力をセッションディレクトリのファイルに保存**し、Claude にパス＋先頭プレビューを渡す（上限150,000字、`BASH_MAX_OUTPUT_LENGTH`） | tools-reference.md L105 | 「中間省略（先頭末尾保持）」 | tool-027 |
| Fast モード | **Claude Opus（4.8/4.7/4.6）専用**の高速API構成（最大2.5倍）。Sonnet/Haiku不可。**非Opusから有効化すると Opus に自動切替** | fast-mode.md L3,L23 | 「同一モデルのまま・切替なし」 | ses-108 |
| /context のコンテキスト消費 | **MCP ツール定義はデフォルト遅延ロード**（ツール検索）。使うまではツール名のみ消費 | how-claude-code-works | 「MCP定義がリクエストごとに大量消費」 | ses-025 |
| autoMemoryDirectory | **任意のスコープ（user/project/local/policy/--settings）から設定可**。プロジェクト/ローカルは**ワークスペース信頼ダイアログ承認後**に有効。値は絶対パスか `~/` 始まり | memory.md L270,L278 | 「プロジェクト設定からは不可」 | mem-060 |
| モデル切替方法 | `/model`・`--model`・**`ANTHROPIC_MODEL` 環境変数**・settings.json `model` の4通り | model-config.md L33-38 | `ANTHROPIC_MODEL` を不正解扱い | cmd-065 |
| 復元/巻き戻しメニュー | **6つ**: Restore code and conversation / Restore conversation / Restore code / Summarize from here / **Summarize up to here** / Never mind | checkpointing.md L23-28 | 「5つ」 | tool-051 |
| Remote Control 同時実行 | 通常は1セッションのみ。**サーバーモード（`claude remote-control`）は `--capacity` でデフォルト最大32** | remote-control.md L46,L137 | server mode 言及なし | cmd-089 |
| Code Review 課金 | **usage credits** で別途請求（"Extra Usage" はリンクテキスト） | code-review.md | 「Extra Usage」表記 | ext-161, ses-117 |
| `/simplify` | **4つ**の並列レビューエージェント（再利用・簡素化・効率性・適切な抽象度） | commands.md L76 | （assembled は古く「3つ」）正解は4で正しい | skill-065(ok) |
| acceptEdits | mkdir/touch/mv/cp 等は自動承認、**`rm` 等の破壊的コマンドは引き続き確認** | permissions.md L32,L36 | （正しい。誤指摘を棄却）| ses-126(ok) |
| Shift+Enter ネイティブ対応 | **7種**（Ghostty/Kitty/iTerm2/WezTerm/Warp/Apple Terminal/Windows Terminal）。要 `/terminal-setup`: VS Code/Cursor/Devin Desktop/Alacritty/Zed | terminal-config.md L14-15 | （正しい。誤指摘を棄却）| key-044(ok) |

**教訓（プロセス）:**
1. **正解妥当性は incremental では漏れる** — 機能のデフォルト/仕様変更（ドリフト）は定期的に「正解そのもの」を全問監査して拾う（10エージェント並列が有効）。
2. **assembled docs に古い記述が残る** — `docs/<page>.md` 個別ファイルが正典。
3. **エージェント指摘は doc 再照合してから適用** — 選択肢を途中までしか読まない誤指摘あり（key-044/key-020/ses-126）。

## モデル・エフォート関連

### 既定モデル（プラン別、model-config.md L124-127、2026-05-31 更新）
- **Max / Team Premium / Enterprise(pay-as-you-go) / Anthropic API**: Opus 4.8
- **Claude Platform on AWS**: Opus 4.7
- **Pro / Team Standard / Enterprise(subscription seats)**: Sonnet 4.6
- **Bedrock / Vertex AI / Microsoft Foundry**: Sonnet 4.5

### `CLAUDE_CODE_EFFORT_LEVEL`（6 値、model-config.md L146-149、2026-05-31 更新）
- `low` / `medium` / `high` / `xhigh` / `max` / `auto`
- `xhigh`: **Opus 4.8 / Opus 4.7**（Opus 4.6 / Sonnet 4.6 は `high` にフォールバック）
- `max`: **Opus 4.8 / Opus 4.7 / Opus 4.6 / Sonnet 4.6**（4 モデル）
- デフォルト effort は**モデル別**: Opus 4.8 / Opus 4.6 / Sonnet 4.6 = `high`、Opus 4.7 = `xhigh`（プラン別ではない）

### `/effort ultracode` と dynamic workflows（commands.md L25 / model-config.md L149,L162、2026-06-02 確認）
- `/effort` が受け付ける値は `low` / `medium` / `high` / `xhigh` / `max` / `ultracode`（6 種。`max`・`ultracode` は session-only）
- **`ultracode` はモデルの effort レベルではなく Claude Code の設定**: `xhigh` 推論をモデルに送りつつ、substantive なタスクで dynamic workflow を自動オーケストレーションする
- 設定方法: `/effort ultracode`、または `--settings` / Agent SDK control request で `"ultracode": true`。**`effortLevel` 設定・`--effort` フラグ・`CLAUDE_CODE_EFFORT_LEVEL` では設定不可**（上記 env の 6 値に ultracode は含まれない）
- **dynamic workflow**: Claude が JavaScript スクリプトを書き、ランタイムが背景実行して数十〜数百のサブエージェントをオーケストレーション（codebase 横断バグ掃討・500ファイル移行・リサーチのソース相互検証等）。同一セッション内で resumable。`/deep-research` は bundled workflow（workflows.md）

### 1M context 対応モデル（Opus 4.6 以降 + Sonnet 4.6、model-config.md L201、2026-05-31 更新）
- **Opus 4.6 and later（Opus 4.8 / 4.7 / 4.6）/ Sonnet 4.6**
- Opus は Max / Team（Standard+Premium）/ Enterprise で 1M へ自動アップグレード。Sonnet 1M は全プランで usage credits 必要

### Extended Thinking / adaptive reasoning
- Opus 4.8 / Opus 4.7 / Opus 4.6 / Sonnet 4.6: `MAX_THINKING_TOKENS` は無視（adaptive reasoning）
- **Opus 4.7 / Opus 4.8 は常にアダプティブ**: `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` は適用されない（model-config.md「Adaptive reasoning and fixed thinking budgets」、2026-05-31 再確認）
- Opus 4.6 / Sonnet 4.6 のみ: `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` で固定思考予算（`MAX_THINKING_TOKENS`）に戻せる
- 例外: `MAX_THINKING_TOKENS=0` は全モデルで thinking を無効化

---

## Hooks

### Hook event types
- **総数: 30**（2026-06-01 再確認、`hooks.md` lifecycle table。**29→30: `MessageDisplay`**（"While assistant message text is displayed"、matcher なし・非ブロッキング）が追加。旧履歴: 26→29 で Setup / UserPromptExpansion / PostToolBatch 追加）
- 30 件: SessionStart, InstructionsLoaded, UserPromptSubmit, UserPromptExpansion, PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, PostToolBatch, PermissionDenied, Notification, MessageDisplay, Setup, SubagentStart, SubagentStop, TaskCreated, TaskCompleted, Stop, StopFailure, TeammateIdle, ConfigChange, CwdChanged, FileChanged, WorktreeCreate, WorktreeRemove, PreCompact, PostCompact, SessionEnd, Elicitation, ElicitationResult
- **Blocking events: 15**（2026-06-02 再カウントで確認、`hooks.md` "Exit code 2 behavior per event" テーブルの "Can block? = Yes" を数えた）: PreToolUse, PermissionRequest, UserPromptSubmit, UserPromptExpansion, Stop, SubagentStop, TeammateIdle, TaskCreated, TaskCompleted, ConfigChange, PostToolBatch, PreCompact, Elicitation, ElicitationResult, WorktreeCreate

### Hooks exit 2 の振る舞い
- `PreToolUse`: `hookSpecificOutput` で制御
- `PostToolUse` / `Stop`: `reason` = Claude feedback
- `UserPromptSubmit`: `reason` = "Shown to user, Not added to context"
- `Notification` / `SessionStart` etc: user display only

### `allowManagedHooksOnly`
- `true` 時: Managed + SDK hooks は許可、User/Project/Local/Plugin hooks を無効化

---

## 設定・環境変数

### CLAUDE.md / Settings のスコープ
- **Settings**: Managed > CLI > Local > Project > User
- **CLAUDE.md**: Managed > Project > User > Local（4 スコープ、`CLAUDE.local.md` はドキュメントに復帰済み）

### Managed CLAUDE.md パス
- macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
- Linux/WSL: `/etc/claude-code/CLAUDE.md`
- Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`
- `~/.claude/CLAUDE.md` は User スコープ（Managed ではない）

### 環境変数
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY`: `1`=無効化 / `0`=`--bare` や `autoMemoryEnabled: false` を上書きして強制有効化。出典: `env-vars.md:70`（2026-05-31: 旧「gradual rollout」記述は消滅、`memory.md:259` citation 無効。トグルは `autoMemoryEnabled` 設定 `memory.md:266`）
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`: `--add-dir` フラグとの**併用必須**
- `CLAUDE_CODE_SIMPLE=1`: minimal prompt、Bash/file のみ。`--mcp-config` 経由の MCP ツールは利用可
- `CLAUDE_CODE_EFFORT_LEVEL`: 上記「モデル・エフォート関連」参照
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 1-100（auto-compaction 発動閾値%）
- `CLAUDE_CODE_SHELL_PREFIX`: "for logging or auditing"（nix-shell/Docker exec ではない）
- `USE_BUILTIN_RIPGREP`: settings page に記載
- `CLAUDE_CODE_CLIENT_CERT` / `CLIENT_KEY` / `CLIENT_KEY_PASSPHRASE`: mTLS 用。出典: `env-vars.md:62-64` + `network-config.md:82-88`（settings.md には記載なし）
- `MCP_TIMEOUT`: サーバー起動タイムアウト
- `MCP_TOOL_TIMEOUT`: ツール実行タイムアウト（別変数）
- `MAX_MCP_OUTPUT_TOKENS`: default 25,000 / warning 10,000
- `BASH_MAX_TIMEOUT_MS`: モデルが設定可能な最大タイムアウト

### defaultMode 有効値（6 値）
`default` / `acceptEdits` / `plan` / `auto` / `dontAsk` / `bypassPermissions`

### Auto mode のプロバイダ可用性（2026-06-02 確認、⚠️ 公式ドキュメント間で矛盾あり）
- **changelog v2.1.158（2026-05-30）**: 「Auto mode is now available on **Bedrock, Vertex, and Foundry** for Opus 4.7 and Opus 4.8. Opt in by setting `CLAUDE_CODE_ENABLE_AUTO_MODE=1`」
- **desktop.md（未更新・旧記述）**: 「Auto mode is a research preview available to all users on the Anthropic API. **It is not available on third-party providers.** It requires Claude Opus 4.6 or later, or Sonnet 4.6」
- → 新しい changelog を優先。**third-party（Bedrock/Vertex/Foundry）でも利用可能**。クイズで「auto mode は Anthropic API 専用 / third-party 不可」とするのは古い desktop.md ベースの誤り。対象モデル差に注意（API: Opus 4.6+/Sonnet 4.6、third-party: Opus 4.7/4.8 + `CLAUDE_CODE_ENABLE_AUTO_MODE=1` オプトイン）

---

## CLI / Agent SDK

### Task → Agent リネーム（v2.1.63、SDK も統一済み 2026-05-02）
- CLI は `Agent` ツールを使う
- Agent SDK の `allowedTools` も `Agent` を使う（agent-sdk/overview に「Include `Agent` in `allowedTools` since subagents are invoked via the Agent tool」と明記、サンプルコードも `allowed_tools=["Read", "Glob", "Grep", "Agent"]`）
- 旧名の `Task` は SDK でも非推奨／不可。以前の MEMORY 「SDK は Task を使う」は outdated

### `allowed-tools` in Skills
- 許可リスト（per-use 承認なしで grant）
- リスト外のツールは通常のパーミッション設定に従う（**ブロックされない**）

### Plugin source types（5 種）
- relative path / github / url / git-subdir / npm
- `pip` は**存在しない**

### その他
- `claude commit` サブコマンドは**存在しない**
- `/teleport`（`/tp`）: スラッシュコマンドとして存在（Web セッションピッカー表示）
- `claude --teleport`: CLI フラグとしても別途存在
- `/summarize` は存在しない（`/rewind` メニュー内の "Summarize from here" に統合）
- `/todos` も commands.md から削除済み
- Agent teams: CLI と Agent SDK のみ。Desktop アプリでは**利用不可**（`desktop.md` L558 "Agent teams ... available in the CLI, not in Desktop"。Desktop は dynamic workflows で多エージェント可）
- `dontAsk` permission mode: CLI のみ。Desktop では利用不可（`desktop.md` L63）

---

## キーボード / UI

### モード切替
- `Shift+Tab`: `default` / `acceptEdits` / `plan` に加え、有効化した `auto` / `bypassPermissions` も含めてサイクル（3 つ固定ではない）
- `Alt+M`: 一部環境のみ

### ショートカット
- `Ctrl+C`: 生成キャンセルのみ（exit しない）
- `Ctrl+D`: exit
- `Ctrl+B`: bash コマンド**とエージェント**をバックグラウンド化。Tmux 環境では 2 回押して tmux prefix をバイパス
- `Ctrl+T`: Task List 表示（Claude の作業進捗 UI）

### `/terminal-setup`
- `Shift+Enter` のみ有効化
- Alt+B/F/Y/M/P は依然として「Option as Meta」ターミナル設定が必要
- `Option+T`（アダプティブ推論トグル）は **v2.1.132 以降 macOS でも「Option as Meta」設定不要**（interactive-mode.md L45 / changelog.md L65、2026-05-09 確認）

### Checkpoint restore（5 オプション）
- restore code+conv / conv only / code only / summarize / never mind

---

## MCP / Tools

### MCP SSE Transport（2026-05-31 更新: **deprecated 撤回**）
- `mcp.md` L56「Option 2: Add a remote SSE server」(`claude mcp add --transport sse`) — SSE は**有効な transport**。2026-05-31 facts-checker で "deprecated" 記述の消滅を確認（mcp.md 全体に "deprecat" 文字列ゼロ）
- HTTP（Option 1）が推奨だが SSE は**非推奨ではない**。「SSE は deprecated」とするクイズ修正提案は誤り（known-issues.md と整合）

### Tool Search
- Sonnet 4+ / Opus 4+ 必須（Haiku は未サポート）

### Sandboxing
- macOS: Seatbelt
- Linux/WSL2: bubblewrap
- ページ: `/en/sandboxing`

### `sandbox.network.allowManagedDomainsOnly`
- Denied domains は全ソースからマージ（`deniedMcpServers` とは別サブシステム）

---

## その他

### Compact Instructions
- how-claude-code-works.md に「add a 'Compact Instructions' section to CLAUDE.md」と記載

### `@import` 再帰深度（2026-06-06 確認）
- **最大深度は 4 ホップ**（"maximum depth of four hops"）。出典: EN `memory.md:73` / JA `memory#import-additional-files`「最大深度は 4 ホップです」で一致確認
- 「5階層」表記は誤り（root の CLAUDE.md を階層に数えた旧表現）。CLAUDE.md→A→B→C→D = 5ファイルだが 4 ホップ。quiz は「4ホップ」表記に統一済み（mem-002/030/043/046、2026-06-06）

### Memory page anchors（2026-03-01 確認）
- `#import-additional-files`
- `#choose-where-to-put-claudemd-files`
- `#view-and-edit-with-memory`
- `#how-claudemd-files-load`
- `#user-level-rules`
- `#path-specific-rules`

### Microsoft Foundry
- 正式名称は **Microsoft Foundry**（"Azure Foundry" は誤記）

### best-practices 強調キーワード
- `IMPORTANT` と `YOU MUST` のみドキュメント化
- `ALWAYS` / `NEVER` は明示されていない

### `spinnerVerbs.mode`
- デフォルト: `append`（`replace` ではない）

### CLI tools
- ユーザーが Claude に `--help` 使用を指示する（「自動学習」ではない）
