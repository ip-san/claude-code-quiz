# Quiz Refine — 検証チェックリスト

検証エージェントは各問題に対して A-J を順に適用する。

## A. 事実の正確性
検証対象フィールドは **question・options[].text・explanation・options[].wrongFeedback の全て**。
- question に含まれる前提・数値・機能名がドキュメントと一致しているか
- 正解選択肢がドキュメントの内容と一致しているか
- explanation が正しい情報を含んでいるか
- wrongFeedback がドキュメントと矛盾していないか

## B. 用語・名称の正確性
- API やコマンド名が正式名称か
- 設定ファイル名やパスが正しいか
- サードパーティプロバイダー名は専用ドキュメントページの H1 タイトルを最終権威として確認
- **大文字/小文字の一致**: 技術用語はドキュメントの表記を正確に転記（例: bubblewrap, Seatbelt）

## C. リファレンス URL の有効性
- referenceUrl が有効か、アンカーがページ見出しと一致するか
- referenceUrl の参照先が問題内容に最も直接的か

## D. 内部一貫性
- question ↔ explanation の整合性
- explanation ↔ wrongFeedback の整合性
- wrongFeedback 同士の整合性

## E. バッククォート書式
コード用語・ファイルパス・コマンド・環境変数・設定キーがバッククォートで囲まれているか。
対象: ツール名(Bash,Read,Edit等), Hookイベント名, ファイルパス, 設定キー, 環境変数, スラッシュコマンド, CLIフラグ, 技術用語

**よく見落とされるパターン:**
- キーボードショートカット: Ctrl+X → `Ctrl+X`。同一問題内で一部だけバッククォートありは不整合
- 環境変数=値: `ENV_VAR`=1 ではなく `ENV_VAR=1`（=値も含めてバッククォート内）
- プレースホルダー引数: [issue-number] → `[issue-number]`

## F. wrongFeedback 品質
- 「`X`ではありません。」だけの一行は品質不足（severity: info で記録のみ）
- 正しいショートカット/コマンドが何かを教える内容であるべき
- **文字数目安:** 30文字以下の wrongFeedback は info severity で記録（「なぜ誤りか」の説明が不足している可能性）。修正時は正解との違い・正しい知識を補足する

## G. 解説の教育的価値
- explanation が正解の言い換えだけでなく、**なぜそうなのか**（仕組み・背景）を含んでいるか
- 不正解選択肢が間違いである理由に触れているか（全てでなくても代表的な誤解に言及）
- 学習者が「次回同様の問題を見たとき判断できる知識」を得られる内容か
- **severity:** critical=10文字以下, major=正解のリフレーズのみ（理由なし）, info=理由あるが他選択肢に触れず

## H. 不正解選択肢の妥当性（Distractor Quality）
- 各不正解選択肢が「ありそうだが間違い」の水準を満たしているか
- 正解だけが著しく長い/具体的で、不正解が明らかに雑なフィラーになっていないか
- 技術的に全く関係のない選択肢がないか
- **severity: info**（機械チェック `quiz:lint distractor` と併用）

## I. ダイアグラムの品質（diagrams フィールド）
- タイプが概念に合っているか（14タイプの仕様は generate-quiz-data SKILL.md 参照）
- データフィールド内容が explanation と一致しているか
- `label`/`sub` が正確か（sub は25文字以内推奨）
- **参照整合性**: network の edges→nodes id、sequence の messages→actors インデックス、venn の sets が2〜3個
- **マーカーチェック**: `{{diagram:N}}` が `diagrams[N]` に対応、範囲外参照なし、導入と詳細の間に配置
- **冗長性**: 解説80字未満で図が繰り返し → 削除提案。**過密**: comparison列5+、flow/hierarchy要素6+、network ノード8+、sequence メッセージ10+ → 簡略化提案
- **タイプ適合**: 上書き関係→layer、複数アクター→sequence、双方向通信→network が適切か
- **途中切れ禁止**: ダイアグラム本文に `…`（日本語三点リーダー）や文中の `...` を入れない。`bun run quiz:check-ellipsis` が CI/`quiz:check` で fail する。terminal/config の末尾 `Loading...` 等の進捗表示のみ許容。`{ ... }` `sk-...` `https://example.com/...` のような placeholder は具体値（`https://gitlab.com/group/project.git`、`{"session_id": "abc-123"}` など）に置き換える。
- **comparison vs hierarchy**: `comparison.columns[].items[]` は完全文で 80 文字以内。長い説明を載せたい場合は `hierarchy`（`items: [{text, sub}]`）を使う（`sub` は長さ無制限）。
- **severity:** major=ドキュメント不一致/マーカー範囲外/ID参照不一致/途中切れ, info=改善提案

## J. ダイアグラム追加の検討（diagrams なしの問題）
- explanation に手順/階層/比較/循環/接続/時系列/包含/並列/重なり/グリッド/ツリー/計算のパターンがあれば追加提案
- **優先ルール**: 包含→`layer`, 複数アクター→`sequence`, 双方向→`network`, 概念重なり→`venn`, 並列→`swimlane`, 2軸→`matrix`, ディレクトリ→`tree`, 計算式→`formula`
- 追加しない場合: 解説80字未満 / 抽象的で視覚化効果薄 / 単純な事実記述のみ
- **severity:** info（提案のみ）。フォーマット: `[diagram-proposal] {id}: {type} - {label} ({理由})`
