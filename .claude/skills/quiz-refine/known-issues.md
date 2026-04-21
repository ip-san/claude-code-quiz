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

- `defaultMode` 有効値は `default`/`acceptEdits`/`plan`/`auto`/`dontAsk`/`bypassPermissions` の**6つ**（settings.md L229 確認）。settings ページの例 `acceptEdits` だけを見て「4つ」「5つ」と誤判定するパターンに注意。完全なリストは settings.md の defaultMode 行に記載あり
- ses-102 がエフォートレベルの設定方法を「5つ」と記述していたが、docs はスキル/サブエージェントのフロントマターを含む6つを列挙 → known-issues.md にエフォートレベル設定方法6種（/effort, /model slider, --effort, env var, settings, frontmatter）を明記

## VALID_DOC_PAGES の更新

- `npm test` が「unknown doc page」エラーで失敗する場合、`src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストに該当ページ名を追加する
- 過去に追加が必要だったページ: `plugin-marketplaces`, `sandboxing`

## モデル固有機能のスコープ

- エフォートレベル調整（`CLAUDE_CODE_EFFORT_LEVEL`: low/medium/high）は Opus 4.6 **と Sonnet 4.6** の両方でサポート。「Opus 4.6専用」は誤り
- **エフォートレベルのデフォルトはプラン依存**: Pro/Max=`medium`、その他(API key/Team/Enterprise/Bedrock/Vertex AI/Foundry)=`high`。model-config ページに "Pro and Max subscribers default to medium effort. All other users default to high effort: API key, Team, Enterprise, and third-party provider" と明記。**Team は `high` であり `medium` ではない**
- `MAX_THINKING_TOKENS`（非ゼロ値）は Opus/Sonnet 4.6 ではアダプティブ推論中は無視される — `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` を設定した上でのみ有効
- **ただし `MAX_THINKING_TOKENS=0` はどのモデルでも thinking を完全に無効化できる例外** — docs: "The one exception: setting MAX_THINKING_TOKENS=0 still disables thinking entirely on any model."
- **Opus 4.6 の推論機能の正式用語は「adaptive reasoning」** — model-config ページは "Extended Thinking" を使わず "effort levels control Opus 4.6's adaptive reasoning" と表現する。quiz の question/explanation で "Extended Thinking" と書くのは用語の不一致（v4.41.0 bp-018 で修正）

## スキル定義のキー名形式

- スキル定義のキー名はアンダースコアではなくハイフン区切り（例: `allowed-tools` であり `allowed_tools` ではない）
- `allowed-tools` in Skills: 許可リスト（grants without per-use approval）。リスト外のツールは通常のパーミッション設定に従う（ブロックされるのではない）

## Hook の exit code 詳細

- exit 0: stdout が Claude のコンテキストに追加
- exit 1: stderr がユーザーに表示されエラーとして記録（処理は継続）
- exit 2: ブロッキング制御 — **`reason`/stderr の送信先はイベントごとの decision control テーブルで決まる**
  - `PostToolUse`/`Stop`/`SubagentStop` → `reason` を **Claude へフィードバック**
  - `UserPromptSubmit`/`ConfigChange` → `reason` を **ユーザーへ表示のみ**（"Not added to context"）
  - `PreToolUse`/`PermissionRequest` → `hookSpecificOutput` による制御（別メカニズム）
  - `TeammateIdle`/`TaskCompleted` → Exit code のみ（stderr は Claude へフィードバック）
  - `Elicitation` → ブロック可。exit 2 でエリシテーションを拒否
  - `ElicitationResult` → ブロック可。exit 2 で応答をブロック（action は decline に変更）
  - `Notification`/`SessionStart`/`SessionEnd` 等 → ブロッキング不可
- **各イベントセクションの decision control テーブルを個別確認すること。一般ルールで一括判定してはいけない**
- ext-029 の explanation がブロッキング可能なイベントを9つ列挙していたが、`Elicitation` と `ElicitationResult` の2つが欠落していた（docs では11イベントがブロッキング可能） → known-issues.md のブロッキング対応イベントリストを9→11に更新（Elicitation, ElicitationResult を追加）
- Hook イベントタイプが22種から25種に増加。`TaskCreated`、`CwdChanged`、`FileChanged` の3イベントが追加された → known-issues.md の Hook イベント総数を 22→25 に更新。ブロッキング対応イベントも 11→12 に更新（TaskCreated 追加）
- ext-029 が「12イベント」と記述し、PreCompact をブロッキング不可リストに分類していた。docs (hooks.md, exit code 2 behavior per event) では PreCompact = "Yes" (Blocks compaction)。実際は **13 イベント** がブロッキング可能 → known-issues.md の「Hook イベント総数」セクションでブロッキング可能を 12→**13** に修正。13 イベント = PreToolUse, UserPromptSubmit, PermissionRequest, Stop, SubagentStop, TeammateIdle, TaskCreated, TaskCompleted, ConfigChange, PreCompact, WorktreeCreate, Elicitation, ElicitationResult

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

## MCP Tool Search のデフォルト動作（2026-04-06 確認）

- Tool Search は**デフォルトで有効**（ENABLE_TOOL_SEARCH=true 相当）。MCPツールは事前にコンテキストへロードされず、Claudeがオンデマンドで検索・使用する
- **「MCPツール定義がコンテキストの10%を超えると自動有効化」は誤り** — 10%閾値は ENABLE_TOOL_SEARCH=auto モード専用
- ENABLE_TOOL_SEARCH の値と動作: デフォルト未設定=常に遅延読み込み、auto=閾値ベース（10%未満なら事前ロード）、false=完全無効化
- 参照: mcp ページ 'Scale with MCP Tool Search' セクション
- この機能には Sonnet 4 以降または Opus 4 以降が必要。Haiku はサポート外

## 「推奨」と「非推奨」の混同

- ドキュメントが「AはBより推奨（recommended）」と記載していても、「Bは非推奨（deprecated）」とは限らない
- 「推奨」は相対的な優先度を示すだけであり、「非推奨」はそれより強い公式宣言
- **具体例（v4.42.0）**: mcp.md は "HTTP servers are the recommended option" と記載しているが、SSE について "deprecated" の文字は存在しない。quiz が "SSEは現在は非推奨です" と断定していたため修正
- `deprecated` という表現はドキュメントに明示的に記載されている場合のみ使用すること

## 存在しないフレーズの引用（具体例）

- "Delegate, don't dictate" は `how-claude-code-works` ページに掲載済み（`best-practices` ではない）
- "Ruthlessly prune" は best-practices ページの「The over-specified CLAUDE.md」パターンの Fix として記載済み（2026-03-10 確認）。memory ページにはなし
- "Keep it concise" は memory ベストプラクティスページに記載なし

## CLIフラグの組み合わせ（具体例）

- `--fork-session` は単独では動作しない → 正しくは `--continue --fork-session`

## パスの動的部分（具体例）

- `~/.claude/projects/memory/` → 正しくは `~/.claude/projects/<project>/memory/`

## Memory ページのアンカー（2026-03-01 確認）

- 有効アンカー: `#import-additional-files`, `#choose-where-to-put-claudemd-files`, `#view-and-edit-with-memory`, `#how-claudemd-files-load`, `#user-level-rules`, `#path-specific-rules`
- Auto Memory の `MEMORY.md` 読み込み制限が「先頭200行」から「先頭200行または25KB（先に到達した方）」に変更されている → known-issues.md に「MEMORY.md の読み込み制限は 200 lines or 25KB, whichever comes first」を追加

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
- ext-029: Hook のブロッキング対応イベント（Can block = Yes）は11: `PreToolUse`, `UserPromptSubmit`, `PermissionRequest`, `Stop`, `SubagentStop`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `WorktreeCreate`, `Elicitation`, `ElicitationResult`。**`PostToolUse` は Can block = No**（ツール実行済みのため exit 2 でも stderr を Claude に表示するだけ）

## multi-select 問題の完全性検証

- `type: "multi"` かつ「全て選んでください」の問題は、**ドキュメントに記載のある全有効オプションが選択肢に含まれているか**を逆方向でも検証すること
- 正解→ドキュメント照合（内容が正確か）だけでなく、ドキュメント→選択肢（網羅しているか）の確認も必要
- 具体例: skill-031（v4.41.0）は `.claude/commands/` と `~/.claude/commands/` のみ正解としていたが、`.claude/skills/<name>/SKILL.md` と `~/.claude/skills/<name>/SKILL.md` も有効パスとしてドキュメントに記載あり → 問題文を `commands/` 形式限定に絞って修正

## 外部知識の混入（具体例）

- 「ultrathink」は model-config ページに "include 'ultrathink' in your prompt to trigger high effort for that turn" と記載済み（2026-03-30 確認）。ただし「think hard」は未ドキュメント。「think」「think hard」を Claude Code 固有の動作として断言してはいけない
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

## 存在しないスラッシュコマンド・機能の混同

- `/summarize` はスラッシュコマンドとして存在しない。要約機能は `/rewind` メニュー内の「Summarize from here」オプションに統合済み
- `CLAUDE_CODE_SIMPLE=1`: minimal prompt、Bash/file のみ、MCP/hooks/CLAUDE.md 無効。ただし **`--mcp-config` 経由の MCP ツールは利用可能**（MEMORY confirmed）。quiz で通常モードの機能として記述しないこと

## UI 機能の名前混同

- **Task List** (`Ctrl+T`): ビルトインの進捗追跡 UI
- **`/todos`**: スラッシュコマンド（`CLAUDE_CODE_ENABLE_TASKS=false` 時に利用可能）
- **`/tasks`**: 別のスラッシュコマンド
- これら3つは異なる機能。quiz で混同しないこと

## チェックポイント復元オプション

- チェックポイント復元時は5つの選択肢がある: restore code+conv, conv only, code only, summarize, never mind
- 「2つ」「3つ」等の不正確な数値を記述しないこと

## Tool Search のモデル要件

- Tool Search は Sonnet 4+ / Opus 4+ が必要。Haiku は非対応（MCP ページに記載）

## effort level default value

- ses-045とses-102の両方がeffort levelのデフォルト値を"high"と記述していたが、ドキュメント(model-config)では Pro/Max=medium、その他(API key/Team/Enterprise/Bedrock/Vertex AI/Foundry)=high と明記。**Team は medium ではなく high**
- ses-045 と ses-102 がエフォートレベルを「3段階」(low/medium/high) と記述していたが、docs (model-config page) では第4レベル `max` (Opus 4.6専用、セッション単位、永続化されない) と `/effort auto` (デフォルトリセット) が追加されている。また ses-102 の explanation が設定方法を「3つ」と記述していたが、`/effort` コマンドと `--effort` CLI フラグの追加で4つになっている → generate-quiz-data SKILL.md にエフォートレベルの4段階 + auto、および設定方法4種を明記する
- key-016, ses-045 のエフォートレベル値が low/medium/high の3つのみで、max と auto が欠落していた → generate-quiz-data SKILL.md にエフォートレベルの5値 (low/medium/high/max/auto) と、設定方法5種（/effort, --effort, env var, settings, /model slider）を明記
- ses-045 の explanation/wrongFeedback と diagram が「max=Opus 4.6専用」「4段階」と記述していたが、ドキュメント (model-config) では Opus 4.7 にも `max` がサポートされ、さらに `xhigh` (Opus 4.7のみ) が追加されている。Opus 4.7 のデフォルトは `xhigh`。 → known-issues.md の「effort level default value」「モデル固有機能のスコープ」セクションを Opus 4.7 を含む3モデル対応に更新。`max` は3モデルサポート、`xhigh` は Opus 4.7専用、Opus 4.7 のデフォルトは `xhigh`、Opus 4.6/Sonnet 4.6 はプラン依存（Pro/Max=medium、その他=high）

## 存在しないCLIサブコマンド

- `claude commit` は CLI サブコマンドとして存在しない。MEMORY で確認済み

## Sandboxing の技術名称

- macOS: Seatbelt, Linux/WSL2: bubblewrap。ドキュメントページ: `/en/sandboxing`

## Hook イベント総数

- Hook event types は全 26 種（2026-04-04 確認）。25 種から `PermissionDenied` が追加された
- 全26種: `SessionStart`, `SessionEnd`, `InstructionsLoaded`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `CwdChanged`, `FileChanged`
- ブロッキング可能: 12 イベント（PreToolUse, UserPromptSubmit, PermissionRequest, Stop, SubagentStop, TeammateIdle, TaskCreated, TaskCompleted, ConfigChange, WorktreeCreate, Elicitation, ElicitationResult）
- `PermissionDenied`: auto mode classifier がツール呼び出しを拒否した時。ブロッキング不可だが `{retry: true}` を返すとモデルにリトライを許可できる

## 環境変数（追加）

- `BASH_MAX_TIMEOUT_MS`: settings.md 記載済み（モデルが設定可能な最大タイムアウト）
- `CLAUDE_CODE_CLIENT_CERT`/`CLAUDE_CODE_CLIENT_KEY`/`CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`: mTLS 用として settings.md に記載あり
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 1-100 値。コンテキストの何%でオートコンパクションが発火するかの閾値（settings page）
- `MAX_MCP_OUTPUT_TOKENS`: デフォルト 25,000 / 警告は 10,000 トークン時点（settings page）
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`: `--add-dir` フラグとの併用が必須。単独設定では機能しない

## Tool Search のデフォルト動作

- Tool Search はデフォルトで有効（全 MCP ツールが遅延読み込み、ツール名のみコンテキストに入る）
- `ENABLE_TOOL_SEARCH=auto` はデフォルトではない。閾値ベースの代替モードで、ツール定義がコンテキストの 10% 以内なら事前読み込み、超えたら遅延読み込みになる
- Tool Search は Sonnet 4 以降 / Opus 4 以降が必要。Haiku は非対応
- `ANTHROPIC_BASE_URL` がサードパーティホストの場合、Tool Search はデフォルト無効（プロキシが `tool_reference` ブロックを転送しないため）

## Plugin source types

- Plugin の source は5種類: relative path（）, github, url, git-subdir, npm（pip はドキュメントに存在しない。2026-04-04 再確認）
-  はモノレポ向けスパースクローン（sparse-checkout）
- plugin-marketplaces ページで確認: relative path, github, url, git-subdir, npm の5種のみ

## キーボードショートカット（追加）

- `Ctrl+C` = generation cancel のみ（exit ではない）。`Ctrl+D` = exit
- `/terminal-setup` は `Shift+Enter` バインディングのみをインストールする（VS Code, Alacritty, Zed, Warp 等の非ネイティブ端末向け）。iTerm2/WezTerm/Ghostty/Kitty では設定不要
- `Option+T`（Extended Thinking トグル）は「Option as Meta」のターミナル設定が必要。`/terminal-setup` の機能ではない（2026-04-05 interactive-mode.md で再確認）
- `Alt+B`/`F`/`Y`/`M`/`P`/`T` は全て "Option as Meta" 設定が必要（macOS）
- `Shift+Tab` でパーミッションモード切替（Normal→Auto-Accept→Plan）。`Alt+M` は "some configurations" のみ（interactive-mode.md）— 全環境対応ではない

---

## `.claude/rules/` フロントマターフィールド

- `.claude/rules/` のYAMLフロントマターで文書化されているフィールドは `paths` のみ（globパターンで適用対象ファイルを指定）
- `description` フィールドは **Skills** のフロントマターフィールドであり、rules には存在しない
- mem-044, mem-047 が `description` を rules のフロントマターとして参照していたため修正（v4.45.0）

---

## エージェントチームのプラットフォーム制限

- エージェントチームは CLI と Agent SDK でのみ利用可能。デスクトップアプリでは利用不可（docs: "Agent teams: multi-agent orchestration is available via the CLI and Agent SDK, not in Desktop"）
- quiz でエージェントチームのプラットフォーム対応を記述する場合はこの制限を正確に反映すること

---

## 要改善候補（info-level 蓄積）

> スキャンで info-level として報告されたが即時修正不要の項目。将来の品質改善パスで対応する。

### 短い wrongFeedback（v4.46.0 時点）

~~cmd-049, cmd-057, cmd-058, cmd-062, key-001~~ → v4.46.0 で修正済み（5問6エントリ拡充）

## Lint auto-fix for proper nouns (Git Bash)

- quiz:lint のバッククォート自動修正が "Git Bash" を "Git `Bash`" に変換した。"Git Bash" はプロダクト名であり、ツール名 `Bash` とは異なる → quiz:lint のバッククォート自動修正に "Git Bash" などの固有名詞の例外パターンを追加検討
- ses-133 で quiz:lint のバッククォート自動修正が "Git Bash" を "Git `Bash`" に変換した。"Git Bash" は Git for Windows に含まれるプロダクト名であり、Claude Code のツール名 `Bash` とは異なる → quiz-lint.mjs のバッククォート自動修正に "Git Bash" などの固有名詞の例外パターンを追加する
- ses-133 で quiz:lint が "Git Bash" を "Git `Bash`" に変換。"Git Bash" は Git for Windows のプロダクト名でありツール名 `Bash` とは異なる → quiz-lint.mjs のバッククォート自動修正に "Git Bash" の例外パターンを追加
- ses-133 で quiz:lint のバッククォート自動修正が "Git Bash" を "Git `Bash`" に繰り返し変換している。"Git Bash" は Git for Windows のプロダクト名であり、Claude Code のツール名 `Bash` とは異なる → quiz-lint.mjs のバッククォート自動修正に "Git Bash" の例外パターンを追加する
- quiz:lint のバッククォート自動修正が "Git Bash" を "Git `Bash`" に変換し続ける。ses-133 で毎回修正が必要。 → quiz-lint.mjs のバッククォート自動修正に "Git Bash" を例外パターンとして追加する
- quiz:lint reported 206 distractor issues (correct-too-long, format-giveaway, distractor-too-short) → Consider a dedicated pass to balance option lengths and add backticks to wrong options
- quiz:lint reported distractor issues (correct-too-long, format-giveaway, distractor-too-short) → Consider a dedicated pass to balance option lengths and add backticks to wrong options
- quiz:lint のバッククォート自動修正が毎回 bp-059, bp-061, bp-064 で修正を行う（7 fixes in 3 questions）。これらは `WebFetch` や `Bash` のようなツール名が自由テキスト内で使われるケース → quiz:lint のバッククォート自動修正ルールをより精密にするか、修正済みの結果が保存されるようワークフローを調整

## Agent teams terminology (teammates vs subagents)

- skill-039 の wrongFeedback がデスクトップアプリでの利用可能性を誤って記述していた。docs は "available via the CLI and Agent SDK, not in Desktop" と明記 → エージェントチーム関連問題の生成時に CLI/Agent SDK のみ利用可能というプラットフォーム制限を明記するガイドラインを追加
- key-016 が question タイトルに "拡張思考（Extended Thinking）" を使用。model-config docs では Opus 4.6/Sonnet 4.6 の思考機能は "adaptive reasoning" と表記。ただし settings.md と interactive-mode.md では一般的な思考機能として "Extended Thinking" を使用しており、用語の使い分けが必要 → known-issues.md に「"Extended Thinking" は一般的な思考機能名として使用可。Opus 4.6/Sonnet 4.6 固有の動作を説明する場合は "adaptive reasoning" を使用」というガイドラインを追加
- cmd-033 の explanation が「`claude commit` サブコマンドは存在しません」と正しく否定的に述べているのに、terminology checker がフラグした → ✅ RESOLVED (2026-04-20): quiz-lint.mjs に `skipIfNegated` オプションを追加し、`claude commit` / `/teleport` エントリに設定。40文字以内に「存在しません」「ではない」「does not exist」等の否定語があればスキップ
- key-016 の diagram.label が "Extended Thinking動作" となっており、known-issues に記載の用語ガイドライン（Opus 4.6/Sonnet 4.6 固有の動作には "adaptive reasoning" を使用）と不整合 → quiz:edit コマンドが diagram.label フィールドをサポートしていないため、quiz-utils.mjs に diagram サブフィールドの編集サポートを追加する
- cmd-033 が「`claude commit` サブコマンドは存在しません」と正しく否定しているのに terminology checker がフラグし続ける。毎回 known-issue 確認が必要 → ✅ RESOLVED (2026-04-20): `skipIfNegated` で構造的に解決済み
- key-011 が `Ctrl+F` を全バックグラウンドエージェント停止ショートカットとして記載していたが、正しくは `Ctrl+X Ctrl+K`（コードバインディング）。interactive-mode ドキュメントで明確に定義されている → generate-quiz-data SKILL.md のキーボードショートカットセクションに `Ctrl+X Ctrl+K`（全バックグラウンドエージェント停止）を明記
- cmd-033 の explanation「`claude commit` サブコマンドは存在しません」を terminology checker が毎回フラグ。known-issues にも複数回記載されている → ✅ RESOLVED (2026-04-20): `skipIfNegated` で構造的に解決済み。全ての terminology エントリで必要に応じてこのフラグを指定可能

## /memory と /context の役割の違い

- `/memory` = CLAUDE.md ファイルの読み込み確認・編集・オートメモリ制御。公式ドキュメントで「CLAUDE.md が指示通りに動かない場合の**第一デバッグ手順**」として明示
- `/context` = コンテキストウィンドウの使用量可視化（カテゴリ別トークン表示・最適化提案）
- 「CLAUDE.md が読み込まれているか確認する」問題に `/context` を正解として生成しないこと（mem-063 で修正済み・2026-04-05）
- mem-063 が /context を正解にしていたが公式docs は /memory を推奨

## dontAsk パーミッションモードのプラットフォーム制限

- `dontAsk` パーミッションモードは CLI のみで利用可能。デスクトップアプリでは利用不可
- quiz で `dontAsk` モードを記述する場合は CLI 限定であることを正確に反映すること

## CLAUDE.md line count recommendation inconsistency

- skill-048 が 500行を正解としていたが、memory page は "target under 200 lines per CLAUDE.md file" と明記。features-overview に "~500 lines" と "200 lines" の両方が記載されており混乱の原因 → known-issues.md に「CLAUDE.md 推奨行数は200行/ファイル（memory page）。features-overview に ~500 lines の記載もあるが、200 がプライマリ推奨」を追加
- known-issues.md が 'CLAUDE.md のスコープは4段階: Managed > Project > Local > User' と記載しているが、MEMORY.md と quiz データは 'Managed > Project > User > Local' を使用 → known-issues.md の該当行を 'Managed > Project > User > Local（MEMORY.md・quiz データ・docs テーブル順で確認済み）' に修正
- known-issues.md が 'CLAUDE.md のスコープは4段階: Managed > Project > Local > User' と記載しているが、MEMORY.md と quiz データは 'Managed > Project > User > Local' を使用 → known-issues.md の該当行を 'Managed > Project > User > Local（MEMORY.md・quiz データ・docs テーブル順で確認済み）' に修正

## quiz:lint distractor issues accumulation

- 206件の distractor issues（correct-too-long: 106, format-giveaway: 46, distractor-too-short: 54）が蓄積。正解の長さの偏りとバッククォート書式の不均衡が多い → 専用パスとして distractor 品質改善バッチを検討（正解の短縮 or 不正解への具体性追加）
- 206件のdistractor issues（correct-too-long: 106, format-giveaway: 46, distractor-too-short: 54）が蓄積したまま → 専用の distractor 品質改善バッチを検討
- 220件の distractor issues が蓄積（correct-too-long: 115, format-giveaway: 46, distractor-too-short: 59） → 専用の distractor 品質改善パスを検討。正解選択肢の短縮または不正解選択肢への具体性追加
- 39問のtarget問題に25文字未満のwrongFeedbackがあった（全体的な品質改善候補） → 専用の wrongFeedback 品質改善パスを検討。「なぜ誤りか」の説明を30文字以上に拡充
- quiz:lint が220件の distractor issues を報告（correct-too-long: 115, format-giveaway: 48, distractor-too-short: 56） → 正解選択肢の短縮または不正解選択肢への具体性追加の専用パスを検討
- `quiz:lint` が 55問で difficulty mismatch を検出。score=-1/-2（容易方向）が 54問、score=+2（難化方向）が 1問。全て Step 0a の lint 出力から機械的に抽出可能 → quiz-refine SKILL.md の Step 0a（lint 前処理）の直後に「difficulty auto-fix」ステップを追加。score<=-1 と score>=+2 を自動適用。ロジックを scripts/quiz-utils.mjs に統合し `npm run quiz:difficulty-fix` として expose

## Automated pattern scanning efficiency

- 557問のフルスキャンで、Known Issues に記載された全パターンを自動スクリプトで検証したが、全て既に修正済みであった → 今回の自動スキャンスクリプトのパターンをquiz-utils.mjsに統合し、quiz:fact-checkのカバレッジを拡張する

## allowManagedHooksOnly wrongFeedback precision

- ses-052 の wrongFeedback.2 が「マネージド以外のHooks」と曖昧に記述しており、SDK hooks が許可される点が不明確 → wrongFeedback で allowManagedHooksOnly の範囲を記述する場合は「User/Project/Plugin のフックが無効化される。Managed と SDK のフックは許可される」と正確に記述するガイドラインを追加
- extensions カテゴリ中心に 25 文字未満の短い wrongFeedback が多数存在（ext-042, ext-048, ext-051, ext-058, ext-059, ext-060, ext-064, ext-067, ext-070, ses-038, ses-042, ses-050, ses-062, ses-064, ses-078） → 短い wrongFeedback を 30 文字以上に拡充し、「なぜ誤りか」の説明を具体化するパスを検討

## Non-blocking event list completeness

- ext-029 の非ブロッキングイベント一覧から `PostToolUseFailure` と `StopFailure` が欠落していた → チェックリスト A に「ブロッキング/非ブロッキングイベント一覧を列挙する場合は22種全てが網羅されているか確認」を注記
- ext-053 の explanation と wrongFeedback で、TaskCompleted イベントの発火条件として「Agent Teamsのチームメイトが進行中タスクを残したままターンを終了した時」という記述があったが、公式ドキュメントには "When a task is being marked as completed" としか記載されていない → known-issues.md に「TaskCompleted の発火条件はドキュメント記載の 'When a task is being marked as completed' のみ。追加条件を断言しない」を追記

## referenceUrl domain migration

- 全630問のreferenceUrlが`/docs/ja/`を使用していたが、quiz-lintは`/docs/en/`を期待していた。テストコード（quizContentQuality.test.ts）も`/docs/ja/`を期待していたため、lintとtestで不整合があった → quiz-lint.mjsとquizContentQuality.test.tsのURL prefix定義を統一するチェックをCIに追加。言語切替が発生した場合の一括変換スクリプトも検討

## CLAUDE.local.md ドキュメント復帰（確認済み）

-  は現在のドキュメント（memory.md）に**掲載されている**（2026-04-04 再確認）。Local scope はテーブルに記載されており「削除」は誤り
- CLAUDE.md のスコープは4段階: Managed > Project > Local > User（ は Local scope）
- settings.json スコープは5段階: Managed > CLI > Local > Project > User（異なる）
- 以前の「CLAUDE.local.md removal」という記録は古い情報。quiz で「3スコープ」「Local scope が存在しない」と記述しないこと

## @import does not support glob patterns

- mem-046 が `@import` で glob パターンがサポートされていると主張していたが、docs には glob/wildcard の記載なし。docs は「Both relative and absolute paths are allowed」のみ → known-issues.md に「`@import` は個別ファイルパスのみ。glob パターン（`@docs/*.md`）は未ドキュメント」を追加
- key-016 の diagram.label が "Extended Thinking動作" のまま残存しており、quiz:edit コマンドでは diagram サブフィールドの編集ができない → quiz-utils.mjs の edit コマンドに `diagram.label`, `diagram.steps[N].text`, `diagram.steps[N].sub` 等の diagram サブフィールド編集サポートを追加する

## Stale targets files cleanup

- `.claude/tmp/quizzes/` に古い `*_targets.json` と `*_batch*.json` ファイルが残存しており、修正済みの古いデータが含まれている → verify:diff スクリプトの冒頭で古いファイルを自動削除する

## Distractor quality batch improvement

- quiz:lint が 220 件の distractor issues を報告（correct-too-long: 115, format-giveaway: 46, distractor-too-short: 59）。正解選択肢が不正解の平均の2倍以上長い問題が多数 → 専用の distractor 品質改善パスを作成。正解選択肢の短縮または不正解選択肢への具体性追加
- quiz:lint で distractor 120 件（correct-too-long 74 + distractor-too-short 46）を検出。known-issues.md に 5 回以上「専用パス必要」と記録されているが未着手。今回も SKILL.md の fix mode は critical/major のみを修正対象とするため、info severity の distractor は素通り → `/quiz-balance-distractors` 専用スキルを作成（quality-loop に組み込み）。入力は `quiz:lint distractor` の JSON 出力、処理は (a) 正解選択肢の短縮提案 または (b) 不正解選択肢の具体性追加、出力は `quiz:edit` 経由でバッチ適用

## 1Mコンテキスト料金の誤認パターン

- ses-105 が「200Kトークンを超えるとロングコンテキスト料金が適用される」と記述していたが、ドキュメントは「standard model pricing with no premium for tokens beyond 200K」と明記。プレミアム料金なしが正しい → known-issues.md に「1Mコンテキスト窓は通常料金。200K超えのトークンにプレミアムなし。サブスクリプション包含プランはそのまま利用可能、extra usage経由プランはextra usageとして課金」を追加

## AI パイプライン教訓（v4.51+）

- Haiku の出力は markdown code fence で囲まれることがある。パーサーで strip 必要
- Haiku の OK 判定のみ信頼。flag/uncertain は全て上位モデルへ渡す（偽陰性ゼロ設計）
- compressed-input.json が存在しない場合は rolling-7d.json にフォールバック必須
- プロンプトが長い場合は stdin pipe で渡す（シェル引数制限回避）

## 定義一貫性の教訓（v4.51+）

- XP（学習量）とマスタリーレベル（正答率）は別概念。UI で並行表示すると混乱 → 統合が必要
- recommendedAccuracy は lastCorrect ではなく correctCount/attempts を使う
- パターン→カテ���リのマッピングは改善パターンにも対応するため固定テーブルが必要

## /todos コマンド削除の追跡

- cmd-007 が `/todos` をアクティブなスラッシュコマンドとして記述していたが、commands.md から削除済み。また `CLAUDE_CODE_ENABLE_TASKS=false` で「旧/todosに戻る」という説明も現在のドキュメント記載と一致しない → known-issues.md に「/todos はコマンドリストから削除済み（2026-04-06確認）。現在の docs に記載なし。CLAUDE_CODE_ENABLE_TASKS=1 は非インタラクティブモードでのタスクトラッキング有効化」を追加

## 自動スキャンパターンの精度向上

- grep ベースのパターンマッチングで false positive が多発（PostToolUse+ブロック、Ctrl+B+bashなど） → 否定的文脈でのキーワード使用を区別するチェックを追加

## `scripts/pre-verify-quiz.mjs` is missing ✅ RESOLVED (2026-04-18)

- SKILL.md Step 0c は `node scripts/pre-verify-quiz.mjs` を呼び出すが、ファイルは存在しない（`scripts/pre-lint-quiz.mjs` のみ存在）
- **解決**: commit `ee41ea1` で Step 0c の参照を `pre-lint-quiz.mjs` に差し替え。Haiku 事前フィルタはアスピレーショナルだったため記述を削減、決定論的 lint の使い方を明記。Step 0d は将来の Opus バッチ監査用に予約枠として最小記述で残す

## 762問全件スキャン時の逐次処理が非現実的

- 今回のように広範な docs 変更（30ページ）で content-hash が変わると、全762問が verify 対象となり、逐次 Sonnet 検証は時間・コスト面で非現実的 → verify:diff に `doc-changed` のみで拾われた問題は lint-level の差分検査に留め、実質的な content-changed のみ Sonnet 検証に回す閾値設計を検討。あるいは team モード必須化

## format-giveaway 是正の機械的パターン

- 正解のみバッククォート、不正解プレーンテキストの4問（key-006, ses-016, ses-064, ses-078）は、不正解内の技術用語・名詞にバッククォートを追加するだけで解消 → quiz:lint の auto-fix に、同一問題内で正解のみがバッククォート含有の場合に不正解内の候補語（技術用語辞書との一致）へバッククォート付与を試みる自動修正を追加。あるいは generate-quiz-data SKILL.md に「distractor にも技術用語にはバッククォートを付ける」ガイドラインを明記

## correct-too-long が91件、distractor-too-short が47件、高止まり

- 専用改善バッチの必要性が known-issues.md に何度も記載されているが、未着手 → `/quiz-balance-distractors` のような専用スキル/スクリプトを新規作成し、quality-loop に組み込む
- 既に known-issues.md 内で複数回記録されているが未解決。今回も 90件検出（distractor-too-short 47件も継続）。distractor 品質専用パスの必要性が継続している → `/quiz-balance-distractors` 専用スキルを作成。quality-loop に組み込む。または quiz:lint にバッククォート以外の auto-fix（正解短縮・不正解拡張の提案生成）を追加

## 難易度不整合が55件

- advanced→beginner の reclassify が55問で検出。多くは単純な事実問題で advanced 扱い → difficulty-calibrator エージェントの自動実行を quality-loop に組み込み、score<=-1 は自動で降格、score>=+2 は昇格を提案する

## `default` モデルエイリアスのプラン別マッピング更新 ✅ RESOLVED (2026-04-18)

- ses-103 が「Max/Team Premium のデフォルトは Opus 4.6」と記述していたが、ドキュメントは「Max/Team Premium → Opus 4.7」「Pro/Team Standard/Enterprise/Anthropic API → Sonnet 4.6」「Bedrock/Vertex/Foundry → Sonnet 4.5」と更新済み
- **解決**: commit `0048e98` で ses-103 を修正、MEMORY.md + `docs/verified-facts.md` にプラン別マッピングを citation 付きで記録

## quiz:edit が `\n` をエスケープしてしまう ✅ RESOLVED (2026-04-18)

- `node scripts/quiz-utils.mjs edit <id> explanation '...\n...'` を実行すると、`\n` が `\\n` (literal backslash-n) として保存される
- **解決**: commit `ee41ea1` で `scripts/quiz-utils.mjs` の edit コマンドに `\n` / `\t` / `\\` のアンエスケープ処理を追加

## 1Mコンテキスト対応モデルリストの更新 ✅ RESOLVED (2026-04-18)

- ses-105 explanation と diagram が「Opus 4.6 と Sonnet 4.6 が 1M コンテキストをサポート」と記述していたが、docs (model-config) は「Opus 4.7, Opus 4.6, Sonnet 4.6」の 3 モデル
- **解決**: commit `0048e98` で ses-105 を修正、MEMORY.md + `docs/verified-facts.md` に 3 モデル対応として記録

## TaskCompleted explanation の backtick close 漏れ

- ext-053 の explanation 冒頭が `\`TaskCompletedイベントは...\`TaskUpdate\`` と、`TaskCompleted` の後ろの閉じバッククォートが欠落していた → quiz-lint.mjs のバッククォート整合性チェックで「`<word>` の `` の総数が偶数でない」場合をエラー報告する。または「`Foo` で始まり、 `Bar` の前に閉じが見つからない」パターンを警告

## Pre-lint fact tier の実態は "疑わしい語" の存在のみ

- pre-lint-quiz.mjs が 56問を fact tier としてフラグしたが、10問以上を spot-check した結果、実際の誤りはゼロ。全て factCheck:flags/factCheck:env 等のキーワード一致のみで、否定文脈（「～は存在しない」）や正しい記述も含まれていた → pre-lint-quiz.mjs の fact tier 判定に「否定文脈の共起除外」を追加（cmd-033 known-issue と同じパターン）。または Sonnet 検証を省略して lint 出力をそのまま skill-proposals に転記し、人間が判断する運用へ変更

## Team モード不在時の代替戦略

- `--team` 指定にも関わらず Task ツールが現環境で利用不可。並列エージェント起動ができないため、762問全件の Sonnet 検証は実質不可能。結果として fact-tier 56問の spot-check と機械的 lint 修正に留まった → quiz-refine SKILL.md に「Task ツール利用不可時の fallback」を明記。pre-lint fact-tier のみを Sonnet 検証対象とし、quality-tier は lint 結果そのものを修正提案として扱う（Sonnet 検証スキップ）

## Task/Agent ツール利用不可時のフォールバックを本フローのデフォルトに昇格

- 762 問の full scan で Sonnet targets が 154 に絞られたが、forked skill context では Task/Agent ツールが利用できず、並列検証を起動できなかった。fact-tier 57 問のうち 20 問を spot-check した結果は全て正しく、`known-issues.md` 既記載の「pre-lint fact tier の実態は keyword hit のみ」パターンと一致 → quiz-refine SKILL.md の Step 0 直後に「forked-skill 判定 → Agent ツール不可時は fact-tier spot-check のみ → 修正なしで verify:save へ」の明示的パスを入れる。現行 SKILL.md は `--team` 失敗時のみフォールバックと読めるが、forked context では常時 Agent 利用不可のため、`scripts/verify-category-headless.mjs` を経由した subprocess 並列化を常用パスに昇格させる

## pre-lint の tiers にラベル「mechanical-fixable」を追加

- 今回の run では `tiers.fact=57, quality=97, autofix=0` と表示され、autofix ゼロに見えたが、実際は quiz:lint の distractor 120 件が機械的に改善可能。tier ラベルが現実と乖離 → scripts/pre-lint-quiz.mjs の tier 分類を拡張し、「distractor-fixable」「difficulty-fixable」「backtick-fixable」の 3 つのサブカウントを追加。Skill の summary 出力でも表示
