# Quiz Verifier Memory Index

検証対象カテゴリのファイルを Read してから検証する。事実の正本は `docs/verified-facts.md` と `.claude/skills/quiz-refine/known-issues.md` で、ここに残る値が食い違う場合はそちらを優先する。

- [Memory](memory_patterns.md) — CLAUDE.md のロード範囲、server-managed-settings の分類 drift、正解妥当性監査
- [Skills](skills_patterns.md) — skills カテゴリの検証パターンと正解妥当性監査
- [Tools](tools_patterns.md) — ツール仕様（Grep / Read PDF / Tool Search など）、distractor 書き換え後の検証
- [Commands](commands_patterns.md) — コマンド仕様、fact-tier 検証の偽陽性記録
- [Extensions](extensions_patterns.md) — Hook イベント、plugins 提出先、Chrome 対応、カスタムパス置換
- [Session](session_patterns.md) — Fast mode・effort・モデルラインナップの drift、xhigh 表現
- [Keyboard](keyboard_patterns.md) — Option+T 設定要件、keybindings.json フォーマット
- [Bestpractices](bestpractices_patterns.md) — advisor、artifacts、security-guidance、effort level 手段
- [SDK](sdk_patterns.md) — sdk カテゴリの検証パターン・偽陽性記録
- [カテゴリ横断](cross_category_patterns.md) — 循環検証トラップ（assembled JSON を事実根拠にしない）、複数カテゴリの偽陽性記録

新しい発見は該当カテゴリのファイルに追記し、このファイルには索引だけを置く。
