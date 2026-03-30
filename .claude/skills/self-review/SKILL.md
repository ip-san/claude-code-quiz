---
name: self-review
description: プロジェクト固有のセルフレビューチェックリスト。過去のミスパターンを自動検出する。セルフレビュー、レビュー、チェック
allowed-tools: Bash, Grep, Glob, Read
argument-hint: "[--fix]"
---

# Self-Review Skill

このプロジェクトで過去に発生したミスパターンを自動検出するチェックリスト。
`/code-review`（ユーザーレベル、汎用）とは異なり、このスキルはプロジェクト固有の教訓に特化する。

## 引数

- なし: チェックのみ（報告）
- `--fix`: 検出した問題を自動修正する

## チェック項目

### 1. ダークモード対応

```bash
grep -rn 'bg-stone-700\|bg-stone-800\|bg-stone-900\|bg-claude-dark\|bg-gray-800\|bg-gray-900' src/components/ --include='*.tsx' | grep -v 'dark:' | grep -v '\.test\.' | grep -v '// '
```

**判定:** ターミナル UI（`TutorialScreen` の `bg-stone-900`）は意図的なので除外。それ以外のヒットは `dark:` prefix が欠落している。

**過去の事例:** PWAUpdatePrompt と OfflineIndicator が `bg-claude-dark` + `text-white` をダーク固定で使用し、ライトモードで読めなかった。

### 2. トピック固有文字列のハードコード

```bash
grep -rn '"Claude Code"\|Claude Code' src/ --include='*.ts' --include='*.tsx' | grep -v 'theme\.ts\|\.test\.\|scenarios\.ts\|quizzes\.json\|node_modules\|// \|/\*'
```

**判定:** `theme.ts`、`scenarios.ts`、`quizzes.json`、テスト、コメント内は OK。それ以外にヒットがあれば `theme.subject` や `theme.appName` を参照すべき。

**過去の事例:** `App.tsx` のローディング画面、`locale.ts` の `promptCopied`、`ScoreMessageService` のメッセージに "Claude Code" がハードコードされていた。

### 3. 未使用 import / dead code

```bash
npx biome check src/ mcp/ scripts/ 2>&1 | grep '×'
```

**判定:** エラー（×）があれば修正が必要。

**過去の事例:** MCP サーバーリファクタ後に `createInterface` import が残存。`mcp/` が Biome 範囲外だったため検出できなかった。

### 4. 正規表現の文字クラス不足

新規・変更された正規表現に対して、意図したパターンがマッチするか手動確認。

```bash
git diff HEAD~1 | grep '^+.*match\|^+.*RegExp\|^+.*\/.*\/' | grep -v '^\+\+\+'
```

**過去の事例:** `.env` パーサーの `[A-Z_]+` が `GA4_PROPERTY_ID` の数字 `4` にマッチしなかった。

### 5. const 前方参照（Temporal Dead Zone）

```bash
# try ブロック内で使われている変数が、ブロックより後で宣言されていないか
# 手動確認が必要 — 自動検出は困難
```

**過去の事例:** `validate-docs.mjs` で `readmeMd` が L91 の `try` 内で参照されていたが、`const` 宣言は L197。`catch` が ReferenceError を握り潰し、README チェックが無言でスキップされていた。

### 6. クイズ ID 重複

```bash
npm run quiz:check 2>&1 | grep -i 'duplicate\|FAIL'
```

**過去の事例:** 既存 max ID を確認せず bp-048〜057 を追加したところ、既存 ID と衝突。

### 7. ドキュメント整合性

```bash
npm run docs:validate 2>&1
```

**過去の事例:** テスト戦略テーブルに Data レイヤー（15テスト）が欠落。コンポーネント数の `.ts` + `.tsx` 合算を `.tsx` のみと誤認。

## 出力フォーマット

```
## Self-Review 結果

| # | チェック項目 | 結果 | 詳細 |
|---|------------|------|------|
| 1 | ダークモード | OK / NG (N件) | ファイル:行 |
| 2 | ハードコード | OK / NG (N件) | ファイル:行 |
| 3 | 未使用 import | OK / NG (N件) | |
| 4 | 正規表現 | OK / 要確認 | |
| 5 | TDZ | OK / 要確認 | |
| 6 | クイズ ID | OK / NG | |
| 7 | ドキュメント整合 | OK / NG | |
```

`--fix` 指定時は NG 項目を自動修正し、修正内容を報告する。
