# Quiz Verifier Memory Index

- [SDK category patterns](sdk_patterns.md) — sdk カテゴリの検証パターン・偽陽性記録
- [Keyboard category patterns](keyboard_patterns.md) — keyboard カテゴリのパターン（Option+T設定要件, keybindings.jsonフォーマット, wrongFeedback短文）

## extensions カテゴリ検証パターン（2026-05-23）

### Hook イベント総数の更新
- hooks.md の直接カウントで29種（Setup、UserPromptExpansion、PostToolBatch を含む）
- known-issues.md の「全26種（2026-04-04確認）」は古い記録。next update で26→29に更新が必要
- 3種の追加: Setup、UserPromptExpansion、PostToolBatch
- ブロッキング可能な更新確認も必要（PostToolBatch は "Stops the agentic loop" → ブロッキング可）

### permissionDecision の 4値確認（Verified）
- allow、deny、ask、defer の4値が公式（hooks.md PreToolUse decision control）
- defer は non-interactive (-p) モードでのみ有効（重要制約）

### Auto mode 分類器のモデル
- permission-modes.md は "a separate classifier model" とのみ記述、モデル名を特定しない
- ext-164 が「常にSonnet 4.6で実行」と主張しているが、ドキュメントに根拠なし → needsOpusReview
- 偽陽性の可能性あり（Anthropic内部実装を知っている場合は正しい可能性）

### plugins settings.json の対応キー
- plugins.md: `agent` と `subagentStatusLine` の2キーが明示されている
- quiz が「agent のみ」と記述している場合は不正確（サブ説明レベルの問題）

### 組み込みサブエージェントのリスト（Verified）
- sub-agents.md: Explore、Plan、general-purpose、statusline-setup、claude-code-guide の5種
- "Bash" という名の組み込みサブエージェントは存在しない（ext-008 diagram の誤記）

### distractor quality tier
- 13問が distractor でフラグされたが全て偽陽性（事実誤認なし）
- distractor 問題は品質改善候補だが fact の正確性に問題なし

## tools カテゴリ検証パターン（2026-05-23）

### 全13問false-positive（fact=7, quality=6）
- tools カテゴリの fact-tier 7問はすべて「存在しないフラグ・変数の否定」か「正確な設定値」
- skipIfNegated パターン該当多数: --jetbrains、--regex、--import-session、CLAUDE_AUTO_APPROVE 等
- quality-tier 6問はすべて distractor バランス問題のみで事実誤認なし

### VS Code リモートセッション UI（tool-061, needsOpusReview）
- vs-code.md のリモートセッション手順セクション（L68-76）はキャッシュで省略されステップ詳細不明
- ドキュメント記載は「Session history button」、問題は「パスト会話ドロップダウン」を使用
- UI名称変更の可能性あり。Remoteタブ/LocalタブのUI構造、GitHub リポジトリ限定制約の要確認
- 次回検証時は vs-code.md のリモートセッション手順を実際のドキュメントで直接確認すること

### 確認済み facts（Verified 2026-05-23）
- sandbox.autoAllowBashIfSandboxed: デフォルト true（settings.md L297）
- CLAUDE_CODE_CLIENT_CERT/KEY/PASSPHRASE: mTLS 用3変数（env-vars.md）
- WebFetch(domain:xxx): domain: specifier が正しい（permissions.md, tools-reference.md）
- Grep: ripgrep 準拠、Rust regex 構文、--regex フラグ不要（tools-reference.md L135）
- Read PDF: 10ページ超は pages 必須、最大20ページ/リクエスト（tools-reference.md L217）
- TodoWrite: -p フラグと Agent SDK でデフォルト、インタラクティブは Task ツール（tools-reference.md L48）
- Tool Search: デフォルト有効、Haiku 非対応、ENABLE_TOOL_SEARCH=auto で閾値ベース（mcp.md）
- /teleport: スラッシュコマンドとして存在（commands.md L80）
- claude --teleport: CLI フラグとして存在（cli-reference.md L109）
- --jetbrains: フラグとして存在しない（cli-reference.md に記載なし）

## session カテゴリ検証パターン（2026-05-23）

### Fast Mode フォールバック先の表現
- fast-mode.md: "falls back to standard speed on the same Opus version"（同じ Opus バージョン）
- 問題 ses-118 が「スタンダード Opus 4.6」と固定表現 → major issue
- デフォルト Fast Mode は Opus 4.6 なので通常文脈では正確だが、Opus 4.7 Fast Mode 使用時に誤解を招く
- session カテゴリの Fast Mode 問題では Opus バージョンを固定しない表現を確認すること

### Fast Mode の利用条件
- fast-mode.md: "Not available on third-party cloud providers: Bedrock, Vertex AI, or Microsoft Azure Foundry"
- 「Microsoft Azure Foundry」が正式表記（not「Microsoft Foundry」や「Azure Foundry」）→ docs では "Microsoft Azure Foundry" と "Microsoft Foundry" が混在する

### PreCompact trigger フィールド
- hooks.md L154/L2039-2040: trigger は "manual"（/compact 実行）と "auto"（コンテキストウィンドウ満杯時）の 2 種類
- これは Verified。ses-107 は正解

### CLAUDE_CODE_USE_BEDROCK と CLAUDE_CODE_USE_VERTEX
- env-vars.md に明記。値は =1（整数、=true ではない）
- ses-030 の正解記述 "=1" は正確

### effortLevel の設定ファイル記述
- settings.md L179: 'effortLevel' accepts "low", "medium", "high", "xhigh"（max は受け付けない）
- model-config.md L171: 'max is session-only and is not accepted here'

### Opus 4.6 での xhigh サポート（2026-05-29 更新）
- model-config.md L146-147: Opus 4.6 は `low`, `medium`, `high`, `max` のみ。`xhigh` は Opus 4.7/4.8 のみ
- ただし環境変数 CLAUDE_CODE_EFFORT_LEVEL=xhigh を設定しても動作はする（high にフォールバック）
- ses-102 explanation が「Opus 4.6 のコンテキストで CLAUDE_CODE_EFFORT_LEVEL=low|medium|high|xhigh|max|auto」と記述 → minor inaccuracy（実際には xhigh は Opus 4.6 専用の有効値ではない）
- wrongFeedback では「xhigh は Opus 4.7 専用」と正しく記述されているので問題の正解への影響なし

### distractor tier の全問は偽陽性（17問中17問）
- session カテゴリの quality:distractor フラグ問題は全て事実誤認なし
- 品質（distractor の長さ/書式）の問題だが修正優先度は低い

### autoVerify 設定
- .claude/launch.json の `autoVerify: false` または Preview ドロップダウン
- CLAUDE_AUTO_VERIFY 環境変数は存在しない（ses-112 正解確認済み）

## memory カテゴリ検証パターン（2026-05-23）

### factCheck:env の偽陽性パターン（memory カテゴリ）
- mem-030, mem-036: `CLAUDE_MD_PATH` という環境変数が不正解選択肢に登場し factCheck:env が反応
- ただし wrongFeedback でその環境変数の非存在を否定しているため、内容は正確
- `存在しない` `ではない` 等の否定文脈で不正解選択肢に環境変数が登場する場合は偽陽性率が高い

### factCheck:slash の偽陽性パターン（memory カテゴリ）
- mem-012: wrongFeedback 内の「/load というコマンドは存在しません」に反応
- 否定文脈のスラッシュコマンドは skipIfNegated と同様の除外が必要
- /load は commands.md に存在しないことを確認済み（2026-05-23）

### factCheck:flags の偽陽性パターン（memory カテゴリ）
- mem-061: `--append-system-prompt` が正解フラグとして正確に記述されているのにフラグ
- cli-reference.md L56 に明示的に記載されており問題なし
- 不正解の `--force-instructions`, `--priority-instructions` も正しく「存在しない」と記述

### mem-012 の wrongFeedback に潜在的な不正確表現
- options[2] の wrongFeedback: 「現在の作業ディレクトリから上位（ルート手前まで）にある」
- 「ルート手前まで」が不正確: memory.md は "content is ordered from the filesystem root down" と記述
- ファイルシステムルート自体も含む。"ルート手前" ではなく "ルートまで" が正確
- 重要度: minor（正解の内容に影響しない wrongFeedback の細部）

### CLAUDE.md 配信メカニズム（Verified）
- memory.md L316 に明示: "CLAUDE.md content is delivered as a user message after the system prompt"
- `--append-system-prompt` でシステムプロンプトレベルに昇格可能（cli-reference.md L56 確認済み）
- "must be passed every invocation" = スクリプト・自動化向きという記述も memory.md に確認

### best-practices の5つのアンチパターン（Verified, 2026-05-23）
- 5パターン全て best-practices.md L369-381 に記載: kitchen sink / Correcting over and over / over-specified CLAUDE.md / trust-then-verify gap / infinite exploration
- "Ruthlessly prune" は best-practices.md L376 の Fix として記載（memory ページには**ない**）
- mem-069 の "IMPORTANT" 遵守率向上は best-practices.md L104 に記載（memory ページには記載なし）

## commands カテゴリ検証パターン（2026-05-23）

### fact tier 15問の偽陽性率は高い
- commands カテゴリも他のカテゴリ同様、factCheck:flags の大部分は偽陽性
- 不正解選択肢の「存在しないフラグ」への否定表現が lint に反応するのが主要原因
- 実際に問題があったのは cmd-025（--verbose/--include-partial-messages の欠落）のみ major

### /undo は /rewind のエイリアスとして存在する（Verified 2026-05-23）
- commands.md: '/rewind ... Aliases: /checkpoint, /undo'
- cmd-051 diagram に「(/undo は存在しない)」と記載されているが、これは誤り
- /undo は /rewind のエイリアスとして実際に存在する

### stream-json でのリアルタイムストリーミング要件（Verified 2026-05-23）
- headless.md: '--output-format stream-json' は '--verbose' と '--include-partial-messages' との組み合わせが必要
- cmd-025 は正解選択肢でこの2フラグを省略しており、実際のコマンドとして不完全（major issue）
- cmd-073 は3フラグを正しく組み合わせており正しい

### GitHub Actions v1 の claude_args（Verified 2026-05-23）
- github-actions.md: Breaking Changes Reference で max_turns, model → claude_args: --max-turns, --model
- v1 では個別パラメータが廃止され claude_args に統合済み（cmd-081 正しい）

### /tasks と Claude Code on the web（Verified 2026-05-23）
- commands.md: '/tasks List and manage background tasks. Also available as /bashes'
- claude-code-on-the-web.md: 'Monitor progress with /tasks or at claude.ai/code'
- /tasks はバックグラウンドタスク全般（ローカル+Web）を管理。Web専用コマンドではない

### --bare フラグの動作（Verified 2026-05-23）
- cli-reference.md: 'Minimal mode: skip auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and CLAUDE.md. Claude has access to Bash, file read, and file edit tools. Sets CLAUDE_CODE_SIMPLE.'
- cmd-114 の正解記述は正確

### GHES のトラブルシューティング（Verified 2026-05-23）
- github-enterprise-server.md: 'If claude --remote fails with a clone error, verify that your admin has completed setup for your GHES instance and that the GitHub App is installed on the repository. Check with your admin that the instance hostname registered in Claude settings matches the hostname in your git remote.'
- cmd-119 の正解（ホスト名一致確認 + GitHub App インストール確認）は正確
- /install-github-app は github.com 専用（GHES 不可）も確認済み

### quality tier の distractor 問題は全て偽陽性
- cmd-002, cmd-004, cmd-006, cmd-062, cmd-108, cmd-114, cmd-119 の8問
- 全て事実誤認なし。品質（distractor バランス）の問題のみ

## commands カテゴリ後半検証パターン（2026-05-23, commands_2.json 44問）

### /loop のデフォルト動作（Critical issue, cmd-085）
- scheduled-tasks.md: "When you omit the interval, Claude chooses one dynamically... picks a delay between one minute and one hour based on what it observed"
- 「10分ごとに実行される」という固定値はドキュメントに存在しない
- 正確には「Claudeが動的に1分〜1時間の範囲で決める」
- cmd-085 の正解が誤り → critical

### スケジュールタスクの有効期限（Critical issue, cmd-086）
- scheduled-tasks.md L152: "Recurring tasks automatically expire **7 days** after creation"
- cmd-086 の正解「作成から3日後に自動的に期限切れ」は誤り → critical
- 正しくは 7日後（multiple docs locations で確認済み）

### /voice バージョン要件（v2.1.69）はドキュメント未記載（cmd-116）
- voice-dictation.md に v2.1.69 というバージョン要件の記述なし
- claude.ai account 認証 + local microphone は正確
- バージョン番号の断定は docs 根拠なし → major候補だが他の要素は正確

### Remote Control タイムアウト 10分（cmd-088 Verified）
- remote-control.md: "network for more than roughly 10 minutes, the session times out"
- cmd-088 の正解「10分間のタイムアウト」は正確

### cmd-087 の wrongFeedback 不正確性（minorレベル）
- 「Claude Code を再起動するとすべてのタスクがクリアされる」の wrongFeedback が「これは実際の制約です」と記述
- ただし --resume で期限切れでないタスクは復元可能（単純な再起動クリアではない）
- 正答（correctIndex: 3）への影響なし → minor/info 相当

### commands_2.json 大多数は事実誤認なし
- cmd-075〜cmd-084 (GitLab/GitHub CI関連)、cmd-088〜cmd-102 (Remote Control/トラブルシューティング) は正確
- cmd-104〜cmd-107 (/effort, /copy, /init, /mcp) は正確
- cmd-108〜cmd-113 (クラウドスケジュール/branch/batch) は概ね正確
- cmd-116, cmd-117, cmd-118, cmd-119 は正確

## bestpractices カテゴリ検証パターン（2026-05-29, bp-091〜098）

### large-codebases.md の確認済み事実
- settings.json は起動ディレクトリのみ適用。親ディレクトリ継承なし（L62 確認）
- worktree.sparsePaths と symlinkDirectories は両方 settings.json の worktree キー下に記述（L191-218）
- additionalDirectories: ファイルアクセスのみ。CLAUDE.md/rules/skills ロードなし（L247-260 の表）
- --add-dir: スキルをロード。CLAUDE.md/rules は CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 が必要
- OTEL_LOG_TOOL_DETAILS=1 と skill_activated イベント: large-codebases.md L313 に明記
- /deep-research は唯一のビルトインワークフロー。WebSearch 必須。（workflows.md L47-54）

### workflows.md の確認済み事実
- `workflow` キーワードでワークフロー生成トリガー。`alt+w` でキャンセル（L89-95）
- サブエージェントは常に acceptEdits モードで動作、ツール許可リストを継承（L124）
- disableWorkflows: true でビルトインコマンド無効、workflow キーワード無効、ultracode 非表示（L173）

## security-guidance.md の確認済み事実（2026-05-29）

### セキュリティプラグインの動作
- 3層: ファイル編集時（パターンマッチ・モデル呼び出しなし）、ターン終了時（バックグラウンド・最大30ファイル・3回連続）、コミット時（エージェント型・最大20回/時間）
- ファイルパス: `.claude/claude-security-guidance.md`（モデル指示）、`.claude/security-patterns.yaml`（パターン）
- `.claude/claude-security-guidance.local.md` もサポート（personal overrides）
- デフォルトモデル: Claude Opus 4.7（SECURITY_REVIEW_MODEL=エンドターン用、SG_AGENTIC_MODEL=コミット用）
- `ENABLE_CODE_SECURITY_REVIEW=0`: モデルバックドレビュー全無効
- コミットレビューは Claude の Bash ツール経由の git commit/push のみ。ユーザーの直接 commit は対象外

## ses-102 での xhigh 表現の誤り（2026-05-29 確認）
- model-config.md L146: `xhigh` は「Opus 4.8 and Opus 4.7」でサポート（Opus 4.7専用ではない）
- ses-102 explanation と wrongFeedback の「`xhigh` は Opus 4.7 専用です」は Opus 4.8 を見落とした誤記 → major
- 正確には「`xhigh` は Opus 4.7/4.8 でサポート。Opus 4.7 のデフォルト。Opus 4.8 のデフォルトは `high`」
- ses-102 explanation でのモデルリスト「Opus 4.7 / Opus 4.6 / Sonnet 4.6」からも Opus 4.8 が欠落 → major

## bp-018 の xhigh 表現誤り（2026-05-30 確認）
- bp-018 の correctIndex=1 option text、explanation、option[2] wrongFeedback、diagram[0] に「`xhigh` は Opus 4.7 専用」と記述
- model-config.md L146: `xhigh` は「Opus 4.8 and Opus 4.7」でサポート → 「Opus 4.7 専用」は major issue
- 正確には「`xhigh` は Opus 4.7 / Opus 4.8 でサポート（Opus 4.7 のデフォルト、Opus 4.8 のデフォルトは `high`）」
- 質問文自体が「Opus 4.7/Opus 4.6/Sonnet 4.6」スコープなので Opus 4.8 省略は質問本体としては意図的
- しかし「Opus 4.7 専用」という表現が事実として誤り。正しくは「Opus 4.7/4.8 でサポート」

## tools カテゴリ distractor 書き換え後検証（2026-05-30, tool-008/016/030/038/046/073/074/080/081）

### TodoWrite の仕様変更（Critical update）
- tools-reference.md L49: `TodoWrite` は **v2.1.142 からデフォルト無効**（all modes）
- env-vars.md L97: 「As of Claude Code v2.1.142, Task tools are the default in **all modes**」
- MEMORY.md の旧記録（2026-05-23）「-p フラグと Agent SDK でデフォルト」は**古い仕様**
- tool-074 の正解「TodoWrite は非インタラクティブモードと Agent SDK で使用」→ **現行ドキュメントでは誤り**（major issue）
- 現在の正しい説明: Task tools（TaskCreate/TaskGet/TaskList/TaskUpdate）がすべてのモードでデフォルト。TodoWrite は `CLAUDE_CODE_ENABLE_TASKS=0` で復活可能

### 検証済み facts（tool-008, 016, 030, 038, 046, 073, 080, 081）
- チェックポイント: 各ユーザープロンプトで自動スナップショット、30日後クリーンアップ（checkpointing.md）
- NotebookEdit: replace/insert/delete の3 edit_mode、cell_id でセル特定（tools-reference.md L171-177）
- Bash sandbox プラットフォーム: macOS(Seatbelt)/Linux(bubblewrap)/WSL2(bubblewrap)のみ。Native Windows 不可（sandboxing.md L12,L124-127）
- Tool Search: デフォルト有効。Haiku 非対応。Sonnet 4+ / Opus 4+ 必要（mcp.md L615）。ENABLE_TOOL_SEARCH=auto で閾値モード
- Read PDF: 10ページ超は pages 必須、最大20ページ/リクエスト（tools-reference.md L219）
- PowerShell: Linux/macOS/WSL は opt-in（CLAUDE_CODE_USE_POWERSHELL_TOOL=1 + pwsh 7+）。Windows は Git Bash なし→自動有効、Git Bash あり→段階的ロールアウト（tools-reference.md L181-195）
- sandbox Bash ツール: Bash コマンドと子プロセスのみ制限。組み込みツール(Read/Edit等)/MCP/フックはホストで無制限実行（sandbox-environments.md L19-28, L51）
- sandbox runtime: Docker 不要。Seatbelt/bubblewrap でプロセス全体をラップ（sandbox-environments.md 比較表）
- 組織強制: Claude Code が自前で強制できるのは組み込み Bash サンドボックスのみ。managed settings で sandbox キー配布（sandbox-environments.md L86-90）

## skills カテゴリ検証パターン（2026-05-31）

### skill-061/064/076 quality-tier 3問 全て偽陽性（または diagram minor）

**skill-061 (distractor)**
- effort: xhigh は Opus 4.7/4.8 のみ。correctIndex=1（xhigh）は正確
- options[2]/[3] に長い括弧注釈があり distractor バランス不均等だが事実誤認なし → false-positive

**skill-064 (distractor)**
- 1% context window、1,536文字上限、skillListingBudgetFraction、SLASH_COMMAND_TOOL_CHAR_BUDGET はすべてドキュメント通り
- diagram hierarchy に `（フォールバック8,000文字）` という記述があるが、docs はこの値を明示しない → minor（diagram のみ）
- 正しい表現: "1% of the model's context window"（固定 fallback 値なし）
- SLASH_COMMAND_TOOL_CHAR_BUDGET は「fixed character count」として使う（8000 という値の根拠なし）
- options のバランス不均等（correct option が他より長い）→ distractor flag の主因は false-positive

**skill-076 (difficulty)**
- agent-teams の split-pane 条件（tmux または iTerm2 + it2 CLI + Python API）は正確（agent-teams.md）
- `"auto"` デフォルト: tmux セッション内ならスプリット、それ以外はインプロセス（confirmed）
- `"tmux"` 設定: スプリットペイン強制、tmux/iTerm2 自動検出（confirmed）
- difficulty "advanced" は適切（agent-teams は実験的機能、tmux/iTerm2 条件は上級者向け）
- difficulty フラグ → false-positive

### skills カテゴリ確認済み facts（2026-05-31）
- effort frontmatter: `low`/`medium`/`high`/`xhigh`/`max` の5値、xhigh は Opus 4.7/4.8 のみ（skills.md frontmatter table）
- skill description コンテキスト予算: モデル context window の 1%（固定 fallback 値の記述なし）
- 各エントリ上限: 1,536 文字（description + when_to_use 合計）、`maxSkillDescriptionChars` で変更可
- `skillListingBudgetFraction`（0.02=2% 等）と `SLASH_COMMAND_TOOL_CHAR_BUDGET`（固定文字数）で予算引き上げ可
- split-pane mode: tmux または iTerm2（it2 CLI + Python API 有効化）が必要
- teammateMode: `"auto"`（デフォルト）/ `"tmux"`（強制）/ `"in-process"` の3値

## session カテゴリ追加検証パターン（2026-05-31, 20問 flagged）

### ses-103 の default モデル誤り（Critical issue）
- model-config.md: "Max, Team Premium, Enterprise pay-as-you-go, and Anthropic API: defaults to **Opus 4.8**"
- ses-103 正解（correctIndex:1）は "Opus 4.7" → critical。正しくは Opus 4.8
- wrongFeedback にも "Opus 4.7" と記述されており要修正

### ses-117 の Microsoft Foundry 命名（**false-positive**: プロジェクト正式表記）
- fast-mode.md: "not available on Amazon Bedrock, Google Vertex AI, **Microsoft Azure Foundry**, or Claude Platform on AWS"
- ses-117 正解 option は "Microsoft Foundry" → **修正不要**。プロジェクト正式表記は「Microsoft Foundry」（`topic-config.mjs` TERMINOLOGY_DICT: `Azure Foundry`→`Microsoft Foundry`、doc slug も `microsoft-foundry`）
- **doc の冗長形「Microsoft Azure Foundry」に合わせて修正提案するのは false-positive**。terminology lint が巻き戻す（2026-05-31 に実際 revert）。次回以降フラグしないこと

### ses-141 の macOS Keychain 確認（Pass）
- authentication.md: "On macOS, credentials are stored in the encrypted macOS Keychain"
- ses-141 正解「暗号化された macOS Keychain」は正確。偽陽性を懸念する必要なし

### ses-153 の SOCKS プロキシ否定（要注意）
- network-config.md に「SOCKSプロキシ非対応」の記述なし
- env-vars.md に `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`/`CLAUDE_CODE_PROXY_RESOLVES_HOSTS` のみ（SOCKS なし）
- ses-153 explanation の「SOCKSプロキシはサポートされていません」は根拠なし → minor
- 正解 `HTTPS_PROXY` 自体は正確

### ses-048 の CLAUDE_CODE_PROXY_RESOLVES_HOSTS（Pass）
- env-vars.md に明記: "Set to 1 to allow the proxy to perform DNS resolution"
- ses-048 explanation 末尾の記述は正確

### session カテゴリ factCheck distractor tier（2026-05-31）
- ses-027, ses-045, ses-189, ses-190 の distractor/difficulty フラグ：全て偽陽性
- 事実誤認なし。品質（選択肢長バランス）の問題のみ
