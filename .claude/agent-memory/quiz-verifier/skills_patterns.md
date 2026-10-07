# Skills カテゴリ検証パターン

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

## skills カテゴリ追加検証パターン（2026-09-10, skill-061/064/065/076/078/079/080/088/089/093）

### skill-088 run_in_background の断定表現（Major, needsOpusReview）
- sub-agents.md「Run subagents in foreground or background」: サブエージェント定義の `background: true` は無条件でエラー。一方 `run_in_background: true` は「fork modeがオフでバックグラウンドタスクを無効化していない」場合のみエラーになる条件付き
- agent-teams.md L299: 「A teammate's run_in_background: true request also fails, either with an error or by running silently in the foreground」と明記。エラーと静かなフォアグラウンド実行の2パターンがある
- skill-088 の正解/explanationは両方とも一律「エラーになる」と断定 → 結論（フォアグラウンド限定）自体は正しいが run_in_background の条件分岐が抜けている

### skill-080 の /doctor バージョン主張は深掘りで正しいと確認（誤検出回避の実例）
- 一見 changelog.md だけを見ると「disableBundledSkills 導入は v2.1.169」「/doctor が "full setup checkup" になったのは v2.1.205」で、quizの「v2.1.205以降が唯一の例外」という記述と矛盾するように見えた
- しかし env-vars.md の `DISABLE_DOCTOR_COMMAND` 項目に「Before v2.1.205, this variable hid the /doctor diagnostics screen command」と明記されており、v2.1.205 以前は `/doctor` が「診断コマンド」（組み込みコマンド）で、v2.1.205 で「setup checkup skill」に変わったことが裏付けられる → quiz は正確。**disableBundledSkills や /doctor 関連の版数主張は skills.md/changelog.md だけでなく env-vars.md の DISABLE_DOCTOR_COMMAND 項目も必ず確認すること**

### skill-061/064/076/078/079/089/093 は全て事実確認済み（正解・explanation ともドキュメント一致）
- skill-061: effort `xhigh` は Fable 5.1/5・Opus 5・Sonnet 5・Opus 4.8・Opus 4.7 のみ対応（Opus 4.6/Sonnet 4.6 は `max` まで）。model-config.md L313-315 の表と完全一致
- skill-064/089: スキル説明のコンテキスト予算はモデルの1%、各エントリ上限1,536文字（description+when_to_use合計）、`skillListingBudgetFraction`（例:0.02=2%）、`SLASH_COMMAND_TOOL_CHAR_BUDGET`、`skillOverrides`の`"name-only"` は skills.md L433 に完全一致
- skill-065: `/simplify` は変更されたコードに対し4つの並列レビューエージェント（reuse/simplification/efficiency/abstraction）、v2.1.154以降はバグ検出なし・`/code-review`使用は commands.md L85 に一致。crossCheck numeric-contradiction フラグは false-positive の可能性
- skill-076: teammateMode のデフォルトは v2.1.179以降 `"in-process"`（それ以前 `"auto"`）、`"tmux"` で強制、iTerm2 は `it2` CLI + Python API 必須、v2.1.186 で `"iterm2"` 追加、は agent-teams.md L61-70 に一致
- skill-078: skillsディレクトリのファイル変更は再起動不要、新規トップレベルskillsディレクトリ作成のみ再起動必要（skills.md L124 に一致）
- skill-079: 同名ネストskillは両方生存、修飾なし`/deploy`はルート実行+ディレクトリ修飾バリアント一覧を追記（skills.md L60-63 に一致）
- skill-093: routine/cloudセッションは毎回新規リモートセッションで`~/.claude/skills/`を読まない。claude.aiアカウントで有効化 or リポジトリ`.claude/skills/`にコミット or `.claude/settings.json`宣言プラグイン、が対処法（skills.md L80-85 に一致）

## skills カテゴリ検証パターン（2026-09-10、正解妥当性監査）

### サブエージェントのネスト制限が撤廃された（Critical, skill-024）
- 旧仕様「サブエージェントは他のサブエージェントを起動できない」は stale。現行 sub-agents.md「Let subagents spawn their own subagents」: デフォルトでメイン会話の下に最大3階層までネスト可能（`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` で変更可）。深さ上限で `Agent` ツールが取り上げられる（フォーク除く）
- 「サブエージェントの重要な制限」を問う問題で「ネスト不可」を正解にしている場合は要修正

### Explore の既定モデルが Haiku 固定ではなくなった（Critical, skill-022）
- v2.1.198 以降、Explore はメイン会話のモデルを継承する（Claude API 上は Opus を上限にキャップ）。常時 Haiku で動く旧仕様は stale
- Haiku 固定で動かすには `Explore` という名前のユーザー/プロジェクトサブエージェントを自作し `model: haiku` を明示する必要がある
- 「Explore は Haiku モデルで高速動作する」という一般化した記述は現行 docs と矛盾する

### エージェントチームの Plan approval は自動承認・レビューなし（Critical, skill-083）
- agent-teams.md「Have teammates plan before implementing」: チームメイトの計画承認リクエストは**リードのレビューなしで自動承認**される。ユーザーへの個別プロンプトも出ない設計上の例外
- 「実装前に必ず計画をレビューさせたい」というユースケースに対する解決策として Plan approval を正解にする問題は前提が誤り。現行仕様では人間/リードによる能動的レビュー・却下は行われない

### 「Default teammate model」設定は /config から削除済み（Critical, skill-082）
- changelog.md: 'Removed the "Default teammate model" setting from /config; agent-team teammates now use the leader's model unless the spawn names one'
- 現行のモデル決定優先順位（agent-teams.md「Specify teammates and models」）: 1) spawnプロンプトの指名 → 2) サブエージェント定義の `model`（`inherit`=リードのモデル）→ 3) `CLAUDE_CODE_SUBAGENT_MODEL` → 4) **リードの現在のモデル**（フォールバック既定）
- 「チームメイトにリードと同じモデルを使わせるには `/config` で明示的に設定が必要」という問題は誤り。現在は**何もしなくても既定でリードのモデルを継承する**

### 確認済み正確（false-positiveではない、doc一致）
- Skill(name)/Skill(name *) パーミッション構文（完全一致/プレフィックスマッチ）、skillOverrides 4状態（on/name-only/user-invocable-only/off）とメニュー表示可否、Enterprise > Personal > Project のスキル優先順位、metadata（自由形式YAMLマップ）vs compatibility（500文字文字列、Agent Skills仕様）の違い、disableSkillShellExecution の対象範囲（バンドル/管理スキル対象外）、shell: powershell + CLAUDE_CODE_USE_POWERSHELL_TOOL、CLAUDE_EFFORT/CLAUDE_SESSION_ID/CLAUDE_SKILL_DIR の各文字列置換変数、コンパクション後のスキル再アタッチ（各5,000トークン、合計25,000トークン予算）、エージェントチームのメールボックス検証（不正エントリのみ除去、v2.1.207前は既知バグ）、SendMessage/タスク管理ツールはチームメイトの tools 制限を受けない、CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 での有効化
