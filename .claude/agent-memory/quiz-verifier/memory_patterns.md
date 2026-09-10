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
