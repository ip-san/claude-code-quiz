## 概要

<!-- 変更の目的を1-2文で -->

## 変更内容

- 

## チェックリスト

- [ ] `bun run check` が通る（型 + lint + テスト + クイズチェック）
- [ ] ダークモード対応（新しい色に `dark:` 付き）
- [ ] アクセシビリティ（`aria-label`、タップターゲット 44px+）
- [ ] CLAUDE.md の数値が最新（`bun run docs:validate`）

### 該当する場合のみ

- [ ] E2E テスト通過（`bun run build:web && bun run test:e2e`）
- [ ] Visual Regression ベースライン更新（`npx playwright test --update-snapshots`）
- [ ] クイズデータ変更 → `bun run quiz:post-add`
- [ ] ドキュメント更新
