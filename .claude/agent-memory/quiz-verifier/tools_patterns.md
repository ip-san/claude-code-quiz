# Tools カテゴリ検証パターン

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
- TodoWrite / Task tools: 既定は Task tools（TaskCreate/TaskGet/TaskList/TaskUpdate）で、`CLAUDE_CODE_ENABLE_TASKS=0` で TodoWrite に戻る。どのモデルで使えるかは tools-reference.md の task-tool-availability 節で毎回確認する（対象モデルは更新で変わる）
- Tool Search: デフォルト有効、Haiku 非対応、ENABLE_TOOL_SEARCH=auto で閾値ベース（mcp.md）
- /teleport: スラッシュコマンドとして存在（commands.md L80）
- claude --teleport: CLI フラグとして存在（cli-reference.md L109）
- --jetbrains: フラグとして存在しない（cli-reference.md に記載なし）

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

## tools カテゴリ 17問検証（2026-09-10, tool-026/027/031/039/044/053/059/061/074/081/083/084/086/092/093/094/098）

### tool-059: JetBrains インストール手順は実は2ステップ、正解は Step 2（major, needsOpusReview）
- ローカルキャッシュ `.claude/tmp/docs/jetbrains.md` と `sections/jetbrains/installation.md` は `<Steps>` の各タイトルが空白（"1"/"2"のみ）に平坦化されている。hooksページの見出し平坦化と同種のレンダリング欠落
- ライブ取得 `curl https://code.claude.com/docs/en/jetbrains.md` で確認: Step 1 = "Install the Claude Code CLI"（quickstartに従う）、Step 2 = "Install the JetBrains plugin"（Marketplaceからインストール+再起動）
- tool-059 の問題文は「最初のステップ」を問うが、正解選択肢（correctIndex=3）はStep 2の内容。真のStep 1（CLIインストール）はどの選択肢にも存在しない。他3択は明確に誤りなので critical ではなく major 判定とした
- 次回このページを検証する際は、キャッシュの空白ステップだけで判断せず `jetbrains.md` のライブ `.md` 版を確認すること。vs-code.md にも同様の `<Steps>` インストール手順がある可能性があり、横断確認が有効

### tool-074: Task tool availability に v2.1.233 のモデル別例外あり（major, needsOpusReview, 新規drift）
- tools-reference.md の新セクション「## Task tool availability」（v2.1.233以降）: Opus 4.8 / Sonnet 5 / Fable 5 / Mythos 5（またはそれ以降の同ファミリー）では `TodoWrite` と `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate` の**両方**がデフォルトで提供されない（opt-inが必要: `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` / `--allowedTools` / `--tools`）
- 「Opus 4.7 など上記以外のモデル」でのみ、従来通り Task ツールがデフォルト + `CLAUDE_CODE_ENABLE_TASKS=0` で `TodoWrite` に戻せる、という2026-05-30時点の記述が成立する
- known-issues.md L154 の「Pro/Team Standard/Enterprise サブスクリプション席 = Sonnet 5」と合わせると、現在の大多数のデフォルトユーザーはこの例外対象モデルに該当するため、tool-074 の「全モードでデフォルト」という説明は最新docsに対して不完全
- 2026-05-30時点の MEMORY 記録（L244-251, TodoWriteの仕様変更）はその時点では正しかったが、v2.1.233 でさらに上書きされた。**「一度確認済み」の記録でも、バージョン番号付きの仕様は次回スキャン時に再確認が必要**（特にTask/TodoWrite・effort level・モデルデフォルトなど頻繁に変わる領域）

### 確認済み facts（2026-09-10, 高信頼）
- Grep: ripgrep/Rust regex構文、`--regex`フラグ不要（tools-reference.md L199-207）
- Bash出力: デフォルト30,000字超でセッションディレクトリのファイルに保存、パス+先頭プレビューのみ渡す。`BASH_MAX_OUTPUT_LENGTH`で最大150,000字（tools-reference.md L126-133, env-vars.md L52）
- `sandbox.autoAllowBashIfSandboxed`: デフォルトtrue（sandboxing.md L124）
- mTLS: `CLAUDE_CODE_CLIENT_CERT`/`CLAUDE_CODE_CLIENT_KEY`/`CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`（env-vars.md L82-84）
- `WebFetch(domain:example.com)`構文が正しい。`url:`ではなく`domain:`（permissions.md L206-212）
- `CLAUDE_AUTO_APPROVE`は存在しない環境変数（env-vars.md grep該当なし）
- `--jetbrains`/`--import-session`フラグは存在しない（false-positive確認済みパターンを再確認）
- VS Code vs JetBrains の `mcp__ide__executeCode`: VS Codeのみ公開（要Quick Pick確認）、JetBrainsは公開しない（jetbrains.md L156「does not expose a code-execution tool to the model」、vs-code.md L324-331）
- `cleanupPeriodDays`: デフォルト30日・最小1日、`0`はバリデーションエラー（claude-directory.md L123）
- 設定リロード: `permissions`/`hooks`/`apiKeyHelper`は即時リロード+`ConfigChange`フック発火。`model`/`effortLevel`/`modelSettings`は読み込み一度きり（`/model`/`/effort`で切替）。`outputStyle`はプロンプトキャッシュの都合で`/clear`か再起動まで反映されない（settings.md L102-107, prompt-caching.md L91）
- `footerLinksRegexes`: メインスレッドでターン完了ごとにマッチング、ネスト量指定子`(a+)+$`はReDoSでセッションフリーズの危険。バッジ最大5個、URL長2048字上限、スキームは`https`/`http`+エディタdeep-link（`vscode`/`jetbrains`等含む）、オリジンはテンプレートと一致必須（settings-reference.md「footerLinksRegexes」節、2026-09-10 curl確認）
- サンドボックスランタイム（`@anthropic-ai/sandbox-runtime`）: Docker不要でSeatbelt/bubblewrapによりプロセス全体（ファイルツール・MCP・フック含む）を隔離。Dev container/Custom containerは両方Docker必須（sandbox-environments.md 比較表 L12-14）
- `--dangerously-skip-permissions`: 確認ダイアログが一切働かないため分離境界が唯一の保護。Auto modeのクラシファイアは per-action 制御で分離境界の代替にならないが、Auto modeでは分離は「必須ではなく多層防御」という位置づけの違いがある（sandbox-environments.md L37）
- サンドボックスの保護パス（`.claude/settings.json`等）: `allowWrite`/`Edit`許可ルール/`denyWrite`からの除外のいずれでも解除不可。唯一の解除法は`filesystem.disabled`（sandboxing.md L216-225）
