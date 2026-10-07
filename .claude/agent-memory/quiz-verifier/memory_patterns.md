# Memory カテゴリ検証パターン

## Server-managed settings の承認記録は2categoryではなく3category（2026-09-10 発見, mem-093）
- server-managed-settings.md #security-approval-dialogs の Approval memory 節は
  claude.aiログイン／**Claude apps gatewayサインイン**／その他の資格情報（APIキー・`CLAUDE_CODE_OAUTH_TOKEN`）
  の **3カテゴリ**に分かれている。
- 「claude.aiログイン vs それ以外の資格情報」の2分法で問題を作ると、Claude apps gateway を
  「それ以外の資格情報」に含めてしまい drift が起きやすい。Gateway は独自の挙動:
  - 1ゲートウェイにつき1承認（`/logout`で削除されるとは明記されていない）
  - 同一ゲートウェイへのサインアウト→再サインインでは設定が変わらない限り再表示されない
  - 別ゲートウェイへのサインイン・証明書変更・設定変更時のみ再表示
  - ループバック開発ゲートウェイ（平文HTTP）は承認を保存しない＝毎回再表示
- 「その他の資格情報」（APIキー等）はキャッシュと一緒に保存され `/logout` でキャッシュごと削除される点が Gateway と異なる。
- 検証時は「claude.aiログイン vs それ以外」という2分法の設問文自体が資格情報の分類を正しく反映しているか確認すること。

## CLAUDE.md ロード範囲は「ファイルシステムのルート」まで（git ルートではない）
- memory.md「How CLAUDE.md files load」: "current working directory and every directory above it" とのみ記述。
  gitリポジトリのルートに限定する記述はない。
- mem-012 の wrongFeedback は正しく「ファイルシステムのルートまで」と記述。
- ダイアグラムsubなどで「gitルートまで」という表現を見たら doc drift の可能性（mem-036 flow diagram で発見・修正提案済み）。

## Verified facts（2026-09-10、docs個別ファイルで確認済み）
- `autoMemoryDirectory`: user/project/local/policy/`--settings`の任意スコープ。プロジェクト/ローカル設定はhooksと同じworkspace trustゲート（memory.md L187: "under the same workspace trust rule as hooks in settings files"）。値は絶対パスか`~/`始まり。
- `.claude/rules/` の `paths` ブレース展開: ルール全体で展開後1,000パターン・4MiB共有予算。超過分は未展開のまま（リテラルブレースは何にもマッチしない）。v2.1.217より前はCLIがスタール/クラッシュしていた。
- `.claude/rules/` の `paths` の無効な `[` パターン: 「何もマッチしない」として扱われるのみ（他パターンや同ファイルの他ルールに影響しない）。v2.1.207より前はRead失敗を引き起こしていた。
- `claude project purge`: projects/配下のトランスクリプト+自動メモリ、セッションごとのtasks/debug/file-history、history.jsonl内の一致行、~/.claude.json内のプロジェクトエントリを削除。shell-snapshots/とbackups/は対象外（プロジェクトスコープでないため）。
- retention sweep（`cleanupPeriodDays`）: 安全に決定できない場合は一時停止。原因が設定ファイル読込/パース失敗、または`cleanupPeriodDays`明示設定時の設定エラーなら`/status`に警告表示。managed settingsが値を配信していればその値で実行される（一時停止条件に関わらず）。
- サーバー管理設定フェッチのスキップ: `CLAUDE_CODE_USE_VERTEX`等のサードパーティプロバイダ変数や非デフォルト`ANTHROPIC_BASE_URL`がシェルでexportされているとフェッチ自体がスキップされ、管理設定の`env`ブロックではクリアできない（そのブロック自体がスキップされるフェッチ経由のため）。復元にはシェルのexport削除、またはユーザー設定`env`ブロックでの空文字列指定（eligibilityチェックより前に適用）が必要。
- `--append-system-prompt` はシステムプロンプト末尾に追記、`--system-prompt`はシステムプロンプト全体を置換。CLAUDE.mdはシステムプロンプトではなくシステムプロンプト後のユーザーメッセージとして配信される（memory.md L209）。

## distractor-tier（quality）の傾向
- 2026-09-10 実行分: mem-060/070/087/088/089/092/093/094 の distractor フラグはすべて事実誤認なし（長さ不均衡のみ）。
  mem-070 は選択肢が「A と B」等の短い組み合わせ選択のため lint の短文フラグは構造的な誤検出（combination-style選択肢は短くて当然）。

## /memory と /context の役割ドリフト（2026-09-10 発見、known-issues.md記載を覆す）
- **旧known-issues.md「/memoryと/contextの役割の違い」セクション（2026-04-05確定）は現在stale**。当時は「CLAUDE.mdが読み込まれているか確認する」問題に`/context`を正解として使わないよう指示していたが、
  現行memory.mdは逆にTroubleshootセクションで`/context`を読み込み確認の第一手順として明示している:
  > "Run `/context` and check the list under **Memory files** to verify your CLAUDE.md and CLAUDE.local.md files loaded... Use `/memory` to open and edit the files."（memory.md L211。同内容がL59, L85, L201にも一貫して記載）
- `/memory`コマンドは「候補ロケーション一覧（存在しないファイルのエントリも含む）＋編集＋Auto Memoryトグル」用であり、「現在読み込まれているか」の確認には**不向き**と明記されている（L201: "including... entries for files that don't exist yet"）。
- この逆転はmem-058, mem-063, mem-075（デバッグ手順の正解）、mem-049, mem-057（/memoryの機能説明）の計5問に影響。次回検証時は「/memoryが読み込み確認の正解」という判定をデフォルトにしないこと。ドキュメントの実際の文言を都度再確認する。

## サーバー管理設定の承認カテゴリ 3→5（2026-09-10）
- server-managed-settings.md の Security approval dialogs は現在5カテゴリ: Shell command settings, **Sandbox binary settings**（`sandbox.bwrapPath`/`sandbox.socatPath`/`sandbox.ripgrep`, v2.1.251前後で追加）, **Sandbox network and isolation settings**, Custom environment variables, Hook configurations。旧「3カテゴリ」記述は古い。
- 管理対象`CLAUDE.md`（`claudeMd`キー）は**v2.1.260以降、承認不要**になった（"it's instruction text for Claude rather than a command Claude Code runs"）。旧「管理対象CLAUDE.mdも承認ダイアログ対象」は古い。

## policyHelper とサーバー管理設定の優先関係（2026-09-10 critical）
- server-managed-settings.md L68: "Claude Code doesn't consult a `policyHelper` configured in MDM or file-based settings while server-managed settings deliver a policy key."
- `policyHelper`はMDM/ファイルベース（エンドポイント管理設定）側のみで構成可能な仕組み。サーバー管理設定が何らかのポリシーキーを配信している間は**一切参照されない**。`policyHelper`が使われるのは、サーバー管理設定が何も配信せず、エンドポイント管理設定側が管理ティア内で選択された場合のみ。
- 「policyHelperが常にサーバー管理設定より優先される」という記述は誤り（優先関係が逆）。

## CLAUDE.md ロード順序の表現（2026-09-10, 要watch）
- memory.md L46: CLAUDE.mdスコープの並びは「load order, from broadest scope to most specific」で **Managed → User → Project → Local**（表の行順）。「a project instruction appears in context after a user instruction」と明記。
- L89: 「All discovered files are concatenated into context rather than overriding each other」— settings.jsonのような厳密な上書き優先順位とは異なる仕組み。
- 「CLAUDE.mdの優先順位はManaged > Project > User > Localの4段階」という説明は、実効的な重み付け（後に読まれる＝より具体的＝優先度が高い）としては妥当な可能性が高いが、根拠となる一次ドキュメントの文言が「load order」であり「priority」という直接表現ではない点に注意。今後の検証でこの言い回しを見たら再確認すること。

## "YOU MUST" の根拠消失（2026-09-10）
- best-practices.md, memory.md を全文grepしたが「YOU MUST」という文字列は現行ドキュメントに一切出現しない。現在の推奨は「IMPORTANT」を該当1行だけに付けることのみ（best-practices.md L93）。
- 過去のquiz・known-issues.mdで「IMPORTANT」「YOU MUST」の2例をセットで正解としている問題は要再確認（doc drift）。

## /init の AGENTS.md 読み込みは CLAUDE_CODE_NEW_INIT=1 が条件（2026-09-10）
- memory.md L85: デフォルトの`/init`はCursor rules・Copilot rulesのみ読む。`AGENTS.md`, `.devin/rules/`, `.windsurf/rules/`, `.clinerules`の読み込みには`CLAUDE_CODE_NEW_INIT=1`環境変数が必要。
- 「/initを実行するとAGENTS.mdが自動的に取り込まれる」という無条件の説明は不正確。

## settings.local.json の gitignore 表現の許容度（2026-09-10, 偽陽性注意）
- settings.md L46は「adds it to your global git excludes file」（プロジェクトの.gitignoreではない）と厳密に記述する一方、claude-directory.md L105は同じ挙動を「gitignored when Claude Code saves a setting to it」と口語的に表現している。
- quizが「自動的にgitignoreに追加する」と書いていても、ドキュメント自身がこの緩い言い回しを使うため、機械的に誤りと断定しない。より確実な論点は「自動的に」が無条件ではなく「Claude Codeが最初に書き込む時」に限られる点（手動作成済みファイルは対象外）。

## 2026-09-29 全問監査で判明した doc drift
- `.claude/rules/`: user-level と project ルールは「上書き関係なし」（user が先、project が後に読まれるだけ、競合時はどちらに従うか不定）。「project が常に優先」は誤り（mem-013 critical）。CLAUDE.md スコープも priority でなく load order（Managed→User→Project→Local）。mem-025/045 は priority 表現が残存。
- AGENTS.md: v2.1.277+ で CLAUDE.md/CLAUDE.local.md が無ければ AGENTS.md を既定で直接読む。`@AGENTS.md` import が必要なのは CLAUDE.md 併存 / `claude-md` 設定 / 非対応セッション。/init が AGENTS.md を取り込むのは `CLAUDE_CODE_NEW_INIT=1` 時のみ（mem-077 critical）。
- サーバー管理設定: サインイン起動では最大5秒フェッチを待ち、間に合えば初画面から適用（mem-042/038 の「初回は非同期」は要修正）。
- 共有ルールを承認なしでロードする文書化された方法は `~/.claude/rules/`（mem-026 の distractor が有効になり得る）。symlink のターゲットが作業ディレクトリ外だと外部 import 承認が必要。
- `claude project purge` の確認省略は `--yes`（`-y` は docs に無い）。`--dry-run` は実在。
- ローカルキャッシュ（.claude/tmp/docs）は code fence が脱落する。コマンド/フラグ/`/init` 文言は live `https://code.claude.com/docs/en/<page>.md` を curl して確認する。
- mem-039 系の「first-wins で他ソース完全無視」は例外キー（enableArtifact 等）を無視した言い過ぎ。

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

## memory カテゴリ 13問検証（2026-08-13, mem-092/093/094 新規追加）

### mem-092（retention sweep一時停止条件）検証済み・OK
- claude-directory.md 'Cleaned up automatically' 節: "if Claude Code can't safely determine the retention period, it pauses the retention cleanup sweep...When the cause is a settings file that can't be read or parsed, or settings errors with cleanupPeriodDays explicitly set, Claude Code also shows a warning in /status until you fix the settings errors. When managed settings provide cleanupPeriodDays, Claude Code runs the sweep at the managed value in either case." と correctIndex=3 が一字一句一致
- `cleanupPeriodDays=0`はバリデーションエラーになる仕様（"setting 0 fails with a validation error"）も正確
- referenceUrl `#cleaned-up-automatically` は実サイトで有効確認済み

### mem-093（サーバー管理設定の承認記録方法）検証済み・OK
- server-managed-settings.md 'Approval memory' 節: claude.aiログイン="one approval per organization, held by the account that approved most recently"、それ以外の資格情報="one approval for the delivered settings, kept with the cached copy...shows the dialog again when the settings...change, and after /logout"
- 別アカウントで同一組織にサインインすると再表示される点も "shows the dialog again even when the settings are unchanged" と一致
- referenceUrl `#security-approval-dialogs` は実サイトで有効確認済み

### mem-094（paths のブレース展開予算超過時の挙動）検証済み・OK
- memory.md 'Path-specific rules' 節: "a rule's whole paths list shares one budget of 1,000 expanded patterns and 4 MiB, and patterns without braces don't count against it. Claude Code uses any pattern that would exceed the budget unexpanded, and its literal braces match no files. Before v2.1.217, a paths value with many brace groups stalled or crashed the CLI at startup." と correctIndex=1・option[2]のv2.1.217前挙動まで完全一致

### 既存10問（mem-012/030/036/037/060/061/070/087/088/089）は前回検証から内容変更なし
- correctIndex・referenceUrl とも前回確認時と同一。再検証省略し前回結果（mem-070のみinfo、他はok）を再利用

## memory カテゴリ 13問検証（2026-08-19, distractor長さバランスをminorとして報告する回）

### タスク指示によるseverity方針の変化に注意
- 通常はdistractor長さバランス(correct-too-long/too-short)はseverity:info（checklist.md H節）だが、依頼元が明示的に「純粋な長さバランスはminorとして書き直し案を含めて報告」と指示するケースがある
- この場合は事実面が正確でも指示に従いminorで報告し、具体的な圧縮/短縮の書き直し案を添える。事実誤りではないため needsOpusReview は false のまま
- mem-060/087/088/089/092/093/094の「正解が不正解平均の2倍以上」は全て「シナリオ診断型の設問で正解が条件分岐・根拠説明を含むため必然的に長くなる」という共通パターン。事実面はいずれも正確（既に複数回ドキュメント一致を確認済み）

### mem-070の distractor too-short は形式起因（要注意: 安易に書き直し提案しない）
- A/B/C/Dの組み合わせ回答形式（「AとC」等）の問題は、正解自体も短いため相対的不均衡ではなく形式上の絶対的な短さ。無理に選択肢を長文化する書き直しは可読性を損なうため非推奨と明記すること

### mem-093のformat-giveaway（バッククォート非対称）とE節の衝突
- 正解のみ`/logout`をバッククォート表記し不正解はプレーンテキストというformat-giveawayをlintが検出するケースがあるが、`/logout`はスラッシュコマンドでありchecklist.md E節（スラッシュコマンドはバッククォート必須）に従えばバッククォート自体は正しい書式
- この場合、giveaway解消のためにバッククォートを除去するのはE節違反になるため非推奨。代わりに他の不正解選択肢に(存在するなら)技術用語を追加してバランスを取る方向を推奨する
