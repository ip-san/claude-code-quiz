# 開発ガイド

Claude Code Quiz の開発環境セットアップと開発ワークフローについて説明します。
アーキテクチャの全体像は [ARCHITECTURE.md](ARCHITECTURE.md)、技術選定の背景は [decisions.md](decisions.md) を参照。

## 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発サーバーの起動](#開発サーバーの起動)
- [プロジェクト構成](#プロジェクト構成)
- [開発ワークフロー](#開発ワークフロー)
- [テスト](#テスト)
- [コードスタイル](#コードスタイル)
- [デバッグ](#デバッグ)

## 開発環境のセットアップ

### 必要なツール

- Node.js 18+
- [bun](https://bun.sh/)（パッケージマネージャー兼ランタイム）
- Git
- お好みのエディタ（VSCode 推奨）

### セットアップ手順

```bash
# リポジトリをクローン
git clone git@github.com:ip-san/claude-code-quiz.git
cd claude-code-quiz

# 依存パッケージをインストール
bun install
```

### VSCode 推奨拡張機能

- [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) — Lint + フォーマッター
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## 開発サーバーの起動

### PWA（推奨）

```bash
bun run dev:web
```

`http://localhost:5174/claude-code-quiz/` で PWA 版の開発サーバーが起動。ブラウザで開発・デバッグする場合はこちら。

### Electron

```bash
bun run dev
```

Vite 開発サーバー（`http://localhost:5173`）が起動し、Electron ウィンドウが自動的に開く。

### ホットリロード

- **React コンポーネント**: 変更が即座に反映（HMR）
- **Electron Main プロセス**: 変更時に自動再起動
- **Preload スクリプト**: 変更時に自動再ビルド

## プロジェクト構成

```
claude-code-quiz/
├── electron/              # Electron メインプロセス
│   ├── main.ts           # エントリーポイント
│   └── preload.ts        # Preload スクリプト（IPC ブリッジ）
├── src/                   # React アプリケーション
│   ├── components/       # UI コンポーネント
│   ├── domain/           # ドメイン層（ビジネスロジック）
│   ├── infrastructure/   # インフラ層（永続化など）
│   ├── stores/           # Zustand 状態管理
│   ├── data/             # クイズデータ（JSON）
│   └── main.tsx          # React エントリーポイント
├── build/                 # アプリアイコン
├── docs/                  # ドキュメント
├── scripts/               # ビルドスクリプト
└── release/               # ビルド成果物（.gitignore）
```

### 主要ファイル

| ファイル | 役割 |
|---------|------|
| `electron/main.ts` | Electron メインプロセス、ウィンドウ管理、IPC ハンドラー |
| `electron/preload.ts` | Renderer と Main の橋渡し（contextBridge） |
| `src/stores/quizStore.ts` | アプリケーション状態管理（Zustand） |
| `src/data/quizzes.json` | クイズ問題データ |
| `vite.config.ts` | Vite + Electron ビルド設定 |

## 開発ワークフロー

### 新機能の追加

1. **ブランチ作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **開発サーバー起動**
   ```bash
   bun run dev:web   # PWA（推奨）
   bun run dev       # Electron
   ```

3. **実装とテスト**
   - コードを変更
   - ホットリロードで確認
   - テストを追加・実行

4. **コミット**
   ```bash
   git add .
   git commit -m "Add: your feature description"
   ```

5. **プルリクエスト作成**

### コミットメッセージ規約

```
<type>: <subject>

<body>
```

**Type:**
- `Add`: 新機能
- `Fix`: バグ修正
- `Update`: 機能改善
- `Refactor`: リファクタリング
- `Docs`: ドキュメント
- `Test`: テスト追加・修正
- `Chore`: ビルド、設定など

## テスト

### テストの実行

```bash
# 全テスト実行（414テスト、約2秒）
bun test

# 型チェック + lint + テスト + クイズチェック（一括、約5秒）
bun run check

# ウォッチモード（ファイル変更時に自動実行）
bun run test:watch

# E2E テスト（Playwright、46テスト）
bun run test:e2e

# カバレッジレポート生成
bun run test:coverage
```

### テスト構成

```
src/
├── domain/
│   ├── entities/
│   │   ├── Question.ts
│   │   └── Question.test.ts      # ユニットテスト
│   └── services/
│       ├── QuizSessionService.ts
│       └── QuizSessionService.test.ts
└── infrastructure/
    └── validation/
        ├── QuizValidator.ts
        └── QuizValidator.test.ts
```

### テストの書き方

```typescript
import { describe, it, expect } from 'vitest'
import { Question } from './Question'

describe('Question', () => {
  it('should create a valid question', () => {
    const question = Question.create({
      id: 'test-001',
      category: 'memory',
      difficulty: 'beginner',
      question: 'テスト問題',
      options: [
        { text: '選択肢1' },
        { text: '選択肢2' }
      ],
      correctIndex: 0,
      explanation: '解説'
    })

    expect(question.id).toBe('test-001')
    expect(question.isCorrectAnswer(0)).toBe(true)
  })
})
```

## コードスタイル

### Lint + フォーマット（Biome）

```bash
# チェック
npx biome check src/

# 自動修正
npx biome check --write src/
```

Biome が lint とフォーマットの両方を担当する（ESLint / Prettier は不使用）。設定は `biome.json` に集約。

### TypeScript

- strict モード有効
- 明示的な型注釈を推奨
- `any` の使用は避ける
- 型カバレッジ: 99.5%（`npx type-coverage` で計測）

### Tailwind CSS

- ユーティリティクラスを優先
- カスタムスタイルは `tailwind.config.js` で定義
- Claude ブランドカラーは `claude-*` プレフィックス
- ダークモード: `dark:` プレフィックスで全画面対応

```tsx
// Good
<div className="bg-claude-cream dark:bg-stone-900 text-claude-orange p-4 rounded-lg">

// Avoid
<div style={{ backgroundColor: '#FAF9F5' }}>
```

## デバッグ

### Renderer プロセス（React）

開発モードでは DevTools が自動的に開きます。

- **Console**: ログ出力
- **React DevTools**: コンポーネント階層、状態確認
- **Network**: API リクエスト確認

### Main プロセス（Electron）

```typescript
// electron/main.ts
console.log('Debug message')  // ターミナルに出力
```

### IPC 通信のデバッグ

```typescript
// Renderer 側
window.electronAPI.someMethod().then(result => {
  console.log('IPC result:', result)
})

// Main 側
ipcMain.handle('some-channel', async (event, data) => {
  console.log('Received:', data)
  return { success: true }
})
```

### ビルドのデバッグ

```bash
# 詳細なビルドログ
DEBUG=electron-builder bun run build

# Vite ビルドのみ
npx vite build

# Electron ビルドのみ
npx electron-builder --config
```

## パフォーマンス最適化

### バンドルサイズの確認

```bash
npx vite build --report
```

初期ロードは 189KB（コード分割: quiz-data / vendor / 画面別チャンク）。

### 最適化のポイント

1. **遅延ロード**: 大きなコンポーネントは動的インポート
2. **メモ化**: `React.memo`, `useMemo`, `useCallback` の活用
3. **状態管理**: Zustand のセレクターで必要な状態のみ購読

---

- アーキテクチャの詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照
- 技術選定の背景は [decisions.md](./decisions.md) を参照
- Claude Code の活用方法は [claude-code-workflow.md](./claude-code-workflow.md) を参照
- 全ドキュメントの一覧は [docs/README.md](./README.md) を参照
