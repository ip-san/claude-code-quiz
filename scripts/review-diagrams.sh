#!/bin/bash
# review-diagrams.sh — 全ダイアグラムをカテゴリ別に順次レビュー・修正
# Usage: bash scripts/review-diagrams.sh [category...]
# Example: bash scripts/review-diagrams.sh              # 全カテゴリ
#          bash scripts/review-diagrams.sh memory tools  # 指定カテゴリのみ

set -euo pipefail
cd "$(dirname "$0")/.."

ALL_CATS=(memory skills tools commands extensions session keyboard bestpractices)
CATS=("${@:-${ALL_CATS[@]}}")
LOG_DIR=".claude/tmp/diagram-review"
mkdir -p "$LOG_DIR"

echo "=== Diagram Review: ${CATS[*]} ==="
echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

TOTAL_FIXED=0

for CAT in "${CATS[@]}"; do
  echo "────────────────────────────────────────"
  echo "[$CAT] Starting review..."

  # カテゴリ別の問題IDリストを生成
  IDS=$(node -e "
    const q = require('./src/data/quizzes.json').quizzes;
    const ids = q.filter(x => x.category === '$CAT' && (x.diagrams?.length || x.diagram)).map(x => x.id);
    console.log(JSON.stringify(ids));
  ")

  COUNT=$(echo "$IDS" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).length)")
  echo "[$CAT] $COUNT questions with diagrams to review"

  if [ "$COUNT" -eq 0 ]; then
    echo "[$CAT] Skipped (no diagrams)"
    continue
  fi

  PROMPT=$(cat <<'PROMPT_EOF'
あなたはクイズのダイアグラム品質レビュアーです。自律的に全問題をレビューし、問題があれば修正してください。AskUserQuestion は使わないこと。

## レビュー対象
`src/data/quizzes.json` の「CATEGORY_PLACEHOLDER」カテゴリでダイアグラム付きの全問題。

## レビュー手順
1. `node -e "const q=require('./src/data/quizzes.json').quizzes; q.filter(x=>x.category==='CATEGORY_PLACEHOLDER'&&(x.diagrams?.length||x.diagram)).forEach(x=>console.log(JSON.stringify({id:x.id,explanation:x.explanation,diagrams:x.diagrams||[x.diagram]})));"` で対象を取得
2. 各問題について以下をチェック:

### チェック項目
A. **タイプ適合性**: ダイアグラムのタイプが解説内容に合っているか
   - スコープの上書き/包含関係 → layer が適切（hierarchy ではなく）
   - 複数アクター間のやり取り → sequence が適切（flow ではなく）
   - 双方向通信/接続関係 → network が適切（flow ではなく）
   - 概念の重なり → venn が適切（comparison ではなく）
   - 2軸のグリッド → matrix が適切（comparison ではなく）
   - ディレクトリ構造 → tree が適切（hierarchy ではなく）
   - 計算式/内訳 → formula が適切

B. **データ整合性**: ダイアグラムのデータが解説と一致しているか
   - network: edges の from/to が nodes の id と一致
   - sequence: messages の from/to が actors 配列の有効インデックス
   - venn: sets が2〜3個
   - layer: 外側(index 0)が最優先
   - matrix: cells の行数=rows数、列数=cols数
   - tree: root が存在し children が再帰的に有効
   - formula: components が2個以上

C. **マーカー整合性**: `{{diagram:N}}` が diagrams[N] に対応、範囲外参照なし

D. **内容正確性**: ダイアグラム内のテキストが解説の事実と一致しているか

E. **冗長性**: 解説80字未満で図が繰り返しなら削除提案

### 修正方法
```bash
node scripts/quiz-utils.mjs edit {ID} diagrams '{json}'
node scripts/quiz-utils.mjs edit {ID} explanation "..."
```

### 出力形式
問題なし: `[OK] {id}`
修正実施: `[FIX] {id}: {変更内容}`
スキップ: `[SKIP] {id}: {理由}`

最後にサマリーを出力:
```
## CATEGORY_PLACEHOLDER Review Summary
- Reviewed: N questions
- OK: N
- Fixed: N
- Issues: {修正内容の一覧}
```

最後に `bun run quiz:check` で検証してください。
PROMPT_EOF
)

  # カテゴリ名を埋め込み
  PROMPT="${PROMPT//CATEGORY_PLACEHOLDER/$CAT}"

  # ヘッドレスモードで実行
  LOGFILE="$LOG_DIR/review-${CAT}.log"
  echo "[$CAT] Running headless review -> $LOGFILE"

  claude -p "$PROMPT" \
    --allowedTools "Read,Bash,Grep,Glob,Edit,Write" \
    --model claude-opus-4-7 \
    2>&1 | tee "$LOGFILE"

  # 修正数をカウント
  FIXED=$(grep -c '^\[FIX\]' "$LOGFILE" 2>/dev/null || echo 0)
  TOTAL_FIXED=$((TOTAL_FIXED + FIXED))
  echo ""
  echo "[$CAT] Done. Fixed: $FIXED"
  echo ""
done

# 最終検証
echo "════════════════════════════════════════"
echo "Final validation..."
bun run quiz:check
echo ""
echo "=== Review Complete ==="
echo "Total fixed: $TOTAL_FIXED"
echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Logs: $LOG_DIR/"
