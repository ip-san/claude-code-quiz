# Electron 層のルール

このディレクトリ配下のファイルを編集する時に Claude が自動でロードするルール。

## アーキテクチャ
Main Process (`main.ts`) ↔ Preload (`preload.ts`) ↔ Renderer (React)

## セキュリティ方針（変更禁止）
- `nodeIntegration: false` — Renderer から Node.js API を直接使用させない
- `contextIsolation: true` — Preload と Renderer のコンテキスト分離
- `sandbox: true` — Renderer プロセスをサンドボックス化
- 外部 URL は HTTPS のみ
- 新規ウィンドウの作成を禁止

## IPC ハンドラ実装パターン
`electron/*-handlers.ts` は `src/infrastructure/*/*Handlers.ts` の **re-export のみ**。

ビジネスロジックは `src/` 側でテスト可能な純粋関数として実装し、依存（fs、process、env）は **DI で渡す**。

例: `electron/recommend-handlers.ts` → `src/infrastructure/recommend/recommendHandlers.ts`

理由:
- electron ランタイムなしで Vitest からテスト可能になる（`scripts/__tests__/` 参照）
- main プロセスがクラッシュしてもロジック自体は再利用できる

## ハードウェアアクセラレーション
`app.disableHardwareAcceleration()` を呼ぶ（`main.ts` 冒頭）。仮想環境・特定 GPU ドライバでクラッシュ回避目的。クイズアプリは高度なグラフィックス不要なので無効化で問題なし。
