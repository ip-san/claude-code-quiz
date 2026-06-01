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
- ext-108 が共通入力フィールドを 5 つ列挙していたが、hooks.md L506-514 の Common input fields テーブルには `effort` フィールドが追加されており、合計 6 つが正しい。`effort` は `level` プロパティを持つオブジェクトで、ツール実行コンテキストのイベント（`PreToolUse`/`PostToolUse`/`Stop`/`SubagentStop`）でのみ受け取る注記あり → `known-issues.md` の「Hook イベント総数」セクション、または別途「Hook Common input fields」セクションに「`effort` フィールド（ツール実行コンテキスト限定）が追加されている。合計 6 フィールド」を追記。`MEMORY.md` の Hook 関連 Verified Facts にも「Common input fields = 6 (session_id, transcript_path, cwd, permission_mode, effort, hook_event_name)」を追加

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

## Hooks ページのアンカー（2026-05-31 確認 / lint false-positive）

- `hooks#configuration` は**有効なアンカー**。quiz:lint の `[URL Anchors] invalid-anchor "#configuration" not found in "hooks"` は **false-positive**（ext-004 / ext-085 / ext-087）
- 根拠: (1) hooks reference ページの "On this page" TOC に `Configuration` セクションが存在する、(2) 公式 hooks-guide が `code.claude.com/docs/en/hooks#configuration` へクロスリンクしている（hooks-guide.md L543）
- 原因: hooks **reference** ページの fetch では見出しが `##` markdown ではなくプレーンテキストに平坦化されるため、slugify ベースのアンカー抽出が拾えない。`hooks-guide` ページは正常に `##`/`###` を持つ
- 対応: これら3問の `referenceUrl` は修正不要。URL Anchors lint は report-only なのでブロックしない

## SDK・ライブラリの改名履歴

- 「Claude Code SDK」→「Claude Code Agent SDK」→「Claude Agent SDK」と改名済み
- `Task` ツールは Claude Code CLI では `Agent` に改名されたが、Agent SDK の `allowedTools` 設定には `Task` と指定する必要がある（CLI 文脈か SDK 文脈かで正しい名称が異なる）

## 用語: Microsoft Foundry（2026-05-31 確認 / doc-string false-positive 注意）

- プロジェクト正式表記は **「Microsoft Foundry」**（`topic-config.mjs` TERMINOLOGY_DICT: `Azure Foundry`→`Microsoft Foundry`、doc page slug も `microsoft-foundry`）
- **注意**: 一部の公式ドキュメント（`fast-mode.md` 等）は冗長形「Microsoft Azure Foundry」を使う。検証エージェントが doc 文字列に合わせて quiz を「Microsoft Azure Foundry」へ修正提案するのは **false-positive**。terminology lint が `Azure Foundry → Microsoft Foundry` で巻き戻すため、doc の冗長形に合わせないこと（ses-117 で実際に発生・revert 済み）

## デフォルトモデルのプラン別対応（2026-05-31 確認）

- **Opus 4.8** = Max / Team Premium / Enterprise pay-as-you-go / Anthropic API のデフォルト（model-config.md L124）
- **Opus 4.7** = Claude Platform on AWS のデフォルト（同 L125）。Max/Team Premium のデフォルトを「Opus 4.7」とするのは旧情報（ses-103 で修正済み）
- **Sonnet 4.6** = Pro / Team Standard / Enterprise サブスクリプション席（L126）、**Sonnet 4.5** = Bedrock/Vertex/Foundry（L127）
- `xhigh` エフォートは **Opus 4.8 / Opus 4.7 のみ**（Opus 4.6 / Sonnet 4.6 は high にフォールバック、model-config.md L146-147）。旧 known-issues の「Opus 4.7 専用」は 4.8 追加後の stale 表記

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

- Hook event types は全 30 種（2026-06-01 hooks.md lifecycle table で再確認）。26→29 で `Setup`・`UserPromptExpansion`・`PostToolBatch`、**29→30 で `MessageDisplay`**（matcher なし・非ブロッキング、"While assistant message text is displayed"）が追加された
- 全30種: `SessionStart`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `MessageDisplay`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `SessionEnd`
- 追加3種の意味: `Setup`（`--init-only`/`--init`/`--maintenance` 時の一回限り準備）、`UserPromptExpansion`（コマンド展開がプロンプト化される前。展開をブロック可）、`PostToolBatch`（並列ツール呼び出しのバッチ解決後・次のモデル呼び出し前。エージェントループを停止可）
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
- quiz:lint の distractor チェックで correct-too-long: 42, distractor-too-short: 46 が継続的に蓄積。known-issues.md L370-371, L412-414 で 5 回以上「専用パス必要」と記録されているが、本 SKILL.md は critical/major のみを修正対象とするため info-level は素通り → `/quiz-balance-distractors` 専用スキルを新規作成（または quality-loop に組み込み）。入力は `quiz:lint distractor --json` の出力、処理は (a) 正解選択肢の短縮提案 or (b) 不正解選択肢への具体性追加を Haiku で生成、出力は `quiz:edit` 経由でバッチ適用。または quiz-refine の fix mode に `--distractor-balance` オプションを追加

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
- 本 run（--full）も forked skill context で実行されたため、`--team` 並列起動が不可。SKILL.md の "フォールバック運用" (L138-159) に従い、決定論的修正 + spot-check に留めた → SKILL.md の Step 0 に「Agent tool 利用可否の検出フラグ」を追加し、forked 環境では自動的に fallback パス（pre-lint fact-tier の spot-check + 決定論的修正のみ）に分岐。`scripts/verify-category-headless.mjs` を主要パスに昇格させ、`--team` フラグを「並列モード(Agent tool)」「並列モード(subprocess fallback)」の 2 モードで明示

## /memory と /context の役割の違い

- `/memory` = CLAUDE.md ファイルの読み込み確認・編集・オートメモリ制御。公式ドキュメントで「CLAUDE.md が指示通りに動かない場合の**第一デバッグ手順**」として明示
- `/context` = コンテキストウィンドウの使用量可視化（カテゴリ別トークン表示・最適化提案）
- 「CLAUDE.md が読み込まれているか確認する」問題に `/context` を正解として生成しないこと（mem-063 で修正済み・2026-04-05）
- mem-063 が /context を正解にしていたが公式docs は /memory を推奨
- forked skill context で `node scripts/verify-category-headless.mjs <cat> --model=sonnet` を 8 並列起動したが、`claude -p` サブプロセスが全て無音終了した。プロンプトファイル（99〜101KB）は正常生成、stdout に `[<cat>] calling claude -p --model sonnet...` のログだけ残って約 30 秒以内に終了。verify_*.json は新規生成されず、5/9 の古い commands.json のみが残った状態 → SKILL.md の「フォールバック運用」セクションに以下を追記:

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
- pre-lint で 88 件の distractor 警告（46 件 too-short、42 件 correct-too-long）が検出。これらは事実誤認ではないが LLM の判断が必要なバランス調整。今回も処理できず累積 → SKILL.md に「distractor lint warnings はファクトチェックの責務外。`/quality-loop --monthly` の Opus 1M context で横断的に再バランスする」を明記。pre-lint レポートで distractor のみ flag された問題を sonnetTargets から除外（または別 tier に分離）

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
- 今回の full scan で 56 問が fact tier としてフラグされたが、cross-check と env/flags キーワードヒット 15 問の spot-check では、ext-108 を除く 14 問は全て正しい記述だった。known-issues.md の「Pre-lint fact tier の実態は 疑わしい語 の存在のみ」(L441)、「Task/Agent ツール利用不可時のフォールバックを本フローのデフォルトに昇格」(L449) に何度も記載されているパターンが今回も継続 → SKILL.md のフォールバックパスを再強調する。fact-tier 全件を Sonnet に投げるのではなく、crossCheck と factCheck:knownNonexistent のみを最優先（高シグナル）、factCheck:flags/env はサンプリング（10問程度）で良い。または pre-lint-quiz.mjs に「否定文脈（`存在しない`, `does not exist`, `ではない` 等の40文字以内共起）はフラグから除外」を実装

## Team モード不在時の代替戦略

- `--team` 指定にも関わらず Task ツールが現環境で利用不可。並列エージェント起動ができないため、762問全件の Sonnet 検証は実質不可能。結果として fact-tier 56問の spot-check と機械的 lint 修正に留まった → quiz-refine SKILL.md に「Task ツール利用不可時の fallback」を明記。pre-lint fact-tier のみを Sonnet 検証対象とし、quality-tier は lint 結果そのものを修正提案として扱う（Sonnet 検証スキップ）

## Task/Agent ツール利用不可時のフォールバックを本フローのデフォルトに昇格

- 762 問の full scan で Sonnet targets が 154 に絞られたが、forked skill context では Task/Agent ツールが利用できず、並列検証を起動できなかった。fact-tier 57 問のうち 20 問を spot-check した結果は全て正しく、`known-issues.md` 既記載の「pre-lint fact tier の実態は keyword hit のみ」パターンと一致 → quiz-refine SKILL.md の Step 0 直後に「forked-skill 判定 → Agent ツール不可時は fact-tier spot-check のみ → 修正なしで verify:save へ」の明示的パスを入れる。現行 SKILL.md は `--team` 失敗時のみフォールバックと読めるが、forked context では常時 Agent 利用不可のため、`scripts/verify-category-headless.mjs` を経由した subprocess 並列化を常用パスに昇格させる

## pre-lint の tiers にラベル「mechanical-fixable」を追加

- 今回の run では `tiers.fact=57, quality=97, autofix=0` と表示され、autofix ゼロに見えたが、実際は quiz:lint の distractor 120 件が機械的に改善可能。tier ラベルが現実と乖離 → scripts/pre-lint-quiz.mjs の tier 分類を拡張し、「distractor-fixable」「difficulty-fixable」「backtick-fixable」の 3 つのサブカウントを追加。Skill の summary 出力でも表示

## 「選択肢X（正解）」ラベルと correctIndex の整合性チェック

- sdk-015 の hierarchy.items に「選択肢D（正解）」と書かれていたが、`correctIndex: 0` は Option A（先頭）。残りの選択肢ラベル（A/B/C）も options 配列の順序と一致せず、wrongFeedback の内容と入れ違いになっていた。 → `scripts/quiz-utils.mjs` に新規チェック `check-option-labels` を追加。`hierarchy` や `flow` 内の `text` フィールドに `選択肢A〜D（正解）` が含まれる場合、`correctIndex` が指す添字（0=A, 1=B, 2=C, 3=D）と一致するかを検証する。`quiz:check` 本体にも統合可能。

## flow.steps の機械的分断（既知の課題）

- sdk-007、sdk-013 で flow.steps[N].text と sub が一文を前後半に分断していた（"Anthropic Client SDKでは" / "、ツールの実行ループを..."、"Claude Co" / "deと同じ..."）。`bun run quiz:check-diagram-text` で 327 件検出。checklist.md L62-66 に既記載のパターン。 → 既知タスク（checklist L66）として `quiz:check` への統合を急ぐ。または「flow→hierarchy 自動変換スクリプト」を導入し、sub が `、` `を` `た` `です` 等で始まる場合に hierarchy へ移行する候補をバッチ生成する。

## comparison.heading の文字数制約

- sdk-014 で comparison.columns[].heading が "SDK版ではシェルコマン" "Python/TypeS" と途中で切られていた（10-12字程度）。heading は列タイトルなので 12 字以内推奨だが、長い説明文の前半を見出しに入れてしまっていた。 → `scripts/quiz-utils.mjs` に `check-comparison-heading-truncation` を追加し、heading が単語の途中（カナ/英字が途切れている）で終わっていないか機械チェック。items にも同様の検査が必要かもしれない。

## ドキュメント全更新時の incremental 挙動

- 21 ページのドキュメントが changed と判定され、結果として 775 問**全件**が doc-changed として targets に入った。incremental の利点が消失 → `verify:diff` に「ドキュメント変更件数が閾値（例: 10ページ）を超えた場合は警告を出し、`/quality-loop` への委譲を推奨」する分岐を追加。または fact-tier に絞った優先処理モード（`--fact-only`）を新設

## 8並列ディープ検証の結果（2026-05-23, 125 flagged 全件）

- pre-lint flagged 125 問（fact=58, quality=67）を 8 並列 quiz-verifier で全件検証。**critical 0 / major 7 / minor 16 / false-positive 76（61%）**。distractor（quality-tier）の lint フラグは**今回 100% が false-positive**（事実誤認なし）→ quality-tier の distractor は Sonnet 検証より機械的 lint 修正に回すのが妥当
- 修正済み major 7 件（再フラグ不要）:
  - bp-018: ultrathink は API の effort を変えない（in-context 指示のみ。model-config.md L161）。「effort を high にする」は誤り
  - cmd-025: `-p` モードの `--output-format stream-json` には `--verbose` が必須（headless.md）
  - cmd-051: `/undo` は `/rewind` のエイリアスとして**存在する**（commands.md「Aliases: /checkpoint, /undo」）。diagram の「/undo は存在しない」は誤り
  - ext-110: `permissionDecision` は 4 値 `allow`/`deny`/`ask`/`defer`（hooks.md L1108）。`defer` は非対話 `-p` で「後で再開できるよう正常終了」
  - ext-137: plugin `settings.json` の対応キーは `agent` と `subagentStatusLine` の 2 つ（plugins.md L185）
  - ext-164: Auto mode 分類器のモデル名は docs 未記載（「a separate classifier model」のみ）。「常に Sonnet 4.6」と断定しない
  - key-033: Warp は `/terminal-setup` 不要（terminal-config.md L22「Works without setup」）。要 `/terminal-setup` は VS Code/Cursor/Windsurf/Alacritty/Zed
- 確認済み false-positive パターン（次回スキップ可）: `--jetbrains`/`--regex`/`--import-session`/`CLAUDE_AUTO_APPROVE`/`--list-remote`/`--input` 等の「存在しないフラグ・変数の否定」は正確。`autoAllowBashIfSandboxed` デフォルト true（settings.md L297）、PDF 制限（10ページ超で pages 必須・最大20、tools-reference.md L217）、組み込み subagent 5 種（Explore/Plan/general-purpose/statusline-setup/claude-code-guide。`Bash` は含まない）、`xhigh` は Opus 4.7 専用（model-config.md L140）はいずれも正確
- VS Code リモートセッション再開の UI は「**Session history** ボタン」（vs-code.md L66）。「パスト会話ドロップダウン/Remote タブ/GitHub リポジトリのみ」は docs 未記載だった（tool-061 で修正）

## 新規ドキュメントページ追加時の VALID_DOC_PAGES 同期（重要）

- `topic-config.mjs` に新ページを追加しただけでは不十分。`src/data/quizzes.json` でそのページを referenceUrl に持つ問題を追加すると、`src/infrastructure/validation/quizContentQuality.test.ts` の **`VALID_DOC_PAGES` 配列**（ハードコード）に未登録だと「不明なドキュメントページ」テストが fail する → 新ページの問題を追加する際は `VALID_DOC_PAGES` への追記を同時に行う（2026-05-23: managed-mcp/plugin-hints/prompt-caching/prompt-library/sandbox-environments/sessions を追加）


## 全数監査で確定した事実（2026-05-23, 759問の full-bank audit）

759問（未LLM検証分）を13並列で監査し18件の事実誤りを修正。以下は確定事実（次回スキャンで誤検出/再発防止用）:

- **/loop（無インターバル）**: 固定間隔ではなく Claude が動的に1分〜1時間で選ぶ（scheduled-tasks.md L53）。「デフォルト10分」は誤り
- **繰り返しスケジュールタスク**: 作成から **7日**で期限切れ（seven-day expiry）。1セッション最大50タスク。単位 s/m/h/d
- **PowerShell ツール**: Linux/macOS/WSL は opt-in（CLAUDE_CODE_USE_POWERSHELL_TOOL=1 + PowerShell 7+）。Windows は Git Bash なしで自動有効・ありで段階的ロールアウト（tools-reference.md L181-195）。「Windows 専用」「Auto モード不可」は誤り
- **複数行入力ネイティブ対応ターミナル = 7種**: iTerm2/WezTerm/Ghostty/Kitty/**Warp/Apple Terminal/Windows Terminal**。/terminal-setup が必要 = VS Code/Cursor/Windsurf/Alacritty/Zed（terminal-config.md L22-23）。Warp を要設定側に入れるのは誤り（key-033/044/020 で頻出）
- **Windows 前提条件**: ネイティブ Windows は必須前提なし。Git for Windows は**任意**（推奨。なければ PowerShell がシェルツール）（setup.md L87）
- **autoMemoryDirectory**: policy/user 設定 + --settings フラグからのみ。**project/local 設定からは不可**（memory.md L286）。「ローカルから可」は誤り
- **/cost・/stats は /usage のエイリアス**（/stats は Stats タブで開く）（commands.md L19/74/88）。「3つは別コマンド」は誤り
- **MCP SSE は非推奨ではない**: HTTP が推奨だが SSE も引き続き有効な選択肢（mcp.md L40/L56）。「SSE は公式に非推奨（mcp.md L80）」は **存在しない引用** の捏造（ext-009/046 で頻出）
- **permissionDecision = 4値**: allow/deny/ask/**defer**（defer は非対話 -p モードのみ。hooks.md L1108）。「3段階(allow/deny/ask)」は欠落
- **Hook ハンドラタイプ = 5種**: command/http/**mcp_tool**/prompt/agent（hooks.md L232）。「4種」は mcp_tool 欠落（ext-016/129 で頻出）
- **コンパクション後の再注入**: SessionStart + compact マッチャーで stdout 注入。**PostCompact は decision control なし**（ログ/クリーンアップ専用）で再注入には使えない（hooks-guide.md L147）
- **Code Review 重大度 🔴 = Important**（🟡 Nit / 🟣 Pre-existing の3種）。"normal" は JSON キー名であり UI 表示名ではない（code-review.md L30）
- **巻き戻しメニュー = 6アクション**: コード+会話復元 / 会話のみ / コードのみ / ここから要約 / **ここまで要約(Summarize up to here)** / Never mind（checkpointing.md L31-36）
- **コンパクション後**: スキル本体は**再注入される**（5,000/25,000 トークン上限）。再読込されない例外は**サブディレクトリのネスト CLAUDE.md**（context-window.md L65-69）。「スキル一覧が例外」は誤り
- **CLAUDECODE=1** が設定される場面: Bash/PowerShell ツール、tmux セッション、**フックコマンド、ステータスラインコマンド**（env-vars.md L45）。「フック/ステータスラインでは設定されない」は誤り
- **/voice 要件**: Claude.ai アカウント認証 + ローカルマイクのみ（voice-dictation.md L13-15）。**バージョン要件（v2.1.69 等）は docs に記載なし**

**教訓**: distractor(quality)-tier の lint フラグは偽陽性が大半だが、**lint を通過した "matched" 問題にも事実誤り（特に数値・列挙の網羅性・"非推奨/廃止" の誤断定）が約2%存在**した。新ドキュメント反映時は数値・列挙・バージョン断定を重点確認する。

## 新規35問の検証結果（2026-05-30, incremental run）

- doc 全更新で 810 問全件が target 化、pre-lint で 151 問に絞られた（fact=60, quality=91, autofix=0）。forked context のため Agent/Task 不可、fallback パス（fact-tier spot-check + 決定論的修正）で実施
- 新規35問（sdk-016〜018, cmd-120〜122, ext-180〜185, tool-080/081, ses-189/190, bp-090〜098, skill-068〜077）のうち高リスク問を docs 照合 → **事実誤りゼロ**。最新ドキュメントに対して正確に生成されていた。確認済み確定事実（次回スキップ可）:
  - **security-guidance プラグイン**: per-edit パターンチェック=モデル呼び出しなし（決定論的・無コスト）。end-of-turn/commit レビュー=Opus 4.7 既定（`SECURITY_REVIEW_MODEL`/`SG_AGENTIC_MODEL` で変更）。commit レビュー=20回/rolling hour、呼び出し元/サニタイザ/関連ファイルを読むエージェント型。拡張は `.claude/claude-security-guidance.md`(markdown, 合計8KB上限) と `security-patterns.yaml`(YAML/JSON, 最大50ルール)。両方 user+project スコープを連結。組み込みチェックは無効化不可（security-guidance.md L60/83/91/139/147/153）
  - **/deep-research**: ビルトインワークフロー。複数角度のweb検索→ソース取得・クロスチェック→主張ごとに投票→引用付きレポート。WebSearch ツール必須（workflows.md L49-53）
  - **disableWorkflows**: managed settings or admin console トグルで組織無効化。無効化で bundled コマンド使用不可 + `workflow` キーワードトリガー無効 + `/effort` から `ultracode` 削除。個人は settings.json / `CLAUDE_CODE_DISABLE_WORKFLOWS=1`（workflows.md L170-173）
  - **ultracode**: `/effort ultracode` で xhigh effort + 自動ワークフロー編成。xhigh 対応モデルのみ。セッション単位（workflows.md L97-105）
  - **FORCE_PROMPT_CACHING_5M=1**: 認証無関係に5分TTL強制（デバッグ・managed override用）。サブエージェントはサブスクリプションでも5分TTL。`cache_read_input_tokens`=標準入力の約10%課金。キャッシュヒットでタイマーリセット（prompt-caching.md L106/114/118/131/137）
  - **Claude Platform on AWS**: ルーティング=`CLAUDE_CODE_USE_ANTHROPIC_AWS=1`+`ANTHROPIC_AWS_WORKSPACE_ID`+`AWS_REGION`（base URL=`https://aws-external-anthropic.{region}.api.aws`）。認証2方式: (A) SigV4（標準AWS認証チェーン）、(B) `ANTHROPIC_AWS_API_KEY`（`x-api-key`送信、SigV4より優先、設定時AWS認証無視）。SSO期限切れ対策=`awsAuthRefresh`（claude-platform-on-aws.md L26-56）
  - **/goal**: 完了条件設定→各ターン後に small fast model が yes/no判定→未達なら理由付きで次ターン、達成で自動クリア。条件は最大4,000字。1セッション1ゴール。`/loop`(時間間隔), Stop hook(設定ファイル) とは別物（goal.md L11/39/59）
  - **deep-links (`claude-cli://`)**: `claude-cli://open` のみ受理。`q`(最大5,000字・URLエンコード・`%0A`改行)、`cwd`(絶対パス・network/UNC拒否)、`repo`(owner/name)。`cwd`が`repo`より優先。Enter まで送信されず、起動時 banner 表示、1000字超でスクロール警告（deep-links.md L33/47-51）
  - **--worktree/-w**: `.claude/worktrees/<value>/` に `worktree-<value>` ブランチ作成。`origin/HEAD` から分岐（`worktree.baseRef="head"` で local HEAD）。`#1234` で PR(`pull/<n>/head`)から分岐し `pr-<number>` に。初回はそのディレクトリで `claude` 実行して trust 承認必須（worktrees.md L15/37/47）
  - **permissionDecision = 4値** allow/deny/ask/defer を ext-132 で再確認（既出 L485/509 と一致）
- crossCheck 15問・fact-tier のスポットチェックは全て正確（known-issues L445-456 の「fact-tier は keyword hit のみ」パターンが今回も継続）
- quality-tier 91問（distractor-too-short 46 + correct-too-long 67 + format-giveaway 8）は事実誤りでなくバランス調整。月次 distractor-balance パスへ委譲継続（未着手）
