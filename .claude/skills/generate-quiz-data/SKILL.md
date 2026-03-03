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
   - **機能別 referenceUrl の推奨マッピング:** `.claude/skills/verify-quiz-content/doc-references.md` を参照
5. **日本語:** 問題文・選択肢・解説・wrongFeedbackはすべて日本語
6. **選択肢4つ:** 各問題に正確に4つの選択肢を含める
7. **バッククォート書式:** コード用語・ファイルパス・コマンド・環境変数・設定キーはバッククォートで囲む（ツール名・Hookイベント名・パス・env var・スラッシュコマンド・CLIフラグ・設定キー・技術用語が対象）
   - 問題文・選択肢・解説・wrongFeedbackすべてに適用する
   - **URL・ファイルパス途中へのバッククォート挿入禁止:** パス・URL 全体をまとめてバッククォートで囲む
   - 対象用語の完全リスト: `.claude/skills/verify-quiz-content/doc-references.md` を参照

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

生成時に最も頻発する原則違反。**全フィールド（question・options・explanation・wrongFeedback）が対象。**

1. **存在しない機能・コマンドの記述:** CLI サブコマンド・スラッシュコマンド・環境変数・設定キーは必ずドキュメントで存在を確認する。環境変数は settings ページの env var テーブルで照合する
2. **数値の未検証断定:** スコープ数・イベント数・トークン数・デフォルト値等は変動する。ドキュメントに具体値がない場合は数値を含む問題設計を避ける
3. **外部知識の混入:** Claude Code docs に記載のない動作を Claude Code 固有の動作として断言しない
4. **設定の副作用の欠落:** 「何が有効になるか」だけでなく「何が無効化されるか」もドキュメントで確認して記載する
5. **組み合わせ必須フラグの単体提示:** `--fork-session` → 正しくは `--continue --fork-session`。パスの動的部分も省略しない
6. **存在しないフレーズの引用:** 「公式ドキュメントは『〜』を推奨」と書く場合、そのフレーズがドキュメント本文に実在するか確認する
7. **条件固有の動作の一般化:** ある条件での動作が別の条件にも適用できるとは限らない（例: Hook exit code 2 の送信先はイベントにより異なる）
8. **referenceUrl に新ページを使う場合:** `src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストに追加が必要（`npm test` が失敗する）

> 検証ラウンドで蓄積された具体例・教訓は verify スキルの `known-issues.md` を参照

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

**memoryページの既知のアンカー（2026-03-01 確認済み）:**
- `#import-additional-files`（`@`インポート関連）
- `#choose-where-to-put-claudemd-files`（メモリ階層・スコープ関連）
- `#view-and-edit-with-memory`（`/memory`コマンド関連）
- `#how-claudemd-files-load`（サブディレクトリ検索・ロード順関連）
- `#user-level-rules`（ユーザールール関連）
- `#path-specific-rules`

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
