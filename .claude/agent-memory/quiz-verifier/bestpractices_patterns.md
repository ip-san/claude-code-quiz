# Bestpractices カテゴリ検証パターン

## bestpractices カテゴリ検証パターン（2026-09-10, bp-004/018/037/066/084/095/098-100/102/105-109/112/115/116/122）

## advisor.md の非対応プロバイダが3→4に増加
- advisor.md Requirements: 'not available on Amazon Bedrock, Claude Platform on AWS, Google Cloud's Agent Platform, or Microsoft Foundry'
- **Claude Platform on AWS が Amazon Bedrock とは別の独立プロバイダとして追加されている**（model-config.md のデフォルトモデル表でも両者は別行）
- bp-102 が旧来の3プロバイダ（Bedrock/Vertex AI/Foundry）のみ列挙 → Claude Platform on AWS が欠落（major）
- 'Google Vertex AI' vs 'Google Cloud's Agent Platform' の呼称ドリフトは既知 false-positive（known-issues.md 記載）。指摘不要

## artifacts.md: `/artifacts`（複数形）コマンドで別セッションから既存artifactを更新可能
- 'To update an artifact from a different session, give Claude its URL, or attach it with `/artifacts`.'（v2.1.208+）
- URL を渡す方法だけが唯一の手段ではなくなった。`/artifacts` で一覧表示→Enterで現在セッションに添付、が正規の代替手段
- bp-105 の distractor『`/artifact resume` コマンドで過去の artifact 一覧から選び直す』の wrongFeedback『そのようなコマンドはありません』は現在は不正確（`/artifacts` という類似コマンドが実在）→ major

## artifacts.md Page constraints: CSPは「外部スクリプト/フォント全面禁止」ではなくCDN許可リストあり（重要drift）
- 'The page can load typefaces from Google Fonts, and scripts from four public CDN hosts (cdnjs, the Tailwind and jQuery CDNs, and selected paths on jsDelivr)'
- 'The CSP blocks every external image and all other external scripts, stylesheets, and fonts' — **画像は完全禁止だが、スクリプト/フォントは名指しの4CDN+Google Fontsのみ許可**
- fetch/XHR/WebSocket も『ページ自身のオリジン + Google Fontsホスト』には到達可能（完全禁止ではない）
- bp-107 の correctIndex が「外部スクリプト・画像・フォント...が禁止される」と全面禁止を主張しており事実と異なる → critical（要リライト、needsOpusReview推奨）
- 今後 artifacts 関連の CSP/ページ制約問題は必ず Page constraints 表の最新文言（cdnjs/Tailwind/jQuery CDN/jsDelivr, Google Fonts）を確認すること

## artifacts.md 無効化設定: disableArtifact は非推奨（deprecated）、enableArtifact が現行キー
- 'Settings file | Set "enableArtifact": false. The deprecated "disableArtifact": true also turns artifacts off'
- `/config` の Artifacts トグルが現行の推奨手段として先頭に記載（内部で enableArtifact: false を書く）
- bp-108 が `disableArtifact: true` のみを挙げ `/config` と `enableArtifact` に触れていない → major（動作はするが最新の推奨手段が欠落）
- artifact 無効化系の問題は今後 `/config` トグル + `enableArtifact`（非推奨 `disableArtifact` も可）+ env var + permissions.deny の4系統を確認する

## admin-setup.md: Desktop WSL セッションは managed settings 存在時デフォルト無効
- '### WSL sessions in Claude Code Desktop': 'On devices where managed settings are present, Desktop WSL sessions are unavailable by default. If your organization wants to enable them, contact your Anthropic account team.'
- wslInheritsWindowsSettings: true は必要条件だが十分条件ではない（Desktop WSL セッション自体の有効化がまず必要）
- bp-116（Claude Code Desktop の WSL セッション限定の設問）はこの前提条件が完全に欠落 → major, needsOpusReview
- WSL関連の管理者ポリシー問題は「CLIのWSL」と「Desktop の WSL セッション」の区別に注意。Desktop 限定なら上記の追加前提を必ず確認

## effort level 設定方法（model-config.md, 2026-09-10確認）: 現在7手段
- /effort コマンド, /model スライダー, --effort フラグ, CLAUDE_CODE_EFFORT_LEVEL 環境変数, Settings(modelSettings/effortLevel), **Remote Control 接続デバイスのeffortコントロール**, **Skill/subagent frontmatter の effort フィールド**
- 旧known-issues記載の「5種」は Remote Control と frontmatter が欠落。ただし bp-018 の他の記述（xhigh対応モデル一覧、Opus4.6/Sonnet4.6のみmaxまで、MAX_THINKING_TOKENS=0の Fable例外）は2026-09-10時点のdocsと完全一致 → minor（列挙不足のみ）
- effort level テーブル: Opus4.6/Sonnet4.6は`low/medium/high/max`（xhigh非対応）、Fable5.1/5とOpus5/Sonnet5/Opus4.8/4.7は`low/medium/high/xhigh/max`

## 確認済み・問題なし（fact tier含む, 2026-09-10）
- bp-037 kitchen sink: best-practices.md L267 と完全一致
- bp-084 quickstart: quickstart.md Step3 'cd your-project && claude' と一致
- bp-066 check-tools: cloud-environments.md L141「shell command, not slash command」と一致、Installed toolsテーブルも一致
- bp-095 /deep-research: workflows.md「唯一のbuilt-in workflow」と一致
- bp-098 workflows組織無効化: workflows.md『disableWorkflows』『管理コンソール』完全一致
- bp-099/100 advisor基本動作・永続設定3方式: advisor.md と完全一致
- bp-106 artifact共有範囲（Pro/Max=公開リンクのみ、Team/EnterpriseはOwner有効化）: 一致
- bp-109 1M context entitlementエラー: errors.md と完全一致
- bp-112 claude-security パッチ生成3条件: claude-security.md と完全一致
- bp-115 auto mode classifier: glossary.md と完全一致（6パーミッションモードも確認済み）
- bp-122 リトライ可否タイミング: errors.md Automatic retries と完全一致

## 追加検証（2026-09-10, bp-001/002/003/005-008/011-017/020-027/029-032/036/041/043/044/046-065/067-081/082/083/085-097/101/103/104/110/111/113/114/117-121）

### auto mode非対話（-p）フォールバック: 「中止する」は誤り、正しくは「スキップして継続する」（重要drift, 2件）
- permission-modes.md「When auto mode falls back」: 'a non-interactive -p run without a --permission-prompt-tool has no prompt to fall back to. When repeated blocks reach a threshold, the action doesn't run and Claude keeps working, in the main conversation and in its subagents alike... Claude Code doesn't stop the run in either case.'
- errors.md「Auto mode cannot determine the safety of an action」の classifier context window超過ケースも同様: 'there is no prompt to fall back to, so the action doesn't run and the run continues'（バックグラウンドサブエージェントも 'and the run continues'）
- bp-073・bp-120 はいずれも「非対話モードではランが中止される」という誤った前提を持つ（旧仕様は中止だったが、現行docsは明確に「スキップして継続」に変更されている）。**今後 auto mode + 非対話(-p)の挙動を問う問題は必ずこの「continues」文言を確認すること**

### artifacts.md: MCPコネクタ経由の閲覧時データ取得（v2.1.209+）を見落とすと「APIコール一切不可」が誤りになる
- 'its only path to outside data when someone views it is calling MCP connectors'
- 'An artifact can call MCP connectors each time someone views it... require Claude Code v2.1.209 or later'
- 「フォーム入力保存・閲覧時API呼び出し・複数ルート提供はできない」という説明は、閲覧時のMCPコネクタ呼び出しという例外を無視した過度な断定（bp-104, major）

### security.md「curl/wgetのデフォルトブロック」表現ドリフト
- 現行: 'not auto-approved by default. In Manual mode they prompt like any other non-read-only Bash command...To block them entirely, add them to permissions.deny'
- 「デフォルトブロック」ではなく「デフォルトで確認プロンプトが出る（承認すれば実行できる）」に変化。完全ブロックには明示的な permissions.deny 追加が必要（bp-064, major）

### best-practices.md「中断を減らす方法」の数: 現在は明示的に「2つのツール」（auto modeは別枠）
- 'Two tools cut those interruptions in Manual mode and apply in auto mode as well: Permission allowlists... Sandboxing...'
- auto mode自体はManual/Autoという起動モードの一方として別途説明されており、「中断を減らす3つの方法」として明示的に数えられているのは2つのみ（bp-080, major, needsOpusReview）

### 確認済み・問題なし（2026-09-10, 深堀り検証）
- bp-050 MCP context: Tool Search機能デフォルト有効（mcp.md L600, L586-588）+ 遅延読込の説明は現行と整合
- bp-052 CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 1-100%、50で早期発動、env-vars.md L61と完全一致
- bp-067 ConfigChangeフック: hooks.md/hooks-guide.mdと完全一致
- bp-072/073(前半)/bp-119/bp-120(前半) auto mode基本動作・3回連続or20回総計しきい値・workflow同時実行16エージェント上限: permission-modes.md L280, workflows.md L190と一致
- bp-096/097 ultracodeキーワード(v2.1.160)・workflowサブエージェントのacceptEditsモード: workflows.md L73,L113と一致
- bp-101/103 advisorモデルペアリング表(Opus4.7以降同士許容, Fable5.1/5の版指定)・CLAUDE_CODE_DISABLE_ADVISOR_TOOL: advisor.md L50-64, L121と完全一致（細かいランク表まで正確、直近改訂追従済み）
- bp-056-059/070 analytics.md 帰属判定(1行以上/正規化後20%閾値)・ダッシュボード指標・Owner+GitHub org admin・ZDR時の貢献メトリクス無効化: analytics.md, zero-data-retention.mdと一致
- bp-060/061/063/069/071 security.md 書込境界(起動フォルダ+サブフォルダ)・WebFetch分離コンテキスト・クラウドセッションVM分離+push制限・WebDAVリスク・RemoteControlローカル実行: 一致（WebDAV記述は .claude/tmp/docs/security.md のアセンブル版では欠落していたが、ja公式ページのライブ取得では存在を確認 — assembled docsキャッシュの欠落であり doc drift ではない。今後WebDAV関連を検証する際は assembled cache だけでなく `curl https://code.claude.com/docs/ja/security` のライブ取得も併用すること）
- bp-088 admin-setup.md permissions.allow/deny のスコープ間マージ(削除不可・追加可): 一致
- bp-089/117 zero-data-retention.md: Chat on claude.aiのZDR対象外・Cloud sessions/Remote Control/Feedback自動無効化・Fable 5とbestエイリアスのOpusフォールバック: 一致
- bp-091-094 large-codebases.md: settings.json非継承・worktree.sparsePaths・additionalDirectories vs --add-dir・OTEL_LOG_TOOL_DETAILS+skill_activated: 一致
- bp-111/113 claude-security.md: 多層防御スタック(Security guidance=セッション内, Claude Security plugin=オンデマンド深部スキャン)・差分スキャンはコミット済みのみ対象(gitリポジトリ必須、フルスキャンは無版管理でも可): 一致
- bp-121 large-codebases.md claudeMdExcludes: 静的リストでタスクスイッチ用途ではない、管理ポリシー由来CLAUDE.mdは除外不可: 一致
- bp-087/110 errors.md ECONNREFUSED(Docker/VPN stale utun/resolv.conf)・apiKeyHelper優先順位: 一致
- bp-074 interactive-mode.md /btw: ツール利用不可・会話履歴に入らない・Claude作業中でも利用可: 一致

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

## bp-018 の xhigh 表現誤り（2026-05-30 確認）
- bp-018 の correctIndex=1 option text、explanation、option[2] wrongFeedback、diagram[0] に「`xhigh` は Opus 4.7 専用」と記述
- model-config.md L146: `xhigh` は「Opus 4.8 and Opus 4.7」でサポート → 「Opus 4.7 専用」は major issue
- 正確には「`xhigh` は Opus 4.7 / Opus 4.8 でサポート（Opus 4.7 のデフォルト、Opus 4.8 のデフォルトは `high`）」
- 質問文自体が「Opus 4.7/Opus 4.6/Sonnet 4.6」スコープなので Opus 4.8 省略は質問本体としては意図的
- しかし「Opus 4.7 専用」という表現が事実として誤り。正しくは「Opus 4.7/4.8 でサポート」
