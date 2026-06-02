# Code Reviewer Agent Memory

## 典型違反の常連箇所

（初回セッション。今後蓄積予定）

## 偽陽性パターン（レビューして指摘不要だったケース）

（初回セッション。今後蓄積予定）

## 過去に発見した事例

### blocking events 数の不整合（2026-06-02 発見）

- **ファイル**: `.claude/skills/quiz-refine/known-issues.md` L250 vs `docs/verified-facts.md` L45
- **内容**: known-issues.md L250 は「ブロッキング可能: 12 イベント」、verified-facts.md L45 は「Blocking events: 15」で不整合
- **由来**: verified-facts.md の 15 は commit 08b09ef（Sync 2 Verified Facts drift）で 13→15 に更新されたが、known-issues.md の同セクションは更新されなかった。さらにその前のカウントが 12 だったため、既存の行は 12 のまま残存している
- **重要度**: Warning（事実DBの矛盾。クイズ検証エージェントが参照するため誤案内リスクあり）
- 同一セッション（3badd62）で MessageDisplay が「非ブロッキング」として追加されたが blocking events 数は更新されていない（15 のまま）。15 は MessageDisplay 追加前の数値
- **解決済み（2026-06-02、commit 9eb4fcd）**: hooks.md "Exit code 2 behavior per event" テーブルを実カウントし blocking=15 を確定。`MessageDisplay` は "Can block? = No"（非ブロッキング）なので総数 29→30 でも blocking 数には影響せず、**15 は MessageDisplay 追加後も正**（「追加前の数値」という上記の懸念は誤り）。known-issues.md L250 を 12→15 に修正し、verified-facts.md / known-issues.md / quiz-verifier MEMORY / 該当 ext クイズの4箇所が一致

### docs/verified-facts.md は quizzes.json 以外の唯一の変更対象になることが多い

- 今回5コミットの quizzes.json 以外変更ファイル: `docs/verified-facts.md`、`.claude/skills/quiz-refine/known-issues.md`、`.claude/agent-memory/quiz-verifier/MEMORY.md`、`.claude/agent-memory/quiz-verifier/sdk_patterns.md`
- これらはすべてドキュメント/メタデータファイルであり、アーキテクチャ違反・型安全性・ダークモード漏れ等は対象外
- コードレビュー観点は「事実DBの一貫性」「引用行番号の陳腐化」「複数ファイル間の数値不整合」が中心になる

### 引用行番号の信頼性（偽陽性注意）

- verified-facts.md / known-issues.md にある `L560-595`、`model-config.md L124-127` などの行番号は外部ドキュメント参照であり、ソースコードの行番号ではない
- 行番号の正確性はコードレビューでは確認不能（外部 URL へのアクセスが必要）
- 指摘する場合は「要確認」止まりにする
