---
paths:
  - "src/lib/urlSync.ts"
  - "src/lib/urlSync.test.ts"
  - "src/stores/slices/initSlice.ts"
---

# URL シェア（PWA）

アドレスバーは `src/lib/urlSync.ts` が現在の画面と双方向同期する。`?q=<id>` / `?category=` / `?mode=` / `?scenario=` / `?view=progress|reader|study|result|tutorial`（+ `?view=reader&filter=bookmarked`）を受信可能。クイズ中は `?q=<現在の問題ID>` に自動書き換え（scenario モード除く）。Electron は対象外。

- 純粋関数: `parseUrlIntent` / `buildUrlSearch` / `applyUrlIntent` / `viewTargetToViewState`
- 新 `ViewState` / `QuizModeId` / `ViewIntentTarget` 追加時は urlSync.ts とテストを同時更新
- 初期 URL は `initialize()` 前にキャプチャ + `useRef` ガードで race/StrictMode 二重ディスパッチを防止
- シェア用セッションラベルは `locale.sessionLabels.{recommend,shared,microQuizTip}`（sentinel 兼任）
