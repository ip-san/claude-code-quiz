---
name: spec-audit
description: CLAUDE.md・README・docs・rules の仕様記述と実装の意味的な整合性を監査する。仕様バグ検出、spec audit、仕様チェック、ドキュメント整合性
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(npm run docs:validate*), Bash(npx vitest*), Bash(npx playwright*), Bash(node scripts/*), Bash(ls *), Bash(find *), Bash(wc *)
argument-hint: "[section]"
---

# Spec Audit Skill

CLAUDE.md・README.md・`docs/ARCHITECTURE.md`・`.claude/rules/quiz-data.md` の仕様記述が実装と一致しているかを監査する（各セクションの照合先は下記）。

## 役割の分担

- **数値の一致** → `npm run docs:validate` が自動検証済み（クイズ数、ダイアグラム数、コンポーネント数、テスト数、ドキュメントページ数等）
- **意味的な整合性** → **このスキルの担当**（モード設定、ナビゲーション動作、ディレクトリ構造、機能の存在等）

数値の不一致を見つけたら `npm run docs:validate -- --fix` で自動修正を試みる。

## Arguments

- 引数なし: 全セクションを監査
- セクション名を指定: そのセクションのみ監査（例: `/spec-audit modes`）

有効なセクション名:
- `structure` — ディレクトリ構造
- `modes` — クイズモード設定
- `tags` — タグシステム
- `categories` — カテゴリ定義
- `commands` — 開発コマンドの存在確認

## Step 0: 数値チェック（前処理）

```bash
npm run docs:validate
```

失敗した場合は `npm run docs:validate -- --fix` で修正し、修正内容を報告する。

## Step 1: セクション別の意味的検証

### structure — ディレクトリ構造

`docs/ARCHITECTURE.md` の「レイヤー構成」「ファイル構成」にあるディレクトリツリーと実際のディレクトリを比較する。

**検証項目:**
- 記載されたディレクトリが実在するか（`ls` で確認）
- 記載されていない新しいディレクトリが追加されていないか
- 各ディレクトリのコメント（`# 説明`）が内容と合っているか
- 代表的なファイル名（`QuizCard, Feedback` 等）が実在するか

### modes — クイズモード設定

README.md の「クイズモード」テーブルと `src/domain/valueObjects/QuizMode.ts` を比較する。

**検証項目:**
- 全モードが QuizMode に定義されているか
- 各モードの問題数（100問、20問、3問等）が実装と一致するか
- 制限時間（60分等）が実装と一致するか
- deferFeedback の設定が正しいか（実力テストのみ true）
- 全体像モードのチャプター数（6）が実装と一致するか

### tags — タグシステム

`.claude/rules/quiz-data.md` の「タグシステム」とクイズデータを比較する。

**検証項目:**
- `overview` タグ付き問題が quiz-data.md 記載の数と一致するか（数値は docs:validate で検証済み）
- `overview-ch-N` のチャプター番号が 1〜6 の範囲か
- `overview-NNN` の出題順序がユニークか
- 全体像モード問題が全チャプターに適切に分散しているか

### categories — カテゴリ定義

`README.md` のカテゴリ表・`.claude/rules/quiz-data.md` の ID 命名規則と、`src/domain/valueObjects/Category.ts` / `src/config/theme.ts` を比較する。

**検証項目:**
- 全カテゴリ ID が Category.ts に定義されているか
- `theme.ts` の `weight` と `generate-quiz-data/SKILL.md` のカテゴリ配分表が一致するか
- ID 命名規則テーブルの Prefix が実際のクイズ ID と一致するか

### commands — 開発コマンドの存在確認

CLAUDE.md の開発コマンドセクションに記載されたコマンドが `package.json` に存在するか。

**検証項目:**
- 記載された `npm run` コマンドが全て `package.json` の `scripts` に存在するか
- `package.json` にあるが CLAUDE.md に記載されていないコマンドがないか（有用なコマンドの記載漏れ）

## Step 2: 結果レポート

### 不一致が見つかった場合

```markdown
## Spec Audit Results

### Issues Found

| # | Section | Severity | 仕様文書の記述 | 実装の状態 | 修正案 |
|---|---------|----------|-----------------|-----------|--------|
| 1 | modes   | major    | README: 20問をランダム出題 | QuizMode: questionCount=25 | README を 25 に修正 or 実装を 20 に修正 |

### Auto-fixed (docs:validate --fix)
- ダイアグラム数: 247 → 250

### Verified OK
- [x] structure
- [x] tags
- [x] categories
```

### 不一致がない場合

```
✅ Spec Audit Complete — 仕様文書と実装は全セクションで一致しています。
```

## Step 3: Web 品質監査（オプション）

引数に `quality` を指定した場合、または全セクション監査時にオプションとして実行する。

**`/web-quality-audit` スキルの基準を適用し、以下を追加チェック:**

- **アクセシビリティ:** `/accessibility` スキル基準で JSX コンポーネントを検査（alt, aria, focus, contrast）
- **パフォーマンス:** `/performance` スキル基準でバンドル・キャッシュ・画像を検査
- **ベストプラクティス:** deprecated API、セキュリティヘッダー、コンソールエラー

結果は Step 2 のレポートに「Web Quality」セクションとして追加する。

## 修正方針

- **仕様文書が古い場合**: その文書を実装に合わせて修正する
- **実装が仕様と異なる場合**: ユーザーに報告し、文書と実装のどちらを正とするか確認する
- **判断できない場合**: 両方の状態を報告し、ユーザーに判断を委ねる
