# Session カテゴリ検証パターン

## 2026-07-16: モデルラインナップ更新による doc ドリフト（Sonnet 5 登場・Fast Mode縮小・default変更）

> この節の値は 2026-07-16 時点のもの。Fast mode 対応モデルなどその後の変更は `docs/verified-facts.md` を正とする。

fetch-docs.mjs で 2026-07-15 キャッシュを取得したところ、model-config.md / fast-mode.md に以下の変更が確認された。既存の quiz（ses-045, ses-102, ses-103, ses-108）は旧モデルラインナップのまま更新されておらず、explanation/wrongFeedback/diagram に古い記述が残っている。**correctIndex 自体は全て妥当**なので critical ではないが、major として要修正。

### 事実確認済み（model-config.md, 2026-07-15キャッシュ）
- **effort levels**: `Fable 5` `low/medium/high/xhigh/max`、**`Sonnet 5, Opus 4.8, Opus 4.7`も同じ5値**、`Opus 4.6, Sonnet 4.6` は `low/medium/high/max`（xhighなし）
- **デフォルトeffort**: `high` on Fable 5, **Sonnet 5**, Opus 4.8, Opus 4.6, Sonnet 4.6。`xhigh` on Opus 4.7 のみ
- **`default` モデル設定**: Max/Team Premium/Enterprise PAYG/API = Opus 4.8、**Claude Platform on AWS/Amazon Bedrock/Google Cloud's Agent Platform = Opus 4.8**（v2.1.207以降）、**Pro/Team Standard/Enterprise subscription seats = Sonnet 5**（旧 Sonnet 4.6 から更新）、Microsoft Foundry = Sonnet 4.5
  - v2.1.207 以前は AWS=Opus 4.7、Bedrock/Vertex=Sonnet 4.5 だった（既に past known-issues に反映済みの旧情報）
- **Fast mode**: "Fast mode is supported on Opus 4.8 and Opus 4.7. It is not available on Sonnet, Haiku, or other models." → **Opus 4.6 が Fast mode 対応から外れた**（pricing table も 4.8/4.7 のみ掲載）。旧 known-issues/quiz の「Opus 4.8/4.7/4.6専用」は stale

### 個別問題への影響
- **ses-045（major）**: explanation の "xhigh（Fable 5 / Opus 4.8 / Opus 4.7）" と "デフォルトはOpus 4.7では`xhigh`、Fable 5 / Opus 4.8 / Opus 4.6 / Sonnet 4.6では`high`" は **Sonnet 5 が欠落**。correctIndex（low,medium,high,xhigh,max,auto の6値）自体は正しい
- **ses-102（major）**: explanation の "xhigh は Fable 5 / Opus 4.8 / Opus 4.7 のみ対応" 等も同様に **Sonnet 5 欠落**。question自体は Opus 4.6 限定なので影響は補足説明部分のみ
- **ses-103（major）**: wrongFeedback「Sonnet 4.6はProプラン、Team Standard、Enterpriseサブスクリプションのデフォルトです」と diagram matrix の "Pro/Team Standard"→"Sonnet 4.6" は **Sonnet 5 に更新が必要**。correctIndex（Opus 4.8 for Max/Team Premium）は変わらず正しい
- **ses-108（major）**: explanation「Fast モードは Claude Opus（4.8 / 4.7 / 4.6）専用」の **4.6 は現在誤り**（fast-mode.md で明示的に除外）。correctIndexの選択肢自体（バージョン非言及）は影響なし

### 注意
- これらは「新モデル追加を見落とした」既存パターン（Opus 4.8追加時にも同じ指摘が繰り返された。known-issues.md L230-236参照）の再発。generate-quiz-data 時にモデルライン参照を都度更新する運用が必要
- 次回検証時、model-config.md の "Available models" セクションと effort levels テーブルを都度再フェッチして比較すること（Sonnet 5 のような新モデルはここに先に反映される）

## ses-112 の Preview ドロップダウン名称（minor, 2026-07-16確認）
- desktop.md L274: "toggle it from **the server dropdown menu**"（"Preview" ではなく "server" ドロップダウン）
- quiz の「Preview ドロップダウンメニュー」は用語がやや不正確。深刻ではないが用語統一の際は "server dropdown" に寄せる

## Verified OK（2026-07-16 再確認、docドリフトなし）
- ses-007, ses-025, ses-027（defaultMode 6値）, ses-030, ses-048, ses-100, ses-107（PreCompact trigger）, ses-117, ses-141（macOS Keychain）, ses-145, ses-152（modelOverrides）, ses-153, ses-154, ses-189（--continue/--resume/--from-pr）, ses-190（prompt caching invalidation）, ses-197（Claude apps gateway）, ses-199（Auto Mode 第三者プロバイダ制限 v2.1.207）は全て feature-availability.md/gateways.md/prompt-caching.md/model-config.md の現行記述と一致

## session カテゴリ検証パターン（2026-05-23）

### Fast Mode フォールバック先の表現
- fast-mode.md: "falls back to standard speed on the same Opus version"（同じ Opus バージョン）
- Fast Mode の対応モデルはモデル追加のたびに入れ替わる（現行値は `docs/verified-facts.md` の Fast mode 節）。Fast Mode 問題では Opus バージョンを固定しない表現になっているか確認する

### Fast Mode の利用条件
- fast-mode.md: "Not available on third-party cloud providers: Bedrock, Vertex AI, or Microsoft Azure Foundry"
- docs には "Microsoft Azure Foundry" と "Microsoft Foundry" が混在するが、プロジェクトの正式表記は「Microsoft Foundry」（`topic-config.mjs` の TERMINOLOGY_DICT）。docs の冗長形に合わせる提案は false-positive

### PreCompact trigger フィールド
- hooks.md L154/L2039-2040: trigger は "manual"（/compact 実行）と "auto"（コンテキストウィンドウ満杯時）の 2 種類
- これは Verified。ses-107 は正解

### CLAUDE_CODE_USE_BEDROCK と CLAUDE_CODE_USE_VERTEX
- env-vars.md に明記。値は =1（整数、=true ではない）
- ses-030 の正解記述 "=1" は正確

### effortLevel の設定ファイル記述
- settings.md L179: 'effortLevel' accepts "low", "medium", "high", "xhigh"（max は受け付けない）
- model-config.md L171: 'max is session-only and is not accepted here'

### xhigh 対応モデル
- Opus 4.6 / Sonnet 4.6 は xhigh 非対応（指定すると high にフォールバック）。対応モデルは新モデル追加のたびに変わるため、`docs/verified-facts.md` の effort 節と model-config.md の表で毎回確認する（「Opus 4.7/4.8 のみ」「Opus 4.7 専用」は stale）

### distractor tier の全問は偽陽性（17問中17問）
- session カテゴリの quality:distractor フラグ問題は全て事実誤認なし
- 品質（distractor の長さ/書式）の問題だが修正優先度は低い

### autoVerify 設定
- .claude/launch.json の `autoVerify: false` または Preview ドロップダウン
- CLAUDE_AUTO_VERIFY 環境変数は存在しない（ses-112 正解確認済み）

## ses-102 での xhigh 表現の誤り（2026-05-29 確認）
- model-config.md L146: `xhigh` は「Opus 4.8 and Opus 4.7」でサポート（Opus 4.7専用ではない）
- ses-102 explanation と wrongFeedback の「`xhigh` は Opus 4.7 専用です」は Opus 4.8 を見落とした誤記 → major
- 正確には「`xhigh` は Opus 4.7/4.8 でサポート。Opus 4.7 のデフォルト。Opus 4.8 のデフォルトは `high`」
- ses-102 explanation でのモデルリスト「Opus 4.7 / Opus 4.6 / Sonnet 4.6」からも Opus 4.8 が欠落 → major

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
