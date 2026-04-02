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

### 3. Biome lint（errors + warnings）

```bash
npx biome check src/ mcp/ scripts/ 2>&1
```

**判定:** errors（×）も warnings も 0 が目標。warnings を見逃さないこと。許容する場合は `biome-ignore` + 理由を明記。

**過去の事例:** errors のみ grep して 15 件の warnings を見逃した。

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

### 7b. docs 内の古いツール参照

```bash
grep -rn 'npm \|ESLint\|Prettier' docs/ --include='*.md' | grep -v '不使用\|ではなく\|instead'
```

**判定:** bun/Biome 移行済みなのに旧ツール名が残っていたら修正。

**過去の事例:** DEVELOPMENT.md に ESLint/Prettier/npm が残留していた。

### 8. アクセシビリティ（プロジェクト固有）

このプロジェクトで特に重要な項目（汎用 `/code-review` の a11y チェックに加えて）:
- フォーカス管理（モーダル、クイズ遷移時）
- カラーコントラスト（ダークモード含む）
- `aria-live` によるスコア・フィードバック通知
- タップターゲットサイズ（48px 以上）— モバイルファースト PWA のため必須
- キーボードナビゲーション（クイズ選択肢、ナビゲーション）

### 9. パフォーマンス（プロジェクト固有）

このプロジェクトで特に重要な項目（汎用 `/code-review` の perf チェックに加えて）:
- バンドルサイズへの影響（新しい import が chunk を肥大化させないか）
- Service Worker キャッシュへの影響
- 不要な re-render（Zustand store の肥大化に注意）
- `content-visibility` や仮想スクロールの適用余地（668問リスト表示時）

### 10. State Management（プロジェクト固有）

このプロジェクトは Zustand を使用:
- サーバーデータをローカル state にコピーしていないか
- Zustand store の肥大化（1 store に機能詰め込みすぎ）
- slice パターン（viewSlice, sessionSlice, progressSlice 等）の整合性

### 11. hooks/設定ファイル内の旧ツール参照

```bash
grep -n 'npm test\|npm run' .claude/settings.json .claude/settings.local.json 2>/dev/null | grep -v '"npm run quiz\|"npm run docs'
```

**判定:** `npm test` → `npx vitest run`、`npm run` → `bun run` に統一すべき。docs/ のチェック（7b）と同種だが、設定ファイル内は見落としやすい。

**過去の事例:** PostToolUse hook で `npm test` が残存し、`bun`/`vitest` 環境と不整合だった。

### 12. テスト内のハードコード数値

```bash
grep -rn 'toBe([0-9]\{3,\})' src/ --include='*.test.*' | grep -v node_modules
```

**判定:** 問題数・テスト数など変動する値がハードコードされていたら、ソースから動的に取得すべき。

**過去の事例:** `should load 732 questions` がクイズ追加のたびに手動更新が必要だった。`quizzes.json` からの動的 import に修正。

### 13. OGP/SEO メタタグの鮮度

```bash
grep -oP 'content="[^"]*\d{3,}問' index.html
```

**判定:** meta description や OGP の問題数が実際の問題数と一致しているか。`docs:validate` がカバーしていない HTML 内の数値。

**過去の事例:** meta description が「676問」のまま、実際は732問に増加していた。

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
| 3 | Biome lint | OK / NG (E件 errors, W件 warnings) | 0 warnings が目標 |
| 4 | 正規表現 | OK / 要確認 | |
| 5 | TDZ | OK / 要確認 | |
| 6 | クイズ ID | OK / NG | |
| 7 | ドキュメント整合 | OK / NG | |
| 7b | ドキュメントリンク・鮮度 | OK / NG (N件) | 孤児・リンク切れ・古いツール参照 |
| 8 | アクセシビリティ | OK / 要確認 | |
| 9 | パフォーマンス | OK / 要確認 | |
| 10 | State Management | OK / 要確認 | |
| 11 | hooks 旧ツール参照 | OK / NG | npm→bun/vitest |
| 12 | テスト内ハードコード | OK / NG | 動的取得すべき数値 |
| 13 | OGP/SEO 鮮度 | OK / NG | meta 内の問題数 |
```

`--fix` 指定時は NG 項目を自動修正し、修正内容を報告する。
