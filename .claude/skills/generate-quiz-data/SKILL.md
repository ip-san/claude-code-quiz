---
name: generate-quiz-data
description: Claude Code公式ドキュメントからクイズ問題を自動生成する。クイズ生成、問題作成、試験問題、quiz generate
allowed-tools: WebFetch, Read, Write, Glob, Grep, Bash
---

# Quiz Generator Skill

あなたは「Claude Code 認定試験」の問題作成責任者です。

## Role

公式ドキュメントに基づいた、実践的で高品質なクイズ問題を生成します。

## Current State

まず現在のクイズデータの状態を確認してください：

```bash
node scripts/quiz-utils.mjs stats
node scripts/quiz-utils.mjs coverage
```

現在のIDの最大値を確認：
```
Read src/data/quizzes.json
```

IDは既存の最大番号の続きから採番してください。

## Input Source

### ドキュメント事前キャッシュ（推奨）

**生成前に `npm run docs:fetch` でドキュメントをローカルキャッシュしておくと、WebFetch が不要になり大幅に高速化される。**

```bash
npm run docs:fetch          # 全ページ取得（キャッシュ済みはスキップ）
npm run docs:status         # キャッシュ状態を確認
```

キャッシュ先: `.claude/tmp/docs/{page-name}.md`

キャッシュが存在する場合は Read で読み、存在しない場合のみ WebFetch する。

### 公式ドキュメント（16ページ + Agent SDK）

以下のページが参照元。キャッシュ済みの場合は `.claude/tmp/docs/{page-name}.md` を Read で読む。

#### Core Documentation
- overview / quickstart / settings / memory

#### Interactive & Tools
- interactive-mode / how-claude-code-works

#### Extensions & Integration
- mcp / hooks / discover-plugins / sub-agents

#### Advanced Topics
- common-workflows / checkpointing / best-practices / skills / model-config

#### Agent SDK（別ドメイン）
- agent-sdk-overview

## Output Format

`src/data/quizzes.json` の既存データに追記する形式で出力してください：

```json
{
  "id": "[category]-[number]",
  "category": "[category_id]",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "question": "問題文（日本語）",
  "options": [
    { "text": "選択肢1", "wrongFeedback": "この選択肢が誤りである理由" },
    { "text": "選択肢2（正解）" },
    { "text": "選択肢3", "wrongFeedback": "この選択肢が誤りである理由" },
    { "text": "選択肢4", "wrongFeedback": "この選択肢が誤りである理由" }
  ],
  "correctIndex": 1,
  "explanation": "正解の詳細な解説（日本語）",
  "referenceUrl": "https://code.claude.com/docs/en/..."
}
```

## Categories (8 categories)

| ID | 名前 | Weight | 主なドキュメントページ |
|----|------|--------|----------------------|
| memory | Memory (CLAUDE.md) | 15% | memory |
| skills | Skills | 15% | skills, how-claude-code-works |
| tools | Tools | 15% | how-claude-code-works, settings |
| commands | Commands | 15% | interactive-mode, quickstart, overview |
| extensions | Extensions | 15% | mcp, hooks, discover-plugins, sub-agents |
| session | Session & Context | 10% | settings, checkpointing, overview, quickstart |
| keyboard | Keyboard & UI | 10% | interactive-mode |
| bestpractices | Best Practices | 10% | best-practices, common-workflows, quickstart |

## ID Conventions

- `mem-NNN`, `skill-NNN`, `tool-NNN`, `cmd-NNN`, `ext-NNN`, `ses-NNN`, `key-NNN`, `bp-NNN`
- 既存の最大番号の続きから採番（重複禁止）

## Quality Requirements

### 基本ルール

1. **正確性:** 公式ドキュメントの内容に基づく正確な情報のみ
2. **実践性:** 実際の開発シーンで役立つ実践的な問題
3. **wrongFeedback:** 正解選択肢にはwrongFeedbackを付けない。不正解選択肢には必ず「なぜ誤りなのか」の説明を含める
4. **referenceUrl:** 各問題に正しいドメインで始まるURLを必ず含める
   - `https://code.claude.com/docs/en/{page}` — 16ページ: overview, quickstart, settings, memory, interactive-mode, how-claude-code-works, mcp, hooks, discover-plugins, sub-agents, common-workflows, checkpointing, best-practices, skills, model-config
   - `https://platform.claude.com/docs/en/agent-sdk/overview` — Agent SDK関連
   - **referenceUrl は問題内容に最も直接的なページを選ぶ:** `quickstart` や `overview` は概要ページであり、機能の詳細を問う問題には機能専用ページ（`memory`・`best-practices`・`discover-plugins`・`hooks` 等）を参照すること（例: CLAUDE.md 肥大化対処法の問題 → `memory` ページ。ベストプラクティスの問題 → `best-practices` ページ）
   - **`overview` / `quickstart` は使わないことを原則とする:** これらは機能の全体概要・導入手順ページであり、特定機能（セッション管理・フック・スキル・CI/CD統合・テレポート等）を問う問題には適さない。セッション再開なら `interactive-mode`、CI/CD統合なら `common-workflows`、CLAUDE.md なら `memory` のように機能専用ページを選ぶこと
   - **機能別 referenceUrl の推奨マッピング:**
     - 環境変数（`BASH_DEFAULT_TIMEOUT_MS`, `CLAUDE_CODE_SHELL_PREFIX` 等）→ `settings`
     - CLIワークフロー（パイプ, CI/CD, Gitコミット, `--fork-session`）→ `common-workflows`
     - 組み込みスラッシュコマンド（`/login`, `/compact`, `/model`, `/clear` 等）→ `interactive-mode`
     - Claude Codeのコア動作（ツールカテゴリ・Compact Instructions・セッション管理）→ `how-claude-code-works`
5. **日本語:** 問題文・選択肢・解説・wrongFeedbackはすべて日本語
6. **選択肢4つ:** 各問題に正確に4つの選択肢を含める
7. **バッククォート書式:** コード用語・ファイルパス・コマンド・環境変数・設定キーはバッククォートで囲む
   - **ツール名:** `Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `WebFetch`, `WebSearch`, `NotebookEdit`, `AskUserQuestion`, `Task`
   - **Hookイベント:** `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `SessionStart`, `SessionEnd` 等
   - **パス:** `CLAUDE.md`, `settings.json`, `.claude/settings.json`, `.mcp.json` 等
   - **環境変数:** `CLAUDE_CODE_EFFORT_LEVEL`, `BASH_DEFAULT_TIMEOUT_MS` 等（ALL_CAPS_WITH_UNDERSCORESパターン）
   - **コマンド:** `/compact`, `/clear`, `/resume`, `--from-pr`, `--continue` 等
   - **設定キー:** `permissions.allow`, `output_mode`, `run_in_background`, `autoMemoryEnabled` 等
   - **技術用語:** `ripgrep`, `bypassPermissions`, `acceptEdits`, `dontAsk`, `JSON-RPC`, `stdio`
   - 問題文・選択肢・解説・wrongFeedbackすべてに適用する
   - **URL・ファイルパス途中へのバッククォート挿入禁止:** URL文字列（`https://...`）やファイルパスの途中にバッククォートを挿入しない。コード要素はパス・URL 全体をまとめてバッククォートで囲む。途中の一部だけを囲むと文字列が崩れる（例: `.git/claude-\`settings.json\`` は誤り → `` `.git/claude-settings.json` ``）

### 暗記問題の禁止（最重要）

**単純暗記を問う問題は作成しない。** 以下のパターンは NG：

❌ **NG例（暗記型）:**
- 「〜のデフォルト値は何ですか？」（数値やパスの暗記）
- 「〜のキーボードショートカットは？」（キーの丸暗記）
- 「〜の環境変数名は何ですか？」（変数名の暗記）
- 「〜のコマンド名は？」（名前の暗記）

✅ **OK例（理解・シナリオ型）:**
- 「コンテキストが膨大になった場合、最も効果的な対処法はどれですか？」（判断力）
- 「プロジェクト固有のルールをチーム全員に共有したい場合、どのファイルに記述すべきですか？」（使い分け）
- 「自動コンパクト機能が意図しないタイミングで発動する場合、どのように調整しますか？」（問題解決）
- 「MCPサーバーをプロジェクト単位で設定する理由として最も適切なものはどれですか？」（設計理由の理解）

### 問題作成の指針

1. **「なぜ」「いつ」「どう使い分ける」を問う** — 機能の存在を知っているかではなく、適切に使えるかを問う
2. **実践シナリオを設定する** — 「〜したい場合、どうすべきか？」という実務的な状況を提示する
3. **誤解しやすいポイントを突く** — よくある勘違いや混同しやすい概念を選択肢に含める
4. **wrongFeedback で学びを提供する** — 単に「間違いです」ではなく、なぜそれが不適切かを説明する

### 不正解選択肢の品質基準

**不正解選択肢はもっともらしいものにする。** 明らかに的外れな選択肢は学習効果が低い。

❌ **NG例（明らかに間違い）:**
- Bashモードのプレフィックス: `>`, `$`, `#`（開発者なら知識なしでも除外できる）
- 架空のコマンド名: `/magic-fix`, `/auto-solve`

✅ **OK例（もっともらしい）:**
- 類似する実在の機能名・コマンド名（混同しやすいもの）
- 他のツールでは正しいが Claude Code では異なる設定方法
- 一見正しそうだが重要な違いがあるアプローチ

### wrongFeedback の品質基準

wrongFeedback は「学びの機会」として活用する。具体的にドキュメントの該当箇所を参照しながら説明する。

❌ **NG例（弱い wrongFeedback）:**
- 「これは正しくありません」
- 「この機能は存在しません」
- 「このパスではありません」
- 「この選択肢は正しくありません。正解の解説を参照してください。」（学習効果ゼロ、絶対NG）
- 「〜は有効なモードです。」（一文で終わり、何をするかの説明なし）
- 「サポートされています。」（何が正しいかの情報なし）

✅ **OK例（具体的な wrongFeedback）:**
- 「`.config/`はXDG規約のディレクトリですが、Claude Codeは`.claude/`ディレクトリを使用します。プロジェクト設定は`.claude/settings.json`に配置します。」
- 「`--from-pr`は作業ツリーでのPRレビューではなく、特定のPRにリンクされたセッションを再開するオプションです。」
- 「`disallowedCommands`は旧APIの名前です。現在は`permissions.deny`で権限を管理します。」

### 重複・冗長の防止

生成前に必ず既存問題を確認し、以下を避ける：
- **完全重複:** 同じ概念を同じ角度から問う問題
- **類似重複:** 表現を変えただけで本質的に同じ問題
- **カバレッジ偏り:** 特定の機能に問題が集中しすぎる

```bash
# 既存問題の確認
npm run quiz:stats
npm run quiz:coverage
```

### 事実正確性の確認ポイント

**検証対象は question・explanation・wrongFeedback の全フィールド。** 正解選択肢だけが正確でも不十分。

**フィールド別チェック:**

- **question（問題文）の前提を確認する**
  - 問題文に含まれる数値・名称・前提がドキュメントと一致しているか
  - 例: 「3つのレベル」という前提を書く場合、実際に3つか（→ 設定スコープは5段階）
  - 例: 問題文で言及するCLIフラグ・機能がドキュメントに存在するか

- **explanation の注記文・補足を確認する**
  - 「注意：〜」「ただし〜」「※〜」で始まる文も事実確認の対象
  - explanation 内で言及するCLIフラグ・環境変数がドキュメントに存在するか確認する
  - 例: 「注意：この環境変数は非公式」→ 公式記載の環境変数に対して書かないこと

- **wrongFeedback の批判内容を確認する**
  - 「〜ではありません」という批判が、ドキュメントと矛盾していないか
  - 正しい情報を「間違い」と批判するwrongFeedbackを作らないこと
  - 例: 正しいキー名を「キー名が異なります」と批判するケース → NG

**よくある誤りパターン：**
- **環境変数名の誤記:** 例）`CLAUDE_CODE_AUTOCOMPACT_*` → 正しくは `CLAUDE_AUTOCOMPACT_*`
- **コマンド動作の誤解:** 例）`--from-pr` はワークツリーでのPRレビューではなくセッションリンク
- **存在しない機能の記述:** ドキュメントで確認できない機能を正解・explanation・wrongFeedback に含めない
- **設定キー名の旧名称使用:** 例）`disallowedCommands` → 正しくは `permissions.deny`
- **スキル定義のキー名:** アンダースコアではなくハイフン区切り（例: `allowed-tools`）
- **数値の断定:** スコープ数・イベント数・対応モデル等は変動するため、ドキュメントで最新を確認
- **キーバインド動作:** ドキュメントに記載のない動作を正解にしない
- 生成後に必ずドキュメントと照合し、正解選択肢の根拠を確認すること
- **ドキュメントに記載のない数値を断定しない:** 具体的な数値がドキュメントに存在しない場合は断定しない。パターンは2種類ある: (a) ドキュメントが "Not specified" と明示しているケース（例: `BASH_DEFAULT_TIMEOUT_MS`のデフォルト）、(b) ドキュメントに数値自体が掲載されていないケース（例: 非アダプティブモデルの思考予算トークン数 — model-configページに具体値の記載なし）。いずれも「〜トークン」「〜秒」「〜文字」のような具体数値は使わず、「ドキュメントでは具体値が規定されていない」と表現するか、数値を含む問題設計を避ける
- **設定フィールド省略時のデフォルト動作を正確に:** explanation で「フィールドを省略すると〇〇になる」と記述する場合、そのデフォルト動作をドキュメントで確認する。デフォルト値は直感と逆になることがある（例: `spinnerVerbs.mode` のデフォルトは `"append"`（追加）。「省略=replace（置き換え）」は誤りで、置き換えには `"replace"` の明示が必要）
- **環境変数は settings ページのテーブルで実在を確認する:** question・options・explanation で言及する環境変数が settings ページの env var テーブルに記載されているか確認する。テーブルに存在しない env var は未ドキュメントとみなし、使用しない（例: `USE_BUILTIN_RIPGREP` は settings ページに記載なし → 使用禁止）
- **referenceUrl に新ドキュメントページを使う場合は VALID_DOC_PAGES を更新する:** `referenceUrl` に既存16ページ以外のページ（例: `plugin-marketplaces`）を使う場合、`src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストにそのページ名を追加しておく。追加を忘れると `npm test` が「unknown doc page」エラーで失敗する。生成後の `npm test` で初めて発覚することが多いため、生成前に新ページの使用予定を確認して先に追加しておくのが効率的
- **モデル固有機能のスコープを正確に:** 機能がどのモデルに対応するか個別に確認する（例: エフォートレベル調整は Opus 4.6 専用。「Opus 4.6とSonnet 4.6の両方」と書く前に model-config ページでモデル別対応を確認）
- **組み合わせ必須フラグを単体で示さない:** 複数フラグのセットで機能するものを単体フラグとして書かない（例: `--fork-session` → 正しくは `--continue --fork-session`）
- **パスの動的部分を省略しない:** テンプレート的なパスには変数部分を明示する（例: `~/.claude/projects/memory/` → 正しくは `~/.claude/projects/<project>/memory/`）
- **ドキュメントに存在しないフレーズを引用しない:** 「公式ドキュメントは『〜』を推奨」と書く場合、そのフレーズがドキュメント本文に実際に存在するか確認する
- **機能の非影響範囲を誤記しない:** 設定・フィールドが「何をしないか」もドキュメントで確認する。「A を有効にするとB も制限される」という記述は根拠なく書かない（例: `allowed-tools` はリスト外ツールを制限しない — 通常のパーミッションに委ねるだけ）
- **設定の副作用・無効化される機能を省略しない:** 設定・フラグの explanation を書く際は「何が有効になるか」だけでなく「何が無効化されるか」もドキュメントで確認して記載する。多機能な設定には両方が共存することが多く、後者の省略は学習者の実害につながる（例: `CLAUDE_CODE_SIMPLE=1` は基本ツールのみで動作するが、同時に MCPツール・フック・`CLAUDE.md` も無効化される — 後者を省略すると不完全な explanation になる）
- **除外条件の表現精度:** "up to but not including X" は「Xまで」ではなく「Xの手前まで（Xは含まない）」と表記する（例: "recurses up to but not including the root" → 「ルートの手前まで再帰的に」）
- **説明の論理的整合性:** explanation で原則・根拠を引用して結論を正当化する場合、その原則が結論を本当に支持しているか確認する（例: 「より具体的な指示が優先される」原則は、最も広域なマネージドポリシーの最高権限を支持しない — 逆の根拠を使っていないか注意）
- **セットアップコマンドの用途混同を避ける:** 複数のセットアップコマンドが存在する場合、それぞれの用途をドキュメントで確認する（例: `/terminal-setup` は Shift+Enter バインディング（一部ターミナル）と Option+T ショートカットの有効化に使用。`Alt+B`・`Alt+F`等の他のOption/Altショートカットには別途ターミナルで「Option as Meta」設定が必要）
- **CLIサブコマンド・スラッシュコマンドの存在確認:** 問題文・選択肢・explanation で言及する CLI サブコマンド（例: `claude commit`）やスラッシュコマンド（例: `/commit`）は、必ず公式 CLI リファレンスページで存在を確認する。ドキュメントに記載のないコマンドを正解・説明に含めてはいけない
- **ドキュメント未記載の旧名称・エイリアスを引用しない:** 「旧`/handoff`」「旧称〜」「以前は〜と呼ばれていた」等の記述はドキュメントで根拠を確認する。ドキュメントに記載のない旧称・エイリアスを explanation に含めてはいけない
- **固定フレーズ・ワークフロー名の翻訳精度:** 公式ワークフローの各フェーズ名は意味が変わる意訳を禁止する（例: 「Explore→Plan→Implement→**Commit**」の最後のフェーズを「検証」と訳すのは誤り — コミットと検証は全く異なる行為）
- **否定・限定文を追加する修正は排他性を再確認:** explanation や wrongFeedback に「〜ではありません」「〜とは異なります」「〜専用です」という否定・限定文を追加する場合、その否定が排他的に正確かをドキュメントで確認する。「AはBのためのもの」という説明はAがBだけに使われるか（他の用途がないか）を確認すること（例: `/terminal-setup` は「Shift+Enter専用」ではなく「Shift+Enter と Option+T の両方」に使われる）
- **選択肢内の表記形式を統一する:** 同一問題の選択肢間で、変数名・コマンド名・設定キーの記載形式を統一する。不正解選択肢が「`CLAUDE_CODE_TMPDIR`」のように具体的な名称を記載しているなら、正解選択肢にも同様に名称を記載する（例: `CLAUDE_CONFIG_DIR`（説明文）という形式）
- **`hint`フィールドは正解に向けて誘導する:** `hint`フィールドを書く場合、正解選択肢の特徴・用途に向けて誘導するヒントにする。問われているファイル・設定と別の概念を説明しないよう注意する（例: `CLAUDE.local.md` の問題で「すべてのプロジェクトに適用される設定はどこに」というヒントは `~/.claude/CLAUDE.md` の説明であり逆方向になる）
- **ドキュメント未記載のプラットフォームを言及しない:** question・選択肢・explanation で言及するインターフェース・プラットフォーム（iOS アプリ、ブラウザ拡張等）がドキュメントに記載されているか確認する（例: `/teleport` を「iOSアプリからのセッション引き継ぎ」と書いたが docs は「claude.ai web session」のみ記載）
- **設定・フラグの「無視される条件」を明示する:** 「X=0 で全モデル Y を無効化できる」のような全称断定は避ける。設定値が特定条件下で「無視される」場合はその条件を明示する（例: `MAX_THINKING_TOKENS=0` は Opus/Sonnet 4.6 ではアダプティブ推論中は無視されるため全モデル無効化にならない。`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` を設定した上でのみ有効）
- **動作表現はドキュメントの正確な動詞を使う:** 「削除される」「切り捨てられる」「無効化される」はドキュメントの表現と意味が異なる場合がある（例: docs の `"not loaded automatically"` を「切り捨てられる」と書くと、ファイルが削除される印象を与えて誤り — 実際にはファイルは存在するがロード対象外）
- **hookのexit codeと出力先を正確に書く:** exit 0: stdout が Claude のコンテキストに追加される。exit 1: stderr がユーザーに表示される（処理は継続）。exit 2: ブロッキングエラー — stderr の送信先は**イベントによって異なる**（`PreToolUse`/`PostToolUse` 等ではClaudeへのフィードバック、`Notification`/`SessionStart` 等ではユーザーへの表示のみ）。「全イベントで exit 2 は Claude へのフィードバック」という一般化は誤り — イベントごとにドキュメントの「Exit code 2 behavior per event」テーブルで確認する
- **条件固有の動作を別の条件に一般化しない:** ある条件A（イベント・コマンド・ツール等）における動作が正しくても、別の条件Bに同じ動作が適用できるとは限らない（例: exit 2 の stderr 送信先は Hook イベントによって異なる）。Hooks・設定スコープ・ツール動作等で「一般則のように見えるが実は条件依存」なものは、各条件をドキュメントで個別確認すること
- **UI固有の詳細動作を問う問題を作らない:** セッションピッカー・ダイアログ等の UI 固有の詳細（キーバインド、選択肢の表示順、グループ化方式等）はドキュメントに明記されていない場合が多い。「Pキーでプレビュー」「フォーク済みセッションはルートの下にグループ化」等の UI 内部動作を断定した問題は作らない。ドキュメントで確認できる機能（コマンドの動作・CLIフラグの挙動）のみを問う
- **外部知識・汎用LLM知識をClaude Code固有動作として断言しない:** Anthropic APIやプロンプトエンジニアリングの一般知識（例: 「think」「think hard」「ultrathink」という記述が思考トークンを増やす）を、Claude Code docs に記載がないままClaude Code固有の動作として問題文や explanation・wrongFeedback に含めない。Claude Code として公式に記載されている動作のみを根拠にする。「一般的なLLMでの挙動」と「Claude Code ドキュメントに記載された挙動」を区別すること
- **サードパーティプロバイダー名・サービス名の正式表記を使う:** 問題文・選択肢・explanation でサードパーティサービスを言及する場合、ドキュメントの正式表記を確認する（例: 「Microsoft Foundry」→「Microsoft Azure Foundry」のような略称・非公式名称に注意）

### 内部一貫性チェック（生成直後に必ず確認）

問題を書いたら、フィールド間の矛盾がないか自己チェックする：

1. **question ↔ explanation の整合性**
   - 問題文が「〜について問う」内容と、explanation・正解が説明している内容が一致しているか
   - 例NG: question「Extended Thinkingの確認方法を問う」、正解「verbose出力に切り替える」→ 不一致

2. **explanation ↔ wrongFeedback の整合性**
   - explanation で述べている事実と wrongFeedback の内容が矛盾していないか
   - 例NG: explanation「他のツールは通常のパーミッション設定に従います」、wrongFeedback「リストにないツールも制限されます」→ 矛盾

3. **wrongFeedback 同士の整合性**
   - ある選択肢の wrongFeedback が別の選択肢の内容を肯定してしまっていないか

4. **既存クイズとのクロス一貫性**
   - 生成した問題が既存の別クイズの explanation・wrongFeedback と矛盾していないか
   - 例NG: 既存問題「`agent`フィールドの組み込みエージェントは3種類（`Explore`、`Plan`、`general-purpose`）」と矛盾する問題を新規作成する
   - 確認方法: 同カテゴリの既存問題を `Grep` で検索し、同じ概念（設定スコープ数・エージェント種別・Hook数等）の記述が統一されているか確認する

### referenceUrl のアンカー指定

referenceUrlにアンカー（`#fragment`）を付ける場合、実際のページ見出しと一致させること。アンカーはドキュメント更新で変わりうるため、WebFetchで再確認すること。

**memoryページの既知のアンカー:**
- `#claudemd-imports`（`@`インポート関連）
- `#determine-memory-type`（メモリ階層・スコープ関連）
- `#directly-edit-memories-with-memory`（`/memory`コマンド関連）
- `#how-claude-looks-up-memories`（サブディレクトリ検索関連）
- `#user-level-rules`（ユーザールール関連）

**skillsページの既知のアンカー:**
- `#run-skills-in-a-subagent`（サブエージェント実行関連）

## Post-Generation Steps（重要）

問題追加後、以下を必ず実行してください：

1. **correctIndex をランダム化:**
   ```bash
   npm run quiz:randomize
   ```

2. **品質チェック:**
   ```bash
   npm run quiz:check
   ```

3. **テスト実行:**
   ```bash
   npm test
   ```

4. **統計確認:**
   ```bash
   npm run quiz:stats
   npm run quiz:coverage
   ```

## Arguments

- `$ARGUMENTS` に数値が指定された場合、その問題数だけ生成（例: `/generate-quiz-data 20` で20問生成）
- 引数なしの場合は、各カテゴリから均等に計16問（各カテゴリ2問）のサンプルを生成
- 生成数に応じてカテゴリ比率を維持すること
- カバレッジの低いドキュメントページを優先的にカバーすること
