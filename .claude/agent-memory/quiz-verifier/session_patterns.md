# Session カテゴリ検証パターン

## 2026-07-16: モデルラインナップ更新による doc ドリフト（Sonnet 5 登場・Fast Mode縮小・default変更）

fetch-docs.mjs で 2026-07-15 キャッシュを取得したところ、model-config.md / fast-mode.md に以下の変更が確認された。既存の quiz（ses-045, ses-102, ses-103, ses-108）は旧モデルラインナップのまま更新されておらず、explanation/wrongFeedback/diagram に古い記述が残っている。**correctIndex 自体は全て妥当**なので critical ではないが、major として要修正。

### 事実確認済み（model-config.md, 2026-07-15キャッシュ）
- **effort levels**: `Fable 5` `low/medium/high/xhigh/max`、**`Sonnet 5, Opus 4.8, Opus 4.7`も同じ5値**、`Opus 4.6, Sonnet 4.6` は `low/medium/high/max`（xhighなし）
- **デフォルトeffort**: `high` on Fable 5, **Sonnet 5**, Opus 4.8, Opus 4.6, Sonnet 4.6。`xhigh` on Opus 4.7 のみ
- **`default` モデル設定**: Max/Team Premium/Enterprise PAYG/API = Opus 4.8、**Claude Platform on AWS/Amazon Bedrock/Google Cloud's Agent Platform = Opus 4.8**（v2.1.207以降）、**Pro/Team Standard/Enterprise subscription seats = Sonnet 5**（旧 Sonnet 4.6 から更新）、Microsoft Foundry = Sonnet 4.5
  - v2.1.207 以前は AWS=Opus 4.7、Bedrock/Vertex=Sonnet 4.5 だった（既に past known-issues に反映済みの旧情報）
- **Fast mode**: "Fast mode is supported on Opus 4.8 and Opus 4.7. It is not available on Sonnet, Haiku, or other models." → **Opus 4.6 が Fast mode 対応から外れた**（pricing table も 4.8/4.7 のみ掲載）。旧 known-issues/quiz の「Opus 4.8/4.7/4.6専用」は stale

### 個別問題への影響
- **ses-045（major）**: explanation の "xhigh（Fable 5 / Opus 4.8 / Opus 4.7）" と "デフォルトはOpus 4.7では`xhigh`、Fable 5 / Opus 4.8 / Opus 4.6 / Sonnet 4.6では`high`" は **Sonnet 5 が欠落**。correctIndex（low,medium,high,xhigh,max,auto の6値）自体は正しい
- **ses-102（major）**: explanation の "xhigh は Fable 5 / Opus 4.8 / Opus 4.7 のみ対応" 等も同様に **Sonnet 5 欠落**。question自体は Opus 4.6 限定なので影響は補足説明部分のみ
- **ses-103（major）**: wrongFeedback「Sonnet 4.6はProプラン、Team Standard、Enterpriseサブスクリプションのデフォルトです」と diagram matrix の "Pro/Team Standard"→"Sonnet 4.6" は **Sonnet 5 に更新が必要**。correctIndex（Opus 4.8 for Max/Team Premium）は変わらず正しい
- **ses-108（major）**: explanation「Fast モードは Claude Opus（4.8 / 4.7 / 4.6）専用」の **4.6 は現在誤り**（fast-mode.md で明示的に除外）。correctIndexの選択肢自体（バージョン非言及）は影響なし

### 注意
- これらは「新モデル追加を見落とした」既存パターン（Opus 4.8追加時にも同じ指摘が繰り返された。known-issues.md L230-236参照）の再発。generate-quiz-data 時にモデルライン参照を都度更新する運用が必要
- 次回検証時、model-config.md の "Available models" セクションと effort levels テーブルを都度再フェッチして比較すること（Sonnet 5 のような新モデルはここに先に反映される）

## ses-112 の Preview ドロップダウン名称（minor, 2026-07-16確認）
- desktop.md L274: "toggle it from **the server dropdown menu**"（"Preview" ではなく "server" ドロップダウン）
- quiz の「Preview ドロップダウンメニュー」は用語がやや不正確。深刻ではないが用語統一の際は "server dropdown" に寄せる

## Verified OK（2026-07-16 再確認、docドリフトなし）
- ses-007, ses-025, ses-027（defaultMode 6値）, ses-030, ses-048, ses-100, ses-107（PreCompact trigger）, ses-117, ses-141（macOS Keychain）, ses-145, ses-152（modelOverrides）, ses-153, ses-154, ses-189（--continue/--resume/--from-pr）, ses-190（prompt caching invalidation）, ses-197（Claude apps gateway）, ses-199（Auto Mode 第三者プロバイダ制限 v2.1.207）は全て feature-availability.md/gateways.md/prompt-caching.md/model-config.md の現行記述と一致
