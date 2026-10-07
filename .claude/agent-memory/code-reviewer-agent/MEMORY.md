# Code Reviewer Agent Memory

## 典型違反の常連箇所

（初回セッション。今後蓄積予定）

## 偽陽性パターン（レビューして指摘不要だったケース）

（初回セッション。今後蓄積予定）

## 過去に発見した事例

### 事実DB間の数値不整合（再発パターン）

- Hook のブロッキング可能イベント数のような「docs の表の要素数」は、`docs/verified-facts.md` / `known-issues.md` / quiz-verifier MEMORY / 該当クイズの間で片側だけ更新されやすい。数値を変える差分では他の3か所との一致を Warning 観点で確認する（数値そのものはここに記録しない）

### quality-loop コミットのレビュー観点

- quality-loop 系コミットは quizzes.json と事実DB（verified-facts / known-issues / agent-memory）だけを変更することが多く、その場合アーキテクチャ・型・ダークモード観点は対象外
- コードレビュー観点は「事実DBの一貫性」「引用行番号の陳腐化」「複数ファイル間の数値不整合」が中心になる

### 引用行番号の信頼性（偽陽性注意）

- verified-facts.md / known-issues.md にある `L560-595`、`model-config.md L124-127` などの行番号は外部ドキュメント参照であり、ソースコードの行番号ではない
- 行番号の正確性はコードレビューでは確認不能（外部 URL へのアクセスが必要）
- 指摘する場合は「要確認」止まりにする
