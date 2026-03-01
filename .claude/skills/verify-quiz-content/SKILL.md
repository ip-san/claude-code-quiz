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

**注意: 複数選択問題（`type: "multi"`）は `correctIndex` の代わりに `correctIndices`（整数配列）を使用する。** このフォーマットは正規の仕様であり、`correctIndex` が存在しなくても構造バグではない。自動テストはこの形式を正しく処理する。
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

### 補足参照ページ（referenceUrl には使用不可だがファクトチェックに有用）
- https://code.claude.com/docs/en/permissions — パーミッション設定の完全リファレンス。`defaultMode`有効値（`default`/`acceptEdits`/`plan`/`dontAsk`/`bypassPermissions`の5つ）、パーミッションルール構文、managed-only設定の詳細。**注意:** `settings`ページは`defaultMode`の例として`acceptEdits`のみを示すが、完全な有効値リストはこのページにある。`defaultMode`関連の問題を検証する際は必ずこのページを確認すること

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
- ドキュメントで確認できない機能を正解・explanation・wrongFeedback に含めてしまう
- スキル定義のキー名形式（アンダースコアではなくハイフン区切り）
- 設定スコープ・Hookイベント・ツールカテゴリ等の「数」が古い（question の前提として現れる場合も含む）
- `MAX_THINKING_TOKENS`の対応モデル範囲が不完全（ドキュメントで最新を確認）
- explanation 内の「注意：〜」注記が事実に反している（例: 公式記載の環境変数を「非公式」と書くケース）
- **ドキュメントに記載のない数値を断定:** 具体的な数値がドキュメントに存在しない場合に、特定の数値として断定している。パターンは2種類ある: (a) ドキュメントが "Not specified" と明示しているケース（例: `BASH_DEFAULT_TIMEOUT_MS`のデフォルト値）、(b) ドキュメントに数値自体が掲載されていないケース（例: 非アダプティブモデルの思考予算トークン数 — model-configページに具体値の記載なし）。いずれも「〜トークン」「〜秒」「〜文字」のような数値断定はドキュメントで根拠を確認すること
- **ドキュメント記載の制限・数値を「未規定」と断定（逆方向の誤り）:** wrongFeedback や explanation で「〜という制限はありません」「〜は定められていません」と書く場合も、ドキュメントで実際にその制限・数値が未記載かを確認する。ドキュメントに記載されている制限を誤って「ない」と述べるのは、上記「ない数値を断定する」パターンと逆方向の誤りで同等に有害。特に、不正解選択肢が**具体的な数値**（「500行」等）を含む場合、それを否定しようとして「数値は存在しない」と wrongFeedback に書くと、別の正しい数値（200行）もまとめて否定してしまうリスクがある（例: `CLAUDE.md`の行数制限について「具体的な行数制限は定められていません」と書いていたが、docs は "target under 200 lines per CLAUDE.md file" と明記している）
- **設定フィールド省略時のデフォルト動作の断言:** explanation や wrongFeedback で「フィールドを省略すると〇〇になる」「指定しない場合は〇〇モード」と断言している場合、そのデフォルト動作をドキュメントで明示的に確認する。デフォルト値は直感と逆になることがある（例: `spinnerVerbs.mode` を省略すると `"append"`（追加）がデフォルト。「省略=replace（置き換え）」は誤り — ドキュメントに "append" がデフォルトと明記されている）
- **環境変数の settings ページリスト照合:** question・options・explanation・wrongFeedback で言及する環境変数が、settings ページの環境変数テーブルに存在するか確認する。テーブルに存在しない env var は未ドキュメントとみなし、問題・解説での使用を禁止する（例: `USE_BUILTIN_RIPGREP` は settings ページの env var テーブルに記載なし → 削除対象）。**ただし、settings ページは env var の網羅リストではない**— 機能専用ページにのみ記載される env var が存在する（例: `MCP_TIMEOUT` は settings ページになく、mcp ページの Tips セクションに記載）。settings テーブルで見つからない場合は、該当機能のドキュメントページも確認してから「未ドキュメント」と断定すること
- **`settings`ページの設定がリンク先の別ページで定義されている場合がある:** `settings`ページに`defaultMode`の「例: `acceptEdits`」とだけ記載されていても、実際の有効値の完全リストは`permissions`ページ（`/en/permissions#permission-modes`）で定義されている。**settingsページは設定のリストであり、設定値の仕様を完全に記載するとは限らない**。設定値の検証は、settingsページがリンクしている専用ページ（permissionsページ等）も合わせて確認すること。（例: `defaultMode`有効値は`default`/`acceptEdits`/`plan`/`dontAsk`/`bypassPermissions`の5つ。settingsページの例`acceptEdits`だけを見て「4つ」と誤判定するパターンは v4.22.0 で実際に発生した）
- **referenceUrl に新ドキュメントページを使っている場合は VALID_DOC_PAGES を確認:** Step 0 の `npm test` が「unknown doc page」エラーで失敗する場合、`src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストに該当ページ名が含まれているか確認する。修正は同ファイルのリストにページ名を追加するだけ（例: `plugin-marketplaces` や `sandboxing` は既存ページに含まれないため追加が必要）。新規ドキュメントページが追加されたときに発生するパターン
- **モデル固有機能のスコープ誤り:** エフォートレベル・Extended Thinking等の機能がどのモデルに適用されるか個別に確認する（例: エフォートレベル調整は Opus 4.6 専用、Sonnet 4.6 には非対応）
- **CLIフラグの組み合わせ省略:** 単独では動作しないフラグを単体で示している（例: `--fork-session` → 正しくは `--continue --fork-session`）
- **パスの動的部分の省略:** テンプレート的なパスの変数部分が欠落している（例: `~/.claude/projects/memory/` → 正しくは `~/.claude/projects/<project>/memory/`）
- **存在しないフレーズの引用:** 「公式ドキュメントは『〜』を推奨」と書く場合、その正確なフレーズがドキュメント本文に存在するか確認する（例: "Delegate, don't dictate" はドキュメントに未掲載。"Ruthlessly prune" / "Keep it concise" も memory ベストプラクティスページに記載なし — 実際は "Review periodically" "Be specific" "Use structure to organize"）
- **機能間の「同一」「同等」断言の確認:** explanation で「AはBと同じ機能・同じリストを操作する」という記述は、ドキュメントで両者の関係を確認する。見た目が似た2つの機能が実は別実装の可能性がある
- **設定の副作用・無効化される機能の欠落:** 設定・フラグを説明する際は「何が有効になるか」だけでなく「何が無効化されるか」もドキュメントで確認して記載されているか検証する。多機能な設定には「有効化されるもの」と「無効化されるもの」が共存することが多く、後者の省略は学習者が実害を受ける
- **CLIサブコマンド・スラッシュコマンドの存在確認:** 問題文・選択肢・explanation で言及する CLI サブコマンドやスラッシュコマンドは、必ず公式 CLI リファレンスページで存在を確認する。ドキュメントに記載のないコマンドを正解・説明に含めてはいけない
- **ドキュメント未記載の旧名称・エイリアス引用:** 「旧称〜」「以前は〜と呼ばれていた」等の記述はドキュメントで根拠を確認する。ドキュメントに記載のない旧称・エイリアスを explanation に含めてはいけない
- **修正時に導入される否定文の検証:** explanation や wrongFeedback に「〜ではありません」「〜専用です」という否定・限定文を追加する修正は、その否定が排他的に正確かをドキュメントで再確認する。「AはBのためのもの」という説明はAがBだけに使われるか（他の用途がないか）を確認すること
- **設定・フラグの「無視される条件」の欠落:** 「X=0 で全モデル Y を無効化できる」のような全称断定は、その設定が特定条件下で無視されないかをドキュメントで確認する。設定値が「無視される」場合、その条件（どのモデル・モード・フラグが必要か）を明示する（例: `MAX_THINKING_TOKENS`（非ゼロ値）は Opus/Sonnet 4.6 ではアダプティブ推論中は無視される — `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` を設定した上でのみ有効。**ただし `MAX_THINKING_TOKENS=0` はどのモデルでも thinking を完全に無効化できる例外** — docs: "The one exception: setting MAX_THINKING_TOKENS=0 still disables thinking entirely on any model." この例外を「未記載」として削除すると誤りになる）
- **動作表現の精度（「削除・切り捨て」vs「ロードしない・スキップ」）:** 機能の動作を説明する際、ドキュメントの正確な動詞・表現を使う。「削除される」「切り捨てられる」「無効化される」はドキュメントの表現と意味が異なる場合がある（例: docs の `"not loaded automatically"` を「切り捨てられる」と書くと、ファイルが削除される印象を与えて誤り — 実際にはファイルは存在するがロード対象外）
- **hookのexit codeと出力先の正確性:** hook スクリプトの exit code ごとの stdout/stderr の送信先を正確に確認する。exit 0: stdout が Claude のコンテキストに追加される。exit 1: stderr がユーザーに表示されエラーとして記録される（処理は継続）。exit 2: ブロッキングエラー — stderr の送信先は**イベントによって異なる**（`PreToolUse`/`PostToolUse` 等ではClaudeへのフィードバック、`Notification`/`SessionStart`/`SessionEnd` 等ではユーザーへの表示のみ）。イベントごとの動作はドキュメントの「Exit code 2 behavior per event」テーブルで個別確認すること
- **条件固有の動作を別の条件に一般化しない:** ある条件A（イベント・コマンド・ツール等）における動作が正しくても、別の条件Bに同じ動作が適用できるとは限らない。特に「〜の場合は〜」という修正を行う際は、類似する他の条件への適用が正しいかをドキュメントで確認する（例: exit 2 の stderr 送信先は Hook イベントによって異なる — 「全イベントでClaudeへのフィードバック」という一般化は誤り）
- **UI固有の詳細動作の断定禁止:** セッションピッカー・ダイアログ等の UI 固有の詳細はドキュメントに明記されていない場合が多い。ドキュメントで確認できる機能のみを問う。**ただし、セッションピッカーのキーバインドは `common-workflows`（"Use the session picker" セクション）に掲載済み** — `P`=プレビュー、`R`=リネーム、`B`=ブランチフィルター、`/`=検索、`A`=全プロジェクト切替、`↑↓`=ナビゲート。フォーク済みセッションがルートセッション下にグループ化されることも同ページに明記。これらは「UI内部動作」ではなく「ドキュメント記載の機能」として検証対象になる
- **外部知識・汎用LLM知識の混入:** Anthropic APIやプロンプトエンジニアリングの一般知識（例: 「think」「think hard」「ultrathink」という記述が思考トークンを増やす）を、Claude Code docs に記載がないままClaude Code固有の動作として断言してはいけない。explanation・wrongFeedbackで言及するClaude Code固有の動作は必ず公式ドキュメントで根拠を確認すること。「一般的にLLMではこう動く」という知識とドキュメント記載の動作は区別する
- **制限・許可設定の列挙完全性:** 設定が「Xのみが許可/実行される」という説明の場合、ドキュメントが示す完全な許可リストを確認する。実際には「XとY」の複数が許可されているのに「Xのみ」と不完全に断言している可能性がある（例: `allowManagedHooksOnly: true` は「Managed設定のHooksとSDK Hooksのみ」が許可されるが、「Managed設定のHooksのみ」と記述されていた — SDK Hooksが欠落）。設定説明のdocsテーブルで列挙されている全ての許可対象を確認すること
- **セッション再開時の「完全なコンテキスト」断言の不完全さ:** explanation や wrongFeedback で「セッション再開時に完全なコンテキストが復元されます」と書く場合、「完全な」という表現が誤解を招く可能性がある。docs は "Your full conversation history is restored, **but session-scoped permissions are not**. You'll need to re-approve those." と明記している。メッセージ履歴とツール使用結果は復元されるが、セッションスコープの許可設定（事前承認済みコマンド等）は復元されない。「完全な」「シームレスに」という表現がこの制約を隠している場合は注記を追加すること（参照: `how-claude-code-works` "Resume or fork sessions" セクション）
- **過去のMEMORY記録を最終権威にしない:** MEMORY.mdに「〜が正式名称」「〜は確認済みfalsealarm」と記録されていても、実際のドキュメントページを直接確認すること。特に製品名・サービス名・環境変数名は、過去の検証で誤って記録されたまま後の検証でも引き継がれることがある（例: v4.13.0で「Microsoft Azure Foundry（正式名称）」と誤記録 → v4.22.0でも踏襲 → 実際のページタイトルは「Microsoft Foundry」）。"過去に確認済み"という記録があっても、重要な固有名詞・設定値は専用ページで再検証する

#### B. 用語・名称の正確性

- APIやコマンド名が正式名称か
- イベント名やフック名が正確か
- 設定ファイル名やパスが正しいか
- サードパーティプロバイダー名・サービス名の正式表記は **専用ドキュメントページのH1タイトルを最終権威** として確認する。本文中の言及より、専用ページのタイトルを優先する（例: ページタイトルが "Claude Code on Microsoft Foundry" であれば「Microsoft Foundry」が正式名称。「Microsoft Azure Foundry」という表記はdocsに存在しない）。過去のMEMORY記録より実際のページタイトルを優先すること
- **SDK・ライブラリ名の改名確認:** SDKやライブラリは改名されることがある。quiz内容で言及するSDK名は公式ページの最新名称と照合する（例: 「Claude Code SDK」→「Claude Code Agent SDK」→「Claude Agent SDK」と改名済み。旧称を補足として記載する場合は「旧称：〜」と明示する）。**改名を1箇所修正した後は、同じ旧名称がquiz全体の他の問題にも残っていないか Grep で全件検索する**（point-in-time修正ではなく全件修正が必要）。**ただし、改名後も旧名称が特定コンテキストで依然として正しい場合がある** — 例えば `Task`ツールは Claude Code CLI では`Agent`に改名されたが、Agent SDKの`allowedTools`設定には`Task`と指定する必要がある。旧名称を「誤り」と判定する前に、CLI文脈か SDK文脈かを確認すること

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
  - ベストプラクティス・スケールアップ（CLAUDE.md書き方・サブエージェント活用パターン・並列実行・ファンアウト・Plan Modeワークフロー）→ `best-practices`
  - CLAUDE.md の刈り込み指針（「各行について『これを削除したらClaudeが間違えるか？』」等の記述）→ `best-practices`（`memory` ではなく "Write an effective CLAUDE.md" セクションに掲載）
  - セッションピッカーのキーバインド（P/R/B/A/↑↓）、フォーク済みセッションのグループ化 → `common-workflows`（"Use the session picker" セクション）
  - 注: `how-claude-code-works` は非常に包括的なページであり、一見別のページが適切に見える内容（Compact Instructions・Code Intelligenceカテゴリ・fork-session等）も実はここに記載されていることが多い。安易に「このページでは説明が足りない」とflagしないこと
  - **プラン/プラットフォーム限定コマンド（`/teleport` 等）:** interactive-mode のコマンドテーブルに掲載されていなくても、ページ注記（"Not all commands are visible to every user. Some depend on your platform, plan, or environment."）があるため存在は否定できない。これらのコマンドの詳細は `claude-code-on-the-web` 等の専用ページにあるが、`claude-code-on-the-web` は VALID_DOC_PAGES に含まれないため referenceUrl に使用不可。最も近い有効なページ（スラッシュコマンドなら `interactive-mode`）を維持する
- 有効なドメインとパス：
  - `https://code.claude.com/docs/en/{page}` — 16ページ: overview, quickstart, settings, memory, interactive-mode, how-claude-code-works, mcp, hooks, discover-plugins, sub-agents, common-workflows, checkpointing, best-practices, skills, model-config
  - `https://platform.claude.com/docs/en/agent-sdk/overview` — Agent SDK関連

**既知の正しいアンカー（ドキュメント更新で変わりうるため、検証時にWebFetchで再確認すること）:**

memoryページ（2026-03-01確認済み、ページ大幅再構成後）:
- `#import-additional-files`（`@`インポート関連）
- `#choose-where-to-put-claudemd-files`（メモリ階層・スコープ関連）
- `#view-and-edit-with-memory`（`/memory`コマンド関連）
- `#how-claudemd-files-load`（サブディレクトリ検索・ロード順関連）
- `#user-level-rules`（ユーザールール関連）
- `#path-specific-rules`

**注意: 以下の古いアンカーは無効（ページ再構成で消滅）:**
`#claudemd-imports`, `#determine-memory-type`, `#directly-edit-memories-with-memory`, `#how-claude-looks-up-memories`

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

1. **サブエージェント報告の実データ照合（修正前に必須）**
2. 修正内容をユーザーに確認（修正範囲の選択肢を提示）
3. 承認後、修正を実施

### ⚠️ 検証サブエージェントはREPORT専用にすること

**3バッチのサブエージェントを並列実行する際、各エージェントに `quizzes.json` を直接修正させてはいけない。** 複数のエージェントが同じJSONファイルを並列で書き換えると、以下の問題が発生する：

- **バージョン番号の競合:** あるエージェントが v4.31.0 のファイルを読んで v4.28.0 と書き戻し、別のエージェントの変更が上書きされる
- **内容の巻き戻し:** 後から書き込んだエージェントが、先に書き込んだエージェントの修正を上書きして消去する

**正しいワークフロー:**
1. 3バッチの検証エージェントは「報告のみ」を実施（ファイル変更禁止）
2. 主エージェント（このskillを実行しているClaude）が報告を受け取り、実データを照合してから修正を適用
3. バージョン番号のインクリメントも主エージェントが一括管理する

**サブエージェントへの指示例（promptに追記）:**
```
重要: このエージェントは問題を報告するだけです。quizzes.jsonへの直接修正は行わないこと。
検証レポートは .claude/tmp/verify_{category}.json に保存すること。
```

### サブエージェント報告の照合（Critical/Major指摘の実データ確認）

サブエージェントが報告した Critical・Major の問題は、**修正を実施する前に必ず実際のJSONデータを直接読み込んで照合すること**。

**照合が特に必要なケース:**
- 「options[N].wrongFeedbackに〜という記述がある」という具体的引用を含む指摘
- 「explanationに〜と書かれている」「questionで〜と前提している」という引用形式の指摘
- 指摘内容が過去の検証記録と矛盾する場合

**理由:** サブエージェントはWebFetchの結果とquizデータの照合過程でhallucination（存在しない記述を「ある」と誤報告）を起こすことがある。実際のフィールド値と一致しない指摘を鵜呑みにすると、存在しない問題を修正しようとして混乱する（例: mem-003でエージェントが「上書きされる可能性があります」というwrongFeedbackが存在すると報告したが、実際のJSONにはその記述はなかった）。

**照合の効率的な方法:**

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('src/data/quizzes.json','utf8'));
const q = data.quizzes.find(q => q.id === 'XXX-NNN');
q.options.forEach((o,i) => {
  const marker = i === q.correctIndex ? '[CORRECT]' : '[wrong]';
  console.log(marker, o.text);
  if (o.wrongFeedback) console.log('  wF:', o.wrongFeedback);
});
console.log('explanation:', q.explanation);
"
```

照合の結果、実際のフィールド値が指摘内容と一致する場合のみ修正へ進む。

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
