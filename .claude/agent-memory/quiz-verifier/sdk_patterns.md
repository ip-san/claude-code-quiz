---
name: SDK category verification patterns
description: sdk カテゴリでの偽陽性パターンと頻出 issue パターン
type: project
---

## factCheck:env フラグの偽陽性パターン

- sdk-011 は `ANTHROPIC_API_KEY` の語がキーワードヒットして `tier: fact` になったが、内容は正確で全チェック通過。
- `factCheck:env` フラグはキーワードマッチのみで、説明文が正しく使用している場合は偽陽性。
- known-issues の「pre-lint fact tier の実態は keyword hit のみ」パターンと完全に一致。

**How to apply:** sdk カテゴリで `factCheck:env` flagged の問題は、まず内容が正確かを確認してから判定を降ろす。`ANTHROPIC_API_KEY` を正しい答えとして記述している問題は偽陽性の可能性が高い。

## diagram 内部の旧名称残存パターン

- sdk-010: question/explanation/wrongFeedback（options フィールド）は全て `Agent` ツールを正しく使用しているが、diagram の flow/hierarchy の sub テキストに旧名称 `Task` が残存。
- この種の問題は lint では検出されにくく、`tier: quality` の distractor フラグとして現れる。
- diagram は options/explanation とは別フィールドなので、チェック D（内部一貫性）で diagram テキストも必ず確認すること。

**How to apply:** sdk カテゴリの distractor フラグ問題では、diagram の sub テキストまで全て確認する。特に `Task`/`Agent` の混在に注意。

## ビルトインツールリスト（2026-05-08 確認）

agent-sdk/overview の Built-in tools テーブル（10種）:
Read, Write, Edit, Bash, **Monitor**, Glob, Grep, WebSearch, WebFetch, AskUserQuestion

- sdk-009 の diagram で `Monitor` が欠落していた。explanation は正確（10種）だが diagram は9種。
- quiz の diagram がツールリストを列挙する場合は Monitor の有無を必ず確認する。

## 認証環境変数（確認済み）

- `ANTHROPIC_API_KEY` → Anthropic 直接
- `CLAUDE_CODE_USE_BEDROCK=1` → Amazon Bedrock
- `CLAUDE_CODE_USE_VERTEX=1` → Google Vertex AI
- `CLAUDE_CODE_USE_FOUNDRY=1` → Microsoft Foundry（agent-sdk/overview は "Microsoft Azure" と表記するが、正式名は "Microsoft Foundry"）

## sdk-015 wrongFeedback の "Microsoft Azure" 表記（2026-05-09確認）

- sdk-015 wrongFeedback（選択肢B）が "Microsoft Azure" と記述。doc の agent-sdk/overview は「**Microsoft Azure**: set `CLAUDE_CODE_USE_FOUNDRY=1`」と表記しており、doc 表現と一致。
- ただし正式名は "Microsoft Foundry" であり、他の sdk 問題（sdk-011 explanation）では "Microsoft Foundry" を使用。minor-level の不整合。
- 偽陽性パターン: doc が "Microsoft Azure" と書いていても critical 判定しない。minor で報告するにとどめる。

## sdk-006 diagram flow text 分割（2026-05-09確認）

- sdk-006 の flow diagram の steps テキストが文章の途中で分割されている（「サポ」「ートしています：(1) Claude subs」等）。
- diagram の flow type では step.text と step.sub が別行表示になるため、文を分割するのは機能的に問題あり。
- minor（書式不備）として報告する価値あり。
- 2026-05-16 再確認: sdk-006 の flow diagram は「Claude Code 起動」→「認証方法を選択」→「セッション開始」と正常。以前の分割問題は解消済みか、別の diagram だった可能性あり。

## sdk-007 / sdk-013 diagram flow テキスト分割（2026-05-16確認）

- sdk-007 の flow diagram steps が途中で切れている: 「Agent Co」「deと同じツール、エージェントループ、コンテキ」など。
- sdk-013 の flow diagram steps も同様: 「Agent SDKとCLIは同じ機能を持ちま」「すが」等。
- これらは minor（書式不備）として報告。lint では検出されにくい。

## agent-sdk/overview ドキュメント大幅縮小（2026-05-16確認）

- 17.4KB → 8.1KB に縮小。インストールコマンドの直接記載はなくなり quickstart へ誘導。
- ビルトインツール 10 種のテーブルは維持（Read/Write/Edit/Bash/Monitor/Glob/Grep/WebSearch/WebFetch/AskUserQuestion）。
- ANTHROPIC_API_KEY の明示記載はないが、Anthropic 標準変数として正確。
- sdk-008 のインストールコマンド `npm install @anthropic-ai/claude-agent-sdk` はドキュメントに明示されていないが、quickstart に記載されるはずで major とまでは言えない。

## prompt-caching TTL 詳細（2026-05-31 確認）

sdk-016（difficulty: advanced）の正解内容はドキュメントと完全一致:
- Claude サブスクリプション → 自動的に1時間 TTL（プラン内、追加コストなし）
- 枠超過・usage credits → 自動的に5分に降格
- API キー / Bedrock / Vertex / Foundry / Claude Platform on AWS → デフォルト5分 TTL
- `ENABLE_PROMPT_CACHING_1H=1` で1時間に切り替え可能
- `FORCE_PROMPT_CACHING_5M=1` で強制5分（managed settings上書き用）
- サブエージェントはサブスクリプションでも5分 TTL
- キャッシュ保存場所: API key/サブスク/Claude Platform on AWS → Anthropic インフラ、Bedrock/Vertex → 各クラウドプロバイダ
- difficulty:advanced フラグは false-positive（TTL の条件分岐は genuinely advanced）

## Claude Platform on AWS 認証（2026-05-31 確認）

sdk-018（difficulty: advanced）の正解内容はドキュメントと完全一致:
- 方式A: SigV4（標準 AWS 認証チェーン: env vars / ~/.aws/credentials / IAM ロール / SSO）
- 方式B: ワークスペース API キー `ANTHROPIC_AWS_API_KEY`、`x-api-key` ヘッダーで送信、SigV4 より優先、設定時は AWS 認証情報を無視
- SSO 期限切れ → `awsAuthRefresh` にログインコマンドを設定してリトライ可能
- difficulty:advanced フラグは false-positive（2方式の選択と優先順位は genuinely advanced）

## sdk-009 / sdk-010 distractor フラグ（2026-05-31 確認）

- sdk-009（distractor）: ビルトインツールリストが diagram で10種すべて列挙されており事実誤認なし。false-positive
- sdk-010（distractor）: 以前の「diagram に旧名称 Task 残存」の issue は解消済み。現在のすべてのフィールドで `Agent` を正しく使用。false-positive
- sdk-011（factCheck:env）: `ANTHROPIC_API_KEY` が正解として正確に記述。keyword hit による false-positive。これで3回連続 false-positive → sdk カテゴリの factCheck:env は keyword hit パターンのみ

## sdk カテゴリ distractor/difficulty 全 false-positive 記録

2026-05-31 検証: sdk-009, sdk-010, sdk-016, sdk-018 の4問すべて false-positive
sdk カテゴリの distractor/difficulty フラグは過去3回の検証（2026-05-08, 05-16, 05-31）を通じて 100% false-positive

## agent-sdk/overview ページの大幅縮小・スタブ化（2026-09-10確認）

- agent-sdk-overview.md は約82行のみで、ビルトインツール一覧・`query`の`resume`/`session_id`詳細・Hooksの`PostToolUse`設定例・SDK固有の認証詳細などの具体的内容がすべて削除され、比較表＋各サブページへのリンク集（agent-sdk/agent-loop, subagents, mcp, permissions, sessions, skills, hooks, plugins等）に置き換わっている。
- 該当コンテンツの移動先: ビルトインツール一覧 → `tools-reference.md`（Agent SDK/CLI共通）。認証環境変数 → `authentication.md`（"apply to the CLI and the surfaces that wrap it, including... the Agent SDK" と明記）。
- **影響**: sdk-009〜sdk-015（referenceUrl が `agent-sdk/overview` を指す問題群）は、URLの参照先ページに具体的な裏付け記述がもう存在しない状態になっている（check C相当の課題）。ただし内容自体はtools-reference.md/authentication.md等で個別に事実確認でき、sdk-009/010/011は2026-09-10時点でも内容は正確（false-positive維持）。
- **申し送り**: 次回 full スキャン時は sdk-012〜sdk-015 の referenceUrl 更新（`tools-reference`, `agent-sdk/sessions` 等への差し替え）を検討候補としてリード側に提起する。

## sdk-019 Anthropic Console認証のdocドリフト（2026-09-10発見・major）

- third-party-integrations.md比較表のAuthentication行が "API key or a **Console sign-in without one**" に更新されている（authentication.md L60 の profile ベースのキーなしサインインに対応）。
- sdk-019 の options[0].wrongFeedback（Anthropic Console選択肢）が「APIキーによる従量課金の認証方式」とだけ記述しており、キーなしサインインの追加に追従できていない。diagramのcomparison列も同様に更新要。
- correctIndex（Claude for Teams/Enterprise）自体には影響なし。次回スキャンで修正候補。

## sdk-019 SSO表記はTeams/Enterprise両方でOK（false-positive注意）

- third-party-integrations.md L13-22 の比較表は「Claude for Teams/Enterprise」を1列に統合し、Authentication="Claude.ai SSO or email"としている。本文では「Claude for Enterprise adds SSO and domain capture」ともあるが、これはEnterprise専用の“ドメインキャプチャ付きSSO”を指す注記であり、表レベルでのSSO対応自体はTeams/Enterprise両方に及ぶ。sdk-019正解「Claude for TeamsまたはClaude for Enterprise」がSSOを含めて記述している点はfalse-positiveとして扱ってよい（criticalにしない）。

## sdk-001 拡張の段階論とfeatures-overview.mdの再編（2026-09-10発見・major）

- features-overview.md（旧overview.mdの拡張ガイド相当）が大幅改訂され、「Build your setup over time」トリガー表の順序は CLAUDE.md→Skill(x2)→MCP→Code intelligence→Subagent→Hook→Plugin。MCPがSubagentより先。
- Agent SDKはこの拡張機能一覧（CLAUDE.md/Skills/Code intelligence/MCP/Subagents/Dynamic workflows/Cross-session messaging/Hooks/Plugins）に含まれない。agent-sdk-overview.mdでは「Claude Code拡張の最終段階」ではなく、CLI/Client SDK/Managed Agentsと並ぶ別製品として比較されている。
- sdk-001の「Skills→Sub-agents→MCP→Agent SDK」4段階論は現行docsの構成と食い違う（correctIndex自体は4択中で妥当だが前提のnarrativeがstale）→ major + needsOpusReview:true で報告。

## sdk-003 認証プロバイダの列挙drift（2026-09-10発見・major）

- third-party-integrations.md 比較表が6列に拡張: Claude for Teams/Enterprise, Anthropic Console, Amazon Bedrock, **Claude Platform on AWS**（新規独立列）, Google Cloud's Agent Platform(旧Vertex AI), Microsoft Foundry。
- sdk-003の「認証方法は5つです」（サブスク/Console/Bedrock/Vertex/Foundry）はClaude Platform on AWSが欠落。correctIndex（GitHub非対応）自体は影響なし→ major。
- 同様の「N個」列挙をするsdk/authカテゴリの他問題も次回スキャンでClaude Platform on AWS欠落を確認すること。

## agent-sdk-overview.md 完全スタブ化の再確認（2026-09-10、前回記録の追認）

- agent-sdk-overview.mdは「Compare the Agent SDK to other Claude tools」表（Agent SDK/CLI/Client SDK/Managed Agentsの4製品比較）のみで、ビルトインツール一覧・session/hooks詳細は他ページに分散済み（前回記録と一致、変化なし）。
- sdk-004/005/007/008/012/013/014/015/017 は個別に照合し全てfalse-positive（事実は正確）。sdk-013/015の「CLIは対話的開発、SDKはCI/CD・本番自動化」という二項対立は、新表に'Managed Agents'という第3の選択肢（長時間/非同期エージェントをインフラ管理なしで）が加わっているが、quizの4択にManaged Agentsが登場しないため現時点では問題化しない。次回Managed Agents関連の設問が追加された場合はこの新製品を踏まえて検証すること。

## sdk-017/014 は完全一致確認（2026-09-10）

- sdk-017: claude-platform-on-aws.md と完全一致（CLAUDE_CODE_USE_ANTHROPIC_AWS=1, ANTHROPIC_AWS_WORKSPACE_ID必須, base URL=https://aws-external-anthropic.{region}.api.aws, Bedrock/Foundry優先のため解除要）。
- sdk-014: hooks.mdの matcher表で「PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied | tool name | Bash, Edit|Write, mcp__.*」と完全一致。
