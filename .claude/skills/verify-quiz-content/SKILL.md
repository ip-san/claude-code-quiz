---
name: verify-quiz-content
description: クイズ内容と公式ドキュメントの整合性をチェックする。クイズ検証、ドキュメントチェック、quiz verify、内容確認
allowed-tools: WebFetch, Read, Glob, Grep, Task, Bash
---

# Quiz Content Verification Skill

あなたはクイズコンテンツの品質保証担当者です。

## Role

`src/data/quizzes.json` の内容が最新の公式ドキュメント (code.claude.com) と整合しているかを検証し、差異を報告します。

## Step 0: Automated Quality Check (最初に実行)

まず自動テストで構造的な問題を検出：

```bash
npm test
npm run quiz:check
npm run quiz:stats
```

これにより以下が自動検証されます：
- ID重複
- correctIndex の偏り（35%上限）
- wrongFeedback の構造（正解に付いていないか、不正解に欠けていないか）
- カテゴリの妥当性
- 問題文・解説の文字数
- referenceUrl の形式
- 難易度分布

**自動テストが失敗した場合は、まずその問題を修正してください。**

## Official Documentation Sources

以下の公式ドキュメント（16ページ + Agent SDK）を検証の参照元とします：

### Core Documentation
- https://code.claude.com/docs/en/overview
- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/memory

### Interactive & Tools
- https://code.claude.com/docs/en/interactive-mode
- https://code.claude.com/docs/en/how-claude-code-works

### Extensions & Integration
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/discover-plugins
- https://code.claude.com/docs/en/sub-agents

### Advanced Topics
- https://code.claude.com/docs/en/common-workflows
- https://code.claude.com/docs/en/checkpointing
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/model-config

### Agent SDK（別ドメイン）
- https://platform.claude.com/docs/en/agent-sdk/overview

## Step 1: Fact Verification

**⚠️ レートリミット対策:** 8カテゴリ全てを同時に並列検証するとAPIレートリミットに抵触する可能性が高い。**2〜3カテゴリずつバッチで実行する**こと。

```
# バッチ1: memory, skills, tools (並列)
# バッチ2: commands, extensions (並列)
# バッチ3: session, keyboard, bestpractices (並列)

Task (subagent_type: general-purpose) for each category in batch:
  1. WebFetchで該当ドキュメントページを取得
  2. 各問題について以下を照合：
     a. question（問題文）の前提・数値・機能名がドキュメントと一致するか
     b. 正解選択肢がドキュメントの内容と一致するか
     c. explanation 内の全フィールド（注記文・CLIフラグ・数値含む）がドキュメントと一致するか
     d. wrongFeedback の批判内容自体がドキュメントと矛盾していないか
     e. question ↔ explanation ↔ wrongFeedback 間の内部矛盾がないか
  3. 差異を報告
```

引数で特定カテゴリが指定された場合は、そのカテゴリのみ並列実行で問題ない。

### Verification Checklist

各クイズ問題について以下を検証：

#### A. 事実の正確性

検証対象フィールドは **question・options[].text・explanation・options[].wrongFeedback の全て**。

- **question（問題文）** に含まれる前提・数値・機能名・用語がドキュメントと一致しているか
  - 例: 「3つのレベル」「5種類のイベント」のような数量の前提が正確か
  - 例: 問題文で言及している機能名・コマンド名がドキュメントに存在するか
- **正解選択肢** がドキュメントの内容と一致しているか
- **explanation** が正しい情報を含んでいるか
  - 注記文（「注意：」「※」「ただし」で始まる文）も確認対象
  - explanation 内で言及する CLIフラグ・環境変数・機能名もドキュメントで存在を確認する
- **wrongFeedback** がドキュメントと矛盾していないか
  - 「〜ではありません」という批判内容自体が正確かもドキュメントで確認する
  - wrongFeedback が正解を誤って批判していないか（例: 正しいキー名を「キー名が異なります」と批判するケース）

**検証の原則:**
- 数値（スコープ数、イベント数、モデル対応範囲など）は公式ドキュメントで都度確認する。過去の正解が最新とは限らない
- 環境変数名・設定キー名・コマンドフラグは正式名称をドキュメントと照合する
- wrongFeedback の内容もドキュメントと矛盾していないか確認する

**よくある誤りパターン:**
- 環境変数名の誤記（例: `CLAUDE_CODE_AUTOCOMPACT_*` → 正しくは `CLAUDE_AUTOCOMPACT_*`）
- コマンド動作の誤解（例: `--from-pr` はワークツリーでのPRレビューではなくセッションリンク）
- ドキュメントで確認できない機能を正解・explanation・wrongFeedback に含めてしまう
- 設定キーの旧名称（例: `disallowedCommands` → 正しくは `permissions.deny`）
- スキル定義のキー名形式（アンダースコアではなくハイフン区切り）
- 設定スコープ・Hookイベント・ツールカテゴリ等の「数」が古い（question の前提として現れる場合も含む）
- `MAX_THINKING_TOKENS`の対応モデル範囲が不完全（ドキュメントで最新を確認）
- キーバインド動作の未ドキュメント記述（例: `Ctrl+C` 2回で終了 — 未ドキュメント）
- explanation 内の「注意：〜」注記が事実に反している（例: 公式記載の環境変数を「非公式」と書くケース）
- **ドキュメントに記載のない数値を断定:** 具体的な数値がドキュメントに存在しない場合に、特定の数値として断定している。パターンは2種類ある: (a) ドキュメントが "Not specified" と明示しているケース（例: `BASH_DEFAULT_TIMEOUT_MS`のデフォルト値）、(b) ドキュメントに数値自体が掲載されていないケース（例: 非アダプティブモデルの思考予算トークン数 — model-configページに具体値の記載なし）。いずれも「〜トークン」「〜秒」「〜文字」のような数値断定はドキュメントで根拠を確認すること
- **設定フィールド省略時のデフォルト動作の断言:** explanation や wrongFeedback で「フィールドを省略すると〇〇になる」「指定しない場合は〇〇モード」と断言している場合、そのデフォルト動作をドキュメントで明示的に確認する。デフォルト値は直感と逆になることがある（例: `spinnerVerbs.mode` を省略すると `"append"`（追加）がデフォルト。「省略=replace（置き換え）」は誤り — ドキュメントに "append" がデフォルトと明記されている）
- **環境変数の settings ページリスト照合:** question・options・explanation・wrongFeedback で言及する環境変数が、settings ページの環境変数テーブルに存在するか確認する。テーブルに存在しない env var は未ドキュメントとみなし、問題・解説での使用を禁止する（例: `USE_BUILTIN_RIPGREP` は settings ページの env var テーブルに記載なし → 削除対象）
- **referenceUrl に新ドキュメントページを使っている場合は VALID_DOC_PAGES を確認:** Step 0 の `npm test` が「unknown doc page」エラーで失敗する場合、`src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストに該当ページ名が含まれているか確認する。修正は同ファイルのリストにページ名を追加するだけ（例: `plugin-marketplaces` は既存16ページに含まれないため追加が必要）。新規ドキュメントページが追加されたときに発生するパターン
- **モデル固有機能のスコープ誤り:** エフォートレベル・Extended Thinking等の機能がどのモデルに適用されるか個別に確認する（例: エフォートレベル調整は Opus 4.6 専用、Sonnet 4.6 には非対応）
- **CLIフラグの組み合わせ省略:** 単独では動作しないフラグを単体で示している（例: `--fork-session` → 正しくは `--continue --fork-session`）
- **パスの動的部分の省略:** テンプレート的なパスの変数部分が欠落している（例: `~/.claude/projects/memory/` → 正しくは `~/.claude/projects/<project>/memory/`）
- **存在しないフレーズの引用:** 「公式ドキュメントは『〜』を推奨」と書く場合、その正確なフレーズがドキュメント本文に存在するか確認する（例: "Delegate, don't dictate" はドキュメントに未掲載。"Ruthlessly prune" / "Keep it concise" も memory ベストプラクティスページに記載なし — 実際は "Review periodically" "Be specific" "Use structure to organize"）
- **機能間の「同一」「同等」断言の確認:** explanation で「AはBと同じ機能・同じリストを操作する」という記述は、ドキュメントで両者の関係を確認する。見た目が似た2つの機能が実は別実装の可能性がある（例: `Ctrl+T` の Task List と `/todos` はどちらもタスク関連だが別機能 — Task List は新機能でClaudeが複雑作業時に作成するリスト、`/todos` は旧来の TODO コマンドで `CLAUDE_CODE_ENABLE_TASKS=false` で旧実装に戻せると明記されている）
- **機能の非影響範囲の誤記:** ある設定・フィールドが「何をしないか」もドキュメントで確認する。特に「A機能を有効にするとB機能も制限される」と断定するケースは要注意（例: `allowed-tools` はリスト外ツールを制限しない — 通常のパーミッション設定に委ねるだけ）
- **設定の副作用・無効化される機能の欠落:** 設定・フラグを説明する際は「何が有効になるか」だけでなく「何が無効化されるか」もドキュメントで確認して記載されているか検証する。多機能な設定には「有効化されるもの」と「無効化されるもの」が共存することが多く、後者の省略は学習者が実害を受ける（例: `CLAUDE_CODE_SIMPLE=1` の explanation で「最小限ツールで動作」とだけ書き、「MCPツール・フック・`CLAUDE.md`が無効化される」という副作用が欠落していた）
- **除外条件の翻訳精度:** "up to but not including X" を「Xまで」と訳すと X を含む意味になる誤り。「Xの手前まで（Xは含まない）」と表記すること（例: "recurses up to but not including the root directory" → 「ルートまで再帰的に」は誤り、「ルートの手前まで再帰的に、ルートは含まない」が正しい）
- **explanation の論理的整合性:** 原則・根拠を引用して結論を正当化する場合、その原則が結論を本当に支持しているか確認する。特に「〜という原則により X が最高権限」という説明は、原則と結論が逆になっていないか注意（例: 「より具体的な指示が優先される」原則は、最も広域なマネージドポリシーの最高権限を支持しない）
- **セットアップコマンドの用途混同:** 複数のセットアップコマンドが存在する場合、それぞれの用途を確認する（例: `/terminal-setup` は Shift+Enter バインディング（一部ターミナル）と Option+T ショートカットの有効化に使用。`Alt+B`・`Alt+F`等の他のOption/Altショートカットには別途ターミナルで「Option as Meta」設定が必要）
- **CLIサブコマンド・スラッシュコマンドの存在確認:** 問題文・選択肢・explanation で言及する CLI サブコマンド（例: `claude commit`）やスラッシュコマンド（例: `/commit`）は、必ず公式 CLI リファレンスページで存在を確認する。ドキュメントに記載のないコマンドを正解・説明に含めてはいけない
- **ドキュメント未記載の旧名称・エイリアス引用:** 「旧`/handoff`」「旧称〜」「以前は〜と呼ばれていた」等の記述はドキュメントで根拠を確認する。ドキュメントに記載のない旧称・エイリアスを explanation に含めてはいけない
- **固定フレーズ・ワークフロー名の翻訳精度:** 公式ワークフローの各フェーズ名は意味が変わる意訳を禁止する（例: 「Explore→Plan→Implement→**Commit**」の最後のフェーズを「検証」と訳すのは誤り — コミットと検証は全く異なる行為）
- **修正時に導入される否定文の検証:** explanation や wrongFeedback に「〜ではありません」「〜とは異なります」「〜専用です」という否定・限定文を追加する修正は、その否定が排他的に正確かをドキュメントで再確認する。「AはBのためのもの」という説明はAがBだけに使われるか（他の用途がないか）を確認すること（例: `/terminal-setup` は「Shift+Enter専用」ではなく「Shift+Enter と Option+T の両方」に使われる）
- **選択肢内の表記形式の統一:** 同一問題の選択肢間で、変数名・コマンド名・設定キーの記載形式を統一する。不正解選択肢が「`CLAUDE_CODE_TMPDIR`」のように具体的な名称を示しているのに、正解選択肢だけ名称なしの説明文のみになっていないか確認する（例: ses-047 で正解選択肢に `CLAUDE_CONFIG_DIR` が欠落していた）
- **`hint`フィールドの整合性:** `hint`フィールドが正解選択肢の内容へと正しく誘導しているか確認する。ヒントが問われているファイル・設定・概念と別のものを説明していないか注意する（例: `CLAUDE.local.md` を問う問題のヒントが「すべてのプロジェクトに適用される設定」と書かれていた — これは `~/.claude/CLAUDE.md` の説明であり逆方向のヒント）
- **ドキュメント未記載のプラットフォーム言及:** explanation や question で言及するインターフェース・プラットフォーム（iOS アプリ、ブラウザ拡張等）がドキュメントに記載されているか確認する（例: `/teleport` の説明に「iOSアプリから」と書いたが docs は「claude.ai web session」のみ記載）
- **設定・フラグの「無視される条件」の欠落:** 「X=0 で全モデル Y を無効化できる」のような全称断定は、その設定が特定条件下で無視されないかをドキュメントで確認する。設定値が「無視される」場合、その条件（どのモデル・モード・フラグが必要か）を明示する（例: `MAX_THINKING_TOKENS=0` は Opus/Sonnet 4.6 ではアダプティブ推論中は無視されるため全モデル無効化にならない。`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` を設定した上でのみ有効）
- **動作表現の精度（「削除・切り捨て」vs「ロードしない・スキップ」）:** 機能の動作を説明する際、ドキュメントの正確な動詞・表現を使う。「削除される」「切り捨てられる」「無効化される」はドキュメントの表現と意味が異なる場合がある（例: docs の `"not loaded automatically"` を「切り捨てられる」と書くと、ファイルが削除される印象を与えて誤り — 実際にはファイルは存在するがロード対象外）
- **hookのexit codeと出力先の正確性:** hook スクリプトの exit code ごとの stdout/stderr の送信先を正確に確認する。exit 0: stdout が Claude のコンテキストに追加される。exit 1: stderr がユーザーに表示されエラーとして記録される（処理は継続）。exit 2: ブロッキングエラー — stderr の送信先は**イベントによって異なる**（`PreToolUse`/`PostToolUse` 等ではClaudeへのフィードバック、`Notification`/`SessionStart`/`SessionEnd` 等ではユーザーへの表示のみ）。イベントごとの動作はドキュメントの「Exit code 2 behavior per event」テーブルで個別確認すること
- **条件固有の動作を別の条件に一般化しない:** ある条件A（イベント・コマンド・ツール等）における動作が正しくても、別の条件Bに同じ動作が適用できるとは限らない。特に「〜の場合は〜」という修正を行う際は、類似する他の条件への適用が正しいかをドキュメントで確認する（例: exit 2 の stderr 送信先は Hook イベントによって異なる — 「全イベントでClaudeへのフィードバック」という一般化は誤り）
- **UI固有の詳細動作の断定禁止:** セッションピッカー・ダイアログ等の UI 固有の詳細（キーバインド、選択肢の表示順、グループ化方式等）はドキュメントに明記されていない場合が多い。「Pキーでプレビュー」「フォーク済みセッションはルートの下にグループ化」等のUI内部動作を断定してはいけない。ドキュメントで確認できる機能（コマンドの動作・CLIフラグの挙動）のみを問う
- **外部知識・汎用LLM知識の混入:** Anthropic APIやプロンプトエンジニアリングの一般知識（例: 「think」「think hard」「ultrathink」という記述が思考トークンを増やす）を、Claude Code docs に記載がないままClaude Code固有の動作として断言してはいけない。explanation・wrongFeedbackで言及するClaude Code固有の動作は必ず公式ドキュメントで根拠を確認すること。「一般的にLLMではこう動く」という知識とドキュメント記載の動作は区別する

#### B. 用語・名称の正確性

- APIやコマンド名が正式名称か
- イベント名やフック名が正確か
- 設定ファイル名やパスが正しいか
- サードパーティプロバイダー名・サービス名の正式表記をドキュメントで確認する（例: 「Microsoft Foundry」→「Microsoft Azure Foundry」のような略称・非公式表記に注意）
- **SDK・ライブラリ名の改名確認:** SDKやライブラリは改名されることがある。quiz内容で言及するSDK名は公式ページの最新名称と照合する（例: 「Claude Code SDK」→「Claude Code Agent SDK」→「Claude Agent SDK」と改名済み。旧称を補足として記載する場合は「旧称：〜」と明示する）

#### C. リファレンスURLの有効性

- referenceUrl が有効なURLか
- リンク先のページが存在するか
- **アンカー（`#fragment`）が実際のページ見出しと一致するか** — アンカー不一致は頻出するため重点チェック
- **referenceUrl の参照先ページが問題内容に最も直接的か確認する:** URL が有効でも、概要・クイックスタートページを参照しているが機能専用ページ（`memory`・`best-practices`・`discover-plugins` 等）の方が直接的な記述を持つ場合は修正を推奨する（例: CLAUDE.md 肥大化対処法の referenceUrl が `quickstart` → `memory` が適切）
- **`overview` / `quickstart` は危険パターン:** これらは機能の全体概要・導入手順を扱うページであり、特定機能（セッション管理・フック・スキル・CI/CD統合・テレポート等）を問う問題の referenceUrl として不適切なことが多い。`overview` または `quickstart` が referenceUrl になっている問題は優先的に確認し、機能専用ページ（`interactive-mode`, `common-workflows`, `how-claude-code-works`, `memory` 等）への修正を検討すること
- **機能別 referenceUrl マッピング（確認済み）:** 以下は実際の検証から得られた推奨マッピング。
  - 環境変数（`BASH_DEFAULT_TIMEOUT_MS`, `CLAUDE_CODE_SHELL_PREFIX` 等）→ `settings`（`how-claude-code-works` ではない）
  - CLIワークフロー（パイプ `|`, CI/CD, Gitコミット, fork-session）→ `common-workflows`
  - 組み込みスラッシュコマンド（`/login`, `/compact`, `/model` 等）→ `interactive-mode`
  - Claude Codeのコア動作（ツールカテゴリ・Compact Instructions・セッション管理・アジェンティックループ）→ `how-claude-code-works`
  - 注: `how-claude-code-works` は非常に包括的なページであり、一見別のページが適切に見える内容（Compact Instructions・Code Intelligenceカテゴリ・fork-session等）も実はここに記載されていることが多い。安易に「このページでは説明が足りない」とflagしないこと
- 有効なドメインとパス：
  - `https://code.claude.com/docs/en/{page}` — 16ページ: overview, quickstart, settings, memory, interactive-mode, how-claude-code-works, mcp, hooks, discover-plugins, sub-agents, common-workflows, checkpointing, best-practices, skills, model-config
  - `https://platform.claude.com/docs/en/agent-sdk/overview` — Agent SDK関連

**既知の正しいアンカー（ドキュメント更新で変わりうるため、検証時にWebFetchで再確認すること）:**

memoryページ:
- `#claudemd-imports`（`@`インポート関連）
- `#determine-memory-type`（メモリ階層・スコープ関連）
- `#directly-edit-memories-with-memory`（`/memory`コマンド関連）
- `#how-claude-looks-up-memories`（サブディレクトリ検索関連）
- `#user-level-rules`（ユーザールール関連）
- `#path-specific-rules`

skillsページ:
- `#run-skills-in-a-subagent`（サブエージェント実行関連）

#### D. 最新性

- 廃止された機能を参照していないか
- 名称変更された機能の旧名を使っていないか

#### D3. 内部一貫性チェック

問題内部のフィールド間で矛盾がないか確認する（ドキュメントとの照合とは別に行う）：

- **question ↔ explanation の整合性:** 問題文が「〜について問う」と示しているのに、explanation や正解が別の機能を説明していないか
  - 例: question で「Extended Thinking の確認方法」を問いながら、正解・explanation が「verbose出力」の説明になっているケース
- **explanation ↔ wrongFeedback の整合性:** explanation で述べている事実と wrongFeedback の内容が矛盾していないか
  - 例: explanation「他のツールは通常のパーミッション設定に従います」、wrongFeedback「リストにないツールも制限されます」→ 矛盾
- **wrongFeedback 同士の整合性:** 複数の wrongFeedback が互いに矛盾していないか
- **選択肢の相互矛盾:** ある選択肢の wrongFeedback が別の選択肢の内容を肯定してしまっていないか

#### D2. バッククォート書式

- コード用語・ファイルパス・コマンド・環境変数・設定キーがバッククォートで囲まれているか
- question, options[].text, explanation, options[].wrongFeedback すべてが対象
- ディレクトリパス（`.claude/`）の末尾パターンに注意: `.claude/memory.txt` の途中で切れないこと

**バッククォートが必要な主要カテゴリ:**
- **ツール名:** `Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `WebFetch`, `WebSearch`, `NotebookEdit`, `AskUserQuestion`, `Task`, `TodoWrite`
- **Hookイベント名:** `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `Stop` 等
- **ファイルパス:** `settings.json`, `CLAUDE.md`, `CLAUDE.local.md`, `.mcp.json`, `managed-mcp.json`, `.claude/settings.json`, `~/.claude/settings.json`
- **設定キー:** `permissions.allow`, `permissions.deny`, `output_mode`, `run_in_background`, `old_string`, `new_string`, `edit_mode`, `autoMemoryEnabled` 等
- **環境変数:** `ALL_CAPS_WITH_UNDERSCORES`パターン（例: `CLAUDE_CODE_EFFORT_LEVEL`, `BASH_DEFAULT_TIMEOUT_MS`）
- **スラッシュコマンド:** `/compact`, `/clear`, `/resume`, `/memory`, `/model`, `/doctor`, `/init`, `/rewind` 等
- **CLIフラグ:** `--dangerously-skip-permissions`, `--from-pr`, `--continue`, `--worktree` 等
- **技術用語:** `ripgrep`, `bypassPermissions`, `acceptEdits`, `dontAsk`, `JSON-RPC`, `stdio`, `SSE`, `mTLS`

**URL・ファイルパス途中へのバッククォート挿入禁止:** URL文字列（`https://...`）やファイルパスの途中にバッククォートを挿入してはいけない。コード要素はパス・URL 全体をまとめてバッククォートで囲む。途中の一部分だけをバッククォートで囲むと文字列が崩れる（例: `.git/claude-\`settings.json\`` は誤り → `` `.git/claude-settings.json` `` が正しい。同様に URL 途中で `settings.json` だけを囲む形も誤り）。

**ヒント:** バッククォート欠落は広範囲にわたることが多い。大量の場合は正規表現ベースの自動修正スクリプトで一括対応が効率的。

#### E. 問題の質（暗記問題チェック）

以下のパターンに該当する問題を「要リライト」として報告する：

- **丸暗記型:** デフォルト値・パス・キーバインド・環境変数名をそのまま問う
- **表面的:** 「〜とは何ですか」「〜の名前は」のような定義の暗記
- **シナリオなし:** 実務的な状況設定がなく、知識の有無だけで回答できる

**良い問題の基準:**
- 「なぜ」「いつ」「どう使い分ける」を問う
- 実践シナリオが設定されている
- 誤解しやすいポイントを突いている
- wrongFeedback が学びを提供している

#### E2. wrongFeedback の品質チェック

wrongFeedback が具体的で学習効果のある説明になっているか確認する。

**完全NGパターン（即修正）:**
- 「この選択肢は正しくありません。正解の解説を参照してください。」（学習効果ゼロ）

**要改善パターン:**
- 「これは正しくありません」「この機能は存在しません」（抽象的すぎる）
- 「このパスではありません」「不十分です」（理由がない）
- 「〜は有効なモードです。」「〜は組み込みエージェントです。」（一文で終わり、何をするかの説明なし）
- 「サポートされています。」「〜コマンドではありません。」（何が正しいかの情報なし）

**良い例:**
- 具体的にどの機能・設定と混同しやすいか説明
- 正しい情報を併記（「〜ではなく、実際は〜です」）
- ドキュメントの該当箇所を間接的に参照
- 2文以上で理由と正しい情報を提供

**傾向:** 完全NGパターンや一文型wrongFeedbackはtoolsカテゴリとextensionsカテゴリに特に多い傾向がある。

#### E3. 不正解選択肢のもっともらしさ

不正解選択肢が「明らかに間違い」ではなく「もっともらしい」ものになっているか確認する。
- 開発者の一般知識だけで除外できる選択肢は不適切
- Claude Code 固有の知識がないと判別できない選択肢が理想

#### F. 重複・冗長チェック

以下の観点で冗長な問題を特定する：

- **完全重複:** 同じ概念を同じ角度から問う
- **類似重複:** 表現を変えただけで本質的に同じ
- **カバレッジ偏り:** 特定の機能に問題が集中しすぎている

重複が見つかった場合は、どちらの問題を残すべきかを品質の高い方を基準に提案する。

#### G. クロスクイズ一貫性チェック

**同一カテゴリ内の複数問題が互いに矛盾していないか確認する。**

一つの問題の explanation で述べている事実が、別の問題の explanation・wrongFeedback と食い違う場合がある。

**典型的な矛盾パターン:**
- 問題Aの explanation「`agent`フィールドに指定できる組み込みエージェントは3種類（`Explore`、`Plan`、`general-purpose`）」
  →  問題Bの正解「`Bash`は組み込みエージェントの一種」→ 矛盾
- 問題Aの wrongFeedback「設定スコープは5段階」
  →  問題Bの explanation「設定スコープは4段階」→ 矛盾

**確認方法:** カテゴリ内の関連する概念（設定スコープ数、エージェント種別、Hook数等）について、複数問題の記述が統一されているか目視確認する。

## Output Format

### 問題なしの場合
```
## 検証結果サマリー

✅ 全 [N] 問の検証が完了しました。
- 自動テスト: PASS (14/14)
- ファクトチェック: memory 28問 OK, skills 26問 OK, ...

重大な問題は見つかりませんでした。
```

### 問題ありの場合
```
## 検証結果サマリー

⚠️ [N] 件の問題が見つかりました。

### Critical Issues (修正必須)

| Quiz ID | 問題内容 | 現在の内容 | 正しい内容 | 参照元 |
|---------|---------|-----------|-----------|--------|
| ext-003 | イベント名が間違い | PreToolExecution | PreToolUse | hooks |

### Minor Issues (推奨修正)

| Quiz ID | 問題内容 | 詳細 |
|---------|---------|------|
| mem-011 | 数値が古い可能性 | "200行" → 最新値を確認 |

### 暗記問題（要リライト）

| Quiz ID | 現在の問題文 | 問題点 | リライト案 |
|---------|-------------|--------|-----------|
| key-005 | 〜のショートカットキーは？ | キーの丸暗記 | シナリオ型に変更 |

### 重複・冗長

| Quiz ID (残す方) | Quiz ID (削除候補) | 重複内容 |
|------------------|-------------------|---------|
| ext-010 | ext-045 | MCP設定の同一観点 |

### バッククォート書式

| Quiz ID | フィールド | 対象テキスト | 修正内容 |
|---------|----------|-------------|---------|
| mem-005 | question | CLAUDE.md → `CLAUDE.md` | バッククォート追加 |

### wrongFeedback 品質

| Quiz ID | 現在のwrongFeedback | 問題点 | 改善案 |
|---------|-------------------|--------|--------|
| ext-020 | 「これは違います」 | 抽象的 | 具体的な理由を追記 |
```

## Severity Levels

- **Critical**: 事実と異なる情報（正解が間違い、存在しない機能など）
- **Major**: 用語・名称の不一致（旧名称の使用、typo等）
- **Minor**: 数値の更新推奨、リンク切れの可能性
- **Info**: スタイルや表現の改善提案

## Arguments

- `$ARGUMENTS` にカテゴリ名を指定した場合、そのカテゴリのみ検証
  - 例: `/verify-quiz-content memory` → memoryカテゴリのみ
  - 例: `/verify-quiz-content extensions tools` → 複数カテゴリ指定可能
- 引数なしの場合は全カテゴリを検証

## Post-Verification

検証完了後、問題が見つかった場合は：

1. 修正内容をユーザーに確認（修正範囲の選択肢を提示）
2. 承認後、修正を実施

### 修正の効率的なアプローチ

**少量（〜10件）:** 手動で `Edit` ツールで直接修正

**大量（10件以上）:** 一時的なNode.jsスクリプトで一括修正が効率的

```
scripts/fix-*.mjs パターンで一時スクリプトを作成
→ 実行して確認
→ 完了後にスクリプトを削除
```

**バッククォート修正（50件以上）:** 正規表現ベースの自動修正スクリプトが必須
- ツール名・環境変数・パス等をカテゴリ別に定義
- 二重バッククォート防止のガード（既にバッククォート内か確認）
- `--dry-run`オプションでプレビュー後に適用
- 冪等性を確認（2回目の実行で0件変更）

**暗記問題リライト:** `question`フィールドのみ変更（options/explanation は既存を維持）

**重複削除:** IDリストで `splice` → バージョン番号をインクリメント

### 修正後の必須手順

```bash
npm run quiz:randomize   # correctIndex 再ランダム化
npm run quiz:check       # 構造チェック
npm test                 # 全テスト通過確認
npm run quiz:stats       # 分布確認
```
