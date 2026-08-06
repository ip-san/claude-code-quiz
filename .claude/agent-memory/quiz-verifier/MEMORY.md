# Quiz Verifier Memory Index

- [SDK category patterns](sdk_patterns.md) — sdk カテゴリの検証パターン・偽陽性記録
- [Keyboard category patterns](keyboard_patterns.md) — keyboard カテゴリのパターン（Option+T設定要件, keybindings.jsonフォーマット, wrongFeedback短文）
- [Session category patterns](session_patterns.md) — session カテゴリのパターン（モデルラインナップ更新drift: Sonnet 5登場・Fast Mode縮小・default変更）

## extensions カテゴリ検証パターン（2026-05-23）

### Hook イベント総数の更新
- hooks.md の直接カウントで29種（Setup、UserPromptExpansion、PostToolBatch を含む）
- **更新（2026-06-02）: 29→30**。`MessageDisplay`（matcher なし・非ブロッキング、"While assistant message text is displayed"）が追加され現在は全30種。ブロッキング可能は15種（verified-facts.md / known-issues.md L250 と一致）
- known-issues.md の「全26種（2026-04-04確認）」は古い記録 → 30種に更新済み（known-issues.md L247）
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

### VS Code リモートセッション UI（tool-061, Resolved 2026-06-06）
- vs-code.md L66-70: 「Session history」ボタン（UI名称）+ Claude.ai Subscription 要件を確認済み
- 問題の正解選択肢「VS Code パネル上部の Session history ボタン」はドキュメントと一致 → OK
- Jina キャッシュではリモートセッション手順ステップ（1/2/3）が空白になるが内容は L70 に記述あり
- --import-session フラグ不存在: cli-reference.md に記載なし（confirmed false-positive）
- GitHub リポジトリ限定制約はドキュメントに記述なし（非制約）。Claude.ai Subscription が必要条件

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

## commands カテゴリ 第2回検証追加パターン（2026-06-06, fact-tier 15問）

### 全15問ほぼ偽陽性（14問OK、1問minor）
- factCheck:flags の大多数: 不正解選択肢で「存在しないフラグ」を使い wrongFeedback で明示否定 → 偽陽性パターン
- 偽陽性確認済みフラグ: --review, --readonly, --no-write, --skip-permissions, --gui, --focus, --schema, --structured-output, --stream, --realtime, --context-file, --status, --list-remote, --low-memory, --max-old-space-size, --non-interactive, --list-commands
- /restart, /flush, /clean: 不正解選択肢での言及 → commands.md に存在しないことを確認

### cmd-081 の CLAUDE_MAX_TURNS（minor）
- 不正解選択肢[0]に「CLAUDE_MAX_TURNS」が登場し wrongFeedback で否定
- 正しい変数名は `CLAUDE_CODE_MAX_TURNS`（env-vars.md L118 確認済み）
- 正解(correctIndex:3)は「claude_args パラメータに CLI 引数として渡す」で正確
- minor: wrongFeedback「環境変数ではなく claude_args」という否定は正確だが変数名が異なる

### crossCheck numeric-contradiction の偽陽性（cmd-066）
- 問題文の「コンテキスト95%消費」という数値表現に反応
- ドキュメントに固定パーセンテージの記述なし → 仮設的な問題設定として許容範囲
- コマンドの機能説明(/compact, /rewind, /clear の区別)は正確 → 偽陽性

### 確認済み facts（2026-06-06）
- /clear エイリアス: /reset, /new（commands.md L12 確認）
- /compact [instructions]: フォーカス指示は引数として自然言語で指定（commands.md L15）
- --json-schema: headless.md L93-97 に明示。--output-format json と組み合わせて structured_output フィールドに出力
- stream-json + --verbose + --include-partial-messages: headless.md L103-106 に明示
- --continue / --resume: headless.md L191-206 に明示。CLAUDE_SESSION_ID は存在しない
- WORKDIR /tmp: troubleshoot-install.md L394-395 に明示（Docker ハング回避）
- スワップ追加: troubleshoot-install.md L379-383 に明示（OOM Killed 対処）
- /tasks: claude-code-on-the-web.md L267 に明示。進捗確認に使用

## session カテゴリ追加検証パターン（2026-06-06, 14問 fact-tier flagged）

### ses-003 の「同じセッション内で」表現（minor）
- commands.md: "/clear: Start a new conversation with empty context"
- interactive-mode.md L189: "/clear to start a **new session**"
- sessions.md L86: "/clear: start fresh with an empty context. The previous conversation is saved and resumable"
- 正解 option 文中「同じセッション内で新しい会話を始められる」は技術的不正確
- /clear は OLD session を保存して **NEW session** を開始する（Claude Code プロセスは継続）
- 核心（/clear≠終了 vs /exit=終了）は正しい。severity: minor

### ses-007 の -t / --focus フラグ（false-positive 確認済み）
- commands.md: "/compact [instructions]" - フラグなしでインライン指定
- -t および --focus は不正解選択肢の「存在しないフラグ」として記述（skipIfNegated パターン）
- → false positive

### ses-100 の Summarize from here / Fork 記述（Pass）
- checkpointing.md: "Summarize from here: messages before the selected message stay intact. The selected message and everything after it are replaced with a summary"
- Fork: sessions.md に「Branching creates a copy of the conversation」と明記
- quiz の記述（Summarize from here = 時間軸圧縮、Fork = セッション全コピー）は正確

### ses-102 の effortLevel 設定値リスト（minor）
- settings.md L180: effortLevel は "low", "medium", "high", or "xhigh" を受け付ける
- ses-102 option[0] テキスト「`low`、`medium`、`high` を指定する」→ `xhigh` が欠落 → minor
- 正解(correctIndex=3)への影響なし。wrongFeedback も enum を列挙しない

### ses-117 の「Extra Usage」表現（minor）
- fast-mode.md: 公式表記は「usage credits」（"available via usage credits only"）
- ses-117 explanation: "Claude サブスクリプションプランの Extra Usage 経由でのみ利用可能"
- "Extra Usage" はドキュメントに存在しない → 正式用語は "usage credits" → minor
- Microsoft Foundry 命名は引き続き false-positive（TERMINOLOGY_DICT 優先）

### ses-145 の --remote フラグ（Pass）
- cli-reference.md L52: "--remote: Create a new web session on claude.ai with the provided task description"
- 正解「`claude --remote` で実行する」は正確

### ses-152 の modelOverrides（Pass）
- amazon-bedrock.md L174+: "use the modelOverrides setting in your settings file"
- 複数ARNマッピングに modelOverrides を使う正解は正確

### ses-154 の NODE_EXTRA_CA_CERTS（Pass）
- network-config.md L53: "export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem"
- 正解は正確

### 今回の偽陽性パターン（14問中 ok 9問 / minor 5問）
- ses-003: minor（同じセッション内→新しいセッション開始が正確）
- ses-007: ok（-t/--focus は skipIfNegated パターン）
- ses-030: ok（MEMORY 既知）
- ses-048: ok（MEMORY 既知）
- ses-100: ok
- ses-102: minor（option[0] の xhigh 欠落）
- ses-107: ok（MEMORY 既知）
- ses-112: ok（MEMORY 既知）
- ses-117: minor（Extra Usage → usage credits）
- ses-141: ok（MEMORY 既知）
- ses-145: ok
- ses-152: ok
- ses-153: minor（SOCKS 非対応の根拠なし、MEMORY 既知）
- ses-154: ok

### 2026-06-06 quality-loop fact-tier 検証（59問 / 8カテゴリ）
- **@import 再帰深度の drift 修正**: mem-002/030/043/046 が「最大5階層」と誤記。EN memory.md L73 + JA memory（「最大深度は 4 ホップ」）で確認し **4ホップ** へ統一。mem-043 は正解の数値そのものだったため flow diagram も「起点(CLAUDE.md)/1〜4ホップ」に再構成（5ファイル=4ホップを明示）。docs/verified-facts.md に確定事実記録
- **sdk-011（major→修正）**: explanation が `CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY` を「認証変数」と誤分類 → 「プロバイダー選択用、認証は各プロバイダー資格情報」に修正。diagram label「認証方法ごと」→「プロバイダー別」
- **cmd-081（minor→修正）**: distractor の `CLAUDE_MAX_TURNS` → 実在の `CLAUDE_CODE_MAX_TURNS`（env-vars.md L118）
- **ses-117（minor→修正）**: explanation「Extra Usage」→ 公式表記「usage credits」（fast-mode.md）
- **ses-153（minor→修正）**: 「SOCKSプロキシ非対応」は doc 根拠なし → terminal/hierarchy から削除
- **見送り**: ses-003（再ワードが未検証の /resume 主張を導入する risk）/ ses-102（effortLevel enum、Verified Facts 領域）/ key-032（`/output-style` 存在を検証者自身が不確実と判断）
- fact-tier 59問中 49問は skipIfNegated 偽陽性（不正解選択肢で存在しないフラグ/env を否定する設計パターン）。継続的に同じ偽陽性が出る

## memory カテゴリ 正解妥当性監査（2026-06-06）

### @import 最大深度: 現行ドキュメントは「four hops」（重要）
- `docs/memory.md` L73: "maximum depth of **four hops**"（現行フェッチ版）
- `docs-assembled/memory.md` L48: "maximum depth of **five hops**"（アセンブル版に古い内容が混入）
- **docs/memory.md が正典**: アセンブル版は信頼性に問題あり。フェッチされた生ファイルを優先すること
- mem-043 correctIndex=1「最大5階層」は現行docと矛盾 → critical（MEMORY.mdでは「修正済み」と記録されているが実際のJSONはまだ5階層）
- mem-002 explanation「最大5階層」も同様に誤り（correctIndexは正しいが explanation drift）

### mem-060 の critical issue（2026-06-06 確認）
- 正解[0]「セキュリティ上の理由でプロジェクト設定からは受け付けられません」→ **現行ドキュメントと矛盾**
- `docs/memory.md` L270: "It is read from any settings scope: user, **project**, local, policy, or --settings"
- L278: "When set in a project's `.claude/settings.json` or `.claude/settings.local.json`, the value is honored only after you accept the workspace trust dialog"
- 現行では project/local スコープも **許可されている**（trust dialog 経由）。旧仕様への doc drift。
- correctShouldBe: 「できる。ただし .claude/settings.json または .claude/settings.local.json から設定する場合はワークスペース信頼ダイアログの承認が必要」

### docs-assembled vs docs/ の乖離パターン（2026-06-06 発見）
- `fetch-docs.mjs --assemble` が生成する docs-assembled/ は古いページ内容を含むことがある
- memory.md のインポート深度（four vs five hops）で確認済み
- 検証時は必ず `docs/memory.md`（フェッチ生ファイル）を正典として参照すること
- docs-assembled/memory.md は best-practices/session 等のコンテンツが混入しており内容が多い

### CLAUDE.md スコープテーブルの順序変更（新旧ドキュメント）
- 旧 assembled doc: Managed > **Project** > **User** > Local
- 新 docs/memory.md: Managed > **User** > **Project** > Local
- 旧ドキュメントでは Project が User より上位だったが新ドキュメントでは逆転
- ただし新 doc L46「a project instruction appears in context AFTER a user instruction」= project は user より後ろ（高優先）
- mem-045「Managed > Project > User > Local」の答えは現行 doc の context 順序でも支持される → false-positive

### 2026-06-06 正解妥当性監査（最重要パターン）
- **lint フラグの有無に関わらず correctIndex の正解妥当性を毎回確認**。distractor lint は「正解の doc ドリフト」を拾えない。機能のデフォルト/仕様変更に該当する問題は正解そのものを再評価。
- **真の正解が選択肢に存在しない**ケース（ユーザーが正しく選んでも不正解）が最悪 = critical。実例 key-031/tool-027/mem-060。
- **assembled docs は古い記述が残る**（three review agents / five hops / 2%）。`docs/<page>.md` 個別ファイルを正典とする。
- **選択肢を最後まで読む**。途中までで誤判定した実例: key-044（先頭4種だけ見て「4種」と誤指摘、実際は7種で正しい）。
- 確定した新事実は docs/verified-facts.md「2026-06-06」表を参照（5タスク/statusline下部バー/PR4色/Bash出力ファイル保存/Fast=Opus専用/MCP遅延/autoMemoryDirectory任意スコープ/モデル切替4法/復元6/Remote32）。

## 2026-06-23 bp+sdk+keyboard 8問 fact-tier 検証

### /output-style コマンドの現状（key-032 最終確認・2026-06-23 訂正済み）
- **訂正:** 当初「assembled docs に `/output-style` が有効コマンドとして存在」と記録したが**これは循環検証トラップによる誤り**だった。
  根拠とした keyboard.md L110 は assembled ファイルに混入した**クイズ自身の wrongFeedback テキスト**であり、公式ドキュメントではなかった。
- **正典で確認した事実:** `/output-style` は**現行ドキュメントにコマンドとして存在しない**。
  - commands.md L18: 出力スタイル変更は `/config`（Settings 画面）経由のみ。`/output-style` のコマンド定義行なし
  - output-styles.md「Change your output style」: `/config` → Output style か `settings.json` の `outputStyle` 編集
- したがって key-032 の option[1] wrongFeedback が `/output-style` を**現行手段として列挙していたのが誤り**（修正済み）。
  option[3] の「`/output-style` は v2.1.73 付近で廃止」という記述は**正しい**。
- **次回検証時の教訓:** (1) `/output-style` は現行コマンドとして扱わない（正式は `/config`）。
  (2) **assembled の per-category JSON はクイズ本文を含むため、それを「ドキュメント」として事実根拠にしない**。
  事実照合は必ず `docs/<page>.md` の生ドキュメントを正典とする（循環検証トラップ回避）。

### check-tools コマンド（bp-066 確認）
- claude-code-on-the-web.md L63: "ask Claude to run `check-tools` in a cloud session. This command **only exists in cloud sessions**"
- bp-066 の正解「Claudeに check-tools コマンドを実行させる」は正確
- factCheck:flags フラグは `--list-tools` フラグへの否定記述に反応した偽陽性

### bp-084 / bp-095 / sdk-011 / key-034 / key-052 / key-054
- bp-084（claude init --global / claude --setup の否定）: 偽陽性。quickstart.md は「cd your-project && claude」を正式手順として確認
- bp-095（/deep-research ビルトインワークフロー）: 偽陽性。workflows.md L41-45 で確認済み。correctIndex=3 正確
- sdk-011（ANTHROPIC_API_KEY の正確性）: 前回と同様の偽陽性。docs で ANTHROPIC_API_KEY は Anthropic 直接の標準変数として確認
- key-034（keybindings.json 配列形式）: keybindings.md で配列形式フォーマット確認済み。偽陽性
- key-052（/tui fullscreen が主推奨、CLAUDE_CODE_NO_FLICKER=1 は等価）: fullscreen.md L11 "equivalent" を確認。偽陽性
- key-054（CLAUDE_CODE_SCROLL_SPEED 1〜20、vim=3）: fullscreen.md L61 で確認済み。偽陽性

## memory カテゴリ 9問検証（2026-08-03, mem-012/030/036/037/060/061/070/087/088）

### CLAUDE.md を含む見出しのアンカー生成バグ（新規発見・重要）
- `scripts/fetch-docs.mjs` の `slugify()` は `.` を単純除去するため、見出し "How CLAUDE.md files load" から `how-claudemd-files-load`（ハイフンなし）を生成する
- しかし実サイト（`curl https://code.claude.com/docs/en/memory` で確認）の実際の `id` 属性は `how-claude-md-files-load`（"claude" と "md" の間にハイフンあり）。"Choose where to put CLAUDE.md files" も同様に `choose-where-to-put-claude-md-files`
- つまり **見出しに "CLAUDE.md" を含む場合、実サイトは "." を "-" に変換するが、ローカル slugify は "." を除去するだけ**という食い違いがある
- known-issues.md L128「有効アンカー: ...#how-claudemd-files-load...」（2026-03-01確認）は**stale**。次回 known-issues.md 更新時に `#how-claude-md-files-load` へ修正が必要
- mem-012 の referenceUrl `#how-claudemd-files-load` は実際には壊れている（major issue） → `#how-claude-md-files-load` に修正が必要
- **今後の検証方針**: 見出しに `.`（ピリオド）を含む語（"CLAUDE.md" 等）が使われているアンカーは、ローカル slugify だけで「有効」と判定せず、可能なら `curl <URL> | grep 'id="..."'` で実サイトを直接確認する。`#auto-memory` `#path-specific-rules` `#troubleshoot-memory-issues`（ピリオドなし見出し）は今回 curl で実在確認済み・問題なし

### 今回の9問中8問はOK（doc drift/事実誤認なし）、1問 major（URLアンカー）
- mem-030, mem-036, mem-037, mem-060, mem-061, mem-087, mem-088: 全て docs/memory.md・docs/server-managed-settings.md と一字一句レベルで一致。mem-060 は2026-06-06に指摘したcritical issue（プロジェクト設定不可の誤り）が既に修正済みであることを確認
- mem-070: best-practices.md の Include/Excludeテーブルと完全一致（事実面OK）。diagram flow の text/sub 矢印表記が steps 間で不統一（info level、修正不要レベル）
- 決定論的lintの `factCheck:env`（mem-030, mem-036の`CLAUDE_MD_PATH`）、`factCheck:slash`（mem-012の`/load`）、`factCheck:flags`（mem-061の`--append-system-prompt`）は全て既知の否定文脈偽陽性パターンとして再確認

## extensions カテゴリ 25問検証（2026-08-02, ext-008/011/013/017/020/037/043/047/056/071/085/090/110/131/132/172/182/186/188/190/191/194/196/197/198）

### correctIndex は全問正確（critical 0）
- hooks.md/hooks-guide.md（permissionDecision allow/deny/ask/defer 4値、escalateは無効、exit code 2 blocking、PreCompact blocking可、Hook 30イベント種別）、sub-agents.md（Explore/Plan/general-purpose/statusline-setup/claude-code-guide の5built-in、Debug不存在、All hook events are supported）、mcp.md（.mcp.json ${VAR}展開はcommand/args/env/url/headersの5箇所、-- 区切りは既知false-positive)、agents.md（subagents/agent view/agent teams/worktreesの使い分け、/batch=5-30worktree、/tasksが現在セッションの進捗確認窓口）、plugin-relevance.md（relevance block + pluginSuggestionMarketplaces両方必須、cliシグナルは先頭トークンのみ・複合コマンドは最初のみ記録）、mcp-quickstart.md（local=~/.claude.json配下、project=.mcp.json、user=~/.claude.jsonトップレベル、! Needs authenticationの意味）、managed-mcp.md（マージ→denylistチェック→allowlistチェックの順、denylist絶対優先）、plugin-dependencies.md（range-conflict、既存プラグインの状態維持）、discover-plugins.md（DISABLE_AUTOUPDATER両方無効化、FORCE_AUTOUPDATE_PLUGINS+DISABLE_AUTOUPDATERで本体のみ無効化、プラグインのみ無効化は/pluginのMarketplacesタブ個別トグル）を全て個別docファイルで再確認、全て正確。

### 発見した issue（major、critical 0）
- **ext-182**: option[1].wrongFeedbackが「`/agents`は現在のセッション内のsubagentパネル（Running/Libraryタブ）」と旧仕様を記述。agents.md L41「As of v2.1.198, /agents no longer opens a panel; it prints a notice」と矛盾。**同一バッチのext-196は正しく記述**しており、バッチ内不整合の実例。新機能ドキュメント変更（v2.1.198の`/agents`パネル廃止）は複数問題に波及するため、変更検出時は`/agents`を含む全問の横断チェックが必要。
- **ext-011/017/056/090**: flow.steps[].text/subの単語途中分断（「リソース」→「リ」+「ソース」、「Slack」→「Slac」+「k」、「デフォルト」→「デ」+「フォルト」×2、「テンプレート」→「テンプレ」+「ート」、「メカニズム」→「メ」+「カニズム」）。known-issues.md記載の広範debt（521件既知）の一部。個別修正よりバッチ修正（`bun run quiz:check-diagram-text`等）推奨。
- **ext-198**: diagrams[0].steps[0/1].textが「プラグインAがCにを要求」のように、`~2.1`/`~3.0`のバージョン範囲値がバッククォートごと脱落したと見られるデータ破損。正解・explanationは正確（plugin-dependencies.mdのrange-conflict仕様と一致）なのでdiagramのみの影響。

### referenceUrl の en/ja 混在（false-positiveの可能性大、要フォロー不要）
- ext-196/197/198は`/docs/en/agents`,`/docs/en/managed-mcp`,`/docs/en/plugin-dependencies`を使用（他のext問題は`/docs/ja/`）。これらは比較的新しいページで日本語訳が未整備の可能性が高く、意図的と判断（今回は指摘せず）。次回、日本語版ページが追加されたら要再確認。

## memory カテゴリ 10問再検証（2026-08-05, commit 81506fc 後）

### mem-012 のアンカー修正を確認
- 前回指摘した `#how-claudemd-files-load` → `#how-claude-md-files-load` の修正が commit 81506fc で適用済み。再確認不要（今後この問題を再度flagしないこと）

### mem-089（新問）検証済み（claude-directory.md 'Clear local data' 節と完全一致）
- `claude project purge` の削除対象: `projects/`配下のトランスクリプト・自動メモリ、セッションごとの`tasks/`・`debug/`・`file-history/`、`history.jsonl`の一致行、`~/.claude.json`内のプロジェクトエントリ
- 対象外（プロジェクトスコープでないため）: `shell-snapshots/`, `backups/`
- 常に保持: `~/.claude.json`全体, `~/.claude/settings.json`, `~/.claude/plugins/`
- `--all`指定時のみ`history.jsonl`を丸ごと削除（指定なしはフィルタ削除）
- フラグ: `--all`, `--dry-run`, `-i`/`--interactive`, `-y`/`--yes`（`claude project purge --help`をローカルCLIで直接実行し実在確認済み。fetch-docsの平坦化でコード例中のフラグ名が消えていても、ローカルにclaude CLIがあれば`--help`で直接検証できる）
- claude-directory.mdの`#clear-local-data`アンカーは実サイトで有効（curl確認済み）。mem-089のreferenceUrlはページ全体のみだが致命的ではない（info級改善提案）

### CLI --help による実在検証テクニック（新規パターン）
- fetch-docsのJina Reader平坦化でコードブロックが失われフラグ名が文中に見えない場合、ローカルに`claude`CLIがインストールされていれば`claude <subcommand> --help`を直接実行してフラグの実在を一次情報で確認できる。docsのキャッシュ品質に依存しない検証手段として有効
