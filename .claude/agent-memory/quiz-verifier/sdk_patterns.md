---
name: SDK category verification patterns
description: sdk カテゴリでの偽陽性パターンと頻出 issue パターン
type: project
---

## factCheck:env フラグの偽陽性パターン

- sdk-011 は `ANTHROPIC_API_KEY` の語がキーワードヒットして `tier: fact` になったが、内容は正確で全チェック通過。
- `factCheck:env` フラグはキーワードマッチのみで、説明文が正しく使用している場合は偽陽性。
- known-issues の「pre-lint fact tier の実態は keyword hit のみ」パターンと完全に一致。

**How to apply:** sdk カテゴリで `factCheck:env` flagged の問題は、まず内容が正確かを確認してから判定を降ろす。`ANTHROPIC_API_KEY` を正しい答えとして記述している問題は偽陽性の可能性が高い。

## diagram 内部の旧名称残存パターン

- sdk-010: question/explanation/wrongFeedback（options フィールド）は全て `Agent` ツールを正しく使用しているが、diagram の flow/hierarchy の sub テキストに旧名称 `Task` が残存。
- この種の問題は lint では検出されにくく、`tier: quality` の distractor フラグとして現れる。
- diagram は options/explanation とは別フィールドなので、チェック D（内部一貫性）で diagram テキストも必ず確認すること。

**How to apply:** sdk カテゴリの distractor フラグ問題では、diagram の sub テキストまで全て確認する。特に `Task`/`Agent` の混在に注意。

## ビルトインツールリスト（2026-05-08 確認）

agent-sdk/overview の Built-in tools テーブル（10種）:
Read, Write, Edit, Bash, **Monitor**, Glob, Grep, WebSearch, WebFetch, AskUserQuestion

- sdk-009 の diagram で `Monitor` が欠落していた。explanation は正確（10種）だが diagram は9種。
- quiz の diagram がツールリストを列挙する場合は Monitor の有無を必ず確認する。

## 認証環境変数（確認済み）

- `ANTHROPIC_API_KEY` → Anthropic 直接
- `CLAUDE_CODE_USE_BEDROCK=1` → Amazon Bedrock
- `CLAUDE_CODE_USE_VERTEX=1` → Google Vertex AI
- `CLAUDE_CODE_USE_FOUNDRY=1` → Microsoft Foundry（agent-sdk/overview は "Microsoft Azure" と表記するが、正式名は "Microsoft Foundry"）

## sdk-015 wrongFeedback の "Microsoft Azure" 表記（2026-05-09確認）

- sdk-015 wrongFeedback（選択肢B）が "Microsoft Azure" と記述。doc の agent-sdk/overview は「**Microsoft Azure**: set `CLAUDE_CODE_USE_FOUNDRY=1`」と表記しており、doc 表現と一致。
- ただし正式名は "Microsoft Foundry" であり、他の sdk 問題（sdk-011 explanation）では "Microsoft Foundry" を使用。minor-level の不整合。
- 偽陽性パターン: doc が "Microsoft Azure" と書いていても critical 判定しない。minor で報告するにとどめる。

## sdk-006 diagram flow text 分割（2026-05-09確認）

- sdk-006 の flow diagram の steps テキストが文章の途中で分割されている（「サポ」「ートしています：(1) Claude subs」等）。
- diagram の flow type では step.text と step.sub が別行表示になるため、文を分割するのは機能的に問題あり。
- minor（書式不備）として報告する価値あり。
- 2026-05-16 再確認: sdk-006 の flow diagram は「Claude Code 起動」→「認証方法を選択」→「セッション開始」と正常。以前の分割問題は解消済みか、別の diagram だった可能性あり。

## sdk-007 / sdk-013 diagram flow テキスト分割（2026-05-16確認）

- sdk-007 の flow diagram steps が途中で切れている: 「Agent Co」「deと同じツール、エージェントループ、コンテキ」など。
- sdk-013 の flow diagram steps も同様: 「Agent SDKとCLIは同じ機能を持ちま」「すが」等。
- これらは minor（書式不備）として報告。lint では検出されにくい。

## agent-sdk/overview ドキュメント大幅縮小（2026-05-16確認）

- 17.4KB → 8.1KB に縮小。インストールコマンドの直接記載はなくなり quickstart へ誘導。
- ビルトインツール 10 種のテーブルは維持（Read/Write/Edit/Bash/Monitor/Glob/Grep/WebSearch/WebFetch/AskUserQuestion）。
- ANTHROPIC_API_KEY の明示記載はないが、Anthropic 標準変数として正確。
- sdk-008 のインストールコマンド `npm install @anthropic-ai/claude-agent-sdk` はドキュメントに明示されていないが、quickstart に記載されるはずで major とまでは言えない。

## prompt-caching TTL 詳細（2026-05-31 確認）

sdk-016（difficulty: advanced）の正解内容はドキュメントと完全一致:
- Claude サブスクリプション → 自動的に1時間 TTL（プラン内、追加コストなし）
- 枠超過・usage credits → 自動的に5分に降格
- API キー / Bedrock / Vertex / Foundry / Claude Platform on AWS → デフォルト5分 TTL
- `ENABLE_PROMPT_CACHING_1H=1` で1時間に切り替え可能
- `FORCE_PROMPT_CACHING_5M=1` で強制5分（managed settings上書き用）
- サブエージェントはサブスクリプションでも5分 TTL
- キャッシュ保存場所: API key/サブスク/Claude Platform on AWS → Anthropic インフラ、Bedrock/Vertex → 各クラウドプロバイダ
- difficulty:advanced フラグは false-positive（TTL の条件分岐は genuinely advanced）

## Claude Platform on AWS 認証（2026-05-31 確認）

sdk-018（difficulty: advanced）の正解内容はドキュメントと完全一致:
- 方式A: SigV4（標準 AWS 認証チェーン: env vars / ~/.aws/credentials / IAM ロール / SSO）
- 方式B: ワークスペース API キー `ANTHROPIC_AWS_API_KEY`、`x-api-key` ヘッダーで送信、SigV4 より優先、設定時は AWS 認証情報を無視
- SSO 期限切れ → `awsAuthRefresh` にログインコマンドを設定してリトライ可能
- difficulty:advanced フラグは false-positive（2方式の選択と優先順位は genuinely advanced）

## sdk-009 / sdk-010 distractor フラグ（2026-05-31 確認）

- sdk-009（distractor）: ビルトインツールリストが diagram で10種すべて列挙されており事実誤認なし。false-positive
- sdk-010（distractor）: 以前の「diagram に旧名称 Task 残存」の issue は解消済み。現在のすべてのフィールドで `Agent` を正しく使用。false-positive
- sdk-011（factCheck:env）: `ANTHROPIC_API_KEY` が正解として正確に記述。keyword hit による false-positive。これで3回連続 false-positive → sdk カテゴリの factCheck:env は keyword hit パターンのみ

## sdk カテゴリ distractor/difficulty 全 false-positive 記録

2026-05-31 検証: sdk-009, sdk-010, sdk-016, sdk-018 の4問すべて false-positive
sdk カテゴリの distractor/difficulty フラグは過去3回の検証（2026-05-08, 05-16, 05-31）を通じて 100% false-positive
