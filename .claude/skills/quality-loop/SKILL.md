---
name: quality-loop
description: コードレビュー + クイズ追加判定 + クイズ検証を一括実行。品質ループ、定期チェック、quality loop
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill
argument-hint: "[--skip-review] [--skip-generate] [--skip-refine] [--dry-run]"
---

# Quality Loop Skill

コード品質とクイズ品質を一括でチェックする統合スキル。
3ステップを順番に実行し、結果をまとめて報告する。

## 引数

`$ARGUMENTS` を空白で分割し、以下のフラグを認識する:

- `--skip-review`: ステップ1（code-review）をスキップ
- `--skip-generate`: ステップ2（クイズ追加判定・生成）をスキップ
- `--skip-refine`: ステップ3（quiz-refine）をスキップ
- `--dry-run`: ステップ2で追加推奨の分析のみ行い、実際の生成はしない

フラグなしの場合は全ステップを実行する。

## ステップ1: コードレビュー

**スキップ条件:** `--skip-review` フラグ、または `git diff --name-only` が空（未コミットの変更なし）

1. `/code-review` スキルを実行する
2. Critical / High の指摘があれば修正を適用する
3. 修正後に `npx tsc --noEmit` で型チェックを確認する

## ステップ2: 新規クイズの必要性検討と生成

**スキップ条件:** `--skip-generate` フラグ

### 分析

1. `npm run quiz:stats` を実行し、カテゴリ別問題数を取得
2. `npm run quiz:coverage` を実行し、ドキュメントページ別カバレッジを取得
3. 以下の基準で追加推奨を判定:
   - **カテゴリ偏り:** Weight に対する問題数比率を計算。Weight 15 のカテゴリが全体の 8% 未満なら不足
   - **カバレッジ不足:** 5問未満のドキュメントページを特定
   - **新機能対応:** 直近の変更で新しいClaude Code関連の概念が追加されたか確認（UIのみの変更は対象外）

### 生成（`--dry-run` でない場合）

追加推奨の場合:
1. 不足が大きいカテゴリから優先して生成（1回あたり最大20問）
2. `/generate-quiz-data N` スキルで生成する（スキルが使えない場合はAgentで代替）
3. `npm run quiz:post-add` を実行（randomize → check → test → stats）
4. テストが通ることを確認

### 報告

- 「追加不要」「追加推奨（--dry-run のため未実行）」「追加済み（N問、カテゴリ: ...）」のいずれかを出力

## ステップ3: クイズ検証・修正

**スキップ条件:** `--skip-refine` フラグ

1. `/quiz-refine` スキルを実行する（差分モード）
2. ステップ2で追加した問題も含めてスキャンされる

## 結果レポート

3ステップの結果を以下の形式でまとめて報告する:

```
## Quality Loop 結果

| ステップ | 結果 | 詳細 |
|---------|------|------|
| 1. code-review | 完了/スキップ | Critical N件, High N件 修正 |
| 2. クイズ追加 | 追加不要/追加済み(N問)/スキップ | 対象カテゴリ: ... |
| 3. quiz-refine | 完了/スキップ | N問スキャン, N件修正 |
```
