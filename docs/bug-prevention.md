# 仕様バグ防止ガイド

今日（2026-04-06）のセッションで発見・修正した仕様バグのパターンと、再発防止策のまとめ。

## バグパターンと防御策

### 1. UI表示 ≠ コードロジック

**事例:** 「34問が期限到来」と表示して3問しか出ない、「60秒チェック」でタイマーなし

**根本原因:** 表示テキストとセッション開始パラメータが別々に管理されている

**防御策:**
- `SpecConsistency.test.ts` — モード定義の数値整合性を自動検証
- `/self-review` チェック #19 — startSession 呼び出し周辺のUI表示を突合
- **設計原則:** 表示カウントとセッション開始カウントは同じ変数から生成する

### 2. ロジックの分散（コピペ）

**事例:** `!p || p.attempts === 0 || !p.lastCorrect` が6箇所に分散 → 1箇所だけ更新漏れ

**根本原因:** 同じビジネスルールがインラインで複数箇所に書かれている

**防御策:**
- `UserProgress.isCorrectlyAnswered()` — 未正解判定を1メソッドに集約
- `ScoreThresholds.ts` — パッシングスコア(70%)等のしきい値を1箇所に集約
- `jscpd` — `check:all` でクローン率2%以下を自動チェック
- `SpecConsistency.test.ts` — しきい値がハードコードされていないことを検証
- **設計原則:** 3箇所以上で使うロジックはドメインメソッドに抽出する

### 3. 状態の保存漏れ

**事例:** `timeRemaining` が保存されず、実力テスト再開でタイマーがリセット

**根本原因:** `QuizSessionState` に新フィールドを追加した時に `SessionRepository` の更新を忘れる

**防御策:**
- `SpecConsistency.test.ts` — 必須フィールドが SessionRepository と resumeSlice に存在することを検証
- **設計原則:** `QuizSessionState` にフィールド追加時は必ず以下を同時更新:
  1. `SessionRepository.ts` の `SavedSessionData`
  2. `utils.ts` の `saveSessionSnapshot()`
  3. `resumeSlice.ts` の `resumeSession()`

### 4. 用語の不統一

**事例:** 「未回答」と「未正解」が混在、「解答済み」と「正解済み」が混在

**根本原因:** locale 文字列とロジックが別々に変更される

**防御策:**
- locale ファイル（`ja.ts`）に全テキストを集約 — ハードコード禁止
- `/self-review` チェック #18 — ハードコード日本語の自動検出
- **設計原則:** 用語変更は locale → ロジック → テストの3点セットで行う

### 5. UI層にビジネスロジックが漏れる

**事例:** チャプター遷移が QuizCard の useState で管理され、再開時に状態が消える

**根本原因:** ドメイン層で管理すべき状態がコンポーネントのローカルステートにある

**防御策:**
- `SpecConsistency.test.ts` — QuizCard に `useState<Set>` がないことを検証
- **設計原則:** 永続化が必要な状態はドメイン層（`QuizSessionState`）で管理する
- **判断基準:** `useState` で管理する状態が SessionRepository に保存されるべきものなら、ドメイン層に移動する

### 6. 全体像モードの母数不一致

**事例:** Ch.1（5問）を選択したのに36問のセッションが開始される

**根本原因:** `startSession({ mode: 'overview' }, { startIndex })` が全問ロードして途中から開始する設計

**防御策:**
- `startSessionWithIds` でチャプターの問題IDだけ渡す方式に変更済み
- E2E テスト — 「続きから」で正しい問題数になることを検証
- **設計原則:** UIに表示される問題数 = セッションの実際の問題数

## 品質ゲートの全体構成

```
Layer 1: 型チェック（tsc）
  → コンパイル時に型の不整合を検出

Layer 2: Lint（Biome）
  → コードスタイル + 基本的なバグパターン

Layer 3: ユニットテスト（Vitest テスト）
  ├── SpecConsistency.test.ts (テスト)
  │   ├── モード定義の数値整合性
  │   ├── セッション保存/復元の完全性
  │   ├── チャプター進捗の計算一貫性
  │   ├── ドメイン層の責務境界
  │   └── しきい値のハードコード禁止
  └── ドメイン/ストア/バリデーションテスト

Layer 4: クローン検出（jscpd）
  → コピペされたロジックの検出（2%以下）

Layer 5: ドキュメント整合（docs:validate）
  → CLAUDE.md の統計値と実装の一致

Layer 6: E2E テスト（Playwright E2E テスト）
  ├── 全体像モード3シナリオ
  └── ユーザーフロー + Visual Regression

Layer 7: ハーネスフック（.claude/settings.json — 全6イベント）
  ├── permissions.deny: 破壊的コマンドブロック（7パターン）
  ├── SessionStart (15s): CI失敗・マージ競合・型エラー・未コミット数
  ├── PreToolUse: Bash (3s): scripts/pre-tool-check.sh で破壊的コマンドを事前ブロック
  ├── PostToolUse Hook 1 (120s): ファイル種別に応じた品質チェック
  │   ├── コンポーネント → tsc + SpecConsistency + vitest (並列)
  │   ├── locale → tsc + ハードコード日本語スキャン
  │   ├── ドメイン/ストア → tsc + vitest
  │   └── ドキュメント → docs:validate
  ├── PostToolUse Hook 2 (5s): 重要ファイル変更時の影響範囲アラート
  │   ├── QuizMode.ts → name/description と questionCount/timeLimit の一致確認
  │   ├── UserProgress.ts → isCorrectlyAnswered() の呼び出し元への影響確認
  │   ├── ScoreThresholds.ts → 全画面のスコア表示への影響警告
  │   └── SessionRepository.ts → resumeSlice と saveSnapshot の同時更新確認
  ├── UserPromptSubmit (2s): 2000文字超のプロンプトに分割提案
  ├── Notification (3s): macOS ネイティブ通知（バックグラウンドタスク完了）
  └── Stop (15s): 未コミットファイル・型エラー報告

Layer 8: レビュー（/self-review 19項目）
  ├── #18 ハードコード日本語
  └── #19 UI-ロジック整合性
```

## ハーネスフックの設計原則

- **PreToolUse** は外部スクリプト（`scripts/pre-tool-check.sh`）で stdin をパース。インライン `jq` は stdin 問題があるため使わない
- **PostToolUse Hook 1** は重い処理（tsc + vitest）を並列実行して120秒以内に収める
- **PostToolUse Hook 2** は軽量（5秒以内）で、連鎖更新の見落としを防ぐメッセージだけ出す
- 対象ファイルは `case` 文で分岐し、無関係な編集では何も実行しない
- **permissions.deny** と **PreToolUse** の二重防御で破壊的コマンドを確実にブロック
- 詳細: `.claude/settings.json` の `hooks` セクション

## 新機能追加時のチェックリスト

1. **表示テキスト** → locale ファイルに追加したか？
2. **数値しきい値** → `ScoreThresholds.ts` を参照しているか？
3. **未正解判定** → `isCorrectlyAnswered()` を使っているか？
4. **セッション状態** → `SessionRepository` に保存・復元されるか？
5. **問題数表示** → 実際のセッション問題数と一致するか？
6. **モード定義** → `name` と `description` が実装と一致するか？
7. **SpecConsistency テスト** → 新パターンのテストを追加したか？
