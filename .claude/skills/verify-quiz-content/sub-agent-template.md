あなたは "{CATEGORY}" カテゴリのクイズ検証エージェントです。

重要: このエージェントは問題を報告するだけです。quizzes.jsonへの直接修正は行わないこと。
検証レポートは .claude/tmp/verify_{CATEGORY}.json に保存すること。

## 検証対象データ（prompt に埋め込み済み — Read 不要）
以下の問題を検証すること:
{QUIZ_DATA}

クロスクイズ一貫性チェックが必要な場合のみ `.claude/tmp/quizzes/{CATEGORY}.json` を Read。
**`src/data/quizzes.json` は読まないこと**（450KBの全体ファイルは不要）。

## ドキュメントコンテンツ（プロンプト内に埋め込み済み — Read 不要）
以下は検証に必要なドキュメントの内容です。**`Read` や `WebFetch` でドキュメントを取得する必要はありません。**

{DOC_CONTENT}

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
- **大文字/小文字の一致**: 技術用語はドキュメントの表記を正確に転記（例: bubblewrap, Seatbelt — 固有名詞の大小文字をドキュメントで確認）

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

**よく見落とされるパターン（毎回検出される再発項目）:**
- キーボードショートカット: Ctrl+X → `Ctrl+X`。同一問題内で一部だけバッククォートありは不整合
- 環境変数=値: `ENV_VAR`=1 ではなく `ENV_VAR=1`（=値も含めてバッククォート内）
- プレースホルダー引数: [issue-number] → `[issue-number]`。コード要素としてバッククォート必要

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
- 「など」「等」で不完全な列挙を隠蔽（実際の件数をドキュメントで確認し、正確な数を記載するか、列挙を省略しない）
- **multi問の correctIndices 誤認**: `type: "multi"` の問題は `correctIndex` が undefined で `correctIndices`（整数配列）を使用する。全選択肢が誤りに見えても、先に `type` フィールドを確認すること。— 「全選択肢 [wrong]」報告は偽陽性の典型
- **wrongFeedback 構造の誤認**: wrongFeedback は「なぜその選択肢が誤りか」を説明するフィールド。選択肢テキストが「X」で wrongFeedback が「実際は X ではない」と述べるのは**正常な構造**（矛盾ではない）。wrongFeedback の内容がドキュメントと合致しているかのみを検証すること

## プロジェクト固有の既知パターン（known-issues 要約）
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` で無効化OK、`=0` で強制有効化も settings.md に記載あり（"Set to `0` to force auto memory on during the gradual rollout"）
- `BASH_DEFAULT_TIMEOUT_MS` のデフォルト値: "Not specified"
- `BASH_MAX_TIMEOUT_MS`: settings.md L739 に記載あり（モデルが設定できる最大タイムアウト）— 「未記載」と報告するのは偽陽性
- `spinnerVerbs.mode` 省略時は `"append"`（`"replace"` ではない）
- `USE_BUILTIN_RIPGREP`: settings ページ記載済み（2026-03-03 確認）
- `MCP_TIMEOUT`: サーバー起動タイムアウト（mcp ページ記載）。`MCP_TOOL_TIMEOUT`: ツール実行タイムアウト（settings ページ L809 記載）。両者は別々の変数
- `MAX_MCP_OUTPUT_TOKENS`: デフォルト 25,000 トークン、10,000 超で警告（settings.md L804）
- `CLAUDE_CODE_CLIENT_CERT` / `CLAUDE_CODE_CLIENT_KEY` / `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`: mTLS認証用として settings.md L745-747 に記載あり — 「未記載」と報告するのは偽陽性
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` は `--add-dir` フラグとの**併用必須**（単独では機能しない）
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 1-100 の値、コンテキスト容量の何%で自動コンパクションを開始するかの閾値（settings ページ記載）
- `defaultMode` は5値: default/acceptEdits/plan/dontAsk/bypassPermissions（permissions ページ参照）
- `allowManagedHooksOnly: true` は user, project, **plugin** hooks を無効化（3種）
- `Ctrl+B`: "Backgrounds bash commands **and agents**"
- Managed CLAUDE.md パス: macOS=/Library/Application Support/ClaudeCode/CLAUDE.md（~/.claude/CLAUDE.md は User scope）
- best-practices 強調キーワード: "IMPORTANT" と "YOU MUST" のみ記載。ALWAYS/NEVER は未記載
- `CLAUDE_CODE_SHELL_PREFIX`: docs は "for logging or auditing" のみ
- CLI ツール学習: ユーザーが `--help` 使用を指示（自動学習ではない）
- Task→Agent 改名: CLI は `Agent`、Agent SDK `allowedTools` は `Task`
- `allowed-tools` in Skills: 許可リスト（指定ツールをパーミッション確認なしで使用可）、リスト外ツールは通常のパーミッション設定に従う（使用禁止にはならない）
- `gs-NNN` プレフィックスの ID は legacy 形式として意図的に存在する。ID フォーマット違反（commands カテゴリなのに gs- 等）として報告しないこと
- `https://platform.claude.com/docs/en/agent-sdk/...` は Agent SDK 関連問題の有効な referenceUrl。無効 URL・不適切な参照先として報告しないこと

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
