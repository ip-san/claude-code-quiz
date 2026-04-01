# 開発に参加する

Claude Code Quiz の開発に参加する方向けのガイドです。

## はじめに読むドキュメント

1. [開発ガイド](docs/DEVELOPMENT.md) — 環境セットアップ、テスト実行方法
2. [アーキテクチャ](docs/ARCHITECTURE.md) — DDD レイヤー構成、ディレクトリ構造
3. [設計判断の記録](docs/decisions.md) — なぜこの技術を選んだか
4. [Claude Code 活用ワークフロー](docs/claude-code-workflow.md) — Claude Code をどう使っているか

## 環境構築

```bash
git clone git@github.com:ip-san/claude-code-quiz.git
cd claude-code-quiz
bun install
bun run dev:web    # PWA 開発サーバー（推奨）
```

## コードを書く

### ディレクトリルール

| ディレクトリ | 置くもの | 注意 |
|-------------|---------|------|
| `src/domain/` | ビジネスロジック | React や localStorage に依存しない |
| `src/infrastructure/` | 永続化、バリデーション | domain のインターフェースを実装 |
| `src/stores/` | Zustand ストア | domain のサービスを呼び出す |
| `src/components/` | React コンポーネント | `dark:` プレフィックスを全色に付ける |
| `src/config/` | テーマ、ロケール | ハードコード文字列はここに集約 |

### コードスタイル

- **フォーマット/Lint:** Biome（`bun run check` で自動チェック）
- **型:** TypeScript strict モード。`any` は使わない
- **CSS:** Tailwind ユーティリティクラス。ダークモードは `dark:` プレフィックスで対応
- **状態管理:** Zustand のセレクターパターン（`useQuizStore(s => s.xxx)`）
- **テスト:** 変更したドメインロジックにはテストを書く

### やってはいけないこと

- `bg-stone-800` を `dark:` なしで使う（ダークモードで見えなくなる）
- `npm` コマンドを使う（`bun` に統一）
- コンポーネント内に `"Claude Code"` をハードコードする（`theme.appName` を使う）
- `useState('')` で名前等を保持する（`useCertificateName` のような永続化フックを使う）

## テスト

変更をコミットする前に:

```bash
bun run check     # 型 + lint + ユニットテスト + クイズチェック（約5秒）
```

コンポーネントを変更した場合:

```bash
bun run build:web && bun run test:e2e   # E2E + Visual Regression（7デバイス）
```

### テストの種類

| テスト | コマンド | 対象 |
|--------|---------|------|
| ユニット | `bun test` | domain, infrastructure, stores |
| E2E | `bun run test:e2e` | ユーザーフロー × 7 デバイス |
| a11y | E2E 内自動実行 | WCAG 2.1 AA (axe-core) |
| Visual Regression | E2E 内自動実行 | レイアウト崩れ検出 |
| バンドルサイズ | `bun run size` | 上限超過検出 |

## PR の出し方

1. `main` からブランチを切る
2. コードを変更
3. `bun run check` が通ることを確認
4. PR を作成（テンプレートに従ってチェックリストを埋める）
5. CI が通ればマージ

### コミットメッセージ

```
<type>: <subject>

<body>
```

Type: `Add`, `Fix`, `Update`, `Refactor`, `Docs`, `Test`, `Chore`

## レビューする時に見るポイント

Claude Code の `/self-review` が自動チェックする項目を、人間がレビューする時にも意識する:

### 必ず確認

- [ ] ダークモード対応 — 新しい色に `dark:` が付いているか
- [ ] タップターゲット — ボタンが 44px 以上あるか
- [ ] アクセシビリティ — `aria-label`、`role` が適切か

### 見落としやすいもの

- [ ] Biome warnings が 0 か（errors だけでなく warnings も）
- [ ] docs/ 内に古いツール名（npm → bun）が残っていないか
- [ ] CLAUDE.md の数値が実装と一致しているか（`bun run docs:validate` で自動検証可能）
- [ ] 新しいコンポーネントを追加した場合、CLAUDE.md のコンポーネント数が更新されているか

### クイズ関連の変更

- [ ] `bun run quiz:check` でID重複がないか
- [ ] シナリオの問題が重複していないか
- [ ] 問題の `wrongFeedback` が全不正解選択肢に付いているか

## Claude Code を使ったレビュー

人間がコードを書いた後、Claude Code でレビューを依頼できる:

```
/self-review           # プロジェクト固有チェック
/code-review           # 汎用コード品質レビュー
/spec-audit            # CLAUDE.md と実装の整合性チェック
```

逆に Claude Code が書いたコードを人間がレビューする場合も、上記の「レビューする時に見るポイント」チェックリストが有効。

## 困ったら

- `bun run check` がエラー → エラーメッセージに従って修正
- Visual Regression が失敗 → `npx playwright test --update-snapshots` でベースライン更新
- CLAUDE.md の数値がズレた → `bun run docs:validate -- --fix` で自動修正
- わからないことがある → [docs/README.md](docs/README.md) のドキュメント一覧から探す
