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

Desktop 版は Claude Code の利用履歴を AI が分析し、あなた専用のクイズを毎日提案します。ソースからビルドしてインストールする手順を、初めての方でも迷わないように説明します。

**必要なもの:** [bun](https://bun.sh/)（1.0+）と Git だけ。Node.js は不要です。

### ステップ 0: 必要なツールを準備する

Desktop アプリのビルドには 2 つのツールが必要です。既に入っている場合はスキップしてください。

**ターミナルの開き方:**
- **macOS**: Spotlight（`Cmd+Space`）→「ターミナル」と入力 → Enter
- **Windows**: スタートメニュー → 「PowerShell」と検索 → Enter

**1) bun（JavaScript ランタイム + パッケージマネージャー）**

ターミナルで以下を実行：

```bash
bun --version
```

`1.0.0` 以上が表示されれば OK。「command not found」等と出たらインストール：

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell で実行。管理者権限は不要)
powershell -c "irm bun.sh/install.ps1 | iex"
```

インストール後、**ターミナルを一度閉じて再度開いてから** `bun --version` で確認してください。

**Windows の注意:**
- **Windows 10 バージョン 1809 以降** が必要です（「設定→システム→バージョン情報」で確認）
- [Visual C++ 再頒布可能パッケージ](https://learn.microsoft.com/ja-jp/cpp/windows/latest-supported-vc-redist)（x64）が必要です。エラーが出た場合はインストールしてください
- Windows ネイティブ版の bun は動作しますが、WSL 2（Windows Subsystem for Linux）上で使う方が高速で安定します。WSL 2 をお使いの場合は macOS/Linux と同じ `curl` コマンドでインストールできます

※ Node.js は不要です。bun が全て担います。

**2) Git（ソースコード取得）**

```bash
git --version
```

表示されれば OK。なければ：

```bash
# macOS
xcode-select --install

# Windows → https://git-scm.com/download/win からダウンロード
# インストーラーで「Next」を押し続ければ OK（デフォルト設定推奨）
# インストール後、PowerShell を再起動してから git --version で確認
```

### ステップ 1: ソースコードを取得する

```bash
git clone https://github.com/ip-san/claude-code-quiz.git
cd claude-code-quiz
```

### ステップ 2: 依存パッケージをインストールする

```bash
bun install
```

初回は 1-2 分かかります。「Done!」と表示されれば完了。

### ステップ 3: アプリをビルドする

```bash
bun run build
```

完了すると `release/` フォルダにインストーラーが生成されます：

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

#### 初回起動時の警告（署名なしアプリ）

macOS では署名されていないアプリに対して警告が表示されます。OS バージョンによって手順が異なります。

> 「Claude Code Quiz」は、開発元を確認できないため開けません。

**macOS Sequoia（15.x）以降:**

Sequoia では右クリック→「開く」が効きません。以下の手順で許可してください：

1. アプリをダブルクリック（警告が出て開けない）
2. **システム設定** → **プライバシーとセキュリティ** を開く
3. 画面を一番下までスクロール
4. 「"Claude Code Quiz" はブロックされました」の横にある **このまま開く** をクリック
5. パスワードまたは Touch ID で認証
6. 確認ダイアログで **開く** をクリック

一度許可すれば、以降はダブルクリックで起動できます。

**macOS Sonoma（14.x）以前:**

Finder でアプリを **右クリック** → **開く** → 確認ダイアログで **開く** をクリック。

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

### 初回セットアップ（利用履歴レコメンド）

Desktop 版の最大の特徴は、あなたの Claude Code の使い方を AI が分析してクイズを提案する機能です。初回起動時にワンクリックでセットアップできます。

**1. アプリを起動すると、メニュー画面にバナーが表示されます:**

> 自動レコメンドを有効にしますか？
> Claude Code の全セッション終了時にログを収集し、作業に合ったクイズを提案します
>
> [有効にする] [後で]

**2. 「有効にする」をクリック** → `~/.claude/settings.json` に SessionStart/End フックが自動追加されます。

**3. 普段通り Claude Code で作業する** → セッション終了時にバックグラウンドでログが収集されます。

**4. アプリを開いてレコメンドカードの「分析」ボタンを押す** → AI があなたの作業を分析し、最適な15問を選定します。

```
パイプライン構成（毎セッション自動）:
├── Script: ログ収集・統計化（$0）
├── Haiku: プロンプト意図分類（$0.004/回）
├── Script: 分類結果の圧縮（$0）
└── Sonnet: 問題選定・理由付与（$0.03/回）

特別トリガー（条件一致時のみ自動発動）:
└── Opus: 高度な分析（$0.15/回）
    ├── 初回: あなたの学習者タイプを深く分析
    ├── 月次: 1ヶ月の成長レビュー + 来月の学習プラン
    └── 停滞: 同じ課題が改善しない場合に原因分析

年間コスト: 約$5
```

**収集データの管理:**
- 全データは `~/.claude-quiz-recommend/` に保存（プロジェクト外）
- git に含まれない。外部サーバーに送信されない
- 削除: `rm -rf ~/.claude-quiz-recommend`
- フック停止: `bun run setup:hooks --remove`

→ [パイプラインの詳細](usage-recommend.md) / [アーキテクチャ](ARCHITECTURE.md)

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

### 常に最新版を使う（開発モード）

DMG をビルドせずに、ソースから直接起動する方法です。`git pull` するだけで常に最新の問題・機能が使えます。

```bash
cd claude-code-quiz    # クローン済みのディレクトリに移動

git pull               # 最新のソースを取得
bun install            # 依存パッケージを更新（変更がなければ一瞬）
bun run dev            # Electron を開発モードで起動
```

**毎日の運用（3コマンド）:**

```bash
cd claude-code-quiz && git pull && bun run dev
```

これだけで最新版が起動します。問題が追加・修正されるたびに自動で反映されます。

**メリット:**
- DMG のビルド・再インストールが不要
- 問題の追加や機能改善が `git pull` 直後に反映
- 利用履歴レコメンドも同じように動作

**注意:**
- 起動のたびにターミナルが必要（コマンドを実行する必要がある）
- 開発者ツール（DevTools）が表示されますが、無視して OK

### アンインストール

### macOS

1. Applications フォルダから「Claude Code Quiz」をゴミ箱にドラッグ
2. （任意）設定データを削除：
   ```bash
   rm -rf ~/Library/Application\ Support/claude-code-quiz
   ```

### Windows

1. 設定 → アプリ → 「Claude Code Quiz」を選択 → アンインストール
2. （任意）設定データを削除：
   ```powershell
   Remove-Item -Recurse "$env:APPDATA\claude-code-quiz"
   ```

### Linux

AppImage ファイルを削除するだけです。

## トラブルシューティング

### bun install が失敗する

**症状**: 依存パッケージのインストール中にエラー

**解決方法**:
```bash
# キャッシュをクリアして再実行
rm -rf node_modules bun.lockb
bun install
```

**Windows で「VCRUNTIME140.dll が見つかりません」等のエラー:**
[Visual C++ 再頒布可能パッケージ](https://learn.microsoft.com/ja-jp/cpp/windows/latest-supported-vc-redist)（x64）をインストールしてください。

### ビルドが失敗する

**症状**: `bun run build` でエラーが発生

**解決方法**:
```bash
# node_modules を削除して再インストール
rm -rf node_modules bun.lockb
bun install
bun run build
```

### macOS でアプリが開けない

**症状**: 「開発元を確認できないため開けません」

**解決方法**: [初回起動時の警告（署名なしアプリ）](#初回起動時の警告署名なしアプリ) を参照してください。macOS Sequoia 以降は右クリック→「開く」では解決できません。

### アプリが起動しない / 白い画面のまま

**症状**: アプリを開いても何も表示されない

**解決方法**:
1. 古いバージョンをアンインストール
2. 最新版を再インストール
3. それでも解決しない場合、ターミナルから起動してエラーを確認：
   ```bash
   # macOS
   /Applications/Claude\ Code\ Quiz.app/Contents/MacOS/Claude\ Code\ Quiz
   
   # Windows (PowerShell)
   & "$env:LOCALAPPDATA\Programs\claude-code-quiz\Claude Code Quiz.exe"
   ```

### Linux で AppImage が起動しない

**症状**: 「Permission denied」や FUSE エラー

**解決方法**:
```bash
# 実行権限を確認
chmod +x "Claude Code Quiz-x.x.x.AppImage"

# FUSE がない場合は --appimage-extract で展開して実行
./"Claude Code Quiz-x.x.x.AppImage" --appimage-extract
./squashfs-root/AppRun
```

### アイコンが表示されない

**症状**: Dock にデフォルトの Electron アイコンが表示される

**解決方法**:
```bash
bun run generate-icons
bun run build
```

---

問題が解決しない場合は、[Issue](https://github.com/ip-san/claude-code-quiz/issues) を作成してください。
