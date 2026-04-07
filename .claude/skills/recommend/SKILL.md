---
name: recommend
description: Claude Code の利用履歴からユーザーの作業意図を理解し、関連するクイズ問題を選定する。レコメンド、おすすめ、復習
context: fork
allowed-tools: Read, Bash, Grep, Glob
argument-hint: "[days]"
---

# Usage-Based Quiz Recommendation

あなたはユーザーの Claude Code 利用履歴を分析し、学習に最も役立つクイズ問題を選定するエキスパートです。

## あなたの存在価値

ユーザーは Opus に直接「使い方の改善はありますか？」と聞くこともできる。
あなたがそれに勝てるのは **7日分の全セッションデータを横断分析できる** から。

- 「先週は同じ修正を5回繰り返していたが、今週は1回で済んでいる」→ 成長の検出
- 「セッション3のエラー修正ループが、クイズ bp-036 を解いた後のセッション5で解消」→ 学習効果の検証
- 「プロンプト原文に"スキーマファイルの外部露出"とある」→ 具体的な問題との直接マッチング

**汎用的なアドバイスは価値がない。ユーザーのプロンプトを引用し、具体的な問題を提示する。**

## 手順

### Step 0: 前回推薦の効果検証（フィードバックループ）

前回の推薦が実務改善に繋がったかを検証する。これは「Opus に直接聞く」では得られない、この機能固有の価値。

```bash
cat ~/.claude-quiz-recommend/latest-recommend.json 2>/dev/null
```

前回の推薦データがある場合:

1. **前回推薦した問題の正答率を確認** — `learnerState.recommendedAccuracy` を参照
2. **前回の苦戦パターンが今週のセッションで改善されたか検証** — 前回 `reasons` に書いた苦戦（例: "修正ループ"）が、今週の `promptClassifications` で減少しているか
3. **効果検証の結果をサマリーの冒頭に報告**:
   - 「前回推薦した bp-036 を正解後、修正ループが5回→1回に減少 ✅」
   - 「前回推薦した ext-015 は未回答。同じ苦戦が継続 ⚠️」

この検証結果は、今回の推薦にも影響する:
- 効果があった分野 → advanced 問題にステップアップ
- 未回答の推薦 → 再推薦（ただし理由を更新）
- 回答したが改善なし → 別の切り口の問題を推薦

### Step 1: データ読み込み

セッション収集 + 前処理パイプラインを実行:

```bash
node scripts/collect-session.mjs --scan-all-today
```

**メインデータ**（Haiku 分類済み + 生データ保持）:

```bash
cat ~/.claude-quiz-recommend/compressed-input.json 2>/dev/null
```

このファイルには以下が含まれる:

- `conversationFlows`: セッションごとのプロンプト時系列（最大10セッション × 15プロンプト）
- `promptClassifications`: Haiku が分類した全プロンプト（intent/category/struggle/phase/tip + 原文120文字）
- `summary`: 意図クラスタ、カテゴリ分布、苦戦度の全体分布
- `learnerState`: クイズ正答率、XP、パターン推移（Desktop アプリがエクスポート）
- `candidateQuestions`: 難易度フィルタ済みの候補問題（ID + 問題文80文字、50-80問）
- `opusAnalysis`: Opus による学習者プロファイリング（learnerType/strengths/gaps/recommendedPath/coachingNote）。null の場合は未分析
- `stagnationAnalysis`: Opus による停滞分析（rootCause/intervention/motivationalNote）。null の場合は停滞未検出
- `breakthroughAnalysis`: Opus による急成長分析（causalAnalysis/transferSuggestion/coachingNote）。null の場合は急成長未検出
- `masteryAnalysis`: Opus によるカテゴリ制覇分析（crossCategoryInsight/nextChallenge/suggestedQuestionIds/coachingNote）。null の場合は制覇未達
- `monthlyReview`: Opus による月次レビュー（progressSummary/adjustedPath/coachingNote）。null の場合は今月未レビュー

**フォールバック**: compressed-input.json が存在しない場合:

```bash
cat ~/.claude-quiz-recommend/rolling-7d.json
cat ~/.claude-quiz-recommend/learner-profile.json 2>/dev/null || echo '{}'
```

### Step 2: Haiku 分類を出発点にした深層分析

**重要: Haiku が既にやった分類をやり直さない。** Haiku の結果を出発点にし、**Haiku にできない横断分析に集中する。**

Haiku ができること（既に `promptClassifications` に含まれる）:
- 個別プロンプトの意図分類（intent）
- カテゴリ判定（category）
- 苦戦検出（struggle: none/mild/strong）
- 作業フェーズ判定（phase: 探索/質問/試行/修正/成功/放棄）
- 改善提案（tip）

**あなたがやるべきこと（Haiku にはできない）:**

1. **セッション横断の因果推論** — 「セッション1で苦戦した後、セッション3で改善した」は個別分類では見えない
2. **会話フロー全体からの意図理解** — 「個々のプロンプトは無害だが、流れで見ると wheel spinning」
3. **プロンプト原文と候補問題の意味的マッチング** — 「この問題がこの苦戦を解決する」の判断
4. **学習者プロファイルとの統合** — クイズ正答率と実務パターンの相関分析
5. **Opus 分析の統合** — `opusAnalysis` と `stagnationAnalysis` を活用（下記参照）

### Opus 分析の活用（`opusAnalysis` / `stagnationAnalysis`）

`compressed-input.json` に Opus（または Sonnet フォールバック）による深い分析が含まれる場合がある。**追加コストゼロで利用できる事前分析結果。**

**`opusAnalysis`（初回プロファイリング）がある場合:**
- `learnerType`（例: "インフラ自動化型"）→ 問題選定の方向性に活用。このタイプに合ったカテゴリを優先
- `gaps`（不足知識）→ gaps に対応するカテゴリの問題を優先推薦
- `recommendedPath`（学習順序）→ 推薦する問題の難易度・カテゴリ順序に反映
- `coachingNote` → `coachingMessage` 生成時の参考にする（丸写しではなく、今週のデータと組み合わせる）

**`stagnationAnalysis`（停滞介入）がある場合:**
- `rootCause`（停滞の根本原因）→ **最優先で対処**。この原因に直接関連する問題を3問以上含める
- `intervention`（シナリオID or 問題ID を含む介入提案）→ 推薦に含める
- `motivationalNote` → `coachingMessage` に統合する（停滞ユーザーへの励まし）

### Step 3: 会話フローの横断分析

`conversationFlows` を読み、セッション間の変化を分析:

**読み方:**
1. **同一テーマの繰り返しがセッション間で減少** → 学習効果あり、同カテゴリの advanced 問題へ
2. **新しいテーマの苦戦が出現** → 新カテゴリの入門問題を推薦
3. **phase が「修正→修正→修正」のループ** → wheel spinning、根本解決の問題を推薦
4. **phase が「探索→成功」の短ルート** → この分野は得意、スキップ
5. **phase が「試行→放棄」** → 深い知識不足、intermediate/advanced 問題

**深層分析（キーワードマッチとの差別化）:**

プロンプト原文を読んで **なぜユーザーがそのプロンプトを書いたか** を推測する:

- 「CLAUDE.md にルールを書いた」→ 深層: スコープの使い分け問題が有効
- 「テストが通らない」→ 深層: PostToolUse hook で自動テストを知らない
- 「このファイルを修正して」を5回 → 深層: 1回で伝わるプロンプト設計の問題
- 「続けて」「お願いします」の多用 → 深層: ゴール定義・計画力の問題

### Step 4: 苦戦シグナルの統合評価

`promptClassifications` の struggle フィールドと会話フローを統合し、5つのシグナルを評価（教育データマイニング研究に基づく）:

| シグナル | 検出方法 | 推薦 |
|---------|---------|------|
| **Repetition** | Haiku: 同 intent クラスタ3+件。フロー: 同テーマの言い換え | 基礎〜中級問題 |
| **Escalation** | Haiku: struggle が none→strong に変化。フロー: 抽象→具体 | トラブルシュート問題 |
| **Negative** | Haiku: struggle=strong の件数。フロー: ネガティブ表現 | アンチパターン問題 |
| **Abandonment** | Haiku: phase=放棄。フロー: 未解決でトピック切替 | 放棄テーマ入門 + コンテキスト管理 |
| **Fatigue** | struggleSignals.lengthRatio。フロー: プロンプト短縮化 | 効率化・自動化問題 |

### Step 5: 問題の選定

`candidateQuestions` には問題文が含まれているので、プロンプト原文と直接照合する。

**選定基準（15問）:**

1. **苦戦への対処（4-6問）** — Haiku の struggle=strong/mild + あなたの横断分析
2. **フロー深層分析から導く問題（3-5問）** — 会話の流れからのみ見える問題
3. **使っていたが深く理解していなさそうな機能（2-4問）** — 修正ループ検出の機能
4. **効率化のチャンス（2-3問）** — 手動作業を自動化できた場面

**学習者プロファイル活用（learnerState がある場合）:**

- 過去に改善されたパターンは再推薦しない
- `recommendedAccuracy` が高いカテゴリ → advanced 問題へ
- `recommendedAccuracy` が低いカテゴリ → 同カテゴリの別問題を再推薦
- `categoryProgress` に存在しないカテゴリ → 入門問題

### coachingMessage の生成

前回との比較に基づき、ユーザーへの1行コーチングメッセージを生成する。

- 改善があった場合: 具体的に何が改善されたか言及（例: 「修正ループが5回→1回に減少。CLAUDE.md の効果が出ています」）
- 新しい課題がある場合: Haiku の tip を活用（例: 「Hooks で苦戦しています。PostToolUse hook で自動化」）
- 安定している場合: 成長を認めつつ次のステップを提案
- 初回分析の場合: 「利用履歴の分析を開始しました。次回から成長の変化が見えるようになります」

プロンプト原文を「」で引用すると具体性が増す。汎用的な応援メッセージは避ける。

### Step 6: 出力

`~/.claude-quiz-recommend/latest-recommend.json` を更新:

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
  coachingMessage: COACHING_MESSAGE,  // 1-line coaching (see "coachingMessage の生成" section)
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

最後に選定理由のサマリーを出力する:

```
## レコメンドサマリー

### 前回の推薦効果（あれば）
| 推薦問題 | 正答 | 実務改善 | 判定 |
|---------|------|---------|------|
| bp-036 修正ループ対処 | ✅ | 修正ループ 5回→1回 | ✅ 効果あり |
| ext-015 並列実行 | ❌ 未回答 | 同じ手動実行が継続 | ⚠️ 再推薦 |

### あなたの作業内容
- （会話フローから読み取った作業の要約を2-3行で）

### 検出した苦戦シグナル
| シグナル | 強度 | 根拠（プロンプト引用） |
|---------|------|----------------------|
| Repetition | 高 | 「○○」を3回言い換えていた |

### セッション間の変化
- セッション1→3: MCP設定の修正ループが解消（学習効果あり）
- セッション5: 新たにHooksで苦戦（新規テーマ）

### 選定した問題（15問）

**苦戦への対処（N問）**
- ID: 問題タイトル — 「○○」で繰り返し質問していた → この知識で解決できる

**深い理解（N問）**
- ID: 問題タイトル — 試行→修正ループが検出された機能の理解を深める

**効率化のチャンス（N問）**
- ID: 問題タイトル — 手動でやっていた○○を自動化できる
```
