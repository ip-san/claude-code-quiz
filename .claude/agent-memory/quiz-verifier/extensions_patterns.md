# Extensions カテゴリ検証パターン

## Extensions category patterns (2026-09-10, audit-extensions2 pass, 78問 ext-102〜ext-204)

## 重要: ローカル doc キャッシュの切り詰め問題（新規発見・最重要）
- `.claude/tmp/docs/*.md`（2026-09-10 13:xx 取得分）は live版（`curl https://code.claude.com/docs/en/<page>.md`）に比べて **約35〜45%短く切り詰められている**。実測例:
  - plugin-marketplaces.md: cache 81,538B vs live 117,783B（約31%欠落）
  - plugins.md: cache 17,280B vs live 30,162B（約43%欠落）
  - plugins-reference.md: cache 74,031B vs live 118,247B（約37%欠落）
  - hooks.md: cache 199,895B vs live 319,955B（約38%欠落。ただしCommon input fields等の重要セクションはcache内にも残っていた）
  - chrome.md/slack.md/hooks-guide.md も同様に25〜40%短い
- 切り詰めは先頭からではなく本文中のセクション単位で欠落する（例: plugin-marketplaces.mdでは「Reserved names」節が丸ごとcacheから消えていた）。**原因は不明**（fetch-docs.mjsのJina Reader変換 or サイズ上限のいずれか）だが、`ext-147`（marketplace予約名ブロック）はcacheだけで判定すると「該当記述なし＝critical drift」と誤判定するところだった。live curlで再取得したところ予約名リスト（`anthropic-marketplace`, `claude-code-marketplace`, `agent-skills`, `life-sciences`等）と「impersonate an official marketplace」ブロックは健在で、単なるcache欠落による false positive と判明。
- **今後の運用指針**: 大きめのdocページ（settings-reference, plugins-reference, plugin-marketplaces, hooks, hooks-guide等、cacheが50KB超のページ）で「期待する記述が見つからない」場合、即座にcritical判定せず、必ず `curl -s https://code.claude.com/docs/en/<page>.md` で live 再取得してから最終判断する。cacheのサイズをliveと比較し、20%以上小さい場合は要live確認のシグナルとして扱う。

## 今回確認した genuine critical drift（4件、live docsで二重確認済み）

### ext-140: プラグイン提出先の意味論が変わった
- plugins.mdが「公式マーケットプレイス（`claude-plugins-official`）」と「コミュニティマーケットプレイス（`claude-community`）」を明確に分離。提出フォーム（claude.ai/admin-settings/directory/submissions/plugins/new, platform.claude.com/plugins/submit）は**コミュニティ**マーケットプレイス審査用のみ。
- 公式マーケットプレイスには申請プロセスが存在せず、"There is no application process, and the submission form does not add plugins to the official marketplace." と明記。
- 「公式マーケットプレイスへの提出方法」を問う設問は、この区別を踏まえて作り直す必要がある。

### ext-146/ext-171: Chrome連携の対応ブラウザが拡大
- 旧: Google Chrome / Microsoft Edge の2つのみ
- 新: 上記2つに加え、Brave・Arc・Vivaldi・Operaなど他のChromiumベースブラウザも「検出・接続確立」に対応（chrome.md冒頭Note + Prerequisites両方に明記）
- 「Chrome/Edgeのみ対応」と断定する設問・wrongFeedback・explanationは要修正。また「ベータ版」表記も現行chrome.mdには見当たらず、GA化の可能性（要再確認）。

### ext-152: プラグインのカスタムパス挙動（commands等）が「補完」から「置換」に変更
- plugins-reference.mdに新設された「Path behavior rules」節: `commands`/`agents`/`workflows`/`outputStyles`/`experimental.themes`/`experimental.monitors` はカスタムパス指定時に**デフォルトディレクトリを置き換える**（デフォルトは走査されなくなる）。維持したい場合は明示的に両方列挙する必要がある。
- 唯一の例外は `skills`: デフォルトの`skills/`は常にスキャンされ、指定パスは**追加**される。
- 過去のクイズ（quality-loop第X回）で「カスタムパスは補完的で両方読み込まれる」という一般化がされていたが、これは現在 `skills` にしか当てはまらない。**今後 `commands`/`agents`/`hooks`/`.lsp.json`等のカスタムパスに関する設問を見たら、対象フィールドがreplaces系かadds系かをこの節で個別に確認すること。**

### ext-158: `@claude review` コメントの単発/購読挙動が2026年7月に変更
- code-review.mdに明記: "Before a July 2026 update, `@claude review` subscribed the PR to push-triggered reviews. If you relied on that behavior, comment `@claude review always` instead."
- 現在は素の `@claude review` は単発レビューのみ（`@claude review once` と同じ）。以降のプッシュへの自動購読には明示的に `@claude review always` が必要。
- 過去のクイズ（旧仕様）で「@claude review は以降のプッシュにもオプトインする」という記述があれば要修正。

## major級の列挙(enumeration)ドリフト（4件、correctIndexの選択自体は他の distractor より正確なので致命的ではないが、数値・列挙の更新が必要）

- **ext-108**: hooks.md Common input fields が 6→8 フィールドに増加（`prompt_id` v2.1.196+, `scratchpad_dir` v2.1.257+ が追加）。correctIndexは維持可能。
- **ext-130**: plugin-marketplaces.md のプラグインソースタイプが 5→7 種類に増加（`archive` v2.1.224+ zipアーカイブ, `command` v2.1.229+ ローカルコマンド生成が追加）。
- **ext-133**: hooks.md/hooks-guide.md の SessionStart `source` 値が 4→5 種類に増加（`fork`: `--fork-session`でのフォークセッション発火時）。
- **ext-164**: permission-modes.md がAuto modeの分類器モデルを「Claude Sonnet 5がデフォルト」と明記するようになった（以前はモデル名を特定しなかった）。ただしセッションがSonnet 4.6の場合や`availableModels`がSonnet 5を除外する場合はセッションのモデルにフォールバック（Fableモデルセッションの場合はOpusにフォールバック）という条件付き例外あり。「メインセッションのモデルに関わらず常に独立」という断定は例外条件下で不正確。needsOpusReview推奨。

## 偽陽性として確定した事例（要記録・再度flagしないこと）
- **ext-147**（マーケットプレイス予約名ブロック）: cache版のみで見ると「reserved names」の記述が完全に消えていたが、live版で確認すると `anthropic-marketplace`/`claude-code-marketplace`/`agent-skills`/`life-sciences`等の予約名リストと偽装ブロックは健在。**cache欠落による偽陽性の典型例**。
- desktop-scheduled-tasks.md はページ全体の構成（Cloud/Desktop/`/loop`の3方式比較、用語が「Routines」に変化）が大幅リライトされていたが、個別の事実（最小間隔1時間/1分/1分、7日以内1回のみキャッチアップ、SKILL.mdパス、Keep computer awake等）はすべて現行docsと一致していた。ページ構成の変化だけでcritical判定しないこと。
- channels.md, mcp-quickstart.md, managed-mcp.md, plugin-dependencies.md, channels-reference.md, security-guidance.md, plugin-relevance.md, plugin-hints.md, vs-code.md, agents.md は今回検証した全設問（ext-167〜169, 178〜181, 183〜185, 187, 189, 192-193, 195, 127）で完全一致（ドリフトなし）。

## extensions カテゴリ検証パターン（2026-05-23）

### Hook イベント総数の更新
- 総数・ブロッキング可能数は docs 更新のたびに変わるため、ここには固定値を書かない。現行値は `known-issues.md` の「Hook イベント総数」節と `docs/verified-facts.md` を参照し、hooks.md の表を実カウントして確認する（2026-09 時点: 総数33・ブロッキング可能16。PermissionRequest は No、WorktreeRemove は Yes）
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

## extensions カテゴリ 25問検証（2026-08-02, ext-008/011/013/017/020/037/043/047/056/071/085/090/110/131/132/172/182/186/188/190/191/194/196/197/198）

### correctIndex は全問正確（critical 0）
- hooks.md/hooks-guide.md（permissionDecision allow/deny/ask/defer 4値、escalateは無効、exit code 2 blocking、PreCompact blocking可、Hook 30イベント種別）、sub-agents.md（Explore/Plan/general-purpose/statusline-setup/claude-code-guide の5built-in、Debug不存在、All hook events are supported）、mcp.md（.mcp.json ${VAR}展開はcommand/args/env/url/headersの5箇所、-- 区切りは既知false-positive)、agents.md（subagents/agent view/agent teams/worktreesの使い分け、/batch=5-30worktree、/tasksが現在セッションの進捗確認窓口）、plugin-relevance.md（relevance block + pluginSuggestionMarketplaces両方必須、cliシグナルは先頭トークンのみ・複合コマンドは最初のみ記録）、mcp-quickstart.md（local=~/.claude.json配下、project=.mcp.json、user=~/.claude.jsonトップレベル、! Needs authenticationの意味）、managed-mcp.md（マージ→denylistチェック→allowlistチェックの順、denylist絶対優先）、plugin-dependencies.md（range-conflict、既存プラグインの状態維持）、discover-plugins.md（DISABLE_AUTOUPDATER両方無効化、FORCE_AUTOUPDATE_PLUGINS+DISABLE_AUTOUPDATERで本体のみ無効化、プラグインのみ無効化は/pluginのMarketplacesタブ個別トグル）を全て個別docファイルで再確認、全て正確。

### 発見した issue（major、critical 0）
- **ext-182**: option[1].wrongFeedbackが「`/agents`は現在のセッション内のsubagentパネル（Running/Libraryタブ）」と旧仕様を記述。agents.md L41「As of v2.1.198, /agents no longer opens a panel; it prints a notice」と矛盾。**同一バッチのext-196は正しく記述**しており、バッチ内不整合の実例。新機能ドキュメント変更（v2.1.198の`/agents`パネル廃止）は複数問題に波及するため、変更検出時は`/agents`を含む全問の横断チェックが必要。
- **ext-011/017/056/090**: flow.steps[].text/subの単語途中分断（「リソース」→「リ」+「ソース」、「Slack」→「Slac」+「k」、「デフォルト」→「デ」+「フォルト」×2、「テンプレート」→「テンプレ」+「ート」、「メカニズム」→「メ」+「カニズム」）。known-issues.md記載の広範debt（521件既知）の一部。個別修正よりバッチ修正（`bun run quiz:check-diagram-text`等）推奨。
- **ext-198**: diagrams[0].steps[0/1].textが「プラグインAがCにを要求」のように、`~2.1`/`~3.0`のバージョン範囲値がバッククォートごと脱落したと見られるデータ破損。正解・explanationは正確（plugin-dependencies.mdのrange-conflict仕様と一致）なのでdiagramのみの影響。

### referenceUrl の en/ja 混在（false-positiveの可能性大、要フォロー不要）
- ext-196/197/198は`/docs/en/agents`,`/docs/en/managed-mcp`,`/docs/en/plugin-dependencies`を使用（他のext問題は`/docs/ja/`）。これらは比較的新しいページで日本語訳が未整備の可能性が高く、意図的と判断（今回は指摘せず）。次回、日本語版ページが追加されたら要再確認。

## extensions カテゴリ追加検証（2026-09-10, extensions1グループ 79問中2件検出）

### ext-058: Explore サブエージェントのモデル仕様が v2.1.198 で変更（Critical）
- sub-agents.md: "As of v2.1.198, Explore inherits the main conversation's model instead of always running on Haiku. On the Claude API, the inherited model is capped at Opus"
- 旧仕様「Exploreは常にHaikuモデル」はstale。現行は「メイン会話のモデルを継承（Claude API上はOpus上限）」
- Bedrock/Vertex/Foundry/Claude Platform on AWS等サードパーティでは上限なしでそのままメイン会話のモデルを継承
- ユーザー/プロジェクトレベルで`Explore`という名前のカスタムサブエージェントを`model: haiku`定義すればHaiku固定にできるが、それはビルトインの上書きであり既定動作ではない
- 「ビルトインExploreはHaiku専用」という記述を見たら要修正フラグ（doc drift）

### ext-041: Notification イベントの matcher 値（notification type）が6→12種に増加
- hooks.md L137: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`, `elicitation_url_dialog`, `elicitation_complete`, `elicitation_response`, `agent_needs_input`, `agent_completed`, `quota_auto_resume_fired`, `quota_auto_resume_stale`, `quota_auto_resume_disabled` の12種が現行
- 旧記録（6種: permission_prompt/idle_prompt/auth_success/elicitation_dialog/elicitation_complete/elicitation_response）はv2.1.198以前の相当古い記述。elicitation_url_dialog, agent_needs_input, agent_completed（v2.1.198+）, quota_auto_resume_*（v2.1.234+、3種）が追加された
- 列挙が古くても列挙内の値自体はまだ有効なため correctIndex は変わらない（major、not critical）

### extensions1 その他確認済み facts（2026-09-10、全て一致・修正不要）
- Hook event total = 33種（26→29→30→33、DirectoryAdded/PreModelSwitch/PostModelSwitch追加）、exit-2でブロッキング可能 = 15種（hooks.md L386-421の表で再確認、ext-029は既に正確）
- Hook 5 handler types (command/http/mcp_tool/prompt/agent) は正確。async:trueはcommandタイプ限定（hooks.md L1709）
- MCP Tool Search対応モデル = Sonnet 4.5/Haiku 4.5/Opus 4.5以降（tool_reference対応、mcp.md「Configure tool search」で再確認、2026-08-03のMEMORY記録と一致）
- MCPリソース@メンション構文 `@server:protocol://resource/path`（curl でReactソース確認、mcp.mdの平文キャッシュでは例示コードが欠落するため注意）
- Code Intelligence対応言語 = 11言語（C/C++, C#, Go, Java, Kotlin, Lua, PHP, Python, Rust, Swift, TypeScript）。Rubyは非対応（discover-plugins.md L28-40テーブルで確認）
- プラグイン外部連携 = GitHub/GitLab(Source control), Atlassian/Asana/Linear/Notion(Project management), Figma(Design), Vercel/Firebase/Supabase(Infrastructure), Slack(Communication), Sentry(Monitoring)。AWS CodePipelineは含まれない
- settings優先順位5段階（Managed > Command line > Local project > Shared project > User）はsettings.md L122-133と完全一致
- managed-mcp.json は排他的制御（ユーザーはサーバー追加不可）、allowedMcpServers/deniedMcpServersはポリシーベース制御（allowManagedMcpServersOnly未設定ならユーザーが拡張可能）
- サブエージェントmemoryスコープパス: user=~/.claude/agent-memory/<name>/、project=.claude/agent-memory/<name>/、local=.claude/agent-memory-local/<name>/（sub-agents.md L288-290）
- Agent(agent_type)許可リスト構文は`claude --agent`のメインスレッドでのみ有効（sub-agents.md L225-229で確認、ext-063は正確）
- availableModels単体設定ではDefaultオプションは制約を受けない。enforceAvailableModels併用時のみDefaultも制約対象（model-config.md L177で確認、ext-098は正確）
- MAX_MCP_OUTPUT_TOKENS デフォルト25,000、警告10,000トークン（env-vars.md L289で再確認）
