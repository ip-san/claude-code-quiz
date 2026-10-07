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
- `MAX_THINKING_TOKENS`（非ゼロ値）は Opus 4.8/4.7/4.6・Sonnet 4.6 ではアダプティブ推論中は無視される。**Opus 4.7 / 4.8 は常にアダプティブ推論で動作し `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` も適用されない**（model-config.md「Adaptive reasoning and fixed thinking budgets」、2026-05-31 再確認）。Opus 4.6 / Sonnet 4.6 のみ `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` で固定予算（`MAX_THINKING_TOKENS`）に戻せる
- **`MAX_THINKING_TOKENS=0` の完全無効化例外は Fable 5 には適用されない**（2026-06-10 確認: 「全モデルで無効化」は stale）。Opus 4.8/4.7/4.6・Sonnet 4.6 では thinking を完全無効化できる
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

## Memory ページのアンカー（2026-08-03 更新）

- **実サイトの slug 規則は「`.` → ハイフン」**: `CLAUDE.md` を含む見出しのアンカーは `claude-md` 形式（例: `#how-claude-md-files-load`, `#choose-where-to-put-claude-md-files`, `#claude-md-vs-auto-memory`）。旧記録の `#how-claudemd-files-load` 等（ドット除去形）は**実サイトに存在しない**（2026-08-03 に curl で確認、quiz 7問の referenceUrl と quiz-lint.mjs / fetch-docs.mjs の slugify を修正済み）
- 有効アンカー: `#import-additional-files`, `#view-and-edit-with-memory`, `#user-level-rules`, `#path-specific-rules` ほか
- Auto Memory の `MEMORY.md` 読み込み制限が「先頭200行」から「先頭200行または25KB（先に到達した方）」に変更されている → known-issues.md に「MEMORY.md の読み込み制限は 200 lines or 25KB, whichever comes first」を追加
- `node scripts/fetch-docs.mjs --pages hooks --force` で再取得しても `.claude/tmp/docs/hooks.md` にはコードコメント行（`# .claude/hooks/block-rm.sh` 等）しか `#{1,4} ` パターンにマッチせず、実際の "On this page" 目次にある `Configuration` 等の見出しが Markdown 見出し記法として保存されていない。そのため `scripts/quiz-lint.mjs` の `extractDocAnchors()` が hooks ページのアンカーをほぼ検出できず、`ext-004`/`ext-085`/`ext-087` の `#configuration` を毎回 invalid-anchor と誤検出する。実サイト（`curl https://code.claude.com/docs/en/hooks`）では `id="configuration"` が実在することを確認済み → `fetch-docs.mjs` の hooks ページ取得ロジック（またはレンダリング後処理）を調査し、見出しが平文化されて消える原因を修正する。恒久対応が難しい場合は known-issues.md に「hooks ページの invalid-anchor 指摘は既知の false-positive（キャッシュ形式起因、doc に実在確認済み）」を明記し、quiz-lint 実行時にスキップリストへ `hooks#configuration` を追加する

## Hooks ページのアンカー（2026-05-31 確認 / lint false-positive）

- `hooks#configuration` は**有効なアンカー**。quiz:lint の `[URL Anchors] invalid-anchor "#configuration" not found in "hooks"` は **false-positive**（ext-004 / ext-085 / ext-087）
- 根拠: (1) hooks reference ページの "On this page" TOC に `Configuration` セクションが存在する、(2) 公式 hooks-guide が `code.claude.com/docs/en/hooks#configuration` へクロスリンクしている（hooks-guide.md L543）
- 原因: hooks **reference** ページの fetch では見出しが `##` markdown ではなくプレーンテキストに平坦化されるため、slugify ベースのアンカー抽出が拾えない。`hooks-guide` ページは正常に `##`/`###` を持つ
- 対応: これら3問の `referenceUrl` は修正不要。URL Anchors lint は report-only なのでブロックしない
- (1) hooks.md キャッシュがプレーンテキスト平坦化されており URL Anchors lint が `#configuration` を偽陽性報告 → `node scripts/fetch-docs.mjs --pages hooks --force` で再取得したら `##` 見出し10セクションが復元され lint が解消。(2) mcp.md キャッシュはコードブロック0個（コードフェンス脱落）のため `--env` フラグが factCheck:flags で偽陽性 → known-issues.md の「Hooks ページのアンカー」セクションに「`--force` 再取得でキャッシュ形式が復元され lint 解消する場合がある。invalid-anchor 報告時はまず該当ページを `--force` 再取得してから判定する」を追記。mcp.md のコードブロック脱落も同種の注意（コード例由来のフラグ・コマンド不在は偽陽性の可能性）として記録
- Step 0a の「quiz:lint の URL/用語チェックが失敗した場合はまず問題を修正」という指示に従い、ext-004/ext-085/ext-087 の `hooks#configuration` invalid-anchor を即座に修正（アンカー除去）してしまったが、known-issues.md には「確認済み false-positive・URL 変更不要」と明記されており revert が必要になった（net 変更ゼロで復旧済み） → SKILL.md の「quiz:lint の結果処理」に「URL Anchors / Terminology の指摘を修正する前に、必ず known-issues.md の false-positive 記録（特に『Hooks ページのアンカー』セクション）と照合する。既知 false-positive は修正せずログのみ」と追記する
- agent-teams.md の重要文が 1 行に平坦化され `grep -n | cut` では見えず、security.md の `<Warning>` callout（WebDAV）は cache から脱落して critical 誤報になった（2 回目）。vs-code.md の `<Steps>` も脱落 → SKILL.md「A-3 二重確認」に「cache で見つからない引用は `grep -o "<文字列>.{200}"` で長行内を探し、それでも無ければ `curl https://code.claude.com/docs/en/<page>.md` を一次ソースとして確認してから判定する」を追加。fetch-docs.mjs で `<Warning>`/`<Note>`/`<Steps>` を保持する後処理を検討

## SDK・ライブラリの改名履歴

- 「Claude Code SDK」→「Claude Code Agent SDK」→「Claude Agent SDK」と改名済み
- `Task` ツールは v2.1.63 で `Agent` に改名。**SDK も 2026-05-02 に統一され、CLI・Agent SDK の両方で `Agent` を使う**（agent-sdk/overview docs: "Include `Agent` in `allowedTools`"、サンプル `allowed_tools=["Read", "Glob", "Grep", "Agent"]`）。旧記録「SDK は Task と指定する」は outdated（MEMORY 2026-05-02 確認）

## 用語: Microsoft Foundry（2026-05-31 確認 / doc-string false-positive 注意）

- プロジェクト正式表記は **「Microsoft Foundry」**（`topic-config.mjs` TERMINOLOGY_DICT: `Azure Foundry`→`Microsoft Foundry`、doc page slug も `microsoft-foundry`）
- **注意**: 一部の公式ドキュメント（`fast-mode.md` 等）は冗長形「Microsoft Azure Foundry」を使う。検証エージェントが doc 文字列に合わせて quiz を「Microsoft Azure Foundry」へ修正提案するのは **false-positive**。terminology lint が `Azure Foundry → Microsoft Foundry` で巻き戻すため、doc の冗長形に合わせないこと（ses-117 で実際に発生・revert 済み）

## デフォルトモデルのプラン別対応（2026-07-18 更新・v2.1.207 変更反映）

- **最新（model-config.md「`default` model setting」、2026-07-18 確認）**: Max / Team Premium / Enterprise pay-as-you-go / Anthropic API = **Opus 4.8**、**Claude Platform on AWS / Amazon Bedrock / Google Cloud's Agent Platform = Opus 4.8**（v2.1.207 で変更。旧: AWS=Opus 4.7、Bedrock/Vertex=Sonnet 4.5）、Pro / Team Standard / Enterprise サブスクリプション席 = **Sonnet 5**、**Microsoft Foundry のみ Sonnet 4.5**
- Fable 5 はどのアカウントタイプでもデフォルトにならない（明示選択のみ）
- 旧記述（2026-05-31 時点: AWS=Opus 4.7、Pro=Sonnet 4.6、Bedrock/Vertex/Foundry=Sonnet 4.5）は stale。MEMORY.md の該当 Verified Facts も更新が必要
- `xhigh` エフォートは **Fable 5 / Sonnet 5 / Opus 4.8 / Opus 4.7**（Opus 4.6 / Sonnet 4.6 は high にフォールバック）。旧「Opus 4.8 / 4.7 のみ」は Sonnet 5 / Fable 5 追加後の stale 表記（bp-018 / cmd-104 / key-016 で 2026-07-18 修正）
- model-config.md「`default` model setting」で Claude Platform on AWS / Amazon Bedrock / Google Cloud's Agent Platform のデフォルトが **Opus 4.8** に統一された（旧: AWS=Opus 4.7、Bedrock/Vertex=Sonnet 4.5）。Pro/Team Standard/Enterprise サブスクリプション = Sonnet 5、Microsoft Foundry のみ Sonnet 4.5。quiz 側は ses-103 が既に正しく修正不要だったが、known-issues の 2026-05-31 記録が stale だった → known-issues「デフォルトモデルのプラン別対応」を 2026-07-18 付で更新済み。MEMORY.md の Verified Facts「Claude Code 既定モデル」行も次回 MEMORY 更新時に同期する

## MEMORY 記録の信頼性

- v4.13.0 で「Microsoft Azure Foundry（正式名称）」と誤記録 → v4.22.0 でも踏襲 → 実際のページタイトルは「Microsoft Foundry」
- v4.39.3 で cmd-024 に「SSE は非推奨」と記載 → MEMORY にも「MCP SSE transport is deprecated → use HTTP」と記録済みだったが、実際の mcp ページには "deprecated" の文字列が存在しなかった
- v4.41.0 で MEMORY の「`CLAUDE_CODE_DISABLE_AUTO_MEMORY=0` で強制有効化はドキュメントに根拠なし」が誤りと判明 → settings.md に記載あり
- `/teleport`（`/tp`）は**スラッシュコマンドとして存在する**（Webセッションピッカー表示）。CLIフラグ `claude --teleport` も別途存在（cli-reference に記載）。旧記録「スラッシュコマンドではない」は stale（MEMORY 2026 同期で訂正）
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
- **`/todos`**: **commands.md から削除済み**（2026-04-06 確認）。現在の docs に記載なし。`CLAUDE_CODE_ENABLE_TASKS=1` は非インタラクティブモードでのタスクトラッキング有効化
- **`/tasks`**: 別のスラッシュコマンド
- これらは異なる機能。quiz で混同しないこと・`/todos` をアクティブなコマンドとして記述しないこと

## チェックポイント復元オプション

- チェックポイント復元時は **6 つ**の選択肢がある: restore code+conv, conv only, code only, summarize from here, **summarize up to here**（2026-09-10 追加確認）, never mind
- 「2つ」「3つ」等の不正確な数値を記述しないこと

## Tool Search のモデル要件

- **更新（2026-08-03 確認）**: Tool Search は `tool_reference` ブロック対応モデルが必要 = **Sonnet 4.5 / Haiku 4.5 / Opus 4.5 以降**（mcp.md「Configure tool search」）。旧記述「Sonnet 4+ / Opus 4+、Haiku 非対応」は stale — **Haiku 4.5 は現在対応済み**。「Haiku 非対応」と指摘するのは今後 false-positive ではなく逆に quiz 側の stale（ext-024 / tool-038 で 2026-08-03 修正）
- Google Cloud's Agent Platform では Tool Search がデフォルト無効（Sonnet 4.5+ / Opus 4.5+ でサポート）。`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` 設定時は `ENABLE_TOOL_SEARCH` でも上書き不可

## effort level default value

- ses-045とses-102の両方がeffort levelのデフォルト値を"high"と記述していたが、ドキュメント(model-config)では Pro/Max=medium、その他(API key/Team/Enterprise/Bedrock/Vertex AI/Foundry)=high と明記。**Team は medium ではなく high**
- ses-045 と ses-102 がエフォートレベルを「3段階」(low/medium/high) と記述していたが、docs (model-config page) では第4レベル `max` (Opus 4.6専用、セッション単位、永続化されない) と `/effort auto` (デフォルトリセット) が追加されている。また ses-102 の explanation が設定方法を「3つ」と記述していたが、`/effort` コマンドと `--effort` CLI フラグの追加で4つになっている → generate-quiz-data SKILL.md にエフォートレベルの4段階 + auto、および設定方法4種を明記する
- key-016, ses-045 のエフォートレベル値が low/medium/high の3つのみで、max と auto が欠落していた → generate-quiz-data SKILL.md にエフォートレベルの5値 (low/medium/high/max/auto) と、設定方法5種（/effort, --effort, env var, settings, /model slider）を明記
- ses-045 の explanation/wrongFeedback と diagram が「max=Opus 4.6専用」「4段階」と記述していたが、ドキュメント (model-config) では Opus 4.7 にも `max` がサポートされ、さらに `xhigh` (Opus 4.7のみ) が追加されている。Opus 4.7 のデフォルトは `xhigh`。 → known-issues.md の「effort level default value」「モデル固有機能のスコープ」セクションを Opus 4.7 を含む3モデル対応に更新。`max` は3モデルサポート、`xhigh` は Opus 4.7専用、Opus 4.7 のデフォルトは `xhigh`、Opus 4.6/Sonnet 4.6 はプラン依存（Pro/Max=medium、その他=high）
- **最新（2026-05-31 MEMORY 同期、model-config.md L146-149）**: `CLAUDE_CODE_EFFORT_LEVEL` は **low/medium/high/xhigh/max/auto の6値**。`xhigh` は **Opus 4.8 / Opus 4.7**（Opus 4.6 / Sonnet 4.6 は high フォールバック）。`max` は Opus 4.8/4.7/4.6/Sonnet 4.6 の4モデル。**デフォルト effort はモデル別**: Opus 4.8 / Opus 4.6 / Sonnet 4.6 = `high`、Opus 4.7 = `xhigh`。**プラン別（Pro/Max=medium 等）の旧記述は廃止済み** — 上記の旧行をデフォルト判定に使わないこと

## 存在しないCLIサブコマンド

- `claude commit` は CLI サブコマンドとして存在しない。MEMORY で確認済み

## Sandboxing の技術名称

- macOS: Seatbelt, Linux/WSL2: bubblewrap。ドキュメントページ: `/en/sandboxing`

## Hook イベント総数

- **最新（2026-09-10 hooks.md lifecycle table で再確認）: 全 33 種**。30→33 で `DirectoryAdded`（`/add-dir` や SDK `register_repo_root` での作業ディレクトリ追加時、ブロック不可）、`PreModelSwitch`（モデル切替直前、**ブロック可**）、`PostModelSwitch`（モデル切替後、ブロック不可）が追加された（ext-085 / ext-029 を 2026-09-10 修正）
- **`PermissionRequest` は現行 docs で "Can block? = No"**（"Exit code 2 isn't honored for this event"。拒否は JSON `decision` オブジェクトで行う）。ブロッキング可能イベントは **16 種**（2026-09-16 に exit-code-2 表の "Can block? = Yes" 行を再カウント。**`WorktreeRemove` も Yes**: 非ゼロ終了コードで削除を失敗させる、JSON 出力は無視）: PreToolUse, UserPromptSubmit, UserPromptExpansion, Stop, SubagentStop, TeammateIdle, TaskCreated, TaskCompleted, ConfigChange, PostToolBatch, PreCompact, PreModelSwitch, Elicitation, ElicitationResult, WorktreeCreate, WorktreeRemove（PermissionRequest は No。2026-09-10 の「15 種」は WorktreeRemove の数え落とし → ext-029 を 2026-09-16 修正）
- （旧記録）Hook event types は全 30 種（2026-06-01 hooks.md lifecycle table で再確認）。26→29 で `Setup`・`UserPromptExpansion`・`PostToolBatch`、**29→30 で `MessageDisplay`**（matcher なし・非ブロッキング、"While assistant message text is displayed"）が追加された
- 全30種: `SessionStart`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `MessageDisplay`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `SessionEnd`
- 追加3種の意味: `Setup`（`--init-only`/`--init`/`--maintenance` 時の一回限り準備）、`UserPromptExpansion`（コマンド展開がプロンプト化される前。展開をブロック可）、`PostToolBatch`（並列ツール呼び出しのバッチ解決後・次のモデル呼び出し前。エージェントループを停止可）
- ブロッキング可能: 15 イベント（2026-06-02 hooks.md "Can block? = Yes" 実カウントで再確認）: PreToolUse, PermissionRequest, UserPromptSubmit, UserPromptExpansion, Stop, SubagentStop, TeammateIdle, TaskCreated, TaskCompleted, ConfigChange, PostToolBatch, PreCompact, Elicitation, ElicitationResult, WorktreeCreate（旧記録の12には UserPromptExpansion / PostToolBatch / PreCompact が欠落していた）
- `PermissionDenied`: auto mode classifier がツール呼び出しを拒否した時。ブロッキング不可だが `{retry: true}` を返すとモデルにリトライを許可できる

## 2026-09-10 --full スキャンで確定した doc ドリフト（全 61 ページが 2026-08-19 以降更新）

- **Output styles は 5 種**: Default / Proactive / **Concise**（v2.1.237+、結果先出し・前置き省略）/ Explanatory / Learning（output-styles.md「four additional built-in output styles」）。旧「4種」は stale（key-032 修正）
- **Fable 5.1 追加**: model-config.md の effort 表は「Fable 5.1 and Fable 5」。エフォート対応・xhigh/max・1M context・常時アダプティブ推論のモデル列挙には Fable 5.1 を含める（`fable` エイリアスは v2.1.257+ で Fable 5.1 に解決。Claude apps gateway では Fable 5）。default effort hold は Fable 5 / Opus 4.8 / 4.7 のみで Opus 5 / Fable 5.1 には無い
- **effort の設定方法は 7 通り**: /effort, /model スライダー, --effort, `CLAUDE_CODE_EFFORT_LEVEL`, settings（`modelSettings`/`effortLevel`）, Remote Control 接続デバイス, skill/subagent frontmatter `effort`
- **認証優先順位は 7 段階**: 6 番目に「Anthropic profile and federation credentials（`ant` CLI / Workload Identity Federation）」が追加（authentication.md「Authentication precedence」）
- **Anthropic Console の認証は「API key or a Console sign-in without one」**（キーなし Console サインイン = プロファイル方式が追加。third-party-integrations.md 比較表）
- **advisor 非対応プロバイダは 4 つ**: Amazon Bedrock / **Claude Platform on AWS** / Google Cloud's Agent Platform / Microsoft Foundry（advisor.md Requirements）
- **feature-availability の CI 行**: GitHub Actions は Claude Platform on AWS で ✗（Foundry ✓）、GitLab CI/CD は Microsoft Foundry で ✗（Claude Platform on AWS ✓）
- **artifact CSP は許可リスト方式**: 外部スクリプトは cdnjs / Tailwind CDN / jQuery CDN / jsDelivr の一部パスの 4 CDN、外部フォントは Google Fonts のみ許可。外部画像は全面禁止、fetch/XHR/WebSocket は自オリジンと Google Fonts ホストのみ（artifacts.md Page constraints）。旧「外部リクエスト全面禁止」は stale（bp-107 修正）
- **artifact 無効化の現行キーは `enableArtifact: false`**（`/config` の Artifacts トグルが書き込む）。`disableArtifact: true` は deprecated だが動作する。`CLAUDE_CODE_DISABLE_ARTIFACT=1` / `permissions.deny` の `Artifact` も有効
- **別セッションからの artifact 更新**: URL を渡す **または `/artifacts` で一覧から選んで添付**（artifacts.md「Update an artifact」）
- **Desktop WSL セッション**: 管理設定を検出したデバイスでは**既定で無効**。**2026-09-16 更新: 有効化は管理者のセルフサービス** — `HKLM\SOFTWARE\Policies\Claude` に `disableWslSessions` を `REG_SZ` `false` / `REG_DWORD` `0` で配布（Claude Desktop v1.19367.0+、HKCU 不可、`managed-settings.json` は残してよい）。旧「Anthropic アカウントチームへの有効化依頼」は現行 docs に無い（bp-116 修正）。有効化後に `wslInheritsWindowsSettings: true` を HKLM / `C:\Program Files\ClaudeCode` 経由で配布（admin-setup.md）
- **Linux Desktop `.deb` インストールは apt リポジトリを自動登録**（`/etc/apt/sources.list.d/claude-desktop.list`）。旧「直接インストールでは更新を受け取らない／コメントアウト済みエントリ」は現行 docs に存在しない（ses-233 修正）
- **Task ツールの可用性（tools-reference.md「Task tool availability」）**: v2.1.233+ で Opus 4.8 / Sonnet 5 / Fable 5 / Mythos 5 系列では `TodoWrite` と `TaskCreate/TaskGet/TaskList/TaskUpdate` が**既定で提供されない**。`CLAUDE_CODE_ENABLE_TODO_TOOLS=1` / `--allowedTools` / `--tools` でオプトイン。`CLAUDE_CODE_ENABLE_TASKS` は「提供される場合にどちらを出すか」の選択（tool-074 修正）
- **JetBrains インストールは 2 ステップ**: Step 1 = Claude Code CLI（プラグインは同梱しない、無いと "Cannot launch Claude Code"）→ Step 2 = Marketplace プラグイン。キャッシュでは `<Steps>` タイトルが空白化されるため「最初のステップ」を問う設問に注意（tool-059 修正）
- **サーバー管理設定の承認記録は 3 方式**: claude.ai ログイン（組織ごと1件）/ **Claude apps gateway（ゲートウェイごと1件、同一 gateway 再サインインでは再表示なし）** / その他資格情報（キャッシュと共に保存、`/logout` で削除）。gateway を「その他」に含めない（mem-093 修正）
- **in-process チームメイトのサブエージェント**: 定義の `background: true` は常にエラー。`run_in_background: true` は fork mode オフ＋background tasks 有効の構成ではエラー、それ以外は**静かにフォアグラウンド実行**（sub-agents.md L398 / agent-teams.md L299）。一律「エラー」と断定しない
- **keybindings.json のホットリロード**は docs に記載なし（「再起動不要で自動反映」は根拠なし断定 → 削除。key-034）
- **Explore サブエージェントのモデル**: v2.1.198 以降は**メイン会話のモデルを継承**（Claude API では Opus 上限、他プロバイダは直接継承）。「常に Haiku」は stale。Haiku 固定は `Explore` 名のユーザー/プロジェクト定義で `model: haiku` を指定した場合のみ（sub-agents.md L29-33、ext-058 / skill-022 修正）
- **サブエージェントのネスト**: 既定で**メイン会話の下 3 階層まで**ネスト可能（`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`、上限で `Agent` ツールが取り上げられる）。「ネスト不可」は stale（skill-024 修正）
- **チームメイトのモデル**: 「Default teammate model」設定は `/config` から削除済み。優先順位は スポーン指名 → サブエージェント定義の `model` → `CLAUDE_CODE_SUBAGENT_MODEL` → **リードの現在のモデル**（agent-teams.md「Specify teammates and models」、skill-082 修正）
- **チームメイトの計画承認**: 承認リクエストは**リードのセッションが到着と同時に自動承認**し、リードはレビューしない（agent-teams.md L96 / Permissions「designed exception」、skill-083 修正）。「リードが承認/却下して再提出」は stale
- **Notification マッチャーは 12 種**: permission_prompt / idle_prompt / auth_success / elicitation_dialog / elicitation_url_dialog / elicitation_complete / elicitation_response / agent_needs_input / agent_completed / quota_auto_resume_fired / _stale / _disabled（hooks.md L137）
- **Hook 共通入力フィールドは 8 つ**: `prompt_id`（v2.1.196+）と `scratchpad_dir`（v2.1.257+）が追加（hooks.md Common input fields）。`SessionStart.source` は `fork` を含む 5 値
- **プラグインソースは 7 種**: 相対パス / github / url / git-subdir / npm / **archive**（v2.1.224+）/ **command**（v2.1.229+）。旧「5種」は stale（plugin-marketplaces.md Plugin sources、ext-130 修正）
- **plugin.json のカスタムパス**: `commands` / `agents` / `workflows` / `outputStyles` / `experimental.themes` / `experimental.monitors` は**デフォルトディレクトリを置き換え**（走査されない）。`skills` は追加。旧「補完して両方読む」は stale（plugins-reference.md Path behavior rules、ext-152 修正）
- **プラグイン提出フォームは community マーケットプレイス用**（`claude-community`）。公式 `claude-plugins-official` は Anthropic がキュレーションし申請プロセスなし（plugins.md L158-166、ext-140 修正）
- **`@claude review` は単発レビュー**（2026年7月更新以降、`@claude review once` と同じ）。プッシュ連動は `@claude review always`（code-review.md L72-76、ext-158 修正）
- **Chrome 連携の対応ブラウザ**: Chrome / Edge に加え Brave・Arc・Vivaldi・Opera などの Chromium 系でも拡張を検出・接続（chrome.md L25、ext-146 / ext-171 修正）
- **auto mode 非対話（`-p`、`--permission-prompt-tool` なし）でのブロック**: しきい値到達時も**そのアクションだけ実行されず Claude は作業継続、ランは停止しない**（permission-modes.md L305 / errors.md「the run continues」。bp-073 / bp-120 修正）。旧「中止する」は stale
- **`curl`/`wget` は「デフォルトで自動承認されない」**（Manual モードではプロンプト、`Bash(curl *)` の allow/deny で制御）であり「デフォルトブロック」ではない（security.md L39、bp-064 修正）
- **artifact は閲覧時に MCP コネクタ呼び出しが可能**（外部データへ届く唯一の経路）。「閲覧時の API 呼び出し不可」の言い切りは stale（artifacts.md L20、bp-104）
- **`/memory` vs `/context`**: CLAUDE.md の読み込み確認は **`/context` の Memory files 一覧**（memory.md L211 Troubleshoot）。`/memory` は存在しないファイルのエントリも一覧表示するため確認用途ではなく編集用。旧「まず `/memory` で確認」は stale（mem-058 / mem-063 / mem-075 修正、2026-04-05 の逆判定を上書き）
- **`policyHelper` vs サーバー管理設定**: サーバー管理設定がポリシーキーを配信している間は `policyHelper` は参照されない。ヘルパー出力が唯一の管理設定になるのは MDM/ファイルの管理ソースが選択された場合のみ（server-managed-settings.md L68、mem-086 修正）
- **サーバー管理設定の承認カテゴリは 5 つ**: シェルコマンド設定 / サンドボックスバイナリ設定 / サンドボックスのネットワーク・分離設定 / カスタム環境変数 / フック定義（L129-135、mem-041 修正）。Requirements にバージョン番号の記載なし（mem-040）
- **`settings.local.json` はプロジェクトの `.gitignore` ではなくグローバル git excludes に自動追加**（settings.md L46、mem-005 修正）
- **CLAUDE.md の上方向探索は「ファイルシステムのルートまで」**（memory.md L89、mem-027 / mem-036 修正）。「ルートの手前まで」「git ルートまで」は誤り
- **`/hooks` メニューは読み取り専用ブラウザ**（hooks.md L299「read-only browser」）。追加・削除は settings JSON 編集、一時無効化は `disableAllHooks: true`。「対話的に追加・削除」「JSON 編集はスナップショットで反映されずレビュー必要」は現行 docs に存在しない（cmd-026 修正）
- **Remote Control のネットワーク障害**: サーバーモード（`claude remote-control`）は約10分でプロセス終了、**インタラクティブセッションは障害が続く限り再試行し自動再接続**（remote-control.md L217-219、cmd-088 修正）。ハートビート失敗は約30分で切断
- **routine のプッシュ先**: `claude/` プレフィックスは常に許可、他ブランチは保護 / 他者の PR / 他者のコミットのいずれかで拒否（web-scheduled-tasks.md L147-151、cmd-109 修正）
- **npm 更新は `npm install -g @anthropic-ai/claude-code@latest`**。`npm update -g` は docs で「Avoid」（setup.md L193、cmd-061 修正）
- **`/usage` は API キーでも実行可**（`/cost`・`/stats` エイリアス）。API キーで使えないのは `/usage-credits`（commands.md L107-108、cmd-038 修正）
- **Rewind メニューは 6 アクション**: Restore code and conversation / Restore conversation / Restore code / Summarize from here / **Summarize up to here** / Never mind（checkpointing.md L32、key-002 修正）。旧「5つ」は stale — 上記「チェックポイント復元オプション」セクションの 5 も更新対象
- **パーミッションモード名は「Manual」**（config 値 `default`、v2.1.200+ で CLI/VS Code/JetBrains/Desktop 共通）。Pro/Max/Team の組み込み開始モードは **auto mode**。「Normal」「Auto Mode（研究プレビュー）」は stale（permission-modes.md L3/L18、key-008 修正）
- **`Ctrl+D` は 800ms 以内の 2 回押しで終了**（入力中はカーソル直後 1 文字削除）。**`Ctrl+C` は待機中 1 回目で入力クリア・2 回目で終了**（interactive-mode.md L9-11、key-017 / key-021 修正）
- **Prompt Suggestions は `Tab` または `→` で入力欄に反映してから `Enter`**。`Enter` 単独で「受け入れ＋送信」の記載なし（interactive-mode.md L312、key-025 修正）
- **PR バッジの更新はイベント駆動**（`git push` / `gh pr` 成功時）。「60秒ごと」は docs に存在しない（interactive-mode.md L525、key-026 / key-049 修正）
- **`/terminal-setup` は VS Code・Cursor・Devin Desktop で `terminal.integrated.gpuAcceleration=off` と `mouseWheelScrollSensitivity` も設定**（terminal-config.md L18、key-033）
- **statusline のキャッシュファイル名は `session_id` ベース**（セッション内で安定・セッション間で一意）。固定名は並行セッションで衝突、PID は毎回変わる（statusline.md L228、key-041 修正）
- **フルスクリーンの URL クリックは `Cmd`/`Ctrl`+クリック**。プレーンクリックは開かない（例外: Ghostty / macOS Warp）（fullscreen.md L71-73、key-055 修正）
- **MacBook に既定の最下部ジャンプキーなし**（`Ctrl+Fn+→` は macOS で届かない）。ジャンプボタン / ホイール / `scroll:bottom` 再バインド（fullscreen.md L97、key-056 修正）
- **タスクリスト（`Ctrl+T`）は Opus 4.8 / Sonnet 5 / Fable 5 / Mythos 5 系で既定空**（interactive-mode.md L464、key-010 / key-012 注記）
- **Read ツールは固定 2000 行ではなくトークン上限でページング**（`PARTIAL view`、tools-reference.md L310、tool-007）。**WebSearch はタイトルと URL を返す**（要約ではない、L343、tool-009）
- **Bash の cwd 引き継ぎはプロジェクト／追加ディレクトリ内に限る**。外へ `cd` すると自動リセット + `Shell cwd was reset to <dir>`（L108-110）。`cd /tmp` を「引き継がれる例」にしない（tool-036 / tool-067 / tool-071 修正）
- **JetBrains の診断共有は `getDiagnostics` 呼び出し時のみ**（編集後の自動送信なし、jetbrains.md L26）。セキュリティ注意は `acceptEdits`（および auto）モード（L140-142、tool-062 / tool-064 修正）
- **Ultraplan は削除済み**（ultraplan.md「Ultraplan is no longer available」: `/ultraplan`・キーワード・承認ダイアログのオプション全廃止。代替は plan mode / Claude Code on the web）。ses-183 / ses-184 を廃止告知の問題に書き換え済み
- **Desktop のモデルはセッション中に変更可**（desktop.md L25「You can change this during the session」、ses-137 修正）。環境の選択肢は **Local / Cloud / SSH connection / (Windows) WSL**。「Remote（リモートセッション）」表記は「Cloud（クラウドセッション）」に統一（ses-110 / 113 / 115 / bp-054 / bp-089）
- **Bedrock のリージョン解決（v2.1.172+）**: `AWS_REGION` → `AWS_DEFAULT_REGION` → AWS プロファイルの `region` → `us-east-1`。「`.aws` を読まない」は stale（amazon-bedrock.md L82-86、ses-151 修正）
- **`/bg` は進行中の作業を引き継ぐ**（バックグラウンドコマンド・subagent・動的ワークフロー・`/loop`・artifact 自動返信。monitor は停止。`CLAUDE_DISABLE_ADOPT=1` で引き継がない）（agent-view.md L220-224、ses-193 修正）
- **`alwaysThinkingEnabled`**: thinking は既定 ON なので `true` は無効果、`false` で全セッション OFF（Fable では無効）。旧「true でアダプティブ推論をプロジェクト横断で有効化」は stale（settings-reference.md L306-316、ses-044 修正）
- **その他の列挙更新**: `DISABLE_PROMPT_CACHING_FABLE` 追加（5 変数）/ `teammateMode` は `iterm2` 含む 4 値（既定 `in-process`）/ OTel カーディナリティ制御は 5 変数（`ENTRYPOINT`・`RESOURCE_ATTRIBUTES` 追加）/ Foundry 認証は 3 方式（Bearer `ANTHROPIC_FOUNDRY_AUTH_TOKEN` 追加）/ コンテキストウィンドウ構成要素に auto memory / パーミッションの `/path` は「設定ソースからの相対」（プロジェクト設定ならプロジェクトルート）
- **未検証で棄却した指摘**: ext-164「分類器は既定で Sonnet 5」（cache の permission-modes.md に記述なし、エージェントの live fetch 由来）。key-033「Apple Terminal で Option as Meta も設定」（cache で確認できず）。errors#automatic-retries の invalid-anchor は hooks#configuration と同じキャッシュ平坦化 false-positive（TOC に "Automatic retries" 実在、bp-122 は修正不要）
- **skills.md / settings.md の見出し改編**: `#where-skills-live` → `#choose-where-skills-load`、`#skills-in-cowork-and-cloud-sessions` → `#use-skills-in-cowork-and-cloud-sessions`、`settings#settings-files` → `#settings-files-and-who-they-affect`（referenceUrl 6 問修正）。hooks `#configuration` は `--force` 再取得後に lint 解消（false-positive 継続）

## 環境変数（追加）

- `BASH_MAX_TIMEOUT_MS`: settings.md 記載済み（モデルが設定可能な最大タイムアウト）
- `CLAUDE_CODE_CLIENT_CERT`/`CLAUDE_CODE_CLIENT_KEY`/`CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`: mTLS 用として settings.md に記載あり
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 1-100 値。コンテキストの何%でオートコンパクションが発火するかの閾値（settings page）
- `MAX_MCP_OUTPUT_TOKENS`: デフォルト 25,000 / 警告は 10,000 トークン時点（settings page）
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`: `--add-dir` フラグとの併用が必須。単独設定では機能しない

## Tool Search のデフォルト動作

- Tool Search はデフォルトで有効（全 MCP ツールが遅延読み込み、ツール名のみコンテキストに入る）
- `ENABLE_TOOL_SEARCH=auto` はデフォルトではない。閾値ベースの代替モードで、ツール定義がコンテキストの 10% 以内なら事前読み込み、超えたら遅延読み込みになる
- Tool Search は `tool_reference` 対応モデル（Sonnet 4.5 / Haiku 4.5 / Opus 4.5 以降）が必要（2026-08-03 更新。旧「Sonnet 4+/Opus 4+、Haiku 非対応」は stale）
- `ANTHROPIC_BASE_URL` がサードパーティホストの場合、Tool Search はデフォルト無効（プロキシが `tool_reference` ブロックを転送しないため）。Google Cloud's Agent Platform でもデフォルト無効

## Plugin source types

- ~~Plugin の source は5種類~~ → **7種類**（archive / command 追加。2026-09-30 再確認）
-  はモノレポ向けスパースクローン（sparse-checkout）
- plugin-marketplaces ページで確認: relative path, github, url, git-subdir, npm の5種のみ

## キーボードショートカット（追加）

- `Ctrl+C` = generation cancel のみ（exit ではない）。`Ctrl+D` = exit
- `/terminal-setup` は `Shift+Enter` バインディングのみをインストールする（VS Code, Alacritty, Zed, Warp 等の非ネイティブ端末向け）。iTerm2/WezTerm/Ghostty/Kitty では設定不要
- `Option+T`（アダプティブ推論トグル）は **v2.1.132 以降 macOS でも「Option as Meta」設定なしで動作**（interactive-mode.md L45 / changelog.md L65、2026-05-09 再確認）。`/terminal-setup` の機能ではない。"Option as Meta" は依然として `Alt+B`/`F`/`Y`/`M`/`P` には必要
- `Shift+Tab` でパーミッションモード切替: `default`/`acceptEdits`/`plan` に加え、**有効化済みの `auto` や `bypassPermissions` も含めてサイクル**（3つ固定ではない）。`Alt+M` は "some configurations" のみ（interactive-mode.md）— 全環境対応ではない

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
- lint が 6 問（tool-081, ses-190, sdk-016, sdk-018, skill-076, bp-098）に advanced→beginner (score=-1) を報告したが、自動修正コマンドは存在せず、2段階降格はヒューリスティックとして過剰（AWS SigV4 認証やキャッシュ TTL はエンタープライズ/上級トピック）と判断しスキップ → `quiz:difficulty-fix` の実装時は score<=-2 のみ自動適用、score=-1 は中間（intermediate）への1段階降格提案に留める

## Agent teams terminology (teammates vs subagents)

- skill-039 の wrongFeedback がデスクトップアプリでの利用可能性を誤って記述していた。docs は "available via the CLI and Agent SDK, not in Desktop" と明記 → エージェントチーム関連問題の生成時に CLI/Agent SDK のみ利用可能というプラットフォーム制限を明記するガイドラインを追加
- key-016 が question タイトルに "拡張思考（Extended Thinking）" を使用。model-config docs では Opus 4.6/Sonnet 4.6 の思考機能は "adaptive reasoning" と表記。ただし settings.md と interactive-mode.md では一般的な思考機能として "Extended Thinking" を使用しており、用語の使い分けが必要 → known-issues.md に「"Extended Thinking" は一般的な思考機能名として使用可。Opus 4.6/Sonnet 4.6 固有の動作を説明する場合は "adaptive reasoning" を使用」というガイドラインを追加
- cmd-033 の explanation が「`claude commit` サブコマンドは存在しません」と正しく否定的に述べているのに、terminology checker がフラグした → ✅ RESOLVED (2026-04-20): quiz-lint.mjs に `skipIfNegated` オプションを追加し、`claude commit` / `/teleport` エントリに設定。40文字以内に「存在しません」「ではない」「does not exist」等の否定語があればスキップ
- key-016 の diagram.label が "Extended Thinking動作" となっており、known-issues に記載の用語ガイドライン（Opus 4.6/Sonnet 4.6 固有の動作には "adaptive reasoning" を使用）と不整合 → quiz:edit コマンドが diagram.label フィールドをサポートしていないため、quiz-utils.mjs に diagram サブフィールドの編集サポートを追加する
- cmd-033 が「`claude commit` サブコマンドは存在しません」と正しく否定しているのに terminology checker がフラグし続ける。毎回 known-issue 確認が必要 → ✅ RESOLVED (2026-04-20): `skipIfNegated` で構造的に解決済み
- key-011 が `Ctrl+F` を全バックグラウンドエージェント停止ショートカットとして記載していたが、正しくは `Ctrl+X Ctrl+K`（コードバインディング）。interactive-mode ドキュメントで明確に定義されている → generate-quiz-data SKILL.md のキーボードショートカットセクションに `Ctrl+X Ctrl+K`（全バックグラウンドエージェント停止）を明記
- cmd-033 の explanation「`claude commit` サブコマンドは存在しません」を terminology checker が毎回フラグ。known-issues にも複数回記載されている → ✅ RESOLVED (2026-04-20): `skipIfNegated` で構造的に解決済み。全ての terminology エントリで必要に応じてこのフラグを指定可能
- 本 run（--full）も forked skill context で実行されたため、`--team` 並列起動が不可。SKILL.md の "フォールバック運用" (L138-159) に従い、決定論的修正 + spot-check に留めた → SKILL.md の Step 0 に「Agent tool 利用可否の検出フラグ」を追加し、forked 環境では自動的に fallback パス（pre-lint fact-tier の spot-check + 決定論的修正のみ）に分岐。`scripts/verify-category-headless.mjs` を主要パスに昇格させ、`--team` フラグを「並列モード(Agent tool)」「並列モード(subprocess fallback)」の 2 モードで明示
- 現行 docs はプロバイダ名を「Google Cloud's Agent Platform」に統一済み（doc slug は google-vertex-ai のまま）。bp-102・sdk-016 が「Google Vertex AI」「Vertex」の旧名称を使用（事実自体は正しいため minor でスキップ） → topic-config.mjs の TERMINOLOGY_DICT に `Google Vertex AI → Google Cloud's Agent Platform` 追加を検討（ただし doc slug・referenceUrl は google-vertex-ai のままなので URL は変換対象外にする）。次回スキャンで旧名称使用問題を横断棚卸し

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
- `sdk-016`（プロンプトキャッシュ TTL の認証方式別デフォルト値+環境変数上書き）、`sdk-018`（Claude Platform on AWS の SigV4 vs API キー優先順位）は内容的に明確に advanced 相当（複数条件の相互作用の正確な記憶が必要）だが、lint の difficulty スコアラーは "advanced → beginner, score=-1" と判定した。おそらく文字数/構文の単純さのみで判定しており、知識の複雑さ（条件分岐の数）を考慮していない → difficulty ヒューリスティックのスコアリング要因に「条件分岐/相互作用の数」または「否定文脈の重なり」を加味するか、少なくとも score=-1（境界線）のケースは自動修正せず人間/LLM判断に委ねる運用を明記する。今回は全問 advanced 現状維持と判断（変更なし）
- minor 96 件のうち約 90 件が「correct-too-long（正解が不正解平均の2倍超）/ distractor-too-short / format-giveaway」の純粋な長さ・書式バランスで、事実誤りは 0 件。正解テキストの一括圧縮は事実ドリフト混入リスクがあるため fix-loop 内では適用せず、known-issues 既載の「distractor 品質専用バッチパス」へ委譲した。対象例: ses-227/231（正解 175〜187 字 vs 不正解平均 40 字）、tool-093（8 倍乖離）、ext-199（208 字 vs 45 字）、bp-018/108、key-060、sdk-019/022、skill-064/093、mem-060/087〜094 → SKILL.md の「修正時の注意」に「純粋な長さバランス minor は fix-loop で個別適用せず、対象 ID を蓄積して distractor-balance 専用パス（別スキル or quality-loop ステップ）で一括処理する」を明記。各 verify_*.json の `correct` フィールドに書き直し案が保存済みのため、専用パスはこれを入力にできる。ただし判定層注記（2026-08-19）: バッチパス適用時は保存済み書き換え案を鵜呑みにせず、適用時点の正典 docs と再照合すること。また cmd-025 の referenceUrl 更新（common-workflows→headless のページ分割ドリフト、check C・リンク鮮度）も同バッチパスに相乗りさせる
- 正解の書き換え後に correct-too-long が 145 → 181 件に増加。正解に条件・例外を詰め込むほど distractor との長さ差が「答えのヒント」になる。今回は 18 問を手動で再調整した → SKILL.md の「修正時の注意」に「正解を書き換えたら distractor も同程度の長さ・具体性に書き換える（詳細は explanation へ移す）。書き換え後に `quiz:lint distractor` で当該 ID を確認」を追記

## Automated pattern scanning efficiency

- 557問のフルスキャンで、Known Issues に記載された全パターンを自動スクリプトで検証したが、全て既に修正済みであった → 今回の自動スキャンスクリプトのパターンをquiz-utils.mjsに統合し、quiz:fact-checkのカバレッジを拡張する

## allowManagedHooksOnly wrongFeedback precision

- ses-052 の wrongFeedback.2 が「マネージド以外のHooks」と曖昧に記述しており、SDK hooks が許可される点が不明確 → wrongFeedback で allowManagedHooksOnly の範囲を記述する場合は「User/Project/Plugin のフックが無効化される。Managed と SDK のフックは許可される」と正確に記述するガイドラインを追加
- extensions カテゴリ中心に 25 文字未満の短い wrongFeedback が多数存在（ext-042, ext-048, ext-051, ext-058, ext-059, ext-060, ext-064, ext-067, ext-070, ses-038, ses-042, ses-050, ses-062, ses-064, ses-078） → 短い wrongFeedback を 30 文字以上に拡充し、「なぜ誤りか」の説明を具体化するパスを検討

## Non-blocking event list completeness

- ext-029 の非ブロッキングイベント一覧から `PostToolUseFailure` と `StopFailure` が欠落していた → チェックリスト A に「ブロッキング/非ブロッキングイベント一覧を列挙する場合は22種全てが網羅されているか確認」を注記
- ext-053 の explanation と wrongFeedback で、TaskCompleted イベントの発火条件として「Agent Teamsのチームメイトが進行中タスクを残したままターンを終了した時」という記述があったが、公式ドキュメントには "When a task is being marked as completed" としか記載されていない → known-issues.md に「TaskCompleted の発火条件はドキュメント記載の 'When a task is being marked as completed' のみ。追加条件を断言しない」を追記
  - **更新（2026-06-02、現行 hooks.md 再取得で訂正）**: hooks.md が更新され、TaskCompleted は2状況で発火と明記された（"This fires in two situations: when any agent explicitly marks a task as completed through the TaskUpdate tool, or when an agent team teammate finishes its turn with in-progress tasks."）。入力にも `teammate_name`/`team_name` あり。よって ext-053 の「またはチームメイトがターン終了時」は**現行ドキュメントで正しい**ため、上記「追加条件を断言しない」旧ガイドラインは撤回。今後この点を false-positive として扱う。

## referenceUrl domain migration

- 全630問のreferenceUrlが`/docs/ja/`を使用していたが、quiz-lintは`/docs/en/`を期待していた。テストコード（quizContentQuality.test.ts）も`/docs/ja/`を期待していたため、lintとtestで不整合があった → quiz-lint.mjsとquizContentQuality.test.tsのURL prefix定義を統一するチェックをCIに追加。言語切替が発生した場合の一括変換スクリプトも検討
- 実サイトは `CLAUDE.md` を含む見出しを `claude-md` 形式に slug 化するが、quiz-lint.mjs / fetch-docs.mjs の slugify はドットを除去して `claudemd` を生成していた。このため無効アンカーの quiz 7問（mem-004/012/035/045/048/054, ses-089）が lint を通過し続けていた（lint とデータが同じバグを共有する自己整合の罠）。両 slugify に `.replace(/\./g, '-')` を追加して修正、7問の referenceUrl も修正済み → known-issues.md「Memory ページのアンカー」を更新済み。lint の妥当性検証は定期的に実サイト（curl で id= 属性）とサンプル照合する
- cmd-025 の referenceUrl が指す common-workflows「Pipe Claude into scripts」節が headless.md への 4 行ポインタに縮小され、検証対象の詳細（`--output-format stream-json` 等）は headless.md にのみ記載。cmd-096/097 の troubleshooting → troubleshoot-install と同種 → known-issues「ドキュメントページ分割の追跡」セクションに cmd-025 の事例を追記。次回スキャンで referenceUrl を headless へ更新検討

## CLAUDE.local.md ドキュメント復帰（確認済み）

-  は現在のドキュメント（memory.md）に**掲載されている**（2026-04-04 再確認）。Local scope はテーブルに記載されており「削除」は誤り
- ~~CLAUDE.md のスコープは4段階: Managed > Project > User > Local~~ → 2026-09-30: docs は**読み込み順 Managed → User → Project → Local**（連結・非上書き）であり優先順位ではない（mem-013/025/045 修正）
- settings.json スコープは5段階: Managed > CLI > Local > Project > User（異なる）
- 以前の「CLAUDE.local.md removal」という記録は古い情報。quiz で「3スコープ」「Local scope が存在しない」と記述しないこと

## @import does not support glob patterns

- mem-046 が `@import` で glob パターンがサポートされていると主張していたが、docs には glob/wildcard の記載なし。docs は「Both relative and absolute paths are allowed」のみ → known-issues.md に「`@import` は個別ファイルパスのみ。glob パターン（`@docs/*.md`）は未ドキュメント」を追加
- key-016 の diagram.label が "Extended Thinking動作" のまま残存しており、quiz:edit コマンドでは diagram サブフィールドの編集ができない → quiz-utils.mjs の edit コマンドに `diagram.label`, `diagram.steps[N].text`, `diagram.steps[N].sub` 等の diagram サブフィールド編集サポートを追加する
- Step 0a の `rm -f .claude/tmp/verify_*.json .claude/tmp/verify_*.md ...` は、zsh では `verify_*.md` がマッチしないと `no matches found` でコマンド全体が中断され、5月の stale な verify_*.json が残存した。今回、新旧レポートの混同リスクが実際に発生（手動削除で回避） → SKILL.md Step 0a の削除コマンドを glob 非依存の `find .claude/tmp -maxdepth 1 \( -name 'verify_*.json' -o -name 'verify_*.md' -o -name 'skill-proposals.md' \) -delete` に差し替える
- Step 0a の `rm -f .claude/tmp/verify_*.json .claude/tmp/verify_*.md ...` が zsh の `no matches found: .claude/tmp/verify_*.md` で中断し、Aug 5 の stale な verify_extensions.json / verify_keyboard.json / verify_sdk.json が残存。今回は「全9ファイル存在」の監視が stale ファイルで偽陽性トリガーし、タイムスタンプ照合で回避した。known-issues L398 で既に find ベース削除への差し替えが提案済みだが SKILL.md 未反映のまま再発 → SKILL.md Step 0a の削除コマンドを `find .claude/tmp -maxdepth 1 \( -name 'verify_*.json' -o -name 'verify_*.md' -o -name 'skill-proposals.md' \) -delete` に差し替える（glob 非依存）。加えてレポート集約時は必ず mtime が当日以降であることを確認する
- `rm -f .claude/tmp/verify_*.json .claude/tmp/verify_*.md ...` は zsh では glob が 1 つでも不一致だと「no matches found」でコマンド全体が失敗し、旧レポート（8/13 の stale verify_*.json 9 ファイル）が残存した。稼働中エージェントの成果物と混同するリスクがある → SKILL.md Step 0a のクリーンアップを glob 非依存の形に変更する: `find .claude/tmp -maxdepth 1 \( -name 'verify_*.json' -o -name 'verify_*.md' -o -name 'skill-proposals.md' \) -delete`
- `rm -f .claude/tmp/verify_*.json .claude/tmp/verify_*.md ...` の実行時、`verify_*.md` が 0 件マッチだと zsh が「no matches found」でコマンド全体を中断し、旧 `verify_*.json`（2026-08-15 分）が削除されずに残存した。verify-skills も known-issues の同種記録（2026-07-19, 2026-08-13）を指摘。stale レポートを最新結果と誤認するリスクがある → SKILL.md Step 0a のクリーンアップを `find .claude/tmp -maxdepth 1 \( -name 'verify_*.json' -o -name 'verify_*.md' -o -name 'skill-proposals.md' \) -delete` に差し替える（glob 不一致でも中断しない）

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
- fact tier 65問中 51問は、フラグされたトークン（`/load`, `--gui`, `CLAUDE_PROXY` 等）が**不正解選択肢 / wrongFeedback にのみ**出現する意図的 distractor だった。question・正解選択肢・explanation にフラグトークンが出現したのは ext-013 / tool-031 / cmd-049 / ses-102 の4問のみで、全て false-positive（`--env`=mcp.md コードフェンス脱落、`autoAllowBashIfSandboxed`=settings.md L324 に実在、`--name-only`=git のフラグ例、`--effort=low`=「正しくないもの」問題の正解） → `scripts/pre-lint-quiz.mjs` の factCheck 系チェックに出現位置判定を追加し、トークンが wrong option / wrongFeedback にのみ出現する場合は `fact` tier から `quality`（または skip）へデモートする。question / correct option / explanation に出現する場合のみ `fact` tier とする。これで Sonnet 検証対象を大幅削減できる

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
- **PowerShell ツール**: Linux/macOS/WSL は opt-in（CLAUDE_CODE_USE_POWERSHELL_TOOL=1 + PowerShell 7+）。Windows は Git Bash なしで自動有効・ありなら claude.ai/Console アカウントで既定有効、Bedrock/Agent Platform/Foundry は env=1（2026-09-30 更新。旧「段階的ロールアウト」は消滅）。「Windows 専用」「Auto モード不可」は誤り
- **複数行入力ネイティブ対応ターミナル = 7種**: iTerm2/WezTerm/Ghostty/Kitty/**Warp/Apple Terminal/Windows Terminal**。/terminal-setup が必要 = VS Code/Cursor/**Devin Desktop**/Alacritty/Zed（terminal-config.md L15、2026-08-03 確認。旧記録の Windsurf は Devin Desktop に置換済み）。Warp を要設定側に入れるのは誤り（key-033/044/020 で頻出）
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

## 2026-06-10 Fable 5 / ultracode ドリフト（incremental スキャン）

doc 全面更新（45ページ）で 810 問全件が target 化、pre-lint で 91 問に絞り fact-tier 59 問を docs 照合。**lint フラグ自体はほぼ false-positive だったが、フラグ問の周辺照合で大規模 doc ドリフトを2系統検出**:

1. **Fable 5 の docs 登場**: `xhigh` は Fable 5 / Opus 4.8 / Opus 4.7（「4.8/4.7 のみ」は stale）。`max`・1M context・アダプティブ推論常時有効に Fable 5 追加。`MAX_THINKING_TOKENS=0` は Fable 5 で無効化不可（「全モデルで無効化」は stale）。Fable 5 はどのプランでもデフォルトでない。`/effort` に `ultracode` 追加（モデル effort ではなく CC 設定、env var/effortLevel 不可）→ ses-045/ses-102/skill-061/key-016/bp-018/cmd-104/ses-105 修正
2. **ワークフロートリガーキーワード**: v2.1.160 以降は `ultracode`（旧 `workflow`）。known-issues 旧記録「bp-096 は workflow キーワードで正しい（2026-06-06）」は**本日時点で stale** → bp-096/bp-098 修正。educational quiz でモデル名列挙（「のみ」「全Nモデル」「すべて」）を含む問題は、新モデル登場のたびに一括 grep（`xhigh|全4モデル|のみ`）で総点検すること
3. その他: agent-teams `"auto"` は iTerm2 でも split panes（「tmux のみ」stale、skill-076）。`/config [style]` 引数形式は undocumented（key-032）。fullscreen の版数 claim 削除（key-052）。`/clear` は「全削除」でなく「以前の会話は /resume に残る」（cmd-066）。install 系トラブルは `/troubleshoot-install` ページへ移動（cmd-096/097 referenceUrl + VALID_DOC_PAGES 追加）

## 2026-06-06 正解妥当性監査（10エージェント・正解の doc ドリフト/事実誤り 12問修正）

ユーザー報告「正解を選んでも別の選択肢を選んだことにされる（=正解が間違っている問題）」を起点に、lint 非依存で **correctIndex の正解そのもの**を全810問監査。UI/選択ロジックにバグは無く（選択 index は直接マッピング、回答後の緑ハイライトは正解提示）、原因は**データの正解誤り**だった。

**修正した正解誤り（critical/major、詳細は docs/verified-facts.md「2026-06-06」表）:**
- key-010（タスク 10→5件）, key-031（statusline=画面下部バー）, key-049/key-026（PR バッジ 紫削除）, tool-027（Bash 出力=ファイル保存、correctIndex 1→3）, ses-108（Fast mode=Opus専用・自動切替）, ses-025（MCP 遅延ロード）, mem-060（autoMemoryDirectory=任意スコープ可）, cmd-065（ANTHROPIC_MODEL を正解に・真の誤答に差替）, cmd-089（server mode 32 注記）, tool-051（復元 5→6）, ext-161（usage credits）

**棄却したエージェント誤指摘（自前 doc 照合で false-positive 確認）:**
- key-044（「4種」→実は7種で正しい・選択肢を途中までしか読まず誤読）, key-020（ほぼ正確）, ses-126（rm は確認必要で正しい）, skill-065（/simplify は4エージェントで正しい・assembled が古い）, bp-096（workflow キーワードで正しい）

**プロセス教訓（checklist A-1/A-2/A-3・quiz-verifier・SKILL に反映済み）:**
1. 正解妥当性は incremental では漏れる → 定期的に「正解そのもの」を全問監査（10並列）
2. assembled docs は古い記述が残る → `docs/<page>.md` 個別ファイルが正典
3. 並列エージェントの指摘は doc 再照合してから適用（誤読あり、特に「正解が誤り」は偽陽性コスト大）

## 新モデル登場時の「モデル列挙ドリフト」一括点検

- model-config.md に Fable 5 が追加され、`xhigh`/`max`/1M/アダプティブ推論のモデル列挙を含む 7 問（ses-045, ses-102, skill-061, key-016, bp-018, cmd-104, ses-105）が一斉に stale 化した。lint はこれを検出できず、フラグ問の周辺照合で発見した → quiz-refine SKILL.md に「model-config.md の content-hash が変わった場合、`xhigh|全[0-9]モデル|のみ対応|すべてで利用可能` を全問 grep し、モデル列挙の網羅性を一括再確認する」手順を追加。pre-lint-quiz.mjs に「モデル名列挙 + 限定表現（のみ/すべて/全N）」の fact tier チェックを追加

## 「確認済み」記録の賞味期限（workflow→ultracode）

- bp-096 の `workflow` キーワードは 2026-06-06 監査で「正しい」と確認済みだったが、4日後の docs 更新（v2.1.160）で `ultracode` に変更され stale 化した → known-issues の「確認済み事実」は doc page の content-hash が変わったら再検証対象に戻す（verified-ok スキップを doc 変更で無効化する現行 verify:diff の挙動を維持し、known-issues の false-positive 記録を盲信しない）。checklist A-3 に「known-issues の確認日付と doc 変更日を比較する」を追記

## ドキュメントページ分割の追跡（troubleshooting → troubleshoot-install）

- インストール系トラブルシュート（`Killed`、Docker ハング）が `/troubleshooting` から `/troubleshoot-install` に移動しており、cmd-096/097 の referenceUrl が内容と乖離していた。VALID_DOC_PAGES への追加も必要だった → fetch-docs のページリストに新ページが追加されたら、その親ページを referenceUrl に持つ問題の内容が新ページへ移動していないか確認する

## 2026-07-16 Sonnet 5 登場ドリフト + 正解差し替え2問（quality-loop フルスキャン）

8並列検証（対象 ~107問）+ 判定層（Fable 5）二重確認 5件。偽陽性ゼロ。

1. **Sonnet 5 の docs 登場（モデル列挙ドリフト再発）**: model-config.md に Sonnet 5 追加。`xhigh`/`max` 対応は Fable 5 / Sonnet 5 / Opus 4.8 / Opus 4.7 に、Pro/Team Standard/Enterprise の `default` は Sonnet 4.6 → **Sonnet 5** に変更 → skill-061/key-016/ses-045/ses-102/ses-103 修正。「新モデル登場時の一括点検」パターンが2度目の的中
2. **fast-mode.md**: Opus 4.6 が Fast mode 対象から除外（現行は 4.8/4.7 のみ）→ ses-108 修正
3. **memory.md（正解差し替え）**: 肥大化対処の推奨は path-scoped rules / trim。「Splitting into @path imports helps organization but doesn't reduce context」と @path 分割を明示否定 → mem-030 の正解を差し替え
4. **artifacts.md（正解差し替え）**: 公開リンク（サインイン不要）が存在。Pro/Max は公開リンクが唯一の共有手段、Team/Enterprise は Owner が External sharing 有効化。editor 役割も追加 → bp-106 正解差し替え、bp-108 のプラン要件（Pro/Max/Team/Enterprise）修正
5. **advisor.md**: 「Claude Code v2.1.98 以降」は docs に根拠なし（明記は Fable 5 の v2.1.170+ のみ）。未記載バージョン数値の断定パターン → bp-102 修正
6. **agent-teams.md**: teammateMode デフォルトが v2.1.179 以降 `"in-process"`（旧 `"auto"`）。v2.1.186 以降 `"iterm2"` 追加 → skill-076 修正（正解選択肢テキストも「明示設定が必要」に）
7. **hooks.md**: `defer` は非対話（-p）モード専用（プロセス終了→SDK ラッパーが再開）。「後続フックに委ねる」は優先順位（deny > defer > ask > allow）との混同 → ext-132 修正
8. **desktop.md 表記**: 「Preview ドロップダウン」は docs に存在せず正は「server dropdown」→ ext-172/ses-112 修正
9. minor: mem-037（/resume はピッカー）、key-054（SCROLL_SPEED デフォルト値は未記載）修正。cmd-072/tool-031/key-034 は修正不要と判断

## 排他的モデル列挙は新モデルリリース時に必ず再検証（doc ドリフト高リスク）

- ses-199 の正解選択肢・解説・wrongFeedback×2 が「Auto Mode は Sonnet 5・Opus 4.7・Opus 4.8 のみ」と記述していたが、現行 feature-availability.md は「only Claude Sonnet 5, Opus 4.7, Opus 4.8, and Fable 5」と Fable 5 を追加済み。4フィールドを修正 → known-issues.md に「Bedrock / Google Cloud's Agent Platform / Foundry での Auto Mode 対応モデルは Sonnet 5・Opus 4.7・Opus 4.8・**Fable 5**（2026-07-18 feature-availability.md 確認）。CLAUDE_CODE_ENABLE_AUTO_MODE 要件は v2.1.207 で撤廃」を追記。「のみ」「限定」付きモデル列挙は新モデル（Fable 5 / Sonnet 5 / Mythos 5 等）リリース時に横断再検証する
- ext-008 の選択肢[3]・wrongFeedback・explanation・diagram の4フィールドが「Explore は Haiku モデルで動作」と記述していたが、sub-agents.md は v2.1.198 で「Explore はメイン会話のモデルを継承（Claude API では Opus 上限）」に変更済み。正解（Debug が存在しない）は無事だが、周辺記述が stale → known-issues.md の「排他的モデル列挙は新モデルリリース時に必ず再検証」セクションに「**機能→モデルの固定対応**（Explore=Haiku、statusline-setup=Sonnet、claude-code-guide=Haiku、goal評価=Haiku 等）も同リスク。sub-agents.md / goal.md / model-config.md の hash 変化時に `Haiku|Sonnet|Opus` を含む帰属記述を横断確認」を追記

## PreToolUse permissionDecision は4値（defer 追加確認）

- crossCheck が ext-110 / ext-132 の「4つの値」を数値矛盾としてフラグしたが、現行 hooks.md L422/L781 は `allow` / `deny` / `ask` / `defer` の4値を明記（defer は `-p` 非インタラクティブ専用、優先順位 deny>defer>ask>allow）。quiz は正しく偽陽性 → known-issues.md の Hook 関連セクションに「PreToolUse permissionDecision = 4値（allow/deny/ask/defer、2026-07-18 確認）。3値と指摘するのは偽陽性」を追記

## 新モデル一括点検は「修正済みIDリスト」ではなく「パターン全ヒット」で消し込む

- 2026-07-18 の Sonnet 5 対応で ses-045/ses-102/skill-061/key-016/ses-103 は修正済みだったが、同一パターン（xhigh/max/常時アダプティブのモデル列挙）を持つ bp-018・cmd-104、および key-016 内の別文（常にアダプティブ推論の列挙）が取り残されていた。今回 3問10フィールドを修正 → known-issues の「新モデル登場時の一括点検」手順を強化: 修正リストではなく `xhigh|max.*利用可能|常にアダプティブ|のみ対応|のみで使える` の grep 全ヒットを対象に、新モデル名を含まないものを全件レビューする。**diagram 内の列挙（quiz:edit 非対応領域）を必ず含める**（今回の取り残し10フィールド中5つが diagram）

## モデル列挙チェックはフィールド単位で判定（固定幅 grep 窓は誤判定する）

- 前後30-80文字の固定幅 grep 窓では「Fable 5 / Sonnet 5 / Opus 4.8 / Opus 4.7 のみ」の先頭が切れて stale と誤判定する（ses-102 / skill-061 で3件発生、手動再照合で棄却） → モデル列挙の網羅性チェックは option.text / wrongFeedback / explanation / diagram 文字列のフィールド全体を単位に判定する

## factCheck:flags/env/slash の偽陽性削減（不正解選択肢トークンの除外）

- fact tier 65問のフラグで実修正 0件。内訳: 不正解選択肢内の意図的な架空フラグ/環境変数（--gui, CLAUDE_PROXY 等）が大半、否定文脈の正解（cmd-051 `/summarize` は「存在しないもの」設問）、git のフラグ（cmd-049 `--name-only` は `git diff` の引数）、キャッシュのコードブロック脱落（ext-013 `--env` は `claude mcp add --help` で実在確認） → pre-lint-quiz.mjs の factCheck 系に (a) 不正解選択肢とそのwrongFeedbackのみに出現するトークンの除外、(b) 「存在しない」等の否定語近傍スキップ（terminology の skipIfNegated 相当）、(c) `git |npm |npx ` 直後のフラグ除外、を追加して Sonnet 検証対象を絞る

## TodoWrite は v2.1.142 からデフォルト無効（MEMORY 同期 2026-07-22）

- tools-reference.md L49 / env-vars.md L97: `TodoWrite` は **v2.1.142 から all modes でデフォルト無効**。Task tools（TaskCreate/TaskGet/TaskList/TaskUpdate）がすべてのモードでデフォルト
- `CLAUDE_CODE_ENABLE_TASKS=0` で TodoWrite を復活可能
- 旧仕様「TodoWrite は -p フラグと Agent SDK でデフォルト」を正解として扱うのは doc drift（tool-074 で 2026-05-30 検出済み）

## /output-style は現行コマンドとして存在しない（MEMORY 同期 2026-07-22）

- ~~`/output-style` は廃止~~ → 2026-09-30: **`/output-style <style>` は v2.1.269+ で現存**（コマンド・`/config`・settings の3手段が並列、推奨順位なし）。旧記述:出力スタイル変更は `/config` → Output style または `settings.json` の `outputStyle` 編集が正式手段（commands.md L18 / output-styles.md）
- **循環検証トラップ注意**: assembled per-category JSON はクイズ本文（wrongFeedback 等）を含むため、それを「ドキュメント」として事実根拠にしない。事実照合は必ず `docs/<page>.md` 生ファイルを正典とする（key-032 で 2026-06-23 発生）

## hooks.md キャッシュ平坦化は --force 再取得でも復元されない場合がある

- ext-004 / ext-085 / ext-087 の `#configuration` invalid-anchor（既知 false-positive）に対し、known-issues.md の指示どおり `node scripts/fetch-docs.mjs --pages hooks --force` を実行したが、今回は再取得後も 1 section のみ（見出し平坦化が継続）で lint は解消しなかった。Jina Reader の出力形式が安定しないため、--force 再取得は「解消する場合がある」対処であり確実ではない → known-issues.md「Hooks ページのアンカー」セクションに「--force 再取得でも復元されない場合がある（2026-07-19 確認）。復元されない場合も false-positive 判定は維持し、referenceUrl は修正しない」を追記
- 2026-08-15 の `fetch-docs.mjs --pages hooks --force` 再取得でも見出しの Markdown 記号が復元されず（`##` 見出し 2 個のみ、Configuration は地の文）、invalid-anchor false-positive が継続。known-issues の既存記録（2026-07-19 / 2026-08-13）と同一事象 → quiz-lint.mjs の extractDocAnchors に「見出し検出数が閾値未満（例: `##` が 3 個未満）のページは anchor 検証をスキップし warning のみ出す」ガードを実装する（既存提案のスキップリスト方式より汎用的）

## 不正解選択肢の「架空コマンド」が実在化する二重正解パターン

- cmd-035 の不正解選択肢[3]「`/plan` コマンドで Plan Mode を有効化」が、commands.md への `/plan [description]` 追加（L58）により事実として正しくなり、二重正解状態になっていた。wrongFeedback 自身が「`/plan`コマンドでもPlan Modeに入れますが…」と正解であることを認めており、「他の方法も重要」という理由では不正解にできない → pre-lint-quiz.mjs の factCheck:knownNonexistent を逆方向にも使う: 「不正解選択肢に含まれるスラッシュコマンド/フラグが現行 docs に**出現するようになったら** flag する」チェックを追加（現在は存在しないものの検出のみ）。commands.md / cli-reference.md の content-hash 変化時は、不正解選択肢内のコマンド・フラグ token を全問 grep して実在化を棚卸しする

## 「Key tools include（例示）」を完全リストと誤認する断定の再発

- sdk-009 explanation と diagram が「ビルトインツールは…の10種です」と断定。agent-sdk-overview.md は「Key tools include」と例示表現で、「full list, including scheduling and worktree tools」への参照を明記している。known-issues 既載の「ドキュメントの例示を完全リストと誤認」パターンの再発 → 既存パターンで対応済み。生成時ガイドとして generate-quiz-data 側にも「"include(s)" / "such as" のリストを「全N種」と数えない」を再周知

## Opus 5 の docs 登場（2026-07-30 確認・モデル列挙ドリフト3度目）

- model-config.md に **Opus 5** が追加（v2.1.219）。「新モデル登場時の一括点検」パターンが3度目の的中
- **`default` モデル**: Max / Team Premium / Enterprise pay-as-you-go / Anthropic API / Claude Platform on AWS / Amazon Bedrock / Google Cloud's Agent Platform = **Opus 5**（旧 Opus 4.8 は stale）。Pro / Team Standard / Enterprise サブスクリプション席 = Sonnet 5、Microsoft Foundry = Sonnet 4.5。Fable 5 は引き続きどのアカウントタイプでもデフォルトにならない
- **effort テーブル**: `xhigh`/`max` 対応は Fable 5 / **Opus 5** / Sonnet 5 / Opus 4.8 / Opus 4.7（`max` は加えて Opus 4.6 / Sonnet 4.6）。デフォルト effort は「effort 対応全モデルで high、Opus 4.7 のみ xhigh」。**Opus 5 には初回実行時の effort ホールドがない**（Fable 5 / Opus 4.8 / 4.7 にはある）
- **常時アダプティブ推論**: Fable 5 / Sonnet 5 / Opus 4.7 以降（**Opus 5** / 4.8 / 4.7）。`MAX_THINKING_TOKENS=0` の無効化不可例外は Fable 5 のみ（Opus 5 は無効化可能）
- **1M context**: Fable 5 / Sonnet 5 / Opus 4.6 以降（**Opus 5** / 4.8 / 4.7 / 4.6）/ Sonnet 4.6。Anthropic API では Fable 5 / Sonnet 5 / Opus 4.7 以降が常時 1M
- **Fast mode**: Opus 5 と Opus 4.8 のみサポート。**v2.1.219 以降のデフォルトは Opus 5**（旧 Opus 4.8）。Opus 4.7 の fast mode は 2026-07-24 に削除済み（API が拒否）
- **auto mode（サードパーティ）**: Bedrock / Google Cloud's Agent Platform / Foundry / Claude apps gateway は Sonnet 5・**Opus 4.7 以降（Opus 5 含む）**・Fable 5 のみ
- **advisor ペアリング**: 「Opus 4.7 or later」行に統合（Opus 4.7 以降同士は同等ランクで相互許容、Opus 4.6 / Sonnet 5 advisor は拒否）。Opus 4.6 メインは Sonnet 5 advisor を受け入れる（Opus 4.6 と Sonnet 5 は同等ランク）
- **安全性クラシファイアフォールバック**: Fable 5 → biology は Opus 5 / cybersecurity は Opus 4.8。Opus 5 → cybersecurity は Opus 4.8、biology はフォールバックなしで拒否（v2.1.219 以降）
- 今回修正 12 問: ses-103（critical・正解選択肢 Opus 4.8→Opus 5 + しきい値フォールバック記述の削除）/ bp-018 / ses-045 / key-016 / skill-061 / cmd-104 / ses-105 / ses-102 / cmd-065 / ses-199（列挙に Opus 5 追加）/ bp-101（advisor ペアリング規則更新）/ ses-117（fast mode デフォルト更新）
- ses-103 の「Opus 使用量がしきい値超過で Sonnet に自動フォールバック」は現行 model-config.md に記載なし（stale）。default 節の再記述時は使用しないこと
- 2026-08-13 再取得の hooks.md キャッシュは HTML→テキスト変換で見出しのマークダウン記号（##）がほぼ失われており（「Configuration」等が地の文になる）、quiz-lint の anchor 抽出（`^#{1,4} ` 正規表現）が実在アンカーを検出できず ext-004/085/087 の `hooks#configuration` を invalid-anchor と誤報告した。ライブページの On this page には Configuration セクションが存在し URL は正しい → known-issues.md に「hooks#configuration の invalid-anchor はキャッシュ形式変化による偽陽性。URL を変更しないこと。キャッシュの見出しが平文化されたページでは anchor lint の報告を鵜呑みにしない」を追記

## 新モデル登場の検出を verify:diff 段階で自動化

- model-config.md の content-hash 変化時に「Opus 5」登場を lint は検出できず、fact-tier フラグとは独立にリード照合で発見した（3度目: Fable 5 → Sonnet 5 → Opus 5）。影響 12 問（ses-103 は正解選択肢自体が stale の critical） → pre-lint-quiz.mjs に「docs 内モデル名の集合 vs quiz 内モデル列挙の集合」の差分チェックを追加。docs 側に quiz 未出現の新モデル名（`(Opus|Sonnet|Haiku|Fable) [0-9.]+` パターン）が現れたら、モデル列挙を含む全問を fact tier に昇格する

## tmp/quizzes 分割キャッシュの鮮度検証

- `.claude/tmp/quizzes/*.json` が src/data/quizzes.json より古く（ses-102/ext-110/ext-085 で修正済みの内容が古いまま）、検証初期の判定を誤らせかけた。同一セッションで quiz-generator が並行稼働しており working tree が動く → SKILL.md の「カテゴリ処理の詳細」に「最終判定・修正前は必ず src/data/quizzes.json を正典として再読する。tmp 分割は候補抽出のみに使う」を明記

## fact-tier「存在しないフラグ」トリアージの機械化が有効

- fact tier 67 問中、49 問は不正解選択肢内の意図的な架空フラグ/env（known-issues 既知パターン）で、token の出現位置（正解側/不正解側）の機械判定で一括棄却できた。要精査は 4 問に圧縮 → known-issues 既存提案（factCheck の不正解選択肢トークン除外）を pre-lint-quiz.mjs に実装する優先度を上げる
- pre-lint の fact tier（factCheck:env/flags/slash, crossCheck:numeric-contradiction）63 問は全て「不正解選択肢内の意図的な架空フラグ/env を正しく否定」または既知 false-positive（hooks#configuration アンカー、difficulty 短文 advanced）で、真陽性 0 件だった → known-issues 既載「fact-tier トリアージの機械化」の継続。pre-lint-quiz.mjs の factCheck に「wrongFeedback が『存在しません/架空』と明示する選択肢はフラグ除外」の否定文脈検出を追加できれば、Sonnet 検証対象をさらに絞れる

## 正式フラグのリネーム（旧フラグの deprecated alias 化）で「正解が非推奨・不正解が正式」逆転が起きる

- cli-reference.md で `--remote` が「Deprecated alias for `--cloud`」になり、ses-145 は不正解選択肢 `--cloud` が正式フラグ化・wrongFeedback の「`--cloud` は存在しません」が事実誤りになる critical（正しい知識で選ぶと不正解）が発生。cmd-093/ses-165/bp-087/cmd-119 も表記が stale 化 → known-issues.md の「不正解選択肢の架空コマンドが実在化する二重正解パターン」に「**逆パターン: 正解のフラグ/コマンドが deprecated alias 化し、不正解側が正式名称になるケース**。cli-reference.md の hash 変化時は `Deprecated alias` を grep し、該当フラグを使う全問を棚卸しする」を追記

## 「X は非対応」系の否定断定はモデル世代交代で静かに stale 化する

- Tool Search の「Haiku 非対応」が現行 doc では「Sonnet 4.5 / Haiku 4.5 / Opus 4.5 以降対応」に変わっており、ext-024 / tool-038 の explanation・wrongFeedback・diagram が stale。known-issues の確認済み事実（2026-04-06 付）自体も stale だった → 「新モデル登場時の一括点検」の grep パターンに `非対応|サポート外|対応していない` を追加し、モデル名との共起を再検証対象にする

## flow/terminal diagram の機械分断・途中切れの残債が major 指摘の過半を占める

- 今回の major 指摘のうち 10 問（ext-011/017/056/090/198, cmd-035/049/065, ses-100, skill-065）が diagram の単語分断・文の途中切れ・options との不一致だった。checklist I / known-issues「flow.steps の機械的分断」既載パターンの継続 → `quiz:check-diagram-text` の quiz:check への統合（既知タスク）を優先する。修正時は「flow steps は1ステップ=完結した1文、sub は補足のみ」で書き直すのが最短
- key-022（Ctrl+U 問に Ctrl+W の flow）、ses-119（autoVerify 問にチェックポイント復元 flow）、ext-146（対応ブラウザが非対応列）、ext-108（本文 8 つ・diagram 6 つ） → quiz-utils に「diagram 内の主要トークン（Ctrl+X、機能名）が question/explanation に 1 つも出現しない diagram を報告する」`check-diagram-topic` を追加

## 検証エージェントの指摘は正典 quizzes.json で再照合してから適用（ses-030 で minor 棄却）

- verify-session が ses-030 の referenceUrl を「settings ページ（記載なし）」と minor 指摘したが、正典 `src/data/quizzes.json` では既に `authentication` ページ（authentication.md L99 に `CLAUDE_CODE_USE_BEDROCK`/`CLAUDE_CODE_USE_VERTEX` 明記）で修正済みだった。known-issues「tmp/quizzes 分割キャッシュの鮮度検証」パターンの再発 → known-issues の既存記録で対応済み。リードの A-3 二重確認（正典再読）を維持。verify-targets 分割生成時に quizzes.json の mtime/hash を各分割 JSON に埋め込み、エージェント側で鮮度検証できるようにするのも一案

## advisor Requirements に第3要件「Feature-flag fetching」追加

- advisor.md の Requirements が「Anthropic API only」「Supported main model」の2要件から、「Feature-flag fetching」を加えた3要件（"requires all of the following"）に更新された（2026-08-07 キャッシュには存在せず、2026-08-13 再取得で確認）。`DISABLE_TELEMETRY` などフラグ取得を無効化する環境変数が設定されたセッションでは advisor は無効のまま。bp-102 の explanation / hierarchy ダイアグラムを3要件に更新した。合わせて advisor.md から「Fable 5 はまだ advisor として提供されていない（rollout 待ち）」の注記が全面削除され、Fable 5 が advisor としてフル提供されたことも確認 → known-issues.md に「advisor の利用要件は3つ（Anthropic API only / Supported main model / Feature-flag fetching）。`DISABLE_TELEMETRY` 等でフラグ取得を無効化すると advisor は無効。Fable 5 advisor はフル提供済み（rollout 注記は削除済み）」を追記

## difficulty ヒューリスティックの構造的偽陽性（短文 advanced 問題）

- quiz-lint の difficulty 判定は表層特徴（質問文長・「〜として正しいものはどれですか」等の言い回し）のみで採点するため、問い方が短くても前提知識が多層のエンタープライズ管理・課金/キャッシュ内部動作・サードパーティ統合トピックを advanced→beginner (score=-1) と誤判定する。判定層（Fable 5）レビューの結果、フラグされた11問（tool-081, ses-190, sdk-016, sdk-018, skill-076, bp-098, bp-102, bp-107, bp-108, tool-083, ses-199）のうち beginner 降格妥当は0問。9問は keep-advanced、2問（bp-107, tool-083）のみ intermediate へ降格 → known-issues.md に「difficulty-mismatch (advanced→beginner, score=-1) は表層ヒューリスティックの既知偽陽性パターン。エンタープライズ設定・課金/キャッシュ内部・サードパーティ統合・バージョン履歴系トピックは問い方が短くても advanced 維持が原則。機械適用せず判定層レビュー必須」を追記

## `--full` スキャンでも pre-lint「matched」を素通りさせない（doc ドリフト検出の穴）

- 前回検証（2026-08-19）以降に全 61 ドキュメントページが更新されていたにもかかわらず、Step 1 の「pre-verify の sonnetTargets のみ検証」ルールにより 802 問（81%）が LLM 検証をスキップされる設計になっていた。今回追加で「正解妥当性監査」を全 802 問に走らせた結果、critical 26 問（ses-233, ext-058, skill-024, skill-082, skill-083, skill-022, mem-058, mem-063, mem-075, mem-086, cmd-088, cmd-026, bp-073, bp-120, bp-107, key-025, key-041, key-055, key-056, ext-140, ext-146, ext-152, ext-158, ses-137, ses-151, ses-183/184 など）を検出。lint 通過は「distractor 形式が健全」を意味するだけで事実の鮮度を保証しない → SKILL.md Step 1 に「`verify-state.json` の docHashes と現在の docs を比較し、**変更ページ数が閾値（例: 全体の 30%）を超える場合は pre-lint の matched もスキップせず、正解妥当性監査モード（A-1 のみ・10 並列）を自動で追加実行する**」を追記。`verify:diff` の出力（Changed docs: N）を判定に使う

## 検証エージェントの「live fetch」由来の指摘は cache 再照合で棄却できるようにする

- ext-164（分類器は Sonnet 5 既定）や key-033（Apple Terminal の Option as Meta）など、エージェントが `.claude/tmp/docs` ではなくライブ取得した内容を根拠に報告したケースがあり、リード側の cache に記述が無く検証不能だった。一方 tool-059 のように cache が `<Steps>` タイトルを落として平坦化しており、ライブ取得でしか分からない事実も存在した → quiz-verifier プロンプトに「docSource には必ず cache ファイル名と行番号を書き、live fetch を使った場合は `(live)` と明記する」を追加。リードは `(live)` 指摘を採用する前に `fetch-docs.mjs --pages X --force` で cache を更新して再照合する。known-issues に「hooks / errors / jetbrains の cache は見出し・Steps が平坦化されることがある」を記録済み

## モデル名リスト・件数を持つ問題の「リスト drift」を決定論的に検出する

- Fable 5.1 追加（7 問）、Hook イベント 30→33、Notification マッチャー 6→12、プラグインソース 5→7、Hook 共通フィールド 6→8、承認カテゴリ 3→5、認証優先順位 6→7、OTel 変数 3→5、Rewind 6 アクション、effort 設定 7 通り、Output style 5 種など「docs の表・箇条書きの要素数」に依存する問題が 20 問以上まとめて stale になっていた → `scripts/pre-lint-quiz.mjs` に factCheck:count チェックを追加: 問題文/explanation 中の「N 種/N つ/N イベント/N 段階」と、referenceUrl ページの対応する表・箇条書きの要素数を突き合わせ、不一致を `fact` tier に昇格させる。対応表は `topic-config.mjs` に `COUNT_ANCHORS: {hooks: {"イベント": "Hook lifecycle table"}}` の形で持つ

## 機能廃止（Ultraplan）に対する問題の扱い

- ultraplan.md がページ全体で廃止告知になっており、ses-183 / ses-184 の前提機能が消滅。削除ではなく「廃止の事実と代替」を問う問題に書き換えた → known-issues に「機能廃止ページに当たった場合は問題を削除せず『廃止の事実 + 代替手段』を問う形に書き換える（ID と統計を維持）」を方針として記録（本回で記録済み）

## 2026-09-16 --full スキャン（13 並列 Sonnet 正解妥当性監査 + 判定層 Fable 5.1）で確定した doc ドリフト

- **plugin-evals のアンカー `#add-setup-or-history-with-case-yaml` / `#compare-against-a-no-plugin-baseline` は有効**（ext-209 / ext-211）。quiz:lint の invalid-anchor は **false-positive**: Jina 経由キャッシュの見出しが「Seed the workspace or conversation」「Score against the no-plugin baseline」と旧版でレンダリングされる一方、ライブ HTML（`curl https://code.claude.com/docs/en/plugin-evals | grep 'id="add-setup-or-history-with-case-yaml"'`）には両 id が実在し、ページ内リンクも同 id を参照している（2026-09-16 確認）。`--force` 再取得でも解消しないため、修正せずログのみ
- **skill-049〜056（platform `agent-skills/best-practices`）は 2026-09-16 に判定層で A-1 確認済み（全 8 問一致、三人称ルールはライブ .md L206 で確認）**。同ページを `agent-skills-best-practices` として topic-config / PAGE_ALIASES / CATEGORY_DOC_MAP.skills に登録済みなので、次回以降は verifier がキャッシュから検証できる

- 対象 1005 問（全 61 ページ更新のため pre-lint matched も A-1 監査）。critical 6 / major 35 / minor 26 の報告を判定層で再照合し **64 問修正、false-positive 3 件棄却**
- **prompt-caching「Denying an entire tool」**: ツール名全体の deny は **Tool Search 有効時（対応モデルでは既定）はツール定義が変わらずキャッシュ維持**、Tool Search 無効・非対応時のみ定義が除去されキャッシュ無効化（sdk-022 critical: 旧「常に無効化」）
- **`/agents` は v2.1.198 以降ウィザードを開かない**（「Generate with Claude」廃止）。サブエージェント作成は「Claude に依頼」か「ファイルを書く」の 2 通り（skill-018 critical）
- **エージェントチームは CLI の対話セッション専用**: `-p` 非対話モード（**Agent SDK セッションを含む**）ではチームメイトを起動せず通常サブエージェントとして動作（agent-teams.md「Spawning teammates also requires an interactive session」、cache は長行に平坦化されるため grep は文字列で）。旧記録「CLI と Agent SDK でのみ利用可能」は stale（skill-039 critical: 不正解扱いの選択肢が正しくなっていた二重正解）
- **ワークフローのサブエージェントは「常に acceptEdits」ではない**: セッションのパーミッションルールを使い、モードは sub-agents.md「permission modes」規則（セッションが bypassPermissions/acceptEdits/auto なら継承・指定無視、default/dontAsk/plan ならスクリプト指定、bypassPermissions 指定は v2.1.267+ で無視）（bp-097 critical）
- **ワークフローのランが自動停止する理由は 2 つ**: パーミッションプロンプト + 使用量上限待ち（`autoContinueAtUsageLimit`）（bp-119）
- **`allowManagedHooksOnly: true` の例外**: 管理設定の `enabledPlugins` で強制有効化したプラグイン（`plugin@marketplace` 完全 ID）のフックは実行される。「Managed と SDK のみ」は不完全（ext-101 / ses-052）。`command` ソースのプラグインは `disableCommandPluginSources: false` を明示しない限り無効
- **組み込みヘルパーサブエージェントは 3 つ**: `claude`（キャッチオール、モデル順序に従う、バックグラウンドセッションの既定エージェント）/ `statusline-setup` / `claude-code-guide`（ext-008）
- **quickstart のログインアカウントは 4 種**: サブスク / Console / クラウドプロバイダー / **セルフホスト Claude apps gateway**（sdk-006）
- **`/branch` は切り替え、`/fork` は並行**: `/branch` は会話をコピーして新ブランチに切り替え（元は `/resume` で戻る）、別セッションとして並行実行するのは `/fork`、サブタスク委譲は `/subtask`（cmd-112）。「並行して試せるフォークセッション」は `/fork` の説明
- **VS Code のクラウドセッション再開**: Session history →「Local」「Web」タブの **Web** タブ（cache は `<Steps>` 平坦化で消えるため live .md で確認。tool-061）
- **`outputStyle` の設定ファイル編集は v2.1.251 以降、次のメッセージから反映**（`/clear` 不要）。`model` のみ `/model` が必要（tool-086）
- **Desktop ローカルスケジュールタスクの UI**: Code タブ → サイドバー **Routines**（または More）→ **New routine** → **Local**。旧「Schedule → + New task」は stale（cmd-076）。Web URL は `claude.ai/code/routines`（cmd-110）
- **ultrareview の無料ラン**: Pro/Max 各 3 回、アカウントごと 1 回限りで補充なし。「2026年5月5日まで」等の期限記述は docs に無い（cmd-118）
- **`CLAUDE_CODE_MAX_OUTPUT_TOKENS`**: 既定と上限はモデル依存。未知のモデル ID のみ 32000 既定、上限超過はモデル上限に切り下げ。「最大 64,000」は docs に無い（tool-033 diagram）
- **`/theme` のシンタックスハイライト「ネイティブビルド版のみ」は docs に無い**（cmd-014）。`Ctrl+T` は `/theme` ピッカー内でのみ機能
- **best-practices の強調キーワード例は「IMPORTANT」のみ**（"add emphasis such as IMPORTANT to that line alone"）。「YOU MUST」は現行 docs 全体で 0 件 → 旧 Verified Facts「IMPORTANT と YOU MUST の 2 つ」は stale（mem-019）
- **サーバー管理設定の承認対象から `claudeMd` は除外**（v2.1.260+、指示テキストのため承認不要。server-managed-settings.md L139）（mem-085）
- **skills `shell: powershell` の有効化条件はプラットフォーム依存**: Git Bash なし Windows / claude.ai・Console + Git Bash Windows は既定有効、Bedrock/Agent Platform/Foundry と macOS/Linux/WSL は `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`（skill-072）
- **サブエージェント `permissionMode` は 6 値 + `manual` エイリアス（v2.1.200+）**（skill-019）
- **security.md 作業ディレクトリ境界は「In Manual mode」限定表現**。読み取りも境界外は Read/Grep/Glob 前に確認（bp-060）。quickstart: Pro/Max/Team の対話セッションは **auto モードが既定開始モード**で分類器がレビュー → 「必ず承認を求める」は stale（bp-085 / bp-086「Accept all」も現行用語に無い）
- **`--dangerously-skip-permissions` の推奨用途は「隔離されたコンテナ・VM のみ」**。best-practices.md から「lint 修正やボイラープレート生成の contained workflows」は消滅（bp-012）
- **Shift+Enter 対応は 4 分類**（terminal-config.md）: ネイティブ 7 種 / kitty keyboard protocol 対応（foot、Alacritty 0.16+、v2.1.269+）/ `/terminal-setup` 必要（VS Code, Cursor, Devin Desktop, **Alacritty 0.16 未満**, Zed）/ 利用不可（gnome-terminal, JetBrains IDE）（key-020 / key-033）
- **keybindings.json の自動反映は docs に無い**（key-034 に続き key-029 の EXPL 削除、key-036 は `/keybindings` でファイル作成・オープンを問う設問に差し替え）
- **スクリーンリーダーのネストテーブル「Header: value」化は changelog v2.1.200**（v2.1.198 ではない。key-065）。確認行フォーマットの v2.1.206 は根拠なし（key-057）
- **Fast mode は Opus 5.5 / Opus 5 / Opus 4.8**（2026-09-30 更新: Opus 5.5 が v2.1.280+ の既定、5.5 は $8/$40、5/4.8 は $10/$50、1M 全体でフラット）（ses-116 の「$30/$150・200K 未満」は架空、key-051）
- **Cowork VM はオンデバイス（自分の PC）とリモート（Anthropic 管理）の 2 形態**（desktop-quickstart.md。ses-136）
- **OTel メトリクスのカーディナリティ制御変数は 6 つ**: `OTEL_METRICS_INCLUDE_REPOSITORY`（`vcs.*`、既定 false、v2.1.269+）追加（ses-159）
- **Bedrock リージョン解決順に版数条件なし**（amazon-bedrock.md に v2.1.172 の記載なし。ses-151 の版数削除。2026-09-10 記録の「v2.1.172+」は changelog 由来で docs 本文には無い）
- **devcontainer 参照実装の 3 ファイル**: devcontainer.json / Dockerfile / init-firewall.sh（ses-143 EXPL の「.devcontainer/ ディレクトリ」は誤り）
- **`/clear` は新しいセッションを開始**（元の会話は `/resume` で再開可）。「同じセッション内」は不正確（ses-003）
- referenceUrl 移動: cmd-095/098/099/100/101 → troubleshoot-install、cmd-113 / ses-007 → commands、cmd-115/116 → voice-dictation、sdk-003 → third-party-integrations、bp-030 → memory、bp-052 / ses-161 → env-vars、ses-155 → llm-gateway-protocol、cmd-112 → commands
- **棄却した false-positive**: bp-069（WebDAV 警告は security.md の `<Warning>` callout。cache から callout が脱落するが live .md / ja ページに現存。次回も「WebDAV が docs に無い」は cache 起因と判断してよい）、cmd-049（EXPL の例示コマンドは docs 引用ではなく例示）、cmd-059（「など」付き例示で排他列挙ではない）
- **検証エージェントの引用が cache に無いときは live `.md` を curl してから判定**（skill-039 は cache でも長行 1 本に平坦化されており `grep -n` の 200 字 cut では見えなかった。`grep -o "<文字列>.{200}"` で確認する）

## 「不正解が正しくなる」二重正解ドリフト（否定断定の反転）

- skill-039 の不正解「Agent SDK/ヘッドレスでは使えない」が docs 更新で真になり、wrongFeedback が事実と逆になっていた。sdk-022 も Tool Search 既定化で「どちらも影響しない」が半分正しくなった → checklist A-1 に「不正解選択肢のうち『X は使えない/存在しない』型の否定断定は、正解と同じ優先度で現行 docs と照合する（反転すると二重正解になる）」を明記。quiz-verifier プロンプトにも同文を入れる

## 件数依存クレームの決定論チェック（再掲・実測）

- Hook ブロッキング 15→16（WorktreeRemove 数え落とし）、OTel 変数 5→6、ログイン種別 3→4、ヘルパーサブエージェント 2→3、Shift+Enter 分類 2→4 など、表の行数に依存する記述が 6 問で stale → 2026-09-10 提案の `factCheck:count` を実装する。判定層でも「N 種/N つ」を含む問題は表の行数を必ず実カウントする（要約や過去記録を信用しない）

## 版数（vX.Y.Z）の断定は changelog で裏取り

- key-065（v2.1.198→実際は v2.1.200）、key-057（v2.1.206 根拠なし）、ses-151（v2.1.172 は docs 本文に無い）、skill-065（v2.1.154 根拠なし） → pre-lint に「question/explanation 中の `v2.1.NNN` が referenceUrl ページ本文または changelog.md の該当版ブロックに存在するか」を確認する `factCheck:version` を追加。無ければ fact tier

## 修正適用は JSON パッチ一括適用ツールが安全

- 64 問・220 フィールドの修正を `quiz-utils edit` の個別シェル呼び出しではなく、from→to 完全一致置換（ミス時は abort）と diagram 部分置換をもつパッチ適用スクリプトで実施し、正解に wrongFeedback が付く等のサニティも自動検査できた → scratchpad の apply.mjs 相当（`replace`/`opt`/`set`/`diagSet`/`diagReplace`）を `scripts/quiz-utils.mjs apply-patch <file.json>` として取り込み、SKILL.md の修正コマンドに追記

## 2026-09-30 quality-loop 第16回（Opus 5.5 / Sonnet 5.5 リリース追従・プラグイン docs 再編）

- **横断ドリフト**: Opus 5.5 / Sonnet 5.5 のリリースで「default モデル」「effort 対応モデル・既定値」「Fast mode 対応モデル」「常時思考モデル」「1M 対応モデル」の列挙が一斉に stale 化（ses-103 critical ほか約20問）。モデル列挙を含む問題はリリースのたびに要監査。**モデル一覧は選択肢に埋め込まず explanation に置く**と drift 耐性が上がる（cmd-006 で実施）
- **確定事実の詳細は `docs/verified-facts.md` 末尾「2026-09-30」**を参照（CLAUDE.md 読み込み順、`/memory` と `/context`、AGENTS.md 直接読込、Glob/Grep 既定外、`bashOutputMaxChars`、`/reload-skills`、hooks マージ、Code Intelligence 13 言語、ディレクトリ提出ポータル 等）
- **偽陽性（lint）**: `quiz-lint url` の invalid-anchor のうち、skills `#skills-in-cowork-and-cloud-sessions` / `#live-change-detection` は **ja ページの明示 id として live に実在**（キャッシュが `<hN id="...">` を落とすため lint が誤検出）。修正不要
- **検証者の誤指摘（棄却）**: cmd-119（GHES は Team/Enterprise で利用可と docs 明記）、ext-147（予約名の列挙は現行どおり）、skill-088（fork mode オフ＋background 有効時のエラー条件は正確）、tool-057 の「VS Code は全コマンド利用可」（vs-code.md 表は CLI=All / 拡張=Subset の読み違い）
- **プラグイン docs 再編**: 旧 7 ページ → `/plugins/*` 20 ページ。referenceUrl は `/docs/ja/plugins/<page>` を使う。`docs:discover` はネストパスを検出するよう修正済み（`whats-new/*`・`agent-sdk/*` は除外）
- **quiz-verifier の maxTurns 30 では大カテゴリ（100問超）が完走しない**（10体中7体が上限停止→再開で完走）。次回は 60〜70 問単位に分割するか maxTurns を引き上げる
- 未判定で残した minor: ses-113/018/042/071/078/109/162/140/200/227/236/142、key-040/044/034、tool-001/048/054（Glob/Grep 既定外の注記）、mem-007/051/041/021/061/066/010/033/039/059/037、bp-057。mem-078 と mem-083 は設問がほぼ重複（要統合検討）

## 2026-09-30 quality-loop 第17回（第16回の積み残し検証）

- 第16回で「浅い確認のみ」だった問題と未判定 minor の計134問を判定層で深掘り → 57問修正（critical 相当: tool-020 ツール結果はファイル保存、ext-098 マネージド `availableModels` は上書き、cmd-107 MCP プロンプトの表示形式が選択肢に無かった）。詳細は `docs/verified-facts.md` 末尾
- **diagram-only 修正が多数**: 文断片を並べただけの terminal 図・単語途中で割れた flow 図（ext-014「cw」+「d」等）が残っていた。`quiz:check-diagram-text` で拾えない「terminal 図に文断片」パターンは要チェック追加検討
- **referenceUrl のページ誤り**: settings ページに記述の無い事項（mTLS→network-config、sandbox→settings-reference、`com.anthropic.claudecode`→managed-settings、`CLAUDE_CODE_PROXY_RESOLVES_HOSTS`→env-vars）。settings は大半のキーが settings-reference に移っている
- lint 偽陽性（アンカー）追加: memory `#share-rules-across-projects-with-symlinks`（live に実在）
- 判定見送り（nuance のみ）: mem-037, mem-041, key-034, key-050, sdk-007, sdk-015, mem-010, mem-051
- Google Cloud's Agent Platform（旧 Vertex AI）表記: 旧名称のままの問題が約20問残存（known-issues 既知、段階的に更新）

## 2026-09-30 quality-loop 第18回（仕組み: 内容差分ベースの追従）

- **`verify:diff` はハッシュ比較のため、日次の docs 再取得で大半のページが「変更」扱いになる**（今回 36 ページ・432 問）。実際の内容差分は 1 ページ 2〜30 行程度だった
- 対策: `verify:save` が `.claude/tmp/docs-baseline/` に検証時点のキャッシュを保存し、`bun run docs:changes`（`--hunks` で差分本文）で内容差分と参照問題数を出す。次回以降は「docs:changes → 差分を判定層1体に渡す」で影響問題だけを直す
- 今回は 13 ページ（前日の live 保存分）だけ内容差分を取れた。残り 23 ページ（desktop, mcp, permissions, vs-code, settings-reference, plugin-evals ほか）は比較元が無く未検証 → 今日の版をベースラインとして保存済み。次回の `docs:changes` で拾う
- 根本対策の候補（未着手）: fetch-docs が Jina より公式 `{url}.md` を優先すれば、ハッシュのノイズ・コードフェンス欠落・明示 `<hN id>` 欠落によるアンカー偽陽性がまとめて解消する
- key-029 は「矛盾」ではなく「出典消失」型（docs の例が Ctrl+U→Ctrl+S に変わった）。例を docs に合わせて差し替え
- 第18回追補: 比較元が無かった23ページの参照130問を今日の docs で直接検証 → 28問修正（正解の記述誤り: ses-120。文断片・単語分断のダイアグラムも継続して発見）。以後は `docs:changes` で追従可能

## 2026-09-30 ダイアグラム文言の一括整形（残課題 #1）

- `quiz:check-diagram-text` は CI に入っておらず、flow の文途中分割 285 件・hierarchy 40 字超 437 件が放置されていた。**`check-ellipsis` も CI 未実行だった**（CLAUDE.md の記述と実態が不一致）
- 判定を強化: flow の `sub` が 16 字以上／助詞・読点・空白始まり／括弧が閉じていない／カタカナ語の途中の切れ目、も違反に（旧判定は text が 16 字以上の場合しか見ず、短い分断をすり抜けていた）
- Sonnet 5 体 + 2 回目 3 体で 892 項目を書き換え（text/sub のみ、事実不変）。多くは元データが固定幅で切り詰められた破損で、explanation から全文を復元した
- `check-ellipsis` と `check-diagram-text` を `check` / `check:all` / `quiz:check` / deploy.yml に追加。以後は CI で fail する
- 図の `label` も切り詰め破損があった（tool-062「JetBrainsプラグの注意点」）。label 用の機械チェックは未整備

## 2026-09-30 選択肢の長さバランス一括調整（残課題 #2）+ 旧称更新（#4）

- **単一選択の 67.1% で正解が最長の選択肢**だった（ランダムなら約 25%）。「一番長いものを選ぶ」だけで 3 問に 2 問正解できる状態
- 正解が不正解の最大長の 1.2 倍を超える 464 問 + 書式で正解がわかる 27 問（計 470 問）を Sonnet 10 体で調整（正解の短縮を優先、不正解は wrongFeedback の誤りの範囲内で具体化）→ 判定層 Fable 5 ×3 が old/new を事実面で確認し 8 問を修正（短縮で設問の要素・条件が落ちた cmd-013 / bp-120 / ext-018 / mem-005 / mem-041 など）
- 結果: 正解が最長 67.1% → **42.6%**、比 1.2 超 → 0、distractor lint 167 → 26 件（残りは `$` `>` など記号選択肢）、pre-lint flagged 211 → 100
- **生成時の注意**: 正解に条件・例外・補足を全部詰めると長くなる。詳細は explanation に置き、選択肢は核心だけにする。「一番長い＝正解」を避けるため、不正解も正解と同程度の具体性で書く
- 旧称「Vertex AI」13 問を「Google Cloud's Agent Platform」に更新（referenceUrl の `google-vertex-ai` ページ名は据え置き）
- 残課題: 正解が最長の割合 42.6% はまだ高い（比 1.0〜1.2 の範囲で正解が最長のもの）

## 2026-09-30 残課題の続き（#3 事実確認・#5 重複統合・選択肢バランス追加パス・#8 docs 取得）

- **pre-lint の事実確認系 67 件**を判定層 Fable 5 ×2 で照合 → 真の誤り 8 件を修正（ses-145 は実在しない `--headless` を実在扱い、cmd-078 の出力サンプルのフィールド名、cmd-073 の必須フラグ欠落、key-054 の値域、tool-084 の referenceUrl 移動 ほか）。誤検出 39 件の大半は「不正解選択肢に置いた架空のフラグ・変数を docs に無いと判定」→ pre-lint で、不正解の本文にだけ現れ wrongFeedback が否定している語を除外（fact tier 67 → 35）。crossCheck の数値矛盾はノイズが多いが今回は据え置き
- **mem-078 と mem-083 の重複**を統合（mem-083 を残し mem-078 を削除、1039 → 1038 問）。UI の件数は現存問題の一覧から数えるため、学習進捗に残った削除済み ID は集計に影響しない
- **選択肢バランス追加パス**: 正解が最長の割合 42.5% → **25.0%**（4 択の自然な割合と同水準）。正解が最短 10.1%。比の大きい上位 181 問で不正解を具体化 → 判定層で 9 問を修正（足した語で不正解が部分的に正しくなった sdk-017 / ses-204 / cmd-070 / sdk-008 / ses-161 など）。**生成エージェントの出力形式が1シャードだけ文字列配列だった**ため、適用前の検証で検出して正規化した
- **docs 取得を公式 `.md` 優先に変更**（Jina はフォールバック）。明示 id（`<h3 id="...">`）を lint がアンカーとして扱うよう修正 → skills / memory のアンカー偽陽性 3 件が解消し、隠れていた本物のリンク切れ 4 件（`#choose-where-skills-load` → 実 id は `#where-skills-live`）を修正
- 取得方式の変更に伴い docs キャッシュの形式が変わったため、同日に `verify:save` でベースラインを作り直した（以後 `docs:changes` は新形式同士で比較）

## 2026-10-01 quality-loop 第19回

- `docs:changes` が先頭の `<!-- Cached: 取得時刻 -->` 行まで比較して全ページを「変更」扱いにしていた → `diff -I` で除外（157 → 44 ページ）
- 内容差分 44 ページ・参照 384 問を判定層 2 体に渡し、影響した 5 問だけ修正（mem-039 / bp-101 / cmd-087 / skill-074 / ext-164）。日次の追従はこの規模（判定層 2 体、数十分）で回せる
- 判定層エージェントが冒頭で応答停止（stream watchdog）したが、ログを見ると成果物は書き終えていた。**失敗通知が来ても、まず成果物ファイルとログの件数を確認する**

## 2026-10-05 quality-loop 第20回

- 4 日空くと内容差分は 113 ページ・約 70 万字（sandboxing は 629 行の全面改訂）。判定層 6 体に分割して約 15 分で追従できた。**ループは数日おきが目安**
- 差分の判定を委ねるとき、複数ページから参照される問題（mem-089 / mem-090 / bp-063）は複数エージェントが同時に直す。適用時に一本化が必要。逆に、担当外ページの変更に依存する問題（tool-043）は取りこぼされやすいので、各エージェントに「担当外で影響がありそうな問題」を申し送りさせると拾える
- **ext-060 と cmd-109 は「正しい答えが選択肢に存在しない」状態だった**。ext-060 は docs 更新前から古かった（verified-facts に事実はあったが、該当問題が別だった）
- 新機能 Mods の 16 問を追加（Sonnet 生成 → Fable 照合で 4 問の事実修正）。ja ページのアンカーにカーリーアポストロフィを含む id（`follow-the-test-kit’s-rules`）があり、URL として使いにくいので親見出しを使った

## 2026-10-06 quality-loop 第21回

- 1 日分の差分は 73 ページ・約 13 万字で、判定層 2 体・約 15 分で追従できた（19 問修正）
- Desktop の UI 刷新（Browser ペイン、Review code ボタン廃止、CI 操作の移動）で Desktop 関連 6 問をまとめて修正。**UI のボタン名・メニュー位置を正解にする問題は、UI 刷新のたびに古くなる**。新規作成時は「どこを押すか」より「何ができるか」を問うと持ちが良い
- 判定層への申し送り（担当外ページで影響する問題）は今回も機能した（mem-059 を拾えた）


## 2026-10-07 quality-loop 第23回

- 約10時間分の差分（27ページ）は判定層1体で足りた（1問修正: ses-204 の PostgreSQL 要件 14 → 11）
- **退行を発見**: vitest 5 の JSON レポーターは結果をファイル（`.vitest/json/output.json`）に書き、stdout にはその旨の1行しか出さない。`validate-docs.mjs` が stdout を JSON として読んでいたため、**9/30 の vitest 5 移行以降、テスト数チェックが黙ってスキップされていた** → `--outputFile` で一時ファイルに出して読むよう修正し、読めない場合はエラーにした。判定もテストの成否に左右されないよう `numTotalTests` に変更
- 高負荷時（ロードアベレージ 30〜40）は `useSwipe` のテストが 5 秒タイムアウトで落ちることがある（負荷由来の一時的な失敗）
