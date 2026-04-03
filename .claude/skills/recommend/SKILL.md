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

### Step 1: 利用履歴の収集

まずセッションを収集し、7日分のローリングキャッシュを更新する:

```bash
node scripts/collect-session.mjs --scan-all-today
```

次に、7日分の統合データを読む（**こちらをメインで使う**）:

```bash
cat ~/.claude-quiz-recommend/rolling-7d.json
```

このファイルには直近7日分のプロンプト（最大50件）、トピック、カテゴリスコアが日ごとの重み付きで集約されている。今日のデータが少なくても、過去の作業文脈が含まれる。

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

`prompts`（フラットリスト）も併用するが、意図の分析は `conversationFlows` を優先する。

以下の4つの観点で分析結果をまとめる:

1. **何をしようとしていたか**（目的）— 会話の流れ全体から
2. **どんな困難に直面していたか**（つまずき）— 繰り返し、言い換え、エラー言及から
3. **使っていたが深く理解していなさそうな機能** — 非効率な使い方のパターンから
4. **全く使っていない機能で、この作業に役立つもの** — やり方を見て「これなら○○の方が速い」と思えるもの

### Step 3: 問題の選定

クイズデータから問題を選ぶ:

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('src/data/quizzes.json', 'utf8'));
data.quizzes.forEach(q => {
  console.log(q.id + ' [' + q.category + '/' + q.difficulty + '] ' + q.question.slice(0, 80));
});
" | head -50
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

### Step 4: 選定基準

以下の優先順位で15問を選ぶ:

1. **作業で使った機能の深い理解を問う問題**（5-7問）
   - 使っていたが「なぜそうするのか」を理解していなさそうな機能
   - 例: MCP を使っていた → MCP のセキュリティやタイムアウト設定の問題

2. **つまずきに直接関連する問題**（3-5問）
   - エラーに困っていた → デバッグ手順の問題
   - 指示が守られなかった → CLAUDE.md の書き方の問題

3. **この作業をもっと効率化できる機能の問題**（3-5問）
   - 手動でやっていたことを自動化できる機能
   - 知っていれば時間を節約できた機能

### Step 5: 出力

以下の形式で `~/.claude-quiz-recommend/latest-recommend.json` を更新する:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const data = {
  date: new Date().toISOString().slice(0, 10),
  sessionCount: SESSION_COUNT,
  questionCount: IDS.length,
  ids: IDS,
  url: 'https://ip-san.github.io/claude-code-quiz/?ids=' + IDS.join(','),
  topCategories: TOP_CATEGORIES,
  topics: TOPICS,
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
- （プロンプトから読み取った作業の要約を2-3行で）

### 選定した問題（15問）

**使った機能の深い理解（N問）**
- ID: 問題タイトル — 選定理由

**つまずきに関連（N問）**
- ID: 問題タイトル — 選定理由

**効率化のチャンス（N問）**
- ID: 問題タイトル — 選定理由
```
