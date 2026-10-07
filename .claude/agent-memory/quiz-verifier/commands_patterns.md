# Commands カテゴリ検証パターン

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

## commands カテゴリ 26問検証（2026-09-10, cmd-002/004/025/035/041/049/051/065/066/069/072/073/078/094/096/097/103/111/121/124-127/129/130/133）

### 25/26問が偽陽性、1問のみminor
- fact-tier（factCheck:flags/slash/crossCheck）は全問実doc一致を確認。--review/--input/--readonly/--no-write/--plan/--skip-permissions/--name-only/--gui/--focus/--schema/--structured-output/--realtime/--stream/--context-file/--session/--list-remote/--status/--low-memory/--max-old-space-size/--non-interactive/--list-commands/--switch-model/--restart/--clean/--flush/--summarize は全てcli-reference.md/commands.mdに存在しない不正解として正確
- quality-tier（distractor長さ不均衡: cmd-124〜127/129/130/133）は全て事実誤認なし。正解が長い＝説明が正確で具体的なだけ（info相当）

### 新規ページ（worktrees/deep-links/goal/github-enterprise-server/troubleshoot-install）の確認済みfacts
- EnterWorktree: `.claude/worktrees/`外への移動は常にユーザー承認必須。許可ルール/「don't ask again」では抑制不可、`bypassPermissions`のみ抑制可（v2.1.206より前は無承認移動可）（worktrees.md）
- worktree.baseRef: `"fresh"`(デフォルト)=リポジトリのデフォルトブランチ(origin/HEAD)からクリーン分岐、`"head"`=ローカルHEADから分岐し未pushコミット引継ぎ。ブランチ名の直接指定は不可（worktrees.md L67-72）
- deep-links repo パラメータ: owner/nameスラッグ→過去にclaude実行した最も最近使用のローカルクローンパスに解決。`cwd`と併用時は`cwd`優先（`repo`は無視、cwdパス不存在でも）。一致なしならホームディレクトリ（deep-links.md L36-50）
- GitHub Markdown（README/Issue/PR/Wiki）はhttp/https以外のURLスキームを除去し、`claude-cli://`リンクはラベルのみ残る。回避策はコードブロックにURL記載（deep-links.md L113）
- /goal: セッションにつき1つのみアクティブ（新規設定で置換）。評価モデルはツール呼び出し不可、会話に表面化した内容のみで判定。各ターン終了後に小型高速モデル（Claude APIデフォルトHaiku、`ANTHROPIC_DEFAULT_HAIKU_MODEL`で変更可）がyes/no+理由を返す。セッションスコープのprompt-based `Stop` hookのラッパー。`/loop`は時間間隔、`/goal`はターン終了ベースで明確に区別される（goal.md）
- GHES: GitHub MCPサーバーは非対応（唯一の主要な機能差）。代替として`gh auth login --hostname <GHESホスト>`でgh CLI認証（github-enterprise-server.md L18,114）
- npmネイティブバイナリ: `@anthropic-ai/claude-code-<platform>`としてoptional dependency配布。`--omit=optional`(npm)/`--no-optional`(pnpm)/`--ignore-optional`(yarn)/`.npmrc`の`optional=false`はパッケージ自体のダウンロードをスキップするためJSフォールバックなし、`install.cjs`再実行では解決不可（troubleshoot-install.md L336-344）

### effort level対応モデル一覧（model-config.md、2026-09-10確認）
- Fable 5.1・Fable 5: low/medium/high/xhigh/max
- Opus 5・Sonnet 5・Opus 4.8・Opus 4.7: low/medium/high/xhigh/max
- Opus 4.6・Sonnet 4.6: low/medium/high/max（xhighなし）
- cmd-065のexplanationが「Fable 5/Opus 5/Sonnet 5/Opus 4.8/Opus 4.7/Opus 4.6/Sonnet 4.6」を effort対応モデルとして列挙（Fable 5.1が抜けている）。ただし「xhigh対応」等の断定はしておらず、正誤判定に影響しないため info程度。将来 Fable 5.1 明示チェックの際は注意

### --dangerously-skip-permissions と root/sudo の関係（新規確認事項）
- Linux/macOSでroot/sudo実行時はこのフラグ自体が拒否される（sandboxing.md L341, permission-modes.md L301）。「管理者権限だけでは不十分」という表現は嘘ではないが、実際には「root権限があるとフラグ自体使えない」という逆方向の制約がある点に注意。今後このフラグに関する問題を検証する際は、単なる「不十分」ではなく「root/sudoでは拒否される」という正確な記述を推奨
