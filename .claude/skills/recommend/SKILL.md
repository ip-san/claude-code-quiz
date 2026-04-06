---
name: recommend
description: Claude Code の利用履歴からユーザーの作業意図を理解し、関連するクイズ問題を選定する。レコメンド、おすすめ、復習
context: fork
allowed-tools: Read, Bash, Grep, Glob
argument-hint: "[days]"
---

# Usage-Based Quiz Recommendation

あなたはユーザーの Claude Code 利用履歴を分析し、学習に最も役立つクイズ問題を選定するエキスパートです。

## 目的

キーワードマッチではなく、**ユーザーが何をしようとしていたか**を理解し、その作業に関連する知識を問うクイズ問題を選びます。

## 手順

### Step 1: 圧縮入力の読み込み

まずセッションを収集し、前処理パイプラインを実行する:

```bash
node scripts/collect-session.mjs --scan-all-today
```

**圧縮入力**（メインで使う — Haiku分類+スクリプト集計の結果）:

```bash
cat ~/.claude-quiz-recommend/compressed-input.json 2>/dev/null
```

このファイルには以下が含まれる（~1,750文字に圧縮済み）:
- `intentClusters`: Haiku が分類した意図クラスタ（intent名、プロンプトID、苦戦度）
- `categoryDistribution`: Haiku が判定したカテゴリ分布
- `overallStruggles`: 苦戦度の全体分布（none/mild/strong）
- `struggleSignals`: スクリプトが検出した苦戦シグナル（repetition/negativeSentiment/fatigue）
- `intentTransitions`: スクリプトが付与した意図遷移列（探索→質問→修正→...）
- `learnerState`: クイズ正答率、XP、パターン推移（Desktop アプリがエクスポート）
- `candidateIds`: 難易度フィルタ済みの候補問題ID（50-80問）
- `samplePrompts`: 各意図クラスタの代表プロンプト（5件）

**フォールバック**: compressed-input.json が存在しない場合は従来通り:

```bash
cat ~/.claude-quiz-recommend/rolling-7d.json
cat ~/.claude-quiz-recommend/learner-profile.json 2>/dev/null || echo '{}'
```

**学習者プロファイルの活用方法:**

1. **過去に改善されたパターンは再推薦しない** — `patternHistory` の最新スナップショットに含まれず、過去に含まれていたパターンは「解決済み」として扱う
2. **レコメンド問題の正答率で学習効果を測る** — `recommendedAccuracy[cat]` が存在すれば、全体の `categoryProgress` より優先する。レコメンドで出した問題を解いて正答率が高い → その分野は学べている。低い → まだ理解が浅いので同カテゴリの別問題を再推薦
3. **全体の正答率が高いカテゴリは advanced 問題を出す** — `categoryProgress[cat].accuracy >= 80` なら beginner/intermediate は不要
4. **正答率が低いカテゴリは基礎から固める** — `categoryProgress[cat].accuracy < 50` なら beginner 問題を優先
4. **成熟度が向上傾向なら応用的な問題を出す** — `patternHistory` の最新と最古を比較し、`inquiryRatio` が増加していれば、探求型の advanced 問題が適切
5. **学習量が少ない（totalAttempts < 20）場合は幅広く出す** — 特定カテゴリに偏らせない

今日だけのデータが必要な場合:

```bash
cat ~/.claude-quiz-recommend/sessions/$(date +%Y-%m-%d).json
```

### Step 2: 会話の流れから作業意図を分析

`rolling-7d.json` の `conversationFlows` を重点的に読む。これはセッションごとにプロンプトが時系列順に並んでおり、**一連の作業の流れ**が分かる。

```
例: conversationFlows[0]
  date: "2026-04-03"
  prompts:
    1. "このスキーマファイルは外部に露出してる？"
    2. "外部にお渡しするリスクはあるか"
    3. "企業ブロック機能というものもあるのですが"
    4. "では、提案をまとめてください"
```

この流れから読み取れること：
- 1→2: 同じ質問を言い換えている → **最初の回答が不十分だった** → 質問力の問題？
- 2→3: 追加情報を出している → **Claude に十分な文脈を渡せていなかった** → プロンプト設計の問題
- 3→4: 結論を求めた → **判断を Claude に委ねた** → セキュリティ判断力の問題

**流れの読み方のルール:**

1. **同じテーマのプロンプトが3つ以上続く** → そのテーマで深く悩んでいた。関連知識を重点的に出す
2. **「できない」「動かない」「なぜ？」が含まれる** → つまずいていた。トラブルシュート問題を出す
3. **プロンプトが短くなっていく** → 疲労か諦め。効率化のチャンスを提案
4. **プロンプトが長く詳細になっていく** → Claude に伝わらず試行錯誤。プロンプト設計の問題を出す
5. **全く異なるテーマに突然切り替わる** → タスク間で /clear していない可能性。コンテキスト管理の問題
6. **試行→成功したが「なぜ動くか」を聞いていない** → 偶然の成功。仕組みを問う問題で理解を定着
7. **手動で繰り返している作業** → 自動化を知らない。Hooks/スキル/サブエージェントの問題を出す
8. **エラー修正→別のエラー→別のエラー** → 根本原因を理解していない。設計思想の問題を出す

**フローの深層分析（重要 — キーワードマッチとの差別化）:**

単にトピックを拾うのではなく、**なぜユーザーがそのプロンプトを書いたか**を推測する。

- 「CLAUDE.md にルールを書いた」→ 表面: memory カテゴリ → **深層: チームで共有したい？自分用？スコープの使い分け問題が有効**
- 「テストが通らない」→ 表面: テスト問題 → **深層: Hooks で自動テストを設定していない？PostToolUse 問題が有効**
- 「このファイルを修正して」を5回 → 表面: 編集タスク → **深層: 1回の指示で伝わる書き方を知らない。プロンプト設計問題が有効**
- 「他にもありますか」「続けてください」の連続 → **深層: 自分でゴールを定義できていない。計画力・要件定義の問題が有効**

`prompts`（フラットリスト）も併用するが、意図の分析は `conversationFlows` を優先する。

以下の4つの観点で分析結果をまとめる:

1. **何をしようとしていたか**（目的）— 会話の流れ全体から
2. **どんな困難に直面していたか**（つまずき）— 繰り返し、言い換え、エラー言及から
3. **使っていたが深く理解していなさそうな機能** — 非効率な使い方のパターンから
4. **全く使っていない機能で、この作業に役立つもの** — やり方を見て「これなら○○の方が速い」と思えるもの

**学習者プロファイルがある場合の追加分析:**

5. **前回から改善されたパターン** — `patternHistory` の最新と最古を比較。改善されたパターンに関連する問題は推薦しない（既に学習効果あり）
6. **クイズで学んだが実務に反映されていないカテゴリ** — `categoryProgress` の正答率が高いのに、同じカテゴリの非効率パターンが残っている場合。「知っているけど使っていない」ので、実践的な応用問題やシナリオを推薦
7. **クイズ未挑戦のカテゴリ** — `categoryProgress` に存在しないカテゴリで、かつ `rolling-7d.json` に関連プロンプトがある場合。そのカテゴリの入門問題を推薦

### Step 3: 苦戦シグナルの検出

会話フローから以下の5つの苦戦シグナルを検出する（教育データマイニング研究に基づく）。
各シグナルに強度（低/中/高）を付ける。

**Signal 1: Repetition（繰り返し）**
同じテーマの質問が3回以上連続、または言い換え・補足が続く。
- 「これはどう？」「こうじゃなくて」「つまりこういうこと？」→ 高
- 同じコマンド名を2回言及 → 低
- **推薦**: そのテーマの基礎〜中級問題

**Signal 2: Escalation（エスカレーション）**
質問が抽象→具体へ急激に変化。エラーメッセージの貼り付け、スタックトレースの言及。
- 「MCPとは？」→「MCP のタイムアウトエラーが出る」→ 高
- **推薦**: トラブルシュート系の問題

**Signal 3: Negative Sentiment（ネガティブ）**
「わからない」「うまくいかない」「できない」「なぜ動かない」「困った」の出現。
- 複数回出現 → 高、1回 → 低
- **推薦**: 該当機能の「よくある間違い」系問題

**Signal 4: Abandonment（放棄）**
未解決のままトピックが切り替わる。結論なく次の作業に移行。
- セッション内で突然トピックが変わる → 中
- 最後のプロンプトが質問形で終わっている → 高
- **推薦**: 放棄されたトピックの問題 + コンテキスト管理の問題

**Signal 5: Fatigue（疲労）**
プロンプトが短くなる、「お願いします」「はい」のような指示が増える、応答を全て委任。
- セッション前半の平均文字数 > 後半の2倍 → 中
- 「まとめて」「全部やって」のような丸投げ → 高
- **推薦**: 効率化（/batch, サブエージェント, /btw）の問題

### Step 4: 意図遷移の分析

各セッションのプロンプト列を、以下のステートマシンにマッピングする:

```
探索 → 質問 → 試行 → 修正 → 成功 or 放棄
```

- **探索→質問で止まる**: 基礎知識が不足。beginner 問題を推薦
- **試行→修正を3回以上ループ**: wheel spinning。アプローチを変える知識が必要。bestpractices 問題
- **修正→放棄**: 深い知識不足。intermediate/advanced 問題
- **探索→成功（短ルート）**: この分野は得意。スキップして別の分野を推薦

### Step 5: 問題の選定

**compressed-input.json がある場合**: `candidateIds` から選ぶ（既にフィルタ済み）:

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('src/data/quizzes.json', 'utf8'));
const compressed = JSON.parse(require('fs').readFileSync(require('os').homedir() + '/.claude-quiz-recommend/compressed-input.json', 'utf8'));
const ids = new Set(compressed.candidateIds);
data.quizzes.filter(q => ids.has(q.id)).forEach(q => {
  console.log(q.id + ' [' + q.category + '/' + q.difficulty + '] ' + q.question.slice(0, 80));
});
"
```

**フォールバック（compressed-input.json なし）**: 全問からスキャン:

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('src/data/quizzes.json', 'utf8'));
data.quizzes.forEach(q => {
  console.log(q.id + ' [' + q.category + '/' + q.difficulty + '] ' + q.question.slice(0, 80));
});
"
```

特定のカテゴリやキーワードで絞り込む:

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('src/data/quizzes.json', 'utf8'));
data.quizzes
  .filter(q => q.category === 'bestpractices')
  .forEach(q => console.log(q.id + ': ' + q.question.slice(0, 80)));
"
```

### Step 6: 選定基準

苦戦シグナルの強度と意図遷移の結果に基づいて、15問を以下の配分で選ぶ:

1. **苦戦シグナルに直接対応する問題**（4-6問）— 最優先
   - Repetition（高）→ そのテーマの基礎問題 + 応用問題
   - Escalation（高）→ トラブルシュート・デバッグ問題
   - Negative（高）→ 「よくある間違い」「アンチパターン」系問題
   - Abandonment → 放棄テーマの入門問題 + コンテキスト管理問題
   - Fatigue → 効率化・自動化の問題

2. **フロー深層分析から導く問題**（3-5問）— 差別化ポイント
   - 偶然の成功（試行→成功、理由未確認）→ 仕組み・設計思想の問題
   - 手動繰り返し → 自動化（Hooks/サブエージェント/スキル）の問題
   - 長い指示の連続 → プロンプト設計・CLAUDE.md活用の問題
   - 「続けて」の多用 → 計画力・要件定義・/planモードの問題
   - エラー連鎖 → 根本原因を問う設計思想の問題

3. **使っていたが深く理解していなさそうな機能**（2-4問）
   - 試行→修正ループが検出された機能の「なぜそうするのか」を問う問題

4. **効率化のチャンス**（2-3問）
   - 知っていれば手動作業を自動化できた機能の問題

### Step 5: 出力

以下の形式で `~/.claude-quiz-recommend/latest-recommend.json` を更新する。

**IMPORTANT:** `reasons` フィールドは**必須**。問題IDごとに選定理由を書く。理由にはユーザーの実際のプロンプトを「」で引用し、なぜこの問題が選ばれたかを1行で具体的に書く。空の `reasons: {}` は禁止。

```bash
node -e "
const fs = require('fs');
const path = require('path');
const data = {
  date: new Date().toISOString().slice(0, 10),
  sessionCount: SESSION_COUNT,
  questionCount: IDS.length,
  ids: IDS,
  reasons: {
    // **全問に理由を書くこと（空禁止）**
    // 形式: 'ID': '「ユーザーのプロンプト引用」→ この問題で学べること'
    // 例: 'bp-008': '「枠線の統一感」を5回修正指示 → 修正ループの対処法',
    // 例: 'ext-015': '型チェック・テスト・ビルドを順次実行 → 並列化で時短'
  },
  url: 'https://ip-san.github.io/claude-code-quiz/?ids=' + IDS.join(','),
  topCategories: TOP_CATEGORIES,
  topics: TOPICS,
  // 全セッションからユニークで意味のあるプロンプトを最大30件
  // docker/npm/bun/git/tail/sleep 等のコマンドは除外
  // update_content 等の短い定型プロンプトも除外
  promptSamples: PROMPT_SAMPLES
};
fs.writeFileSync(
  path.join(process.env.HOME, '.claude-quiz-recommend', 'latest-recommend.json'),
  JSON.stringify(data, null, 2)
);
console.log('✓ ' + data.questionCount + '問のレコメンドを保存しました');
console.log(data.url);
"
```

最後に、選定理由のサマリーを出力する:

```
## レコメンドサマリー

### あなたの作業内容
- （会話フローから読み取った作業の要約を2-3行で）

### 検出した苦戦シグナル
| シグナル | 強度 | 根拠 |
|---------|------|------|
| Repetition | 高 | 「○○」を3回言い換えていた |
| Escalation | 中 | エラーメッセージを貼り付けていた |
| ... | | |

### 意図遷移パターン
- セッション1: 探索 → 質問 → 試行 → 修正 → 修正 → 放棄（MCP設定）
- セッション2: 質問 → 試行 → 成功（CLAUDE.md編集）

### 選定した問題（15問）

**苦戦への対処（N問）**
- ID: 問題タイトル — 「○○」で繰り返し質問していた → この知識で解決できる

**深い理解（N問）**
- ID: 問題タイトル — 試行→修正ループが検出された機能の理解を深める

**効率化のチャンス（N問）**
- ID: 問題タイトル — 手動でやっていた○○を自動化できる
```
