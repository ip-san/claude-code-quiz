---
name: self-review
description: 汎用コードレビュー + プロジェクト固有チェックの統合レビュー。セルフレビュー、レビュー、チェック
allowed-tools: Bash, Grep, Glob, Read, Skill
argument-hint: "[--fix] [--skip-code-review]"
---

# Self-Review Skill

`/code-review`（汎用）を内部で呼び出した後、プロジェクト固有のミスパターンチェックを実行する統合レビュースキル。

## 引数

- なし: 汎用レビュー + プロジェクトチェック（報告のみ）
- `--fix`: 検出した問題を自動修正する
- `--skip-code-review`: 汎用レビューをスキップし、プロジェクトチェックのみ実行

## 構成

```
/self-review
├── Step 0: /code-review を実行（汎用: コード品質, React/TS, a11y, perf）
└── Step 1: プロジェクト固有チェック（7項目）
```

**棲み分け:**
- `/code-review`（`~/.claude/skills/`）: 汎用。全プロジェクト共通。カスタムしない
- `/self-review`（`.claude/skills/`）: プロジェクト固有。過去のミスから学んだ教訓

## Step 0: 汎用コードレビュー

**スキップ条件:** `--skip-code-review` フラグ

`/code-review` スキルを実行する。未コミット変更がある場合のみ実行し、変更がなければスキップする。

## Step 1: プロジェクト固有チェック

### 1. ダークモード対応

```bash
grep -rn 'bg-stone-700\|bg-stone-800\|bg-stone-900\|bg-claude-dark\|bg-gray-800\|bg-gray-900' src/components/ --include='*.tsx' | grep -v 'dark:' | grep -v '\.test\.' | grep -v '// '
```

**判定:** ターミナル UI（`TutorialScreen` の `bg-stone-900`）は意図的なので除外。それ以外は `dark:` prefix 欠落。

**過去の事例:** PWAUpdatePrompt と OfflineIndicator が `bg-claude-dark` + `text-white` をダーク固定で使用し、ライトモードで読めなかった。

**このプロジェクトで特に注意:**
- 通知バナー、オーバーレイ、モーダルは見落としやすい
- カラーコントラスト（ダークモード含む）
- `aria-live` によるスコア・フィードバック通知

### 2. トピック固有文字列のハードコード

```bash
grep -rn '"Claude Code"\|Claude Code' src/ --include='*.ts' --include='*.tsx' | grep -v 'theme\.ts\|\.test\.\|scenarios\.ts\|quizzes\.json\|node_modules\|// \|/\*'
```

**判定:** `theme.ts`、`scenarios.ts`、`quizzes.json`、テスト、コメント内は OK。それ以外は `theme.subject` や `theme.appName` を参照すべき。

### 3. 未使用 import / dead code

```bash
npx biome check src/ mcp/ scripts/ 2>&1 | grep '×'
```

**判定:** エラー（×）があれば修正が必要。`mcp/` と `scripts/` も対象範囲に含めること。

### 4. 正規表現の文字クラス不足

新規・変更された正規表現に対して、意図したパターンがマッチするか手動確認。

```bash
git diff HEAD~1 | grep '^+.*match\|^+.*RegExp\|^+.*\/.*\/' | grep -v '^\+\+\+'
```

**過去の事例:** `.env` パーサーの `[A-Z_]+` が `GA4_PROPERTY_ID` の数字 `4` にマッチしなかった。

### 5. const 前方参照（Temporal Dead Zone）

`try/catch` ブロック内で `const` 変数が宣言前に使われていないか確認。エラーが `catch` で握り潰される。

**過去の事例:** `validate-docs.mjs` で `readmeMd` が `try` 内で参照されていたが `const` 宣言はブロック後。README チェックが無言でスキップされていた。

### 6. クイズ ID 重複

```bash
npm run quiz:check 2>&1 | grep -i 'duplicate\|FAIL'
```

### 7. ドキュメント整合性

```bash
npm run docs:validate 2>&1
```

### 8. パフォーマンス（プロジェクト固有）

このプロジェクトで特に重要な項目:
- バンドルサイズへの影響（新しい import が chunk を肥大化させないか）
- Service Worker キャッシュへの影響
- 不要な re-render（Zustand store の肥大化に注意）

## 出力フォーマット

```
## Self-Review 結果

### Step 0: 汎用コードレビュー
（/code-review の出力）

### Step 1: プロジェクト固有チェック
| # | チェック項目 | 結果 | 詳細 |
|---|------------|------|------|
| 1 | ダークモード | OK / NG (N件) | ファイル:行 |
| 2 | ハードコード | OK / NG (N件) | ファイル:行 |
| 3 | 未使用 import | OK / NG (N件) | |
| 4 | 正規表現 | OK / 要確認 | |
| 5 | TDZ | OK / 要確認 | |
| 6 | クイズ ID | OK / NG | |
| 7 | ドキュメント整合 | OK / NG | |
| 8 | パフォーマンス | OK / 要確認 | |
```

`--fix` 指定時は NG 項目を自動修正し、修正内容を報告する。
