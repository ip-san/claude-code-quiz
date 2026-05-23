---
name: Keyboard category verification patterns
description: keyboard カテゴリで頻出する検証パターンと偽陽性メモ（2026-05-08 初回）
type: project
---

## factCheck:env / factCheck:flags の偽陽性パターン

keyboard カテゴリで factCheck:env や factCheck:flags が lint-flagged されても、
「存在しない変数・フラグ」を wrongFeedback で正しく否定している場合は false positive。
以下は確認済み：

- `CLAUDE_OUTPUT_STYLE` → 存在しない（docs に記載なし）。key-032 が wrongFeedback で正しく否定 → 偽陽性
- `CLAUDE_SUBMIT_KEY` → 存在しない（docs に記載なし）。key-034 が wrongFeedback で正しく否定 → 偽陽性
- `--fullscreen` フラグ → 存在しない（docs に記載なし）。key-052 が wrongFeedback で正しく否定 → 偽陽性

## /output-style コマンド廃止（v2.1.73）

- `/output-style` コマンドは v2.1.73 で廃止（changelog 確認済み）
- 現在の正式方法: `/config` → Output style
- key-032 の wrongFeedback が「v2.1.73 付近で廃止」と記述 → 正確
- key-032 の diagram（出力スタイルの実行例）が `/output-style` コマンドを表示 → 廃止済みコマンドの図示（minor 指摘候補）

## CLAUDE_CODE_NO_FLICKER と /tui fullscreen

- `CLAUDE_CODE_NO_FLICKER=1` は依然として有効な方法（docs に記載あり）
- v2.1.110 以降は `/tui fullscreen` が推奨。環境変数は "versions before v2.1.110" の方法として記載
- key-052 の正解は CLAUDE_CODE_NO_FLICKER=1 → 有効だが現在は secondary method
  問題文が「正しいのはどれですか」なので技術的には正解。ただし /tui fullscreen が主流になった点は注記価値あり

## Ctrl+B の出力動作

- ドキュメント: "Output is written to a file and Claude can retrieve it using the Read tool"
- key-006 の正解選択肢・explanation が「出力をバッファリングしつつ」と記述
- "バッファリング"（メモリ）vs "ファイルに書き込み"（ディスク）は技術的に異なる表現
- ただし利用者視点では「コマンドを継続実行しながら後で参照可能」という意味では同等

## Shift+Tab のパーミッションモード

- ドキュメント: "Cycle through `default`, `acceptEdits`, `plan`, and any modes you have enabled, such as `auto` or `bypassPermissions`"
- key-008 は「基本3モード」を問う問題として正しく範囲を限定
- explanation でも追加モードについて補足しているため内容は正確

## CLAUDE_CODE_SCROLL_SPEED

- 値域: 1〜20（docs 確認済み）
- vim 相当値: 3（docs 確認済み）
- key-054 は正確

## 図（diagram）の截断

- key-021: comparison diagram の heading が truncated（"削除したテキストはkil" など）
- key-039: flow diagram の steps が truncated（"出力スタイルは Claude Code のデ"）
- これらは diagram のデータ品質問題（minor）であり、問題の事実正確性とは別

## Option+T と Option as Meta の関係（2026-05-09 フルスキャン確認）

- ドキュメント（interactive-mode.md テーブル）に「Option+T: As of v2.1.132 this shortcut works on macOS without configuring Option as Meta」と明記
- key-015 の explanation/diagram（iTerm2設定ブロック）は旧情報（「Option as Meta 設定が必要」）を記述 → major issue として報告済み
- Alt+B/F/Y/M/P 等の他の Option ショートカットは依然として Option as Meta 設定が必要
- **Option+T のみ v2.1.132 以降は設定不要という例外扱い**。今後 key-015 関連を検証する際は注意

## keybindings.json の正しいフォーマット（2026-05-09 確認）

- **正式フォーマット**: `{ "bindings": [{ "context": "Chat", "bindings": { "key": "action" } }] }` の配列形式
- **旧形式（ドキュメント非対応）**: `{ "Global": {...}, "Chat": {...} }` のトップレベルオブジェクト形式
- key-029 と key-030 の diagram が旧形式を使用 → minor issue（説明テキストは正確）
- 今後 keybindings 関連問題の diagram を検証する際はこのフォーマット違いに注意

## diagram 内部矛盾パターン（2026-05-09）

- key-021: comparison column に「Claude Code固有のショートカット」があるが explanation では「Claude Code固有のショートカットではなく」と矛盾
- diagram の各 column/item と explanation の記述が整合しているか確認が必要（今後の一般原則）

## Warp ターミナルと /terminal-setup（2026-05-13 確認）

- Warp は「Works without setup」側のターミナル（Ghostty/Kitty/iTerm2/WezTerm/Warp/Apple Terminal/Windows Terminal）
- `/terminal-setup` が必要なのは VS Code/Cursor/Windsurf/Alacritty/Zed のみ
- key-033 option 1 wrongFeedback に「Warp」が含まれており誤り（major ではなく minor 指摘）

## /tui fullscreen と CLAUDE_CODE_NO_FLICKER の位置付け（2026-05-13 更新）

- fullscreen.md: 「Run `/tui fullscreen` to switch... or set `CLAUDE_CODE_NO_FLICKER=1` on versions before v2.1.110」
- `/tui fullscreen` が主推奨、`CLAUDE_CODE_NO_FLICKER=1` は v2.1.110 以前の旧バージョン向けとして明示されている
- key-052 の正解（CLAUDE_CODE_NO_FLICKER=1）は「v2.1.110 以前」という旧バージョン限定の方法が正解になっている → major issue
  - 問題文「フルスクリーンレンダリングを有効にする方法」には `/tui fullscreen` が正しい現在の方法
  - CLAUDE_CODE_NO_FLICKER=1 は現在も「equivalent」だが旧バージョン向けとして記述（正解として提示するのは misleading）
- key-054（SCROLL_SPEED 1〜20, vim=3）は正確（docs 再確認済み 2026-05-13）

## keybindings.json フォーマット（2026-05-13 再確認）

- 正式フォーマット確認済み: `{ "bindings": [{ "context": "Chat", "bindings": { "key": "action" } }] }` の配列形式
- key-034 の正解選択肢フォーマット `{ "context": "Chat", "bindings": { "cmd+enter": "chat:submit" } }` は正確
- key-034 の explanation「`"enter": null` を設定します」も正確（docs に明示）
- key-034 は PASSED

## 2026-05-23 深掘り検証（9問 lint-flagged）

### key-033 の severity 更新
- 旧記録（2026-05-13）: 「minor 指摘」としていたが、wrongFeedback[0] と explanation の**両方**に Warp が誤記載されていた
- Warp は「Works without setup」グループのターミナル（設定不要）。docs テーブルで明確
- wrongFeedback[0]: "VS Code、Alacritty、Zed、Warp での改行入力を有効にします" → Warp は誤り → **major** に格上げ
- explanation も同様に "VS Code、Alacritty、Zed、Warpなどネイティブ対応していないターミナル" → Warp は誤り

### key-052 の再評価（false-positive に変更）
- 旧記録（2026-05-13）: 「major issue」として「正解が misleading」と記録
- 再読すると correctIndex=1 の選択肢は「/tui fullscreen を実行する（v2.1.110 以前では環境変数 CLAUDE_CODE_NO_FLICKER=1 を使う）」
- これは /tui fullscreen を主推奨として記述している → 正確
- docs: "The tui setting and the environment variable are equivalent" と記載 → 両方 OK
- **false-positive に変更**。旧記録の「major issue」は誤った判定だった

### key-032 の wrongFeedback[3] 問題（新規記録）
- wrongFeedback[3] 末尾: 「出力スタイルの切り替えは `/output-style` コマンドが最も手軽です」
- `/output-style` は v2.1.73 で廃止済み。廃止コマンドを推奨する表現は minor 問題
- factCheck:env フラグ自体は CLAUDE_OUTPUT_STYLE 変数を対象とした偽陽性だが、別途 minor 問題あり

### key-006 の「バッファリング」表現（既知パターン継続）
- docs: "Output is written to a file and Claude can retrieve it using the Read tool"
- 問題: 「バッファリング」表現 → minor（技術的には異なるが利用者視点では同等）
- 今後も false-positive として扱わず minor で一貫する

### key-021 の diagram 内部矛盾（既知パターン継続）
- diagram.columns[0].items[2]: 「Claude Code固有のショートカット」
- explanation: 「Claude Code固有のショートカットではなく」→ 矛盾 → minor で継続

## 2026-05-23 フルオーディット（48問）

### Shift+Enter ネイティブ対応ターミナル一覧（Critical/Major 発見）
- terminal-config.md テーブル: Works without setup = Ghostty, Kitty, iTerm2, WezTerm, **Warp, Apple Terminal, Windows Terminal** の7種
- key-020 正解テキスト「iTerm2・WezTerm・Ghostty・Kittyでは設定不要」→ 4種のみで不完全。「それ以外は/terminal-setup必要」が誤った一般化（Warp/Apple Terminal/Windows Terminal は設定不要なのに除外）→ major
- key-044 正解テキスト「iTerm2、WezTerm、Ghostty、Kitty」→ 4種のみ断定。ネイティブ対応は実際は7種 → **critical** (quiz が4種のみを正解と断言し、残り3種が間違いとなる)
- key-044 diagram: Warp を「/terminal-setup が必要」欄に誤分類 → Warp は「Works without setup」
- key-020/key-044で共通: /terminal-setup が必要なのは VS Code, Cursor, Windsurf, Alacritty, Zed の5種のみ

### key-051 Option+O ファストモード設定要件
- Option+O には Option+T のような「v2.1.132以降設定不要」の特別注記なし
- key-051の explanation「macOS では Option キーを Meta として送信するターミナル設定が必要」は正確

### keybindings.json フォーマット（key-029/key-030）
- key-029/key-030 のdiagramは旧形式（トップレベルオブジェクト）を使用
- ただし正解テキスト自体は「null を設定する」「UI状態を指定する」で正確 → 事実誤認なし（minor のみ）

### 48問の事実誤り サマリー
- critical: key-044（ネイティブ対応4種のみ断言、実際は7種）
- major: key-020（同問題の4種記述、Warpの誤分類）
- 残り46問: 事実誤認なし
