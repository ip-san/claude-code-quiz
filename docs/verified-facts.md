# Verified Facts — Claude Code ドキュメント照合済み事実

このファイルはチーム共有用の Verified Facts アーカイブです。クイズ内容の正確性を担保するための「ドキュメント照合済み事実」を集約しています。

**運用:**
- 個人ローカルの `~/.claude/projects/.../MEMORY.md` と対で更新する
- `/quality-loop --monthly` が drift を検出したら両方を更新
- 問題追加・修正時はこのファイルを参照（一次ソースは公式ドキュメント）

**最終更新:** 2026-09-30（第16回: Opus 5.5 / Sonnet 5.5 リリース追従・プラグイン docs 再編、末尾参照）／ 2026-06-06（10エージェント正解妥当性監査、正解の doc ドリフト/事実誤り 12問を修正。下記「2026-06-06 正解妥当性監査」参照）

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
| acceptEdits | ~~mkdir/touch/mv/cp 等は自動承認、`rm` 等は引き続き確認~~ → **2026-09-30 更新: `mkdir`/`touch`/`rm`/`rmdir`/`mv`/`cp`/`sed` を作業ディレクトリ内で自動承認**（第18回追補参照） | permission-modes | — | ses-126 |
| Shift+Enter ネイティブ対応 | **7種**（Ghostty/Kitty/iTerm2/WezTerm/Warp/Apple Terminal/Windows Terminal）。要 `/terminal-setup`: VS Code/Cursor/Devin Desktop/Alacritty/Zed | terminal-config.md L14-15 | （正しい。誤指摘を棄却）| key-044(ok) |

**教訓（プロセス）:**
1. **正解妥当性は incremental では漏れる** — 機能のデフォルト/仕様変更（ドリフト）は定期的に「正解そのもの」を全問監査して拾う（10エージェント並列が有効）。
2. **assembled docs に古い記述が残る** — `docs/<page>.md` 個別ファイルが正典。
3. **エージェント指摘は doc 再照合してから適用** — 選択肢を途中までしか読まない誤指摘あり（key-044/key-020/ses-126）。

## モデル・エフォート関連

### 既定モデル（プラン別、model-config.md L193-196、2026-07-18 更新）
- **Max / Team Premium / Enterprise(pay-as-you-go) / Anthropic API**: Opus 4.8
- **Claude Platform on AWS / Amazon Bedrock / Google Cloud's Agent Platform**: Opus 4.8（v2.1.207 で統一。旧: AWS=Opus 4.7、Bedrock/GCP=Sonnet 4.5）
- **Pro / Team Standard / Enterprise(subscription seats)**: Sonnet 5
- **Microsoft Foundry**: Sonnet 4.5
- Fable 5 はどのアカウントタイプでもデフォルトにならない（明示選択時のみ）

### `CLAUDE_CODE_EFFORT_LEVEL`（6 値、model-config.md effort テーブル、2026-07-18 更新）
- `low` / `medium` / `high` / `xhigh` / `max` / `auto`
- `xhigh`: **Fable 5 / Sonnet 5 / Opus 4.8 / Opus 4.7**（Opus 4.6 / Sonnet 4.6 は `high` にフォールバック）
- `max`: **Fable 5 / Sonnet 5 / Opus 4.8 / Opus 4.7 / Opus 4.6 / Sonnet 4.6**（6 モデル）
- デフォルト effort は**モデル別**: Fable 5 / Sonnet 5 / Opus 4.8 / Opus 4.6 / Sonnet 4.6 = `high`、Opus 4.7 = `xhigh`（プラン別ではない）

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

### MCP SSE Transport（2026-05-31 更新: deprecated 撤回 → **2026-09-30 再更新: 現行 docs は SSE を非推奨と明記**。以下の2行は古い記録）
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

## 2026-06-10 incremental スキャン（Fable 5 ドリフト + ultracode キーワード）

### Fable 5 の docs 登場（model-config.md、2026-06-10 確認）
- **effort levels**: Fable 5 は `low/medium/high/xhigh/max` をサポート（model-config.md L198 テーブル）。**`xhigh` は Fable 5 / Opus 4.8 / Opus 4.7**（「Opus 4.8/4.7 のみ」は stale）。`max` は Fable 5 / Opus 4.8 / 4.7 / 4.6 / Sonnet 4.6
- **デフォルト effort**: `high` on Fable 5 / Opus 4.8 / Opus 4.6 / Sonnet 4.6、`xhigh` on Opus 4.7（L202）
- **アダプティブ推論**: "Opus 4.7 and later always use adaptive reasoning, **as does Fable 5**"（L238）。`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` は Fable 5 / Opus 4.7+ に不適用
- **`MAX_THINKING_TOKENS=0`**: Anthropic API 上で thinking 無効化、**ただし Fable 5 は例外（thinking を無効化できない）**（L248-250）。旧記録「全モデルで完全無効化」は stale
- **1M context**: "Fable 5, Opus 4.6 and later, and Sonnet 4.6"（L254）。Anthropic API では Fable 5 / Opus 4.8 / 4.7 は常時 1M
- **デフォルトモデル**: Fable 5 はどのアカウントタイプでもデフォルトにならない（L131）。Max/Team Premium/Enterprise PAYG/API = Opus 4.8 のまま
- **`ultracode`**: `/effort` メニューに追加。モデルの effort レベルではなく Claude Code 設定（xhigh 送信 + dynamic workflows 編成）。`effortLevel` 設定・`--effort` フラグ・`CLAUDE_CODE_EFFORT_LEVEL` には含まれない。セッション限定
- 修正適用: ses-045 / ses-102 / skill-061 / key-016 / bp-018 / cmd-104 / ses-105（WF・EXPL・diagram の xhigh/max/デフォルト記述に Fable 5 を反映）

### ワークフロートリガーキーワード変更（workflows.md L81、2026-06-10 確認）
- **v2.1.160 以降、リテラルトリガーは `ultracode`**（"Before v2.1.160 the literal trigger keyword was `workflow`"）。自然言語の依頼（"use a workflow"）は両バージョンで有効
- 誤トリガー解除: `Option+W`（macOS）/ `Alt+W`（Win/Linux）。`/config` の Ultracode keyword trigger でオフ可
- disableWorkflows 時: bundled コマンド不可 + **`ultracode` キーワード**のトリガー無効 + `/effort` から `ultracode` 削除（旧「workflow キーワード無効」は stale）
- 修正適用: bp-096（Q/WF/EXPL）、bp-098（EXPL）

### agent teams `"auto"` の split pane 条件（agent-teams.md L70、2026-06-10 確認）
- `"auto"` は「tmux セッション内」**または「ターミナルが iTerm2」**の場合に split panes。旧「tmux 内のみ」は stale → skill-076 WF0/EXPL/diagram 修正

### その他確認（2026-06-10）
- 出力スタイル変更: `/config` → Output style メニュー（`.claude/settings.local.json` に保存）。**`/config [style]` の引数形式は undocumented** → key-032 EXPL/diagram から削除
- fullscreen: `/tui fullscreen` と `CLAUDE_CODE_NO_FLICKER=1` は**等価**（バージョン条件なし）。v2.1.89/v2.1.110 の版数 claim は docs に無い → key-052 から削除
- `/clear [name]`: 「空のコンテキストで新しい会話を開始。**以前の会話は `/resume` に残る**」（commands.md L12）。「全履歴削除」表現は不正確 → cmd-066 EXPL 修正
- インストール系トラブルシュート（`Killed`/Docker ハング）は **`/troubleshoot-install` ページに移動** → cmd-096/097 referenceUrl 更新 + VALID_DOC_PAGES に `troubleshoot-install` 追加
- `/scroll-speed` 対話コマンド新設（fullscreen.md）。`CLAUDE_CODE_SCROLL_SPEED` 1〜20 は不変
- Agent SDK builtin tools 10種（Read/Write/Edit/Bash/Monitor/Glob/Grep/WebSearch/WebFetch/AskUserQuestion）✓ sdk-009 正確
- Hook イベント 30種・permissionDecision 4値・defaultMode 6値・`autoAllowBashIfSandboxed` default true・Bash 出力 30,000字/上限150,000字 — いずれも現行 docs と一致（再確認）
- prompt-caching: **effort 切替もキャッシュ無効化要因**（cache key に effort 含む）。`/reload-plugins` は full re-read 時に警告して中断（v2.1.163、`--force` で強行）
- `defaultMode`: v2.1.142 以降 `auto` は project/local settings では無視される（リポジトリの自己昇格防止、settings.md L293）

### カバレッジギャップ解消（2026-06-10 直接レビュー、agent-view.md / data-usage.md 2026-06-06 キャッシュ照合）
- **agent-view（396行の機能ページ）が完全ゼロカバーだった** → ses-191〜195 を新規追加（`claude agents` の基本 / peek・attach・detach / `/bg` の引き継ぎ / シェル管理コマンド / worktree isolation）
- **data-usage もゼロカバー** → ses-196（学習・保持ポリシー）、cmd-123（サードパーティでの `/feedback` ローカルフォールバック）を追加
- カバレッジ計上バグ修正: `agent-sdk/overview`（URL由来スラッグ）と `agent-sdk-overview`（DOC_PAGES 名）が二重計上され「NO COVERAGE」偽陽性 → `quiz-utils.mjs` に PAGE_ALIASES を追加
- `quizContentQuality.test.ts` の許可ページに `agent-view` を追加、`CATEGORY_DOC_MAP` の session に `agent-view`/`data-usage`、commands に `data-usage` を追加
- 残る未カバー7ページ（changelog / desktop-changelog / champion-kit / communications-kit / legal-and-compliance / glossary / mcp-quickstart）は意図的にスキップ: 変更履歴・マーケ資料・法務はクイズ素材不適、glossary は各ページへのリンク集で既存問題と重複、mcp-quickstart は mcp（27問）と内容重複
  <!-- validate-docs:ignore-next-line 歴史的記録（2026-06-10 時点の値、凍結）。過去に stale スキャンで 830→850→870→882 と毎ループ誤置換されたため除外 -->
- 結果: 810→817問、99→101ページカバー。1099テスト・quiz:check・check（型+lint+type-coverage 99.63%）全通過

### 2026-08-03 quiz-refine --full（8並列検証 + 判定層 Fable 5）

- **Tool Search モデル要件の drift**: 現行 mcp.md「Configure tool search」は「`tool_reference` ブロック対応モデル: **Sonnet 4.5 / Haiku 4.5 / Opus 4.5 以降**」。旧事実「Sonnet 4+/Opus 4+、Haiku 非対応」は stale（**Haiku 4.5 対応済み**）。Google Cloud's Agent Platform ではデフォルト無効 → ext-024 / tool-038 修正
- **`--cloud` が現行正式フラグ**（cli-reference.md）: `--remote` は「Deprecated alias for `--cloud`」。ses-145 は wrongFeedback が「`--cloud` は存在しない」と記述する critical（正しい知識で選ぶと不正解）→ 正解を `--cloud` に差替え、`--remote` を非推奨エイリアスの distractor 化。cmd-093 / ses-165 / bp-087 / cmd-119 の表記も `--cloud` へ更新
- **memory ページのアンカー slug 規則**: 実サイトは `CLAUDE.md` → `claude-md`（ドット→ハイフン）。`#how-claude-md-files-load` / `#choose-where-to-put-claude-md-files` / `#claude-md-vs-auto-memory` が正。quiz 7問（mem-004/012/035/045/048/054, ses-089）の referenceUrl と quiz-lint.mjs / fetch-docs.mjs の slugify を修正
- **Fast mode**: 対応は Opus 5 / Opus 4.8 のみ（Opus 4.7 は 2026-07-24 削除・API 拒否）→ ses-108 explanation 修正
- **`!` シェルモード**: v2.1.186 以降、出力がトランスクリプトに載ると Claude が追加プロンプトなしで自動応答（`respondToBashCommands: false` で旧挙動）→ cmd-002 explanation（判定層確認済み）
- **`/agents` は v2.1.198 以降パネルを開かない**（サブエージェント定義ファイル場所の通知のみ。`claude agents` とは別物、agents.md L41）→ ext-182 修正
- **`/workflows` は監視・管理コマンド**（watch/pause/resume/save）であり実行開始コマンドではない → bp-095 wrongFeedback 修正
- **prompt-caching**: Microsoft Foundry のキャッシュ保存場所はデプロイの hosting option 依存（Azure ホスト型=Azure、Anthropic ホスト型=Anthropic）→ sdk-016 修正
- **check-tools の記載は cloud-environments.md へ移動**（claude-code-on-the-web はリンクのみ）。Installed tools: Node.js 20/21/22（nvm）、PHP 8.4 等 → bp-066 referenceUrl + diagram 修正
- **CLAUDE_CODE_SCROLL_SPEED**: 正の値・上限 20（0.25 など 1 未満の小数も可）。`/scroll-speed` 対話コマンドあり → key-054 修正
- **/terminal-setup 対象**: VS Code / Cursor / **Devin Desktop** / Alacritty / Zed（旧 Windsurf は Devin Desktop に置換）
- **agent-sdk-overview はページ簡略化**: ビルトインツールの個別列挙が消失（「Read, write, edit files, run commands, and search the web」概要のみ）。「10種」断定は不可 → sdk-009 diagram をヘッジ表現に修正
- **xhigh 帰属**: Opus 4.6 / Sonnet 4.6 は low/medium/high/max のみ（xhigh 非対応、high フォールバック）。アダプティブ推論の対象列挙は Fable 5 / Opus 5 / Sonnet 5 / Opus 4.8 / 4.7 / 4.6 / Sonnet 4.6 → key-016 修正

## 2026-09-16 quiz-refine --full（13 並列 Sonnet A-1 監査 + 判定層 Fable 5.1、64 問修正）

- **Hook ブロッキング可能イベントは 16**（exit-code-2 表 "Can block? = Yes" 再カウント。`WorktreeRemove` は Yes: 非ゼロ終了コードで削除失敗、JSON 出力は無視。PermissionRequest は No）
- **エージェントチームは CLI 対話セッション専用**: `-p` 非対話モード（Agent SDK セッション含む）ではチームメイトを起動しない（agent-teams.md）。Desktop も不可
- **`/agents` は v2.1.198 以降ウィザードを開かない**。サブエージェント作成は Claude に依頼 or ファイルを書く（sub-agents.md）
- **prompt-caching「Denying an entire tool」**: Tool Search 有効（対応モデル既定）ならツール定義不変でキャッシュ維持、無効時のみ定義除去でキャッシュ無効化
- **ワークフローのサブエージェント**: セッションのパーミッションルールを使い、モードは sub-agents.md の規則（bypassPermissions/acceptEdits/auto は継承・指定無視、default/dontAsk/plan はスクリプト指定）。「常に acceptEdits」は docs に無い。ランの自動停止はパーミッションプロンプト + 使用量上限待ちの 2 つ
- **`allowManagedHooksOnly`**: Managed / SDK / 管理設定 `enabledPlugins` で強制有効化したプラグインのフックが実行、それ以外はブロック
- **組み込みヘルパーサブエージェント 3 つ**: `claude`（キャッチオール、バックグラウンドセッション既定）/ `statusline-setup` / `claude-code-guide`
- **quickstart ログインアカウント 4 種**: サブスク / Console / クラウドプロバイダー / セルフホスト Claude apps gateway
- **`/branch`** = コピーして新ブランチに切り替え（元は `/resume`）、**`/fork`** = バックグラウンド別セッションで並行、**`/subtask`** = 結果を持ち帰るサブエージェント
- **VS Code クラウドセッション再開**: Session history → Web タブ（Claude.ai サブスク必須）
- **`outputStyle` 編集は v2.1.251+ で次メッセージから反映**。`model` のみ `/model` 必須
- **Desktop ローカルスケジュール**: Code タブ → Routines → New routine → Local。Web は `claude.ai/code/routines`
- **ultrareview 無料ラン**: Pro/Max 3 回、1 回限り・補充なし（期限なし）
- **`CLAUDE_CODE_MAX_OUTPUT_TOKENS`**: モデル依存。未知モデル ID は 32000、上限超過は切り下げ。固定「64,000」は無い
- **best-practices 強調語の例示は「IMPORTANT」のみ**（"YOU MUST" は現行 docs に 0 件）
- **サーバー管理設定の承認対象**: シェルコマンド設定 / サンドボックス系 / 許可外 env / Hook。`claudeMd` は v2.1.260+ で承認不要
- **Desktop WSL セッション有効化**: HKLM `SOFTWARE\Policies\Claude` の `disableWslSessions=false`（Desktop v1.19367.0+、HKCU 不可）。Anthropic への依頼は不要
- **skills `shell: powershell`**: Windows は多くの場合既定有効、Bedrock/Agent Platform/Foundry と macOS/Linux/WSL は `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`
- **サブエージェント permissionMode**: 6 値 + `manual`（`default` のエイリアス、v2.1.200+）
- **security.md 作業ディレクトリ境界は Manual モードの記述**（読み取りも境界外は確認）。quickstart: Pro/Max/Team は auto モードが既定開始モード
- **`--dangerously-skip-permissions`（bypassPermissions）は「隔離されたコンテナ・VM のみ」**
- **Shift+Enter 4 分類**: ネイティブ 7 種 / kitty protocol（foot、Alacritty 0.16+、v2.1.269+）/ `/terminal-setup`（VS Code, Cursor, Devin Desktop, Alacritty <0.16, Zed）/ 不可（gnome-terminal, JetBrains）
- **スクリーンリーダー**: モード自体は v2.1.181+、ネストテーブルの「Header: value」化は changelog v2.1.200
- ~~**Fast mode**: Opus 5 / Opus 4.8 のみ、$10/$50 per MTok、1M 全体フラット~~ → 2026-09-30 更新（Opus 5.5 追加・既定化、末尾の第16回参照）
- **Cowork VM**: オンデバイス（自分の PC）/ リモート（Anthropic 管理）の 2 形態
- **OTel カーディナリティ制御変数 6 つ**（`OTEL_METRICS_INCLUDE_REPOSITORY` 追加、v2.1.269+）
- **Bedrock リージョン解決順**（AWS_REGION → AWS_DEFAULT_REGION → プロファイル region → us-east-1）に版数条件の記載なし
- **devcontainer 参照実装 3 ファイル**: devcontainer.json / Dockerfile / init-firewall.sh
- **`/clear` は新セッション開始**（元の会話は `/resume` で再開可）
- **WebDAV 警告（security.md）は現存**（cache は `<Warning>` callout を落とす → live で確認）

## 2026-09-30 quality-loop 第16回（既存1005＋新規20の全件監査、10並列 Sonnet + 判定層 Fable 5 ×3、103問修正）

- CLAUDE.md は優先順位ではなく **読み込み順 Managed → User → Project → Local**。全ファイルは連結され上書きしない、CLAUDE.local.md は CLAUDE.md の後に追加 — memory "lists them in load order, from broadest scope to most specific" / "concatenated into context rather than overriding each other"（quality-rules.md の「Managed > Project > User > Local」は stale）
- user rules と project rules は "Neither set overrides the other"（競合時はどちらに従うか不定）— memory「User-level rules」
- v2.1.277+ は CLAUDE.md / .claude/CLAUDE.md / CLAUDE.local.md が作業ディレクトリ以上に無ければ AGENTS.md を直接読む。`/init` が AGENTS.md を取り込むのは `CLAUDE_CODE_NEW_INIT=1` のみ — memory「AGENTS.md」
- managed CLAUDE.md は claudeMdExcludes で除外不可、user/project より先に読み込み、"context, not enforced configuration" — memory
- `/memory` は未作成エントリを含むメモリファイルの場所一覧。読み込み確認は `/context` — memory「View and edit with /memory」
- 作業ディレクトリ外への symlink ルールは external import 扱い（承認まで非読込、`paths` 付きは承認後も非読込）— memory
- server-managed settings: サインイン直後の起動は最大5秒フェッチを待つ、それ以外は短い未適用期間 — server-managed-settings「Fetch and caching behavior」
- `/reload-skills` で新規トップレベル skills ディレクトリを取り込む（以降の変更ごとに再実行）— skills
- `skillOverrides` は `/skills` で Space→Esc 保存、plugin skills は対象外 — skills / settings-reference
- クラウドセッションではリポジトリ `.claude/settings.json` で宣言したプラグインは読み込まれない — skills「Use skills in Cowork and cloud sessions」
- description 省略時は "first non-empty line"、allowed-tools はスキルを呼び出したターンのみ有効 — skills
- advisor の対応メインモデル: Fable, Opus 4.6+, Sonnet 4.6+, Haiku 4.5。Opus 5.5/5 メインでは Opus 4.7/4.8 advisor は API 拒否 — advisor
- artifacts のスクリプトは five public CDN hosts（cdnjs, unpkg, Tailwind, jQuery, jsDelivr 一部）— artifacts
- ZDR: 違反フラグのセッションは最大2年保持 — zero-data-retention
- agent-teams: SendMessage/Task ツールの追加と本文の追加指示付加は in-process teammate のみ。split-pane は本文が既定システムプロンプトを置換 — agent-teams
- `claude project purge` の確認省略は `--yes`（`-y` ではない）— claude-directory
- Shift+Tab: auto 開始時は最初の押下で default、以降 default→acceptEdits→plan — permission-modes
1. `default` は v2.1.280+ で Pro/Max/Team/Enterprise/API/AWS/Bedrock/Agent Platform すべて Opus 5.5、Foundry のみ Sonnet 4.5。v2.1.280 前は Pro/Team Standard=Sonnet 5、他=Opus 5（v2.1.219+） — model-config "Pro, Max, Team, Enterprise, and Anthropic API: defaults to Opus 5.5 ... Microsoft Foundry: defaults to Sonnet 4.5"
2. Opus 5.5 は v2.1.280+、Sonnet 5.5 は v2.1.284+ 必須 — model-config
3. Fable 5.1/5 はどのプラン・プロバイダーでもアカウントタイプの default にならない — model-config
4. effort 表: Fable 5.1/5、Opus 5.5/Sonnet 5.5/Opus 5/Sonnet 5/Opus 4.8/4.7 = low〜max（xhigh 含む）、Opus 4.6/Sonnet 4.6 = max まで（xhigh は high にフォールバック） — model-config
5. 既定 effort: high、ただし Opus 5.5/Sonnet 5.5 は medium、Opus 4.7 は xhigh — model-config "high on every model that supports effort, except that Opus 5.5 and Sonnet 5.5 default to medium, Opus 4.7 defaults to xhigh"
6. `CLAUDE_CODE_EFFORT_LEVEL` = low/medium/high/xhigh/max/auto（最優先）— env-vars。settings `effortLevel` は low/medium/high/xhigh（max 不可）— model-config
7. Fast mode は Opus 5.5/Opus 5/Opus 4.8、既定 v2.1.280+ Opus 5.5（v2.1.219-279 は Opus 5）、Opus 4.7 は 2026-07-24 削除、価格 5.5=$8/$40・5/4.8=$10/$50、VS Code 拡張に Toggle fast mode、Bedrock/Agent Platform/Foundry/Claude Platform on AWS 不可、サブスクは usage credits 必須 — fast-mode
8. 途中で Fast を初めて有効化すると会話全体に未キャッシュ入力価格（会話ごと1回） — fast-mode
9. 常時思考モデル = Opus 5.5 / Sonnet 5.5 / Fable（トグル・`alwaysThinkingEnabled`・`MAX_THINKING_TOKENS=0` 無効） — model-config, settings-reference
10. 常時アダプティブ推論 = Fable / Sonnet 5 以降 / Opus 4.7 以降 — model-config
11. 1M: Fable 5.1/5、Sonnet 5 以降、Opus 4.6 以降、Sonnet 4.6 — model-config
12. hooks は設定レベル間でマージ（置換しない）— hooks "Hook entries merge across settings levels rather than replacing each other"。settings.json 編集は再起動不要 — debug-your-config
13. Esc=応答中断/ダイアログを閉じる、Esc+Esc=入力あり→下書き消去/空→rewind、Ctrl+C=中断・アイドル時1回目クリア2回目終了 — interactive-mode（keybindings `chat:cancel` の文言差あり）
14. Tab=オートコンプリート候補確定（@、シェルモードのパス v2.1.193+）— interactive-mode
15. `/output-style <style>` は v2.1.269+ で現存、3手段並列で推奨順位なし — output-styles
16. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` は既定より下げる方向のみ、1M 窓の既定は約 967K — env-vars, model-config
17. MCP 接続/切断によるキャッシュ無効化はツール検索が遅延ロードしていない構成のみ — prompt-caching
18. タスク追跡ツールの既定提供は Claude 3.x / Opus 4〜4.7 / Sonnet 4〜4.6 / Haiku 4.5 のみ（他はオプトイン）— tools-reference
- Glob/Grep は macOS/Linux/WSL の既定ツールセット外。Claude は Bash 経由の `find`/`grep`（組み込み bfs/ugrep）で検索する。Windows のみ既定で Glob が使える — tools-reference「Glob tool behavior」
- Bash 出力: 正常終了は約30,000字までインライン、超過はファイル保存＋先頭2,000字プレビュー。失敗時は約10,000字の head/tail 抜粋。`BASH_MAX_OUTPUT_LENGTH` は読み戻し幅のみ、インライン上限は `bashOutputMaxChars`（≤128,000、v2.1.261+）— tools-reference「Output limits」（2026-06-06 の Bash 出力行を更新）
- Bash 状態: export した環境変数は非永続、シェル起動ファイルのエイリアス・関数は全コマンドで利用可 — tools-reference「What persists between commands」
- PowerShell ツール: Git Bash ありの Windows では claude.ai/Console アカウントで既定有効、Bedrock/Agent Platform/Foundry は `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`（「段階的ロールアウト」は消滅）— tools-reference
- スケジュールタスク: 新しい会話でクリア、`--resume`/`--continue` で CronCreate タスクを復元（例外あり）— scheduled-tasks
- `-p` モードでも `/skill-name` をプロンプトに含めればスキル展開される。不可なのは `/login` などターミナル UI 専用コマンド — headless
- バックグラウンドサブエージェントの権限プロンプトはメインセッションに表示（承認 / Esc で1回拒否）。AskUserQuestion は全サブエージェントから除去 — sub-agents
- Code Intelligence 公式プラグインは13言語（Ruby は `ruby-lsp` で対応）— plugins/code-intelligence
- プラグイン source は7種（relative, github, url, git-subdir, npm, archive v2.1.224+, command v2.1.229+）— plugins/marketplace-reference
- 公式マーケットプレイスのカタログは docs に掲載されない（Discover タブで確認）— plugins/anthropic-marketplaces
- ディレクトリ提出は開発者ポータル `claude.ai/directory/manage`（有料プラン、Team/Enterprise は Owner）— plugins/publish
- Auto モード分類器は既定で Sonnet 5（`/model` と独立）。Sonnet 4.6 セッション等ではセッションのモデルにフォールバック — permission-modes
- Chrome 連携の前提: 拡張 1.0.36+、直接プラン、`/login` 必須（Claude Code のバージョン要件記載なし）— chrome
- GitLab `@claude`: Comments の webhook → イベントリスナー → `AI_FLOW_*` 付きトリガー API（任意構成）— gitlab-ci-cd
- `/fork` = 会話をコピーしてバックグラウンドで並行実行、`/branch` = 分岐して切替 — commands
- **ドキュメント構成変更**: プラグイン系7ページ（discover-plugins / plugins / plugins-reference / plugin-marketplaces / plugin-dependencies / plugin-hints / plugin-relevance）は `/plugins/*` の20ページに再編（旧 URL はリダイレクト）。`web-scheduled-tasks` は routines に統合（ja 版は 404）
- **キャッシュの制約**: fetch-docs のキャッシュは明示 `<hN id>` やコードフェンスを落とすことがある（skills `#skills-in-cowork-and-cloud-sessions` / `#live-change-detection`、plugin-evals のアンカーは live では有効）→ 判定は live の `{url}.md` / HTML で行う


## 2026-09-30 quality-loop 第17回（第16回の積み残し134問を判定層 Fable 5 ×3 で深掘り検証、57問修正 + plugins/* 新規12問）

- auto mode は v2.1.283 以降、対話ターミナル・VS Code セッションで**全プラン・全プロバイダ**の組み込み開始モード（それ以前は Pro/Max/Team のみ）— permission-modes / best-practices
- 管理ティアは no-merge が既定（ポリシーキーを配信した最初のソースを採用）。例外はロックキー・`env` の変数ごとマージ（v2.1.223+）・ゲートウェイサインイン系キー — server-managed-settings
- `/compact` 後に再注入されるのはプロジェクトルートの CLAUDE.md のみ。ネスト CLAUDE.md / `paths:` ルールは該当ファイル読込時に再ロード。4 MiB 超の CLAUDE.md はスキップ — memory
- PR バッジは4色、GitHub トークン（`GH_TOKEN`/`GITHUB_TOKEN`/`gh auth login`）で取得、`git push`/`gh pr` 成功時に更新 — interactive-mode
- `Ctrl+X` はコード前置キー、`Ctrl+L` は入力・履歴を保持した再描画 — keybindings / interactive-mode
- statusline の更新契機は8種、300ms デバウンス — statusline
- Shift+Enter: kitty keyboard protocol 対応端末（foot、Alacritty 0.16+）は v2.1.269 以降設定不要 — terminal-config
- Agent SDK docs は `code.claude.com/docs/*/agent-sdk/*` に移設（`platform.claude.com/docs/ja/agent-sdk/overview` は en に 307 リダイレクト → 10問の referenceUrl を `code.claude.com/docs/ja/agent-sdk/overview` に移行）。旧称は「Claude Code SDK」 — agent-sdk/overview
- ツール結果（画像なし）が上限超過するとファイル保存＋パス参照（切り捨てではない）— tools-reference（tool-020）
- マネージド設定の `availableModels` は v2.1.175 以降、ユーザー設定のリストを上書き（下位スコープで拡張不可）— model-config（ext-098）
- MCP プロンプトは `/servername:promptname (MCP)` と表示され、`/mcp__server__prompt` の形式で入力して実行 — mcp（cmd-107）
- MCP OAuth は `/mcp` または `claude mcp login <name>` で開始（`-p` では不可）— mcp（ext-035）
- MCP トランスポートは4種（stdio / HTTP / SSE（非推奨）/ WebSocket）— mcp（ext-009, ext-046）
- 公式 apt/dnf/apk リポジトリが提供されている — setup（cmd-100）
- Claude Code on the web: PR は完了通知の「Create PR」で作成（自動作成ではない）— claude-code-on-the-web（ext-125）
- CLI から見たテレポートは一方向、Desktop は Continue in でローカル→クラウド可 — ses-165
- `CLOUD_ML_REGION` 未設定時は `us-east5` にフォールバック — google-vertex-ai（ses-162）
- クラウド環境のセットアップは Owner ロールのみ（admin 記載なし）— ses-236
- **lint の偽陽性（アンカー）**: memory `#share-rules-across-projects-with-symlinks` も ja ページの実 id として live に存在（キャッシュ欠落）

## 2026-09-30 quality-loop 第18回（同日午後の docs 更新への追従: 13ページの内容差分から5問修正＋新規2問）

- hooks「What a blocked prompt leaves behind」: `UserPromptSubmit` のブロックは**消去ではない**。プロンプトは Claude に届かないが、既定でブロックメッセージ末尾に `Original prompt:` と本文が付き、トランスクリプトにも書かれる。`suppressOriginalPrompt` はブロックメッセージから除くだけ（機密をディスクに残さない手段ではない）— ext-007
- prompt-caching: `DISABLE_PROMPT_CACHING_SONNET` / `_OPUS` は `sonnet` / `opus` エイリアスが解決する**既定モデルだけ**が対象（別 ID をメインにするとキャッシュは維持 → 全体を止めるなら `DISABLE_PROMPT_CACHING`）。settings ページからは該当行が消え、prompt-caching ページが正典 — ses-070, ses-104
- model-config: 思考をオフにできないモデル（Opus 5.5 / Sonnet 5.5 / Fable）ではトグルと `/config` に `Thinking can't be turned off` を表示。`ANTHROPIC_DEFAULT_*_MODEL` 設定時は picker に1行、1M は `/model opus[1m]`
- keybindings: unbind の例は `Chat` の `"ctrl+s": null`（`chat:stash`）。検証警告はデバッグログにのみ出力 — key-029
- third-party-integrations: Teams の「$150/seat」表記は削除（価格ページ参照）— ses-160
- memory: スペースを含む import パスは各スペースの前にバックスラッシュ（`@Design\ Docs/api-conventions.md`）。引用符で囲むと読み込まれない — mem-104（新規）
- skills: `/claude-api` のサブコマンド（migrate / upgrade v2.1.236+ / managed-agents-onboard / prompt-audit v2.1.221+ / cost-optimize v2.1.247+ / build-eval・hillclimb v2.1.259+ / preserved-thinking-migration）。現時点で en のみ — skill-094（新規）
- Claude Tag セッションは server-managed settings を受け取らない（self-hosted 環境では管理設定ファイルを読む）— managed-settings / model-config

## 2026-09-30 quality-loop 第18回 追補（前回比較できなかった23ページを参照する130問を今日の docs で直接検証、28問修正）

- permission-modes: acceptEdits が自動承認する Bash は `mkdir` / `touch` / `rm` / `rmdir` / `mv` / `cp` / `sed`（作業ディレクトリと additionalDirectories 内のみ）。範囲外・保護パス・その他の Bash は確認 — ses-126（2026-06-06 記録の「`rm` 等は引き続き確認」は古い）
- mcp: `.mcp.json` の各サーバーの `timeout`（ms）は、そのサーバーのツール実行について `MCP_TOOL_TIMEOUT` より優先。起動タイムアウトは `MCP_TIMEOUT`（既定 30,000ms）— tool-037
- authentication: macOS で Keychain が書き込みを拒否した場合は `~/.claude/.credentials.json`（0600）にフォールバック — ses-141
- managed MCP の設定内容は `managed-mcp` ページに移動（許可/拒否リストは管理設定側、`managed-mcp.json` は `mcpServers` 形式）— ext-028
- mcp: リモートサーバーの url/headers では `ANTHROPIC_API_KEY` などの認証系変数は空として展開される
- mcp: SSE トランスポートは非推奨（2026-05-31 の「SSE deprecated 撤回」は古い）
- artifacts: Team/Enterprise とも既定オン・Owner がオフ可。サーフェスは CLI / Claude デスクトップ 1.13576.0+ / Claude Tag、Agent SDK・GitHub Action・MCP サーバー文脈では既定オフ。ポリシーは `api.anthropic.com` から取得 — artifacts「Availability」（bp-108）
- plugins/marketplace-reference: `strict: false` のコンフリクトは**マーケットプレイスのエントリ側**がコンポーネント（commands/agents/skills/hooks 等）を宣言したときに発生。宣言なしなら plugin.json がマニフェスト — ext-148
- plugins/marketplace-reference: 予約名が拡充（公式名・内部名・パッケージマネージャ名（v2.1.275+）・`claudeai-` 接頭辞）、`github.com/anthropics/` 配下は例外、非 ASCII・別綴り（v2.1.280+）は拒否 — ext-147
- plugins/components: `.lsp.json` はサーバー名をキーにしたマップ（ラッパーなし）、`claude plugin validate` の対象外 — ext-139
- github-actions: クイックセットアップは Claude API とサブスクリプションの両方に対応、保存するシークレットは `ANTHROPIC_API_KEY` または `CLAUDE_CODE_OAUTH_TOKEN`、github.com 限定・gh CLI 必須 — cmd-080
- sandboxing: Linux/WSL2 は bubblewrap と socat が必要、WSL1・ネイティブ Windows は非対応 — tool-030
- 記録の訂正: artifacts の CDN は 5 ホスト（unpkg を含む）。2026-09-10 の「4 CDN」は古い
- desktop: SSH セッションは初回接続時に Desktop が Claude Code をリモートへ自動インストール（リモートは Linux/macOS）— ses-120（正解の記述誤りを修正）
- desktop: ワークツリー分離はセッション開始時に worktree オプションを選ぶ opt-in（自動ではない）— ses-111
- desktop: Browser ペインは外部サイトも開ける（分類器・許可リストで制御）。Linux ベータもライブプレビュー対応 — ext-172
- desktop-ios-simulator: 自動停止の例外は「Claude Code Desktop の外で起動したデバイス」（Simulator アプリ / Device Hub）— ses-213
- remote-control: Desktop の設定名は「Connect new sessions to Remote Control」、サーバーモードに `--chrome`/`--no-chrome`（v2.1.273+）
- desktop: Desktop の `/resume` はローカルセッションのみ、SSO 必須化は Team / Enterprise

## 2026-10-01 quality-loop 第19回（前日夜のベースラインからの docs 内容差分 44 ページを判定層 Fable 5 ×2 で追従、5問修正）

- server-managed-settings: 管理ティアの no-merge の例外は4種（ロックキー / `env` の変数ごとマージ / `allowedProviders`（v2.1.285+）/ ゲートウェイサインイン系キー）— mem-039（第17回の「例外3種」を更新）
- settings-reference: `allowedProviders`（Managed、v2.1.285+）。マシン側とサーバー側の両方にリストがある場合は共通部分のみ許可（サーバー側は狭めるだけで広げられない）。空リストや全エントリ不明なら全プロバイダ拒否で起動しない
- ~~tools-reference: バックグラウンドの Bash / PowerShell コマンドに時間制限（既定30分、最大2時間）~~ → 2026-10-05 訂正: 時間制限は無人セッション（`-p`、Agent SDK、CI、クラウド）のみ（第20回参照）
- cloud-environments: Anthropic ホスト環境ではセッション作成時と、VM がアイドルから復元・再構築されるたびに環境変数を読み直す。セットアップスクリプトはアイドルからの復元時には走らない。ネットワーク設定の変更は約1分で既存セッションに反映
- sessions: 実行中のバックグラウンドセッションを `--resume` / `/resume` すると、そのセッションにアタッチする（v2.1.285 より前は拒否）
- desktop: `claude --desktop`（v2.1.285+）で Desktop を直接開き、`--continue` / `--resume <session-id>` で CLI セッションを Desktop に移せる
- managed-settings: 管理ソースを OS が読み取り拒否した場合はそのソースなしで起動、それ以外の読み取り失敗は全セッション終了
- env-vars: `CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK=1` / `CLAUDE_CODE_SKIP_MODEL_ACCESS_MEMORY=1`（v2.1.285+）
- advisor: Sonnet 5 と Sonnet 5.5 メインで組み合わせられる advisor が異なる（同じ扱いではない）— bp-101
- scheduled-tasks: 「新しい会話を開始するとすべてのタスクがクリアされる」という記述は削除された（第16回の記録を更新）— cmd-087
- permission-modes: auto モード分類器の「一度確定したらセッション中は変わらない」という保証の記述は撤回された — ext-164
- skills: スキルが発動しないときのトラブルシュート節が書き直された — skill-074

## 2026-10-05 quality-loop 第20回（4日分の docs 内容差分 113 ページを判定層 Fable 5 ×6 で追従、25問修正 + 新機能 Mods の16問追加）

- **新機能 Mods**（`/plugins/mods/*` 10ページ）: Claude Code の内部で動く JavaScript / TypeScript のイベントハンドラ型プラグイン。ペインやコマンドの追加、ツール呼び出しへの介入ができる。設定ファイルの hooks とは別物（docs 上は mod のハンドラも「hook」と呼ぶ）。`--safe-mode` で1セッションだけ全 mod を止め、`allowManagedModsOnly`（管理設定）でユーザーの mod だけを止める
- **第19回の記録の訂正**: バックグラウンドの Bash / PowerShell の時間制限（既定30分・最大2時間）は**無人セッション（`-p`、Agent SDK、CI、クラウド）のみ**。ターミナル・Desktop・VS Code の通常セッションには時間制限なし（v2.1.288 より前は全セッションに適用）— tools-reference
- debug-your-config: サブディレクトリの CLAUDE.md は Read / Write / Edit のいずれかでそのディレクトリのファイルを触ったときに読み込まれる（v2.1.288 より前は Read のみ）。memory ページも 2026-10-06 に同じ内容へ更新済み
- debug-your-config: hooks の `matcher` を配列にすると、そのエントリが無効な設定として一覧表示される。`PreToolUse` / `PermissionRequest` 配下なら同じファイルの他のフックも読み込まれない — ses-187
- hooks-guide: Stop フックは「Claude がツールを呼ばずに8回連続でブロックした」ときに上書きされる。`PermissionRequest` フックは `-p` でも `dontAsk` 以外では実行される
- agent-teams: チームメイトを表示中に `/compact` `/clear` `/rewind` はリードの会話に作用するため確認が出る。`/model` `/fast` はその表示からは実行されず理由の通知が出る — skill-082
- headless: bare モードではバックグラウンドタスクは実行されない（v2.1.286+）
- hooks: `/hooks` メニューは各フックに出所（ユーザー設定・プロジェクト設定・ローカル設定・プラグイン・現在のセッション）を表示し、選ぶと実行内容と定義場所が出る。末尾の「All events」で全イベント表示 — cmd-026
- hooks: `UserPromptSubmit` は入力したプロンプト以外（スケジュールタスクの発火、バックグラウンドサブエージェントの報告、他セッションからのメッセージ）でも発火する
- claude-code-on-the-web / desktop: Desktop の Code タブからクラウドへ送る導線は「Open in」→ Cloud（会話は要約で引き継ぎ、SSH / WSL のセッションは不可）。旧「Continue in」— ses-165
- claude-code-on-the-web: ネイティブ Windows では追跡ファイルの未コミット変更はファイル名に関係なくそのまま送られる（機密ファイルの除外は macOS / Linux / WSL のみ）
- accessibility: コマンド（`/plan` など）で行った権限モードの変更はアナウンスされない — key-067
- model-config: Anthropic API 以外では、Auto モード分類器の Opus フォールバックは `ANTHROPIC_DEFAULT_OPUS_MODEL`、未設定なら Opus 5。ゲートウェイ経由では Fable・Sonnet 5 以降・Opus 4.7 以降は `[1m]` を選ばずに 1M
- skills: `verify` / `simplify` という名前のスキルがあると、コミット直前に実行するよう指示される（v2.1.286+）。同名のスキルは組み込みコマンドを置き換える（エイリアスは除く）
- plugin-evals: `llm` / `baseline` グレーダーの既定の判定モデルは、バックグラウンドタスク用のモデル
- claude-directory / cli-reference: `claude project purge` は `claude purge` に改名（v2.1.288+）— mem-089 / mem-090（第16回の `--yes` 記録はコマンド名のみ更新）
- cli-reference: `--system-prompt` と `--system-prompt-file` は組み合わせ可。v2.1.283+ はフラグとそのファイル版（`--append-system-prompt` と `--append-system-prompt-file`）も併用可（ファイルの内容が先）
- cloud-environments / security: GitHub プロキシの制限は「ブランチ削除とタグなどブランチ以外の push を拒否」。どのブランチに push できるかは制限しない（旧「現在の作業ブランチのみ」は誤り）— bp-063
- desktop-scheduled-tasks / desktop: 「Keep computer awake」や Computer use の設定は Settings > This computer > System — ext-177
- sandboxing（大規模改訂）: 未許可ホストへ接続するコマンドはサンドボックス内に留まり、権限モードごとに扱いが決まる（dontAsk は拒否）。管理設定でサンドボックスを必須にした場合（v2.1.285+）はリポジトリ側の `excludedCommands` / `allowedDomains` 等を無視。ローカルアドレスに解決されるホスト名はプロキシが拒否（v2.1.284+）
- sub-agents: `/agents` は v2.1.198 以降、Claude に頼むか `.claude/agents/` を直接編集するよう促すリマインダーを表示するだけ（v2.1.197 以前はウィザード）— ext-060（正解が選択肢に存在しない状態だった）
- ultrareview: 料金表から Team / Enterprise の行が削除。Pro / Max は無料ラン3回、以後は1回 $5〜25 の usage credits — cmd-118
- self-hosted-environments: Runner の設定で推論を Bedrock / Agent Platform に送れる（旧「他へルーティング不可」は削除）。server-managed settings はこれらのセッションに届かない。auto memory は既定オフ
- env-vars: on/off 型の変数は `yes`/`on`・`no`/`off` も受け付ける。`MAX_MCP_OUTPUT_TOKENS` に関係なく 50,000 字を超えるテキストはファイル保存
- routines: Claude は既定で `claude/` 接頭辞のブランチに push する。どのブランチに push できるかは GitHub のブランチ保護ルール / ルールセットで制御（アクセス権でバイパスできるルールは止めない）。旧「`claude/` は常に受け入れ、他は事前チェックで拒否」は削除 — cmd-109（正解が選択肢に存在しない状態だった）
- security: 作業ディレクトリの境界は「許可プロンプト」であり、承認した Bash はユーザー権限で書ける場所ならどこにでも書ける（OS レベルの制限はサンドボックス）— bp-060
- security / tools-reference: WebFetch はページに対して別のモデル呼び出しを行い、Claude は生ページではなくその結果を受け取る（lossy by design）— bp-061
- advisor: 対応関係は能力順位（Haiku 4.5 → Sonnet 4.6 → Opus 4.6 → Sonnet 5 → Opus 4.7/4.8 → Sonnet 5.5 → Opus 5/5.5 → Fable 5 → Fable 5.1）で決まる。Opus 4.7/4.8 メインに Sonnet 5.5 advisor は v2.1.287+ — bp-101
- chrome: VS Code でも `/chrome` で「Enabled by default」を切り替えられ、CLI と設定を共有。v2.1.287+ はセッション開始時に接続 — ext-124
- permission-modes: Shift+Tab は default → acceptEdits → plan、追加のモードは plan の後に入る
- settings-reference: `allowedDomains` 未設定時は、新しいホストへの扱いを権限モードが決める
- memory: auto memory はローカルセッションで既定オン、自己ホスト環境では既定オフ
- errors: 思考が終わった後、テキストやツール呼び出しを始める前に届いたサーバーエラー / 過負荷は最大2回再試行（v2.1.284+、以前はターン終了）。テキストやツール呼び出しを始めた後は再試行しない — bp-122
- best-practices: `--allowedTools` は「必要なツールを事前承認する」もの（旧「制限する」）。`--permission-mode dontAsk` と組み合わせると、それ以外の承認が必要な操作は拒否される — bp-081 / cmd-034
- best-practices / errors: パイプ入力の例は `cat error.log | claude -p "..."`。Windows では `-p` なしのパイプ起動は v2.1.287+ でエラー — bp-013
- server-managed-settings / costs / errors: claude.ai の管理画面のラベルは「Admin settings」から「Organization settings」に変更 — mem-040
- agent-view: `←` や `/background` で手元のセッションをバックグラウンドに移した場合は worktree を作らず、元の場所で編集を続ける — ses-195
- statusline: `spend_limit.used_usd` / `limit_usd` / `period`（v2.1.284+）
- keybindings: `agents:find`（Ctrl+F）/ `agents:rename`（Ctrl+R）など agent view 用のアクション（v2.1.288+）
- sandboxing: 許可していないホストへの接続はサンドボックス内に留まり、権限モードで扱いが決まる（`bypassPermissions` は確認なしで許可、Manual / `acceptEdits` はプロンプト、auto は分類器が承認した場合のみ、`dontAsk` は拒否）。`strictAllowlist` / `allowManagedDomainsOnly` ではどのモードでも拒否 — tool-043

## 2026-10-06 quality-loop 第21回（docs 内容差分 73 ページを判定層 Fable 5 ×2 で追従、19問修正 + 新規ページ hipaa-setup で3問追加）

- slack / platforms: 旧 Claude Code in Slack は Pro / Max アカウントかつ Claude Tag 未接続のワークスペースでのみ応答。旧 Claude in Slack ボットは 2026-10-05 に終了 — ext-202
- github-enterprise-server: GHES の接続は Organization settings > Git providers（`claude.ai/admin-settings/source-control`）で行う。`admin-settings/claude-code` は Code Review などの有効化画面 — cmd-119
- memory: `/context` の Memory files に出るのは起動時に読み込まれるファイルだけ。サブディレクトリの CLAUDE.md はオンデマンドで読み込まれ一覧に出ない（読み込まれると `Loaded` 行が出る）— mem-049 / mem-057 / mem-058 / mem-063 / mem-075 / mem-059
- memory / large-codebases / context-window: サブディレクトリの CLAUDE.md は、そのディレクトリのファイルに Read / Write / Edit を使ったときに読み込まれる — bp-091 / ses-174
- fullscreen: Cmd / Ctrl クリックしたファイルパスは、ファイルマネージャでそのファイルを選択した状態で開く（Linux / WSL は対応するファイルマネージャが必要）— key-055
- desktop: コミット前のレビューはプロンプトに `/code-review`（diff ビューの「Review code」ボタンは廃止）。Browser ペインは Dev servers メニューと ⋮ メニュー（Keep cookies / Auto-verify changes など）、Browser 全体のオフは Settings > Claude Code の Browser tools。CI の自動修正・自動マージはステータスバーの CI から。SSH 接続は SSH key を任意で指定 — bp-053 / ext-172 / ses-112 / ses-119 / ses-120 / ses-121
- permission-modes: `.claude` ディレクトリ保護の例外は5系統（worktrees、現在のセッションの plan ファイル、ジョブの tmp、auto memory の md、サブエージェントの memory の md）— ext-203
- agent-view: `✻` / `✽` は「実行中または入力待ち」、`∙` は終了済み、`✢` は /loop の待機 — ses-191
- hipaa-setup（新規ページ）: HIPAA 構成の組織では Claude Code v2.1.285+ / Claude Desktop v2.19675.0+ が必要。クラウドセッション・`/web-setup`・Remote Control などは利用不可、Desktop と Claude in Chrome は既定オフ — ses-263〜265


## 2026-10-07 quality-loop 第23回（約10時間分の docs 内容差分 27 ページを判定層 Fable 5 ×1 で追従、1問修正）

- claude-apps-gateway: PostgreSQL は 11 以降（11〜13 はゲートウェイ側の Claude Code v2.1.290+ が必要、保守終了版なので新しい版を推奨）。`store.postgres_url` はホスト1つ、分散 SQL は非対応 — ses-204
- sessions: 再開時の権限モードは基本的に復元しないが、plan モードで終わったセッションは plan モードで再開する（`--permission-mode` / `--dangerously-skip-permissions` / `--fork-session` 指定時を除く）
- sub-agents: frontmatter の `effort` はセッションの effort を上書きするが、`CLAUDE_CODE_EFFORT_LEVEL` 環境変数は上書きしない
- plugins-mods-reference: 新イベント `prompt.mention`（v2.1.290+）。描画の上限は1ツリーあたり先頭100,000文字
- permission-modes: HIPAA 構成の組織では既定の開始モードが Manual（`default`）
