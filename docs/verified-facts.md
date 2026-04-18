# Verified Facts — Claude Code ドキュメント照合済み事実

このファイルはチーム共有用の Verified Facts アーカイブです。クイズ内容の正確性を担保するための「ドキュメント照合済み事実」を集約しています。

**運用:**
- 個人ローカルの `~/.claude/projects/.../MEMORY.md` と対で更新する
- `/quality-loop --monthly` が drift を検出したら両方を更新
- 問題追加・修正時はこのファイルを参照（一次ソースは公式ドキュメント）

**最終更新:** 2026-04-17（facts-checker `--cross-quiz` 初回実行、6件 drift 検出→5問修正）

---

## モデル・エフォート関連

### 既定モデル（プラン別）
- **Max / Team Premium**: Opus 4.7
- **Pro / Team Standard / Enterprise / Anthropic API**: Sonnet 4.6
- **Bedrock / Vertex AI / Microsoft Foundry**: Sonnet 4.5

### `CLAUDE_CODE_EFFORT_LEVEL`（6 値）
- `low` / `medium` / `high` / `xhigh` / `max` / `auto`
- `xhigh`: **Opus 4.7 専用**
- `max`: Opus 4.7 / Opus 4.6 / Sonnet 4.6 で利用可
- デフォルト: Max/Team Premium = `xhigh`、その他 = `high`

### 1M context 対応モデル（3 種）
- Opus 4.7 / Opus 4.6 / Sonnet 4.6
- Opus 4.7 は Max/Team/Enterprise で 1M へ自動アップグレード

### Extended Thinking / adaptive reasoning
- Opus/Sonnet 4.6 以降: `MAX_THINKING_TOKENS` は無視（adaptive reasoning）
- 無効化: `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`
- 例外: `MAX_THINKING_TOKENS=0` は全モデルで thinking を無効化

---

## Hooks

### Hook event types
- **総数: 25**（2026-04-17 再確認。旧メモの「26」は誤り）
- **Blocking events: 13**（PreCompact を含む）

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
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=0`: auto memory を強制有効化（gradual rollout 用）
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`: `--add-dir` フラグとの**併用必須**
- `CLAUDE_CODE_SIMPLE=1`: minimal prompt、Bash/file のみ。`--mcp-config` 経由の MCP ツールは利用可
- `CLAUDE_CODE_EFFORT_LEVEL`: 上記「モデル・エフォート関連」参照
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 1-100（auto-compaction 発動閾値%）
- `CLAUDE_CODE_SHELL_PREFIX`: "for logging or auditing"（nix-shell/Docker exec ではない）
- `USE_BUILTIN_RIPGREP`: settings page に記載
- `CLAUDE_CODE_CLIENT_CERT` / `CLIENT_KEY` / `CLIENT_KEY_PASSPHRASE`: mTLS 用
- `MCP_TIMEOUT`: サーバー起動タイムアウト
- `MCP_TOOL_TIMEOUT`: ツール実行タイムアウト（別変数）
- `MAX_MCP_OUTPUT_TOKENS`: default 25,000 / warning 10,000
- `BASH_MAX_TIMEOUT_MS`: モデルが設定可能な最大タイムアウト

### defaultMode 有効値（6 値）
`default` / `acceptEdits` / `plan` / `auto` / `dontAsk` / `bypassPermissions`

---

## CLI / Agent SDK

### Task → Agent リネーム（v2.1.63）
- CLI は `Agent` ツールを使う
- Agent SDK の `allowedTools` は `Task` を使う（後方互換）

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
- Agent teams: CLI と Agent SDK のみ。Desktop アプリでは**利用不可**
- `dontAsk` permission mode: CLI のみ。Desktop では利用不可

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
- `Option+T` や Alt+B/F/Y/M/P は「Option as Meta」ターミナル設定が別途必要

### Checkpoint restore（5 オプション）
- restore code+conv / conv only / code only / summarize / never mind

---

## MCP / Tools

### MCP SSE Transport
- 公式ドキュメントに "deprecated" の明示記載**なし**（HTTP 推奨は記載あり）
- 「非推奨」と断定するのは誤り

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
