# カテゴリ横断の検証パターン

## 2026-06-23 bp+sdk+keyboard 8問 fact-tier 検証

### /output-style コマンドの現状（key-032 最終確認・2026-06-23 訂正済み）
> 2026-09-30 以降の docs では `/output-style <style>` が v2.1.269+ で現存する（known-issues「/output-style コマンドの現状」節が正）。下の「存在しない」は当時の記録。循環検証トラップの教訓は引き続き有効。
- **訂正:** 当初「assembled docs に `/output-style` が有効コマンドとして存在」と記録したが**これは循環検証トラップによる誤り**だった。
  根拠とした keyboard.md L110 は assembled ファイルに混入した**クイズ自身の wrongFeedback テキスト**であり、公式ドキュメントではなかった。
- **正典で確認した事実:** `/output-style` は**現行ドキュメントにコマンドとして存在しない**。
  - commands.md L18: 出力スタイル変更は `/config`（Settings 画面）経由のみ。`/output-style` のコマンド定義行なし
  - output-styles.md「Change your output style」: `/config` → Output style か `settings.json` の `outputStyle` 編集
- したがって key-032 の option[1] wrongFeedback が `/output-style` を**現行手段として列挙していたのが誤り**（修正済み）。
  option[3] の「`/output-style` は v2.1.73 付近で廃止」という記述は**正しい**。
- **次回検証時の教訓:** (1) `/output-style` は現行コマンドとして扱わない（正式は `/config`）。
  (2) **assembled の per-category JSON はクイズ本文を含むため、それを「ドキュメント」として事実根拠にしない**。
  事実照合は必ず `docs/<page>.md` の生ドキュメントを正典とする（循環検証トラップ回避）。

### check-tools コマンド（bp-066 確認）
- claude-code-on-the-web.md L63: "ask Claude to run `check-tools` in a cloud session. This command **only exists in cloud sessions**"
- bp-066 の正解「Claudeに check-tools コマンドを実行させる」は正確
- factCheck:flags フラグは `--list-tools` フラグへの否定記述に反応した偽陽性

### bp-084 / bp-095 / sdk-011 / key-034 / key-052 / key-054
- bp-084（claude init --global / claude --setup の否定）: 偽陽性。quickstart.md は「cd your-project && claude」を正式手順として確認
- bp-095（/deep-research ビルトインワークフロー）: 偽陽性。workflows.md L41-45 で確認済み。correctIndex=3 正確
- sdk-011（ANTHROPIC_API_KEY の正確性）: 前回と同様の偽陽性。docs で ANTHROPIC_API_KEY は Anthropic 直接の標準変数として確認
- key-034（keybindings.json 配列形式）: keybindings.md で配列形式フォーマット確認済み。偽陽性
- key-052（/tui fullscreen が主推奨、CLAUDE_CODE_NO_FLICKER=1 は等価）: fullscreen.md L11 "equivalent" を確認。偽陽性
- key-054（CLAUDE_CODE_SCROLL_SPEED 1〜20、vim=3）: fullscreen.md L61 で確認済み。偽陽性
