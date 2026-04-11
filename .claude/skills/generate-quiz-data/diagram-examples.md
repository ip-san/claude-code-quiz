# Diagram Examples

各タイプの JSON 例。SKILL.md の `diagrams` フィールド仕様と合わせて参照。

## `network`

```json
{
  "type": "network",
  "label": "MCP アーキテクチャ",
  "nodes": [
    { "id": "client", "text": "Claude Code", "sub": "MCP Client" },
    { "id": "server", "text": "MCP Server", "sub": "外部ツール" },
    { "id": "tool", "text": "Tool A" }
  ],
  "edges": [
    { "from": "client", "to": "server", "label": "request" },
    { "from": "server", "to": "client", "label": "response", "dashed": true },
    { "from": "server", "to": "tool", "label": "execute" }
  ]
}
```

## `sequence`

```json
{
  "type": "sequence",
  "label": "Hook 実行フロー",
  "actors": ["User", "Claude", "Hook", "Tool"],
  "messages": [
    { "from": 0, "to": 1, "text": "prompt" },
    { "from": 1, "to": 2, "text": "PreToolUse" },
    { "from": 2, "to": 1, "text": "allow", "dashed": true },
    { "from": 1, "to": 3, "text": "execute" },
    { "from": 3, "to": 1, "text": "result", "dashed": true },
    { "from": 1, "to": 2, "text": "PostToolUse" }
  ]
}
```

## `layer`

```json
{
  "type": "layer",
  "label": "Settings スコープ（外側が優先）",
  "layers": [
    { "text": "Managed", "sub": "企業管理者" },
    { "text": "CLI flags", "sub": "--model 等" },
    { "text": "Local", "sub": ".claude/settings.local.json" },
    { "text": "Project", "sub": ".claude/settings.json" },
    { "text": "User", "sub": "~/.claude/settings.json" }
  ]
}
```

## `swimlane`

```json
{
  "type": "swimlane",
  "label": "Agent Teams 並列実行",
  "lanes": [
    { "name": "Explore", "segments": [{ "start": 0, "end": 3, "text": "調査" }] },
    { "name": "Test", "segments": [{ "start": 1, "end": 5, "text": "テスト実行" }] },
    { "name": "Review", "segments": [{ "start": 3, "end": 6, "text": "レビュー" }] }
  ],
  "totalSteps": 6
}
```

## `venn`

```json
{
  "type": "venn",
  "label": "Skills と Agents の関係",
  "sets": [
    { "text": "Skills", "items": ["プロンプト定義", "引数対応"] },
    { "text": "Agents", "items": ["並列実行", "worktree分離"] }
  ],
  "intersectionLabel": "再利用可能な自動化"
}
```

## `matrix`

```json
{
  "type": "matrix",
  "label": "パーミッションモード別の機能",
  "rowHeader": "機能",
  "colHeader": "モード",
  "rows": ["ファイル編集", "Bash実行", "MCP呼び出し"],
  "cols": ["plan", "default", "auto"],
  "cells": [
    ["✗", "確認あり", "✓"],
    ["✗", "確認あり", "✓"],
    ["✗", "確認あり", "✓"]
  ]
}
```

## `tree`

```json
{
  "type": "tree",
  "label": ".claude/ ディレクトリ構成",
  "root": {
    "text": ".claude/",
    "children": [
      { "text": "settings.json", "sub": "プロジェクト設定" },
      { "text": "settings.local.json", "sub": "ローカル設定" },
      {
        "text": "skills/",
        "children": [
          { "text": "my-skill/", "children": [
            { "text": "SKILL.md", "sub": "スキル定義" }
          ]}
        ]
      },
      { "text": "agents/", "children": [
        { "text": "reviewer.md", "sub": "エージェント定義" }
      ]}
    ]
  }
}
```

## `formula`

```json
{
  "type": "formula",
  "label": "コンテキスト使用率の計算",
  "result": "used_percentage",
  "components": [
    { "text": "input_tokens", "sub": "入力" },
    { "text": "cache_creation", "sub": "キャッシュ作成" },
    { "text": "cache_read", "sub": "キャッシュ読取" }
  ],
  "operator": "+"
}
```
