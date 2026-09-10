# Extensions category patterns (2026-09-10, audit-extensions2 pass, 78問 ext-102〜ext-204)

## 重要: ローカル doc キャッシュの切り詰め問題（新規発見・最重要）
- `.claude/tmp/docs/*.md`（2026-09-10 13:xx 取得分）は live版（`curl https://code.claude.com/docs/en/<page>.md`）に比べて **約35〜45%短く切り詰められている**。実測例:
  - plugin-marketplaces.md: cache 81,538B vs live 117,783B（約31%欠落）
  - plugins.md: cache 17,280B vs live 30,162B（約43%欠落）
  - plugins-reference.md: cache 74,031B vs live 118,247B（約37%欠落）
  - hooks.md: cache 199,895B vs live 319,955B（約38%欠落。ただしCommon input fields等の重要セクションはcache内にも残っていた）
  - chrome.md/slack.md/hooks-guide.md も同様に25〜40%短い
- 切り詰めは先頭からではなく本文中のセクション単位で欠落する（例: plugin-marketplaces.mdでは「Reserved names」節が丸ごとcacheから消えていた）。**原因は不明**（fetch-docs.mjsのJina Reader変換 or サイズ上限のいずれか）だが、`ext-147`（marketplace予約名ブロック）はcacheだけで判定すると「該当記述なし＝critical drift」と誤判定するところだった。live curlで再取得したところ予約名リスト（`anthropic-marketplace`, `claude-code-marketplace`, `agent-skills`, `life-sciences`等）と「impersonate an official marketplace」ブロックは健在で、単なるcache欠落による false positive と判明。
- **今後の運用指針**: 大きめのdocページ（settings-reference, plugins-reference, plugin-marketplaces, hooks, hooks-guide等、cacheが50KB超のページ）で「期待する記述が見つからない」場合、即座にcritical判定せず、必ず `curl -s https://code.claude.com/docs/en/<page>.md` で live 再取得してから最終判断する。cacheのサイズをliveと比較し、20%以上小さい場合は要live確認のシグナルとして扱う。

## 今回確認した genuine critical drift（4件、live docsで二重確認済み）

### ext-140: プラグイン提出先の意味論が変わった
- plugins.mdが「公式マーケットプレイス（`claude-plugins-official`）」と「コミュニティマーケットプレイス（`claude-community`）」を明確に分離。提出フォーム（claude.ai/admin-settings/directory/submissions/plugins/new, platform.claude.com/plugins/submit）は**コミュニティ**マーケットプレイス審査用のみ。
- 公式マーケットプレイスには申請プロセスが存在せず、"There is no application process, and the submission form does not add plugins to the official marketplace." と明記。
- 「公式マーケットプレイスへの提出方法」を問う設問は、この区別を踏まえて作り直す必要がある。

### ext-146/ext-171: Chrome連携の対応ブラウザが拡大
- 旧: Google Chrome / Microsoft Edge の2つのみ
- 新: 上記2つに加え、Brave・Arc・Vivaldi・Operaなど他のChromiumベースブラウザも「検出・接続確立」に対応（chrome.md冒頭Note + Prerequisites両方に明記）
- 「Chrome/Edgeのみ対応」と断定する設問・wrongFeedback・explanationは要修正。また「ベータ版」表記も現行chrome.mdには見当たらず、GA化の可能性（要再確認）。

### ext-152: プラグインのカスタムパス挙動（commands等）が「補完」から「置換」に変更
- plugins-reference.mdに新設された「Path behavior rules」節: `commands`/`agents`/`workflows`/`outputStyles`/`experimental.themes`/`experimental.monitors` はカスタムパス指定時に**デフォルトディレクトリを置き換える**（デフォルトは走査されなくなる）。維持したい場合は明示的に両方列挙する必要がある。
- 唯一の例外は `skills`: デフォルトの`skills/`は常にスキャンされ、指定パスは**追加**される。
- 過去のクイズ（quality-loop第X回）で「カスタムパスは補完的で両方読み込まれる」という一般化がされていたが、これは現在 `skills` にしか当てはまらない。**今後 `commands`/`agents`/`hooks`/`.lsp.json`等のカスタムパスに関する設問を見たら、対象フィールドがreplaces系かadds系かをこの節で個別に確認すること。**

### ext-158: `@claude review` コメントの単発/購読挙動が2026年7月に変更
- code-review.mdに明記: "Before a July 2026 update, `@claude review` subscribed the PR to push-triggered reviews. If you relied on that behavior, comment `@claude review always` instead."
- 現在は素の `@claude review` は単発レビューのみ（`@claude review once` と同じ）。以降のプッシュへの自動購読には明示的に `@claude review always` が必要。
- 過去のクイズ（旧仕様）で「@claude review は以降のプッシュにもオプトインする」という記述があれば要修正。

## major級の列挙(enumeration)ドリフト（4件、correctIndexの選択自体は他の distractor より正確なので致命的ではないが、数値・列挙の更新が必要）

- **ext-108**: hooks.md Common input fields が 6→8 フィールドに増加（`prompt_id` v2.1.196+, `scratchpad_dir` v2.1.257+ が追加）。correctIndexは維持可能。
- **ext-130**: plugin-marketplaces.md のプラグインソースタイプが 5→7 種類に増加（`archive` v2.1.224+ zipアーカイブ, `command` v2.1.229+ ローカルコマンド生成が追加）。
- **ext-133**: hooks.md/hooks-guide.md の SessionStart `source` 値が 4→5 種類に増加（`fork`: `--fork-session`でのフォークセッション発火時）。
- **ext-164**: permission-modes.md がAuto modeの分類器モデルを「Claude Sonnet 5がデフォルト」と明記するようになった（以前はモデル名を特定しなかった）。ただしセッションがSonnet 4.6の場合や`availableModels`がSonnet 5を除外する場合はセッションのモデルにフォールバック（Fableモデルセッションの場合はOpusにフォールバック）という条件付き例外あり。「メインセッションのモデルに関わらず常に独立」という断定は例外条件下で不正確。needsOpusReview推奨。

## 偽陽性として確定した事例（要記録・再度flagしないこと）
- **ext-147**（マーケットプレイス予約名ブロック）: cache版のみで見ると「reserved names」の記述が完全に消えていたが、live版で確認すると `anthropic-marketplace`/`claude-code-marketplace`/`agent-skills`/`life-sciences`等の予約名リストと偽装ブロックは健在。**cache欠落による偽陽性の典型例**。
- desktop-scheduled-tasks.md はページ全体の構成（Cloud/Desktop/`/loop`の3方式比較、用語が「Routines」に変化）が大幅リライトされていたが、個別の事実（最小間隔1時間/1分/1分、7日以内1回のみキャッチアップ、SKILL.mdパス、Keep computer awake等）はすべて現行docsと一致していた。ページ構成の変化だけでcritical判定しないこと。
- channels.md, mcp-quickstart.md, managed-mcp.md, plugin-dependencies.md, channels-reference.md, security-guidance.md, plugin-relevance.md, plugin-hints.md, vs-code.md, agents.md は今回検証した全設問（ext-167〜169, 178〜181, 183〜185, 187, 189, 192-193, 195, 127）で完全一致（ドリフトなし）。
