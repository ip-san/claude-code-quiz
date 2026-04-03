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

```bash
node scripts/collect-session.mjs --scan-all-today
```

次に、収集されたデータを読む:

```bash
cat ~/.claude-quiz-recommend/sessions/$(date +%Y-%m-%d).json
```

データが少なければ過去7日分も確認:

```bash
ls -t ~/.claude-quiz-recommend/sessions/ | head -7
```

### Step 2: 作業意図の分析

収集された `promptSamples` を読み、以下を判断する:

1. **何をしようとしていたか**（目的）
   - 例: 「GraphQL スキーマの外部露出リスクを確認していた」→ セキュリティの判断が必要
   - 例: 「CLAUDE.md を何度も書き直していた」→ 効果的な書き方を知りたい

2. **どんな困難に直面していたか**（つまずき）
   - 例: 「同じ質問を繰り返していた」→ その機能の理解が浅い
   - 例: 「エラーメッセージについて聞いていた」→ デバッグ知識が必要

3. **使っていたが深く理解していなさそうな機能**
   - 例: 「サブエージェントを使ったが、結果の品質に不満そう」→ 使い分けの問題

4. **全く使っていない機能で、この作業に役立つもの**
   - 例: 「ファイルを1つずつ手動で編集していた」→ /batch を知らない可能性

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
