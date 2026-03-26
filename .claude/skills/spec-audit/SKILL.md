---
name: spec-audit
description: CLAUDE.md の仕様記述と実装の意味的な整合性を監査する。仕様バグ検出、spec audit、仕様チェック、ドキュメント整合性。数値チェックは `npm run docs:validate` で自動化済みなので、このスキルではコードを読んで意味的な不一致を検出する。
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(npm run docs:validate*), Bash(npx vitest*), Bash(npx playwright*), Bash(node scripts/*), Bash(ls *), Bash(find *), Bash(wc *)
argument-hint: "[section]"
---

# Spec Audit Skill

CLAUDE.md の仕様記述が実装と一致しているかを監査する。

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
- `navigation` — ナビゲーション動作
- `ui` — UI/UX 機能の存在確認
- `persistence` — セッション永続化
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

CLAUDE.md のディレクトリツリー記述と実際のディレクトリを比較する。

**検証項目:**
- 記載されたディレクトリが実在するか（`ls` で確認）
- 記載されていない新しいディレクトリが追加されていないか
- 各ディレクトリのコメント（`# 説明`）が内容と合っているか
- 代表的なファイル名（`QuizCard, Feedback` 等）が実在するか

### modes — クイズモード設定

CLAUDE.md のクイズモードテーブルと `src/domain/valueObjects/QuizMode.ts` を比較する。

**検証項目:**
- 全モードが QuizMode に定義されているか
- 各モードの問題数（100問、20問、3問等）が実装と一致するか
- 制限時間（60分等）が実装と一致するか
- deferFeedback の設定が正しいか（実力テストのみ true）
- 全体像モードのチャプター数（6）が実装と一致するか

### navigation — ナビゲーション動作

CLAUDE.md のナビゲーション仕様と `src/stores/quizStore.ts` を比較する。

**検証項目:**
- 「回答前でもスキップ可能」→ `goToNextQuestion`/`goToPreviousQuestion` に回答チェックがないか
- 「選択状態を復元」→ 前の問題に戻った時に選択状態が復元されるか
- 「スコアは差分計算」→ `submitAnswer` で二重カウント防止ロジックがあるか
- 「ブラウザ戻るボタンでメニューに直帰」→ history API 操作があるか
- 実力テストの「タイマーは回答済み問題の閲覧中は停止」→ Timer コンポーネントにその制御があるか

### ui — UI/UX 機能の存在確認

CLAUDE.md に記載された UI 機能が実際にコンポーネントとして存在するか。

**検証項目:**
- ゲーミフィケーション機能（StreakBanner, DailySnapshot, StreakToast, EncouragementToast 等）のコンポーネントが存在するか
- 学習支援機能（QuizSearch, LearningRecommendation, WeakPointInsight, CertificateGenerator 等）が存在するか
- アニメーション（CorrectOverlay, ConfettiEffect, ScoreRing 等）が存在するか
- 記載されたコンポーネント名と実際のファイル名が一致するか

### persistence — セッション永続化

CLAUDE.md のセッション永続化仕様と実装を比較する。

**検証項目:**
- `answerRecords` キーで localStorage に保存しているか
- セッション復帰ロジックが存在するか
- `retryQuestion` が UI リセットと差分スコア計算を行うか
- `finishTest` が answerHistory からスコアを再計算するか

### tags — タグシステム

CLAUDE.md のタグ仕様とクイズデータを比較する。

**検証項目:**
- `overview` タグ付き問題が CLAUDE.md 記載の数と一致するか（数値は docs:validate で検証済み）
- `overview-ch-N` のチャプター番号が 1〜6 の範囲か
- `overview-NNN` の出題順序がユニークか
- 全体像モード問題が全チャプターに適切に分散しているか

### categories — カテゴリ定義

CLAUDE.md のカテゴリテーブルと `src/domain/valueObjects/Category.ts` を比較する。

**検証項目:**
- 全カテゴリ ID が Category.ts に定義されているか
- Weight（重み）が一致するか
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

| # | Section | Severity | CLAUDE.md の記述 | 実装の状態 | 修正案 |
|---|---------|----------|-----------------|-----------|--------|
| 1 | modes   | major    | 20問をランダム出題 | QuizMode: questionCount=25 | CLAUDE.md を 25 に修正 or 実装を 20 に修正 |

### Auto-fixed (docs:validate --fix)
- ダイアグラム数: 247 → 250

### Verified OK
- [x] structure
- [x] navigation
- [x] ui
- [x] persistence
```

### 不一致がない場合

```
✅ Spec Audit Complete — CLAUDE.md と実装は全セクションで一致しています。
```

## Step 3: Web 品質監査（オプション）

引数に `quality` を指定した場合、または全セクション監査時にオプションとして実行する。

**`/web-quality-audit` スキルの基準を適用し、以下を追加チェック:**

- **アクセシビリティ:** `/accessibility` スキル基準で JSX コンポーネントを検査（alt, aria, focus, contrast）
- **パフォーマンス:** `/performance` スキル基準でバンドル・キャッシュ・画像を検査
- **ベストプラクティス:** deprecated API、セキュリティヘッダー、コンソールエラー

結果は Step 2 のレポートに「Web Quality」セクションとして追加する。

## 修正方針

- **CLAUDE.md が古い場合**: CLAUDE.md を実装に合わせて修正する
- **実装が仕様と異なる場合**: ユーザーに報告し、CLAUDE.md と実装のどちらを正とするか確認する
- **判断できない場合**: 両方の状態を報告し、ユーザーに判断を委ねる
