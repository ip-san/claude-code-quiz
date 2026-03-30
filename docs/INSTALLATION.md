# インストールガイド

Claude Code Quiz のインストール方法を説明します。

## 目次

- [PWA（推奨）](#pwa推奨)
- [Electron デスクトップアプリ](#electron-デスクトップアプリ)
- [トラブルシューティング](#トラブルシューティング)

---

## PWA（推奨）

**https://ip-san.github.io/claude-code-quiz/** にアクセスするだけで利用可能。インストール不要。

ホーム画面に追加すると、アドレスバーなしのフルスクリーンアプリとして起動できます。

### iPhone（iOS Safari）

1. **Safari** で上記 URL を開く（Chrome 等では不可）
2. 画面下部の **共有ボタン**（□↑）をタップ
3. **「ホーム画面に追加」** をタップ → **「追加」**

### Android（Chrome）

1. **Chrome** で上記 URL を開く
2. **「アプリをインストール」** バナーをタップ（出ない場合は **⋮ → アプリをインストール**）

### PC（Chrome / Edge）

1. Chrome または Edge で上記 URL を開く
2. アドレスバー右端の **インストールアイコン**（＋マーク）をクリック

---

## Electron デスクトップアプリ

ソースからビルドして Electron デスクトップアプリとしてインストールする手順。

### 必要環境

- **Node.js**: 18.0.0 以上
- **[bun](https://bun.sh/)**: パッケージマネージャー兼ランタイム
- **OS**: macOS 10.12 以上 / Windows 10 以上 / Ubuntu 18.04 以上

### Node.js のインストール

Node.js がインストールされていない場合：

```bash
# macOS (Homebrew)
brew install node

# または公式サイトからダウンロード
# https://nodejs.org/
```

バージョン確認：

```bash
node --version  # v18.0.0 以上
bun --version   # 1.0.0 以上
```

### ソースからビルド

### 1. リポジトリのクローン

```bash
git clone git@github.com:ip-san/claude-code-quiz.git
cd claude-code-quiz
```

### 2. 依存パッケージのインストール

```bash
bun install
```

初回は数分かかる場合があります。

### 3. アプリのビルド

```bash
bun run build
```

ビルドが完了すると、`release/` フォルダにインストーラーが生成されます：

| OS | ファイル | 形式 |
|----|---------|------|
| macOS | `Claude Code Quiz-x.x.x-arm64.dmg` | DMG |
| Windows | `Claude Code Quiz Setup x.x.x.exe` | NSIS |
| Linux | `Claude Code Quiz-x.x.x.AppImage` | AppImage |

### アプリのインストール

### macOS

1. `release/Claude Code Quiz-x.x.x-arm64.dmg` をダブルクリック
2. 開いたウィンドウで、アプリアイコンを **Applications** フォルダにドラッグ
3. **Launchpad** または **Applications** フォルダから「Claude Code Quiz」を起動

#### 初回起動時の警告

macOS では、署名されていないアプリに対して警告が表示されます：

> 「Claude Code Quiz」は、開発元を確認できないため開けません。

**解決方法：**

1. **システム設定** を開く
2. **プライバシーとセキュリティ** を選択
3. 下部に表示される「"Claude Code Quiz" はブロックされました」の横にある **このまま開く** をクリック
4. 確認ダイアログで **開く** をクリック

または、Finder でアプリを右クリック → **開く** を選択する方法もあります。

### Windows

1. `release/Claude Code Quiz Setup x.x.x.exe` をダブルクリック
2. インストーラーの指示に従ってインストール
3. スタートメニューから「Claude Code Quiz」を起動

#### Windows Defender の警告

「Windows によって PC が保護されました」と表示された場合：

1. **詳細情報** をクリック
2. **実行** をクリック

### Linux

```bash
# AppImage に実行権限を付与
chmod +x "Claude Code Quiz-x.x.x.AppImage"

# 実行
./"Claude Code Quiz-x.x.x.AppImage"
```

### アップデート

新しいバージョンがリリースされた場合：

```bash
# 最新のソースを取得
git pull origin main

# 依存パッケージを更新
bun install

# 再ビルド
bun run build
```

生成された新しい DMG/インストーラーから再インストールしてください。

### アンインストール

### macOS

1. Applications フォルダから「Claude Code Quiz」をゴミ箱にドラッグ
2. （任意）設定データを削除：
   ```bash
   rm -rf ~/Library/Application\ Support/claude-code-quiz
   ```

### Windows

1. 設定 → アプリ → 「Claude Code Quiz」を選択 → アンインストール

### Linux

AppImage ファイルを削除するだけです。

## トラブルシューティング

### ビルドが失敗する

**症状**: `bun run build` でエラーが発生

**解決方法**:
```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
bun install
bun run build
```

### アプリが起動しない / 白い画面のまま

**症状**: アプリを開いても何も表示されない

**解決方法**:
1. 古いバージョンをアンインストール
2. 最新版を再インストール
3. それでも解決しない場合、ターミナルから起動してエラーを確認：
   ```bash
   /Applications/Claude\ Code\ Quiz.app/Contents/MacOS/Claude\ Code\ Quiz
   ```

### アイコンが表示されない

**症状**: Dock にデフォルトの Electron アイコンが表示される

**解決方法**:
```bash
# アイコンを再生成
bun run generate-icons

# 再ビルド
bun run build
```

---

問題が解決しない場合は、[Issue](https://github.com/ip-san/claude-code-quiz/issues) を作成してください。
