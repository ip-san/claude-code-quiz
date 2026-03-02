# Known Issues — 過去の検証で発見された個別パターン

> このファイルは SKILL.md の汎用原則を補足する **プロジェクト固有の具体例・教訓** です。
> 各項目は SKILL.md の汎用パターンと対応しており、検証時に「このパターンに該当しないか」を確認する用途で使います。

## 環境変数の逆値動作

- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` で無効化は記載済みだが、`=0` で強制有効化はドキュメントに根拠なし
- env var のフラグ系（`DISABLE_*`, `ENABLE_*`）は片方向の動作のみ記載されていることが多い

## 未記載の数値の断定

- `BASH_DEFAULT_TIMEOUT_MS` のデフォルト値: ドキュメントが "Not specified" と明示
- 非アダプティブモデルの思考予算トークン数: model-config ページに具体値の記載なし
- `CLAUDE.md` の行数制限: docs は "target under 200 lines per CLAUDE.md file" と明記 — 「具体的な行数制限は定められていません」は誤り

## デフォルト動作

- `spinnerVerbs.mode` を省略すると `"append"`（追加）がデフォルト。「省略=replace（置き換え）」は誤り

## 環境変数の照合

- `USE_BUILTIN_RIPGREP`: settings ページの env var テーブルに記載なし → 未ドキュメント
- `MCP_TIMEOUT`: settings ページにはないが、mcp ページの Tips セクションに記載 → ドキュメント化済み
- `MCP_TOOL_TIMEOUT`: 未ドキュメント

## settings ページとリンク先の乖離

- `defaultMode` 有効値は `default`/`acceptEdits`/`plan`/`dontAsk`/`bypassPermissions` の5つ。settings ページの例 `acceptEdits` だけを見て「4つ」と誤判定するパターンは v4.22.0 で実際に発生。完全なリストは permissions ページ（`/en/permissions#permission-modes`）にある

## VALID_DOC_PAGES の更新

- `npm test` が「unknown doc page」エラーで失敗する場合、`src/infrastructure/validation/quizContentQuality.test.ts` の `VALID_DOC_PAGES` リストに該当ページ名を追加する
- 過去に追加が必要だったページ: `plugin-marketplaces`, `sandboxing`

## モデル固有機能のスコープ

- エフォートレベル調整は Opus 4.6 専用、Sonnet 4.6 には非対応
- `MAX_THINKING_TOKENS`（非ゼロ値）は Opus/Sonnet 4.6 ではアダプティブ推論中は無視される — `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` を設定した上でのみ有効
- **ただし `MAX_THINKING_TOKENS=0` はどのモデルでも thinking を完全に無効化できる例外** — docs: "The one exception: setting MAX_THINKING_TOKENS=0 still disables thinking entirely on any model."

## スキル定義のキー名形式

- スキル定義のキー名はアンダースコアではなくハイフン区切り（例: `allowed-tools` であり `allowed_tools` ではない）

## Hook の exit code 詳細

- exit 0: stdout が Claude のコンテキストに追加
- exit 1: stderr がユーザーに表示されエラーとして記録（処理は継続）
- exit 2: ブロッキングエラー — stderr の送信先は **イベントによって異なる**
  - `PreToolUse`/`PostToolUse`/`UserPromptSubmit` → Claude へのフィードバック
  - `Notification`/`SessionStart`/`SessionEnd` 等 → ユーザーへの表示のみ
- イベントごとの動作はドキュメントの「Exit code 2 behavior per event」テーブルで個別確認すること

## UI 固有の詳細（ドキュメント記載済み）

- セッションピッカーのキーバインドは `common-workflows`（"Use the session picker" セクション）に掲載済み: `P`=プレビュー、`R`=リネーム、`B`=ブランチフィルター、`/`=検索、`A`=全プロジェクト切替、`↑↓`=ナビゲート
- フォーク済みセッションがルートセッション下にグループ化されることも同ページに明記
- これらは「UI内部動作」ではなく「ドキュメント記載の機能」として検証対象になる

## セッション再開の注意事項

- docs は "Your full conversation history is restored, **but session-scoped permissions are not**. You'll need to re-approve those." と明記
- 「完全な」「シームレスに」という表現がこの制約を隠している場合は注記を追加すること
- 参照: `how-claude-code-works` "Resume or fork sessions" セクション

## 許可設定の列挙完全性

- `allowManagedHooksOnly: true` は「Managed設定の Hooks **と SDK Hooks** のみ」が許可される。「Managed設定のHooksのみ」は SDK Hooks が欠落

## サブシステム間のフィールド名混入

- `sandbox.network.allowManagedDomainsOnly` の説明で `deniedMcpServers`（MCP サーバーの設定名）を引用していた事例 — 正しくは「拒否ドメイン（denied domains）」。ネットワークドメインと MCP サーバーは別のサブシステム

## 存在しないフレーズの引用（具体例）

- "Delegate, don't dictate" はドキュメントに未掲載
- "Ruthlessly prune" / "Keep it concise" も memory ベストプラクティスページに記載なし
- 実際は "Review periodically" "Be specific" "Use structure to organize"

## CLIフラグの組み合わせ（具体例）

- `--fork-session` は単独では動作しない → 正しくは `--continue --fork-session`

## パスの動的部分（具体例）

- `~/.claude/projects/memory/` → 正しくは `~/.claude/projects/<project>/memory/`

## SDK・ライブラリの改名履歴

- 「Claude Code SDK」→「Claude Code Agent SDK」→「Claude Agent SDK」と改名済み
- `Task` ツールは Claude Code CLI では `Agent` に改名されたが、Agent SDK の `allowedTools` 設定には `Task` と指定する必要がある（CLI 文脈か SDK 文脈かで正しい名称が異なる）

## MEMORY 記録の信頼性

- v4.13.0 で「Microsoft Azure Foundry（正式名称）」と誤記録 → v4.22.0 でも踏襲 → 実際のページタイトルは「Microsoft Foundry」
- 過去に確認済みという記録があっても、重要な固有名詞・設定値は専用ページで再検証する

## 対象の不完全列挙（具体例）

- `Ctrl+B`: "Backgrounds bash commands **and agents**" — 「bash commands」のみの記述は不完全

## 外部知識の混入（具体例）

- 「think」「think hard」「ultrathink」という記述が思考トークンを増やすという知識は、Claude Code docs に記載がないまま Claude Code 固有の動作として断言してはいけない
