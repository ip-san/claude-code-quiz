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

## Step 1: ドキュメント事前キャッシュ + 差分抽出

### 1a. ドキュメントキャッシュ

```bash
npm run docs:fetch
```

- キャッシュ先: `.claude/tmp/docs/{page-name}.md`
- 有効期限: 24時間（`--force` で強制再取得）

### 1b. 差分抽出（高速化の要）

```bash
npm run verify:diff              # 差分モード（通常）
npm run verify:diff:full         # フルスキャン（定期的に実行）
npm run verify:diff -- memory    # 特定カテゴリのみ
```

差分モードは以下の3条件で再検証対象を判定：
1. **新規問題**: 前回検証時に存在しなかった問題
2. **内容変更**: question/options/explanation/referenceUrl のハッシュが変化
3. **ドキュメント変更**: その問題のカテゴリが参照するドキュメントが更新された

結果は `.claude/tmp/verify-targets.json` に保存される。

**`--full` フラグ**: エージェント見落としのキャッチ用。バージョンアップ時や定期的に実行を推奨。

### 1c. 検証対象の確認

`.claude/tmp/verify-targets.json` を Read で読み込み、検証対象カテゴリとドキュメントマッピングを確認する。

- `targets`: 検証が必要な問題リスト
- `categoryDocMap`: カテゴリごとに読むべきドキュメント一覧
- `skippedCount`: スキップされた問題数

**targets が 0 件の場合**: 差分なし。「検証対象なし」と報告して終了。

diff コマンドは同時にカテゴリ別クイズデータを `.claude/tmp/quizzes/{category}.json` に分割出力する。
各ファイルにはそのカテゴリの全問題が含まれ、検証対象の問題には `_needsVerification: true` フラグが付く。

## Step 2: Fact Verification

**差分抽出で特定されたカテゴリのみサブエージェントを起動する。**

各カテゴリのサブエージェントには以下を prompt に含める：

1. **カテゴリ別クイズファイルのパス**（`.claude/tmp/quizzes/{category}.json` — 全体450KBではなく30〜120KB）
2. **読むべきドキュメント一覧**（categoryDocMap から取得）
3. **補助情報（後述の「サブエージェント用プロンプトテンプレート」参照）**

```
# サブエージェント起動パターン
Task (subagent_type: general-purpose) for each category with targets:
  1. `.claude/tmp/quizzes/{category}.json` を Read（全体JSONではなくカテゴリ分のみ）
  2. `.claude/tmp/docs/` から categoryDocMap に指定されたドキュメントのみ Read
     （キャッシュが存在しない場合のみ WebFetch でフォールバック）
  3. `_needsVerification: true` の問題のみ検証（他は一貫性チェックの参照用）
  4. 差異を報告
```

引数で特定カテゴリが指定された場合は、そのカテゴリのみ実行。

**注意:** API の並列呼び出し上限により、一度に起動するサブエージェントは最大4つまでとする。

### サブエージェント用プロンプトテンプレート

以下のテンプレートの `{CATEGORY}`, `{DOC_PAGES}` を置き換えてサブエージェントに渡す。
**補助情報（known-issues, doc-references）はテンプレートに埋め込み済みなので、サブエージェントが別ファイルを Read する必要はない。**

````
あなたは "{CATEGORY}" カテゴリのクイズ検証エージェントです。

重要: このエージェントは問題を報告するだけです。quizzes.jsonへの直接修正は行わないこと。
検証レポートは .claude/tmp/verify_{CATEGORY}.json に保存すること。

## データ読み込み（重要: 全体JSONではなくカテゴリ別ファイルを使用）
1. `.claude/tmp/quizzes/{CATEGORY}.json` を Read（カテゴリ分のみ、30〜120KB）
   - `_needsVerification: true` の問題が検証対象
   - それ以外の問題はクロスクイズ一貫性チェックの参照用
2. **`src/data/quizzes.json` は読まないこと**（450KBの全体ファイルは不要）

## ドキュメント参照
まず `.claude/tmp/docs/` のキャッシュ済みファイルを Read で読むこと。
キャッシュが存在しない場合のみ WebFetch でフォールバック。
必要なページ: {DOC_PAGES}

## 検証チェックリスト

### A. 事実の正確性
検証対象フィールドは **question・options[].text・explanation・options[].wrongFeedback の全て**。
- question に含まれる前提・数値・機能名がドキュメントと一致しているか
- 正解選択肢がドキュメントの内容と一致しているか
- explanation が正しい情報を含んでいるか
- wrongFeedback がドキュメントと矛盾していないか

### B. 用語・名称の正確性
- API やコマンド名が正式名称か
- 設定ファイル名やパスが正しいか
- サードパーティプロバイダー名は専用ドキュメントページの H1 タイトルを最終権威として確認

### C. リファレンス URL の有効性
- referenceUrl が有効か、アンカーがページ見出しと一致するか
- referenceUrl の参照先が問題内容に最も直接的か

### D. 内部一貫性
- question ↔ explanation の整合性
- explanation ↔ wrongFeedback の整合性
- wrongFeedback 同士の整合性

### E. バッククォート書式
コード用語・ファイルパス・コマンド・環境変数・設定キーがバッククォートで囲まれているか。
対象: ツール名(Bash,Read,Edit等), Hookイベント名, ファイルパス, 設定キー, 環境変数, スラッシュコマンド, CLIフラグ, 技術用語(ripgrep,bypassPermissions等)

## よくある誤りパターン
- ドキュメントで確認できない機能を含めてしまう
- 列挙の「数」が古い（設定スコープ・Hookイベント等）
- 環境変数の逆値動作の断定（`VAR=1` の動作 → `VAR=0` で逆とは限らない）
- ドキュメントに記載のない数値の断定
- デフォルト動作の誤断言
- CLIフラグの組み合わせ省略（`--fork-session` は `--continue` と併用必須）
- 存在しないフレーズの引用
- 外部知識の混入（Claude Code docs に記載のない動作を固有動作として断言）
- ドキュメントの例示を完全リストと誤認（「e.g.」で列挙されているものは例示）

## プロジェクト固有の既知パターン（known-issues 要約）
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` で無効化OK、`=0` で有効化は根拠なし
- `BASH_DEFAULT_TIMEOUT_MS` のデフォルト値: "Not specified"
- `spinnerVerbs.mode` 省略時は `"append"`（`"replace"` ではない）
- `USE_BUILTIN_RIPGREP`: 未ドキュメント。`MCP_TIMEOUT`: mcp ページに記載あり
- `defaultMode` は5値: default/acceptEdits/plan/dontAsk/bypassPermissions（permissions ページ参照）
- `allowManagedHooksOnly: true` は user, project, **plugin** hooks を無効化（3種）
- `Ctrl+B`: "Backgrounds bash commands **and agents**"
- Managed CLAUDE.md パス: macOS=/Library/Application Support/ClaudeCode/CLAUDE.md（~/.claude/CLAUDE.md は User scope）
- best-practices 強調キーワード: "IMPORTANT" と "YOU MUST" のみ記載。ALWAYS/NEVER は未記載
- `CLAUDE_CODE_SHELL_PREFIX`: docs は "for logging or auditing" のみ
- CLI ツール学習: ユーザーが `--help` 使用を指示（自動学習ではない）
- Task→Agent 改名: CLI は `Agent`、Agent SDK `allowedTools` は `Task`

## referenceUrl マッピング
| 機能カテゴリ | 推奨ページ |
|-------------|-----------|
| 環境変数 | settings |
| CLIワークフロー | common-workflows |
| スラッシュコマンド | interactive-mode |
| コア動作（ツールカテゴリ等） | how-claude-code-works |
| ベストプラクティス | best-practices |
| CLAUDE.md 刈り込み | best-practices |
| 画像添付・クリップボード | interactive-mode |

## 既知の正しいアンカー（memory ページ）
- `#import-additional-files`, `#choose-where-to-put-claudemd-files`
- `#view-and-edit-with-memory`, `#how-claudemd-files-load`
- `#user-level-rules`, `#path-specific-rules`

## レポート形式
```json
{
  "category": "{CATEGORY}",
  "verified": ["id1", "id2"],
  "issues": [
    {
      "id": "xxx-NNN",
      "severity": "critical|major|minor|info",
      "type": "fact|terminology|url|consistency|backtick|quality",
      "field": "question|options|explanation|wrongFeedback|referenceUrl",
      "current": "現在の内容",
      "expected": "正しい内容",
      "reference": "参照ドキュメント"
    }
  ]
}
```
````

### Verification Checklist（主エージェント用完全版）

各クイズ問題について以下を検証：

#### A. 事実の正確性

検証対象フィールドは **question・options[].text・explanation・options[].wrongFeedback の全て**。

- **question（問題文）** に含まれる前提・数値・機能名・用語がドキュメントと一致しているか
- **正解選択肢** がドキュメントの内容と一致しているか
- **explanation** が正しい情報を含んでいるか（注記文・CLIフラグ・環境変数・機能名も確認）
- **wrongFeedback** がドキュメントと矛盾していないか（「〜ではありません」という批判内容自体が正確か確認）

**検証の原則:**
- 数値（スコープ数、イベント数、モデル対応範囲など）は公式ドキュメントで都度確認する。過去の正解が最新とは限らない
- 環境変数名・設定キー名・コマンドフラグは正式名称をドキュメントと照合する
- wrongFeedback の内容もドキュメントと矛盾していないか確認する

**よくある誤りパターン（汎用原則）:**

- ドキュメントで確認できない機能を正解・explanation・wrongFeedback に含めてしまう
- 列挙の「数」が古い（設定スコープ・Hookイベント・ツールカテゴリ等。question の前提として現れる場合も含む）
- explanation 内の「注意：〜」注記が事実に反している
- **環境変数の逆値動作の断定:** `VAR=1` の動作がドキュメントに記載されていても、`VAR=0` で逆の動作ができるとは限らない。ドキュメントに明記されている場合のみ記載する
- **ドキュメントに記載のない数値を断定:** 「〜トークン」「〜秒」「〜文字」のような数値断定はドキュメントで根拠を確認すること
- **ドキュメント記載の制限・数値を「未規定」と断定（逆方向の誤り）:** 不正解選択肢の具体的な数値を否定しようとして「数値は存在しない」と wrongFeedback に書くと、別の正しい数値もまとめて否定してしまうリスクがある
- **デフォルト動作の断言:** 「フィールドを省略すると〇〇になる」はドキュメントで明示的に確認する。デフォルト値は直感と逆になることがある
- **概要ページだけを見て設定値の完全リストを判断しない:** 設定の有効値リストがリンク先の専用ページにある場合がある
- **CLIフラグの組み合わせ省略:** 単独では動作しないフラグを単体で示していないか
- **パスの動的部分の省略:** テンプレート的なパスの変数部分が欠落していないか
- **存在しないフレーズの引用:** 「公式ドキュメントは『〜』を推奨」と書く場合、その正確なフレーズがドキュメント本文に存在するか確認する
- **機能間の「同一」「同等」断言:** ドキュメントで両者の関係を確認する。見た目が似た2つの機能が実は別実装の可能性がある
- **設定の副作用・無効化される機能の欠落:** 「何が有効になるか」だけでなく「何が無効化されるか」もドキュメントで確認する
- **CLI サブコマンド・スラッシュコマンドの存在確認:** ドキュメントに記載のないコマンドを正解・説明に含めてはいけない
- **ドキュメント未記載の旧名称・エイリアス:** 「旧称〜」「以前は〜と呼ばれていた」等の記述はドキュメントで根拠を確認する
- **修正時に導入される否定文の検証:** 「〜ではありません」「〜専用です」という否定・限定文の排他的正確性をドキュメントで再確認する
- **設定・フラグの「無視される条件」の欠落:** 全称断定は、その設定が特定条件下で無視されないかをドキュメントで確認する
- **動作表現の精度:** ドキュメントの正確な動詞・表現を使う。「削除される」と「ロードされない」は意味が異なる
- **条件固有の動作を別の条件に一般化しない:** ある条件での動作が、類似する別の条件にも適用できるとは限らない
- **UI 固有の詳細動作の断定禁止:** ドキュメントに明記されていない UI の詳細は問わない。ただしドキュメントに記載されている UI 機能は検証対象
- **外部知識・汎用LLM知識の混入:** ドキュメントに記載のない動作を Claude Code 固有の動作として断言してはいけない
- **制限・許可設定の列挙完全性:** 「Xのみが許可」の場合、ドキュメントの完全な許可リストを確認する。不完全な列挙は誤り
- **「完全な復元」等の表現:** 復元されるものと復元されないものの区別を確認する
- **過去の MEMORY 記録を最終権威にしない:** 重要な固有名詞・設定値は専用ページで再検証する
- **異なるサブシステムのフィールド名・用語の混入:** 文脈に合ったフィールド名を使用しているか確認する
- **ドキュメントの「A and B」を「A」のみ引用:** 対象が複数ある場合はドキュメントの列挙を完全に反映すること

> 各パターンの **具体例** は **`known-issues.md`** を参照

#### B. 用語・名称の正確性

- API やコマンド名が正式名称か
- イベント名やフック名が正確か
- 設定ファイル名やパスが正しいか
- サードパーティプロバイダー名・サービス名の正式表記は **専用ドキュメントページの H1 タイトルを最終権威** として確認する
- SDK・ライブラリ名の改名確認: 旧称を補足として記載する場合は「旧称：〜」と明示する。**改名を1箇所修正した後は、同じ旧名称が quiz 全体の他の問題にも残っていないか Grep で全件検索する**。ただし旧名称が特定コンテキストで依然として正しい場合もある（CLI 文脈か SDK 文脈かを確認）

#### C. リファレンス URL の有効性

- referenceUrl が有効な URL か
- リンク先のページが存在するか
- **アンカー（`#fragment`）が実際のページ見出しと一致するか** — アンカー不一致は頻出するため重点チェック
- **referenceUrl の参照先ページが問題内容に最も直接的か確認する**

> 機能別の推奨マッピング・既知のアンカーは **`doc-references.md`** を参照

#### D. 最新性

- 廃止された機能を参照していないか
- 名称変更された機能の旧名を使っていないか

#### D2. バッククォート書式

- コード用語・ファイルパス・コマンド・環境変数・設定キーがバッククォートで囲まれているか
- question, options[].text, explanation, options[].wrongFeedback すべてが対象
- ディレクトリパス（`.claude/`）の末尾パターンに注意: `.claude/memory.txt` の途中で切れないこと
- **URL・ファイルパス途中へのバッククォート挿入禁止:** URL 文字列やファイルパスの途中にバッククォートを挿入してはいけない。パス・URL 全体をまとめてバッククォートで囲む

> 対象用語リストは **`doc-references.md`** を参照

#### D3. 内部一貫性チェック

問題内部のフィールド間で矛盾がないか確認する：

- **question ↔ explanation の整合性**
- **explanation ↔ wrongFeedback の整合性**
- **wrongFeedback 同士の整合性**
- **選択肢の相互矛盾**

#### E. 問題の質（暗記問題チェック）

以下のパターンに該当する問題を「要リライト」として報告する：
- **丸暗記型:** デフォルト値・パス・キーバインド・環境変数名をそのまま問う
- **表面的:** 「〜とは何ですか」「〜の名前は」のような定義の暗記
- **シナリオなし:** 実務的な状況設定がなく、知識の有無だけで回答できる

#### E2. wrongFeedback の品質チェック

**完全NGパターン（即修正）:**
- 「この選択肢は正しくありません。正解の解説を参照してください。」

**要改善パターン:**
- 「これは正しくありません」「この機能は存在しません」（抽象的すぎる）
- 一文で終わり、何をするかの説明なし

#### E3. 不正解選択肢のもっともらしさ

不正解選択肢が「明らかに間違い」ではなく「もっともらしい」ものになっているか。

#### F. 重複・冗長チェック

- **完全重複・類似重複・カバレッジ偏り** を特定

#### G. クロスクイズ一貫性チェック

同一カテゴリ内の複数問題が互いに矛盾していないか確認する。

## Output Format

### 問題なしの場合
```
## 検証結果サマリー

✅ 全 [N] 問の検証が完了しました。
- 自動テスト: PASS
- ファクトチェック: memory 28問 OK, skills 26問 OK, ...
- モード: incremental (差分: X問検証, Y問スキップ)

重大な問題は見つかりませんでした。
```

### 問題ありの場合
```
## 検証結果サマリー

⚠️ [N] 件の問題が見つかりました。
- モード: incremental (差分: X問検証, Y問スキップ)

### Critical Issues (修正必須)

| Quiz ID | 問題内容 | 現在の内容 | 正しい内容 | 参照元 |
|---------|---------|-----------|-----------|--------|

### Minor Issues (推奨修正)
### 暗記問題（要リライト）
### 重複・冗長
### バッククォート書式
### wrongFeedback 品質
```

## Severity Levels

- **Critical**: 事実と異なる情報（正解が間違い、存在しない機能など）
- **Major**: 用語・名称の不一致（旧名称の使用、typo等）
- **Minor**: 数値の更新推奨、リンク切れの可能性
- **Info**: スタイルや表現の改善提案

## Arguments

- `$ARGUMENTS` にカテゴリ名を指定した場合、そのカテゴリのみ検証
  - 例: `/verify-quiz-content memory` → memory カテゴリのみ
  - 例: `/verify-quiz-content extensions tools` → 複数カテゴリ指定可能
- `--full` を含む場合はフルスキャン（差分なしで全問検証）
  - 例: `/verify-quiz-content --full`
  - 例: `/verify-quiz-content memory --full`
- 引数なしの場合は差分モードで全カテゴリを検証

## Post-Verification

検証完了後、問題が見つかった場合は：

1. **サブエージェント報告の実データ照合（修正前に必須）**
2. 修正内容をユーザーに確認（修正範囲の選択肢を提示）
3. 承認後、修正を実施

### 検証サブエージェントは REPORT 専用にすること

**サブエージェントに `quizzes.json` を直接修正させてはいけない。** 複数のエージェントが同じ JSON ファイルを並列で書き換えると、バージョン番号の競合や内容の巻き戻しが発生する。

**正しいワークフロー:**
1. 検証エージェントは「報告のみ」を実施（ファイル変更禁止）
2. 主エージェント（このスキルを実行している Claude）が報告を受け取り、実データを照合してから修正を適用
3. バージョン番号のインクリメントも主エージェントが一括管理する

### サブエージェント報告の照合

サブエージェントが報告した Critical・Major の問題は、**修正を実施する前に必ず実際の JSON データを直接読み込んで照合すること**。

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

### 修正後の必須手順

```bash
npm run quiz:randomize   # correctIndex 再ランダム化
npm run quiz:check       # 構造チェック
npm test                 # 全テスト通過確認
npm run verify:save      # 検証状態を保存（次回の差分用）
npm run quiz:stats       # 分布確認
```
