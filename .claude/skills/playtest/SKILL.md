---
name: playtest
description: 一般ユーザーを模したエージェントが実 PWA のクイズをプレイし、分かりにくさ・学び改善のリクエストを出し、専門家チームがレビュー・改善するゲート。プレイテスト、ユーザーテスト、playtest、分かりにくさ、学習改善
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill
argument-hint: "[--persona beginner|busy-intermediate|reviewer] [--count N] [--report-only] [--no-build]"
---

# Playtest Skill — 模擬ユーザー・プレイテスト & 専門家レビューゲート

模擬ユーザーエージェントが**実 PWA をブラウザで操作**してクイズをプレイし、
「分かりにくい / 学びにくい」を**ユーザーの声**として出す。それを**専門家チームが妥当性検証**してから
クイズ内容・学習設計を改善し、UX/UI は報告する。ユーザーの不満を鵜呑みにせず、
事実正確性（`quiz-verifier`）と教育設計を守るのが「ゲート」の役割。

参照: `personas.md`（ペルソナ定義）, `feedback-schema.md`（JSON 契約）。

## 引数

- `--persona <name>`: 単一ペルソナのみ実行（既定は3ペルソナ全部）
- `--count N`: 1ペルソナあたりのプレイ問題数（既定: beginner 9 / 他 10）
- `--report-only`: 改善を適用せず、リクエストと専門家判定の**報告のみ**（dry-run）
- `--no-build`: 既に preview サーバーが起動済みの場合、ビルド/起動をスキップ

## 前提チェック（最初に実行）

1. claude-in-chrome（ブラウザ自動化）MCP が利用可能か確認。不可なら「ブラウザ MCP 未接続」と報告して中止
   （データレベル代替は本スキルの対象外。実 UI 体験が目的のため）
2. `mkdir -p .claude/tmp/playtest`

## Phase A: プレイスルー（3ペルソナ並列・実ブラウザ）

1. `--no-build` でなければアプリを用意:
   ```bash
   bun run build:web && (bun run preview:web &)   # http://localhost:4173
   ```
   起動待ち（`until curl -sf http://localhost:4173 >/dev/null; do sleep 1; done` 相当）
2. 対象ペルソナごとに `user-simulator` を **同一メッセージ内で同時に** `run_in_background: true` 起動:
   ```
   Agent(subagent_type: "user-simulator", model: "sonnet",
         prompt: "persona=<name>。personas.md と feedback-schema.md に従い実 PWA をプレイし
                  requests-<name>.json を書く。count=<N>。")
   ```
3. 全エージェントの完了通知を待つ → `requests-<persona>.json` が出力される

## Phase B: 集約・名寄せ（決定論的）

```bash
node scripts/playtest-resolve.mjs   # → requests.json（domain別・quizId名寄せ・stats）
```
`unresolved` があれば Phase C の reviewer が Grep で手当てする。

## Phase C: 専門家レビューゲート（ドメイン別並列）

`requests.json` の `byDomain` に項目があるドメインごとに `learning-experience-reviewer` を並列起動:
```
Agent(subagent_type: "learning-experience-reviewer", model: "sonnet",
      prompt: "domain=<content|learning|ux>。requests.json の byDomain[domain] を検証し
               verdicts-<domain>.json を書く。content/learning は事実裏取り、ux は report-only。")
```
- content/learning: accept/modify/reject + 具体 change を判定（事実は変えない）
- ux: report-only（`change` は null、ルーティング先を明記）

## Phase D: 適用 + 事実安全網（`--report-only` なら skip）

```bash
node scripts/playtest-apply.mjs            # accept/modify を quizzes.json へ（from不一致は安全スキップ）
bun run quiz:post-add                       # randomize → check → test → stats
```
適用で**事実に触れた変更**があれば、該当カテゴリに `quiz-verifier` を起動して最終事実検証（判定層の
`needsOpusReview` 時は resolve-model.mjs の解決モデルで二重確認）。NG なら該当変更を巻き戻す。

## Phase E: レポート

```
## Playtest 結果
| ペルソナ | プレイ数 | 詰まり報告 | 主な声 |
|---------|---------|-----------|--------|
| ...     | ...     | ...       | ...    |

| ドメイン | accept | modify | reject | 代表例 |
|---------|--------|--------|--------|--------|
| content | ... |
| learning| ... |
| ux (報告のみ) | — | — | — | ルーティング先: /code-review 等 |

- quizzes.json 変更: N問（事実再検証 ✅）
- UX/UI 課題: M件（/self-review へ）
- 未解決名寄せ: K件
```

## quality-loop との統合

`/quality-loop --playtest` で Phase 3.5 として本スキルを呼ぶ（コスト高のため既定では実行しない／月次・任意）。
UX 課題は quality-loop の Step 1（code-review）へ、内容修正は Step 4（統計同期）前に合流させる。

## モデル選択

- `user-simulator` / `learning-experience-reviewer`: Sonnet（文脈理解）
- 事実の二重確認のみ判定層チェーン（`fable` → `opus` → `sonnet`、`scripts/resolve-model.mjs` で解決）
