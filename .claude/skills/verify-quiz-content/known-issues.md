# Known Issues — 過去の検証で発見された個別パターン

> このファイルは SKILL.md の汎用原則を補足する **プロジェクト固有の具体例・教訓** です。
> 各項目は SKILL.md の汎用パターンと対応しており、検証時に「このパターンに該当しないか」を確認する用途で使います。

## 環境変数の逆値動作

- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` で無効化は記載済み。**`=0` で強制有効化も settings.md に「Set to `0` to force auto memory on during the gradual rollout」と記載あり**（旧 known-issues の「根拠なし」は誤り。2026-03-03 確認）
- env var のフラグ系（`DISABLE_*`, `ENABLE_*`）は片方向の動作のみ記載されていることが多い

## 未記載の数値の断定

- `BASH_DEFAULT_TIMEOUT_MS` のデフォルト値: ドキュメントが "Not specified" と明示
- 非アダプティブモデルの思考予算トークン数: model-config ページに具体値の記載なし
- `CLAUDE.md` の行数制限: docs は "target under 200 lines per CLAUDE.md file" と明記 — 「具体的な行数制限は定められていません」は誤り

## デフォルト動作

- `spinnerVerbs.mode` を省略すると `"append"`（追加）がデフォルト。「省略=replace（置き換え）」は誤り

## 環境変数の照合

- `MCP_TIMEOUT`: settings ページにはないが、mcp ページの Tips セクションに記載 → ドキュメント化済み
- `MCP_TOOL_TIMEOUT`: settings ページ記載済み（2026-03-03 確認）
- `USE_BUILTIN_RIPGREP`: settings ページ記載済み（2026-03-03 確認）。`0` に設定するとシステムの `rg` を使用

## settings ページとリンク先の乖離

- `defaultMode` 有効値は `default`/`acceptEdits`/`plan`/`dontAsk`/`bypassPermissions` の5つ。settings ページの例 `acceptEdits` だけを見て「4つ」と誤判定するパターンは v4.22.0 で実際に発生。完全なリストは permissions ページ（`/en/permissions#permission-modes`）にある

## VALID_DOC_PAGES の更新

- `npm test` が「unknown doc page」エラーで失敗する場合、`src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストに該当ページ名を追加する
- 過去に追加が必要だったページ: `plugin-marketplaces`, `sandboxing`

## モデル固有機能のスコープ

- エフォートレベル調整（`CLAUDE_CODE_EFFORT_LEVEL`: low/medium/high）は Opus 4.6 **と Sonnet 4.6** の両方でサポート。「Opus 4.6専用」は誤り
- `MAX_THINKING_TOKENS`（非ゼロ値）は Opus/Sonnet 4.6 ではアダプティブ推論中は無視される — `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` を設定した上でのみ有効
- **ただし `MAX_THINKING_TOKENS=0` はどのモデルでも thinking を完全に無効化できる例外** — docs: "The one exception: setting MAX_THINKING_TOKENS=0 still disables thinking entirely on any model."
- **Opus 4.6 の推論機能の正式用語は「adaptive reasoning」** — model-config ページは "Extended Thinking" を使わず "effort levels control Opus 4.6's adaptive reasoning" と表現する。quiz の question/explanation で "Extended Thinking" と書くのは用語の不一致（v4.41.0 bp-018 で修正）

## スキル定義のキー名形式

- スキル定義のキー名はアンダースコアではなくハイフン区切り（例: `allowed-tools` であり `allowed_tools` ではない）

## Hook の exit code 詳細

- exit 0: stdout が Claude のコンテキストに追加
- exit 1: stderr がユーザーに表示されエラーとして記録（処理は継続）
- exit 2: ブロッキング制御 — **`reason`/stderr の送信先はイベントごとの decision control テーブルで決まる**
  - `PostToolUse`/`Stop`/`SubagentStop` → `reason` を **Claude へフィードバック**
  - `UserPromptSubmit`/`ConfigChange` → `reason` を **ユーザーへ表示のみ**（"Not added to context"）
  - `PreToolUse`/`PermissionRequest` → `hookSpecificOutput` による制御（別メカニズム）
  - `TeammateIdle`/`TaskCompleted` → Exit code のみ（stderr は Claude へフィードバック）
  - `Notification`/`SessionStart`/`SessionEnd` 等 → ブロッキング不可
- **各イベントセクションの decision control テーブルを個別確認すること。一般ルールで一括判定してはいけない**

## UserPromptSubmit の reason 送信先（v4.43.1 で確定）

hooks.md の UserPromptSubmit decision control テーブル:
- `reason`: "Shown to the user when decision is 'block'. **Not added to context**"
- `additionalContext`: "String added to Claude's context"（これが Claude にコンテキストを渡す正しいフィールド）

v4.43.0 以前の known-issues では「exit code 2 の一般ルールで UserPromptSubmit の stderr も Claude へ」と記載していたが、
**イベント固有の decision control テーブルが一般ルールに優先する**ことが v4.43.1 検証で確定。

## UI 固有の詳細（ドキュメント記載済み）

- セッションピッカーのキーバインドは `common-workflows`（"Use the session picker" セクション）に掲載済み: `P`=プレビュー、`R`=リネーム、`B`=ブランチフィルター、`/`=検索、`A`=全プロジェクト切替、`↑↓`=ナビゲート
- フォーク済みセッションがルートセッション下にグループ化されることも同ページに明記
- これらは「UI内部動作」ではなく「ドキュメント記載の機能」として検証対象になる

## セッション再開の注意事項

- docs は "Your full conversation history is restored, **but session-scoped permissions are not**. You'll need to re-approve those." と明記
- 「完全な」「シームレスに」という表現がこの制約を隠している場合は注記を追加すること
- 参照: `how-claude-code-works` "Resume or fork sessions" セクション

## 許可設定の列挙完全性

- `allowManagedHooksOnly: true` は「Managed設定の Hooks **と SDK Hooks** のみ」が許可される。「Managed設定のHooksのみ」は SDK Hooks が欠落

## サブシステム間のフィールド名混入

- `sandbox.network.allowManagedDomainsOnly` の説明で `deniedMcpServers`（MCP サーバーの設定名）を引用していた事例 — 正しくは「拒否ドメイン（denied domains）」。ネットワークドメインと MCP サーバーは別のサブシステム

## 「推奨」と「非推奨」の混同

- ドキュメントが「AはBより推奨（recommended）」と記載していても、「Bは非推奨（deprecated）」とは限らない
- 「推奨」は相対的な優先度を示すだけであり、「非推奨」はそれより強い公式宣言
- **具体例（v4.42.0）**: mcp.md は "HTTP servers are the recommended option" と記載しているが、SSE について "deprecated" の文字は存在しない。quiz が "SSEは現在は非推奨です" と断定していたため修正
- `deprecated` という表現はドキュメントに明示的に記載されている場合のみ使用すること

## 存在しないフレーズの引用（具体例）

- "Delegate, don't dictate" は `how-claude-code-works` ページに掲載済み（`best-practices` ではない）
- "Ruthlessly prune" / "Keep it concise" は memory ベストプラクティスページに記載なし
- 実際は "Review periodically" "Be specific" "Use structure to organize"

## CLIフラグの組み合わせ（具体例）

- `--fork-session` は単独では動作しない → 正しくは `--continue --fork-session`

## パスの動的部分（具体例）

- `~/.claude/projects/memory/` → 正しくは `~/.claude/projects/<project>/memory/`

## SDK・ライブラリの改名履歴

- 「Claude Code SDK」→「Claude Code Agent SDK」→「Claude Agent SDK」と改名済み
- `Task` ツールは Claude Code CLI では `Agent` に改名されたが、Agent SDK の `allowedTools` 設定には `Task` と指定する必要がある（CLI 文脈か SDK 文脈かで正しい名称が異なる）

## MEMORY 記録の信頼性

- v4.13.0 で「Microsoft Azure Foundry（正式名称）」と誤記録 → v4.22.0 でも踏襲 → 実際のページタイトルは「Microsoft Foundry」
- v4.39.3 で cmd-024 に「SSE は非推奨」と記載 → MEMORY にも「MCP SSE transport is deprecated → use HTTP」と記録済みだったが、実際の mcp ページには "deprecated" の文字列が存在しなかった
- v4.41.0 で MEMORY の「`CLAUDE_CODE_DISABLE_AUTO_MEMORY=0` で強制有効化はドキュメントに根拠なし」が誤りと判明 → settings.md に記載あり
- `/teleport` はスラッシュコマンドではなく `claude --teleport` CLIフラグ（interactive-mode のスラッシュコマンドテーブルに存在しない）
- "Compact Instructions" は how-claude-code-works.md に記載あり（「add a 'Compact Instructions' section to CLAUDE.md」）
- 過去に確認済みという記録があっても、重要な固有名詞・設定値は専用ページで再検証する

## 対象の不完全列挙（具体例）

- `Ctrl+B`: "Backgrounds bash commands **and agents**" — 「bash commands」のみの記述は不完全
- ext-029: Hook のブロッキング対応イベント（Can block = Yes）は9つ: `PreToolUse`, `UserPromptSubmit`, `PermissionRequest`, `Stop`, `SubagentStop`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `WorktreeCreate`。**`PostToolUse` は Can block = No**（ツール実行済みのため exit 2 でも stderr を Claude に表示するだけ）

## multi-select 問題の完全性検証

- `type: "multi"` かつ「全て選んでください」の問題は、**ドキュメントに記載のある全有効オプションが選択肢に含まれているか**を逆方向でも検証すること
- 正解→ドキュメント照合（内容が正確か）だけでなく、ドキュメント→選択肢（網羅しているか）の確認も必要
- 具体例: skill-031（v4.41.0）は `.claude/commands/` と `~/.claude/commands/` のみ正解としていたが、`.claude/skills/<name>/SKILL.md` と `~/.claude/skills/<name>/SKILL.md` も有効パスとしてドキュメントに記載あり → 問題文を `commands/` 形式限定に絞って修正

## 外部知識の混入（具体例）

- 「think」「think hard」「ultrathink」という記述が思考トークンを増やすという知識は、Claude Code docs に記載がないまま Claude Code 固有の動作として断言してはいけない
- `CLAUDE_CODE_SHELL_PREFIX` の用途例として「nix-shell」「Docker exec」を記載 → ドキュメントは "for logging or auditing" のみ。ドキュメントに記載のない用途例を追加しない

## ドキュメントの例示を完全リストと誤認

- best-practices ページの強調キーワード: ドキュメントは "adding emphasis (e.g., **'IMPORTANT'** or **'YOU MUST'**)" と2例を挙げるだけ。explanation/wrongFeedback に `ALWAYS` `NEVER` を追加してドキュメント推奨と記述するのは拡大解釈
- 「e.g.」「for example」「such as」で列挙されているものは例示であり、完全なリストではない。quiz で「ドキュメントが推奨する」と書く場合は実際に記載されている語のみに限定すること

## スコープ名とパスの混同

- `~/.claude/CLAUDE.md` は **User scope**（個人設定）。**Managed policy** のパスはプラットフォーム別:
  - macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
  - Linux/WSL: `/etc/claude-code/CLAUDE.md`
  - Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`
- explanation でスコープ名を併記する際はパスとスコープの対応を正確に

## 許可設定の無効化対象の欠落（追加例）

- `allowManagedHooksOnly: true` が無効化するのは user, project, **plugin** hooks の3種。「User/Project/Local」と書くと plugin hooks が抜ける
- ドキュメント原文: "prevents loading of user, project, and plugin hooks"

## ドキュメントに根拠のないアクセス制限の断定

- cmd-012: `/teleport`に「サブスクリプションプランのユーザーのみ利用可能」と記載していたが、ドキュメントには利用制限の記述なし
- 「〜プランのみ」「〜ユーザーのみ」「〜環境のみ」のようなアクセス制限は、ドキュメントに明記されている場合のみ記載する
- 外部知識やリリースノートの情報を docs 記載と混同しないこと

## 動作主体の誤帰属（具体例）

- CLI ツールの学習: ドキュメントは "Try prompts like `Use 'foo-cli-tool --help' to learn about foo tool`" とユーザーが指示する形。「自動的に学習できる」は誤帰属（Claude が自発的に --help を実行するわけではない）
- 「インストール」と「起動」: `claude` コマンドはインストール済みの状態で**起動**するコマンド。インストールは npm/curl/Homebrew 等が行う
