import { describe, expect, it } from 'vitest'
import { extractReasonsFromStdout } from './extractReasons'

describe('extractReasonsFromStdout', () => {
  it('extracts reasons from **ID** [difficulty]: format', () => {
    const stdout = `
### 選定した問題（3問）

- **bp-073** [advanced]: 「-pで実行させて寝たい」→ auto modeの制限を理解する
- **ext-003** [intermediate]: 「bunx tsc」を毎回手動実行 → PostToolUse hookで自動化
- **mem-019** [beginner]: CLAUDE.mdの指示が守られない → YOU MUSTで強調
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.ids).toEqual(['bp-073', 'ext-003', 'mem-019'])
    expect(result!.reasons['bp-073']).toContain('-pで実行させて寝たい')
    expect(result!.reasons['ext-003']).toContain('PostToolUse')
    expect(result!.reasons['mem-019']).toContain('YOU MUST')
  })

  it('extracts reasons from `ID`: format', () => {
    const stdout = `
### 選定した問題

- \`cmd-032\`: 「-pで実行させて寝たい」で繰り返し — 対話モードとの違い
- \`ext-005\`: 「セルフレビューを繰り返す」— サブエージェントに委任
- \`skill-016\`: チーム共有サブエージェントの配置
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.ids).toEqual(['cmd-032', 'ext-005', 'skill-016'])
    expect(result!.reasons['cmd-032']).toContain('対話モード')
  })

  it('handles mixed formats (bold + backtick)', () => {
    const stdout = `
- **bp-006** [intermediate]: 修正ループの根本解決
- \`ext-003\`: PostToolUseフックで自動化
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.ids).toHaveLength(2)
    expect(result!.reasons['bp-006']).toBe('修正ループの根本解決')
    expect(result!.reasons['ext-003']).toContain('PostToolUse')
  })

  it('prefers bold format when both exist for same ID', () => {
    const stdout = `
- **bp-006** [intermediate]: AI分析による詳細な理由
- \`bp-006\`: 簡潔な理由
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.reasons['bp-006']).toBe('AI分析による詳細な理由')
  })

  it('extracts coaching message', () => {
    const stdout = `
### 選定した問題
- **bp-073** [advanced]: 理由テキスト

**コーチングメッセージ:** 修正ループが減少しています。この調子で続けましょう。
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.coachingMessage).toBe('修正ループが減少しています。この調子で続けましょう。')
  })

  it('handles coaching message with full-width colon', () => {
    const stdout = `
- \`cmd-003\`: コンテキスト管理

**コーチングメッセージ：** Hooksの活用が進んでいます。
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.coachingMessage).toBe('Hooksの活用が進んでいます。')
  })

  it('returns null when no reasons found', () => {
    const stdout = '分析完了。特に推薦する問題はありません。'
    expect(extractReasonsFromStdout(stdout)).toBeNull()
  })

  it('returns undefined coachingMessage when not present', () => {
    const stdout = '- **bp-001** [beginner]: 基本的な理由'
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.coachingMessage).toBeUndefined()
  })

  it('handles 15 questions (full recommendation)', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `ext-${String(i + 1).padStart(3, '0')}`)
    const stdout = ids.map((id) => `- **${id}** [intermediate]: 理由 ${id}`).join('\n')
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.ids).toHaveLength(15)
    for (const id of ids) {
      expect(result!.reasons[id]).toBe(`理由 ${id}`)
    }
  })

  it('ignores lines without valid ID format', () => {
    const stdout = `
- **not-a-valid-id** [beginner]: should be ignored
- **bp-073** [advanced]: valid reason
- some random text without IDs
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.ids).toEqual(['bp-073'])
  })

  it('handles reasons with special characters', () => {
    const stdout = '- **ext-001** [beginner]: 「docker-compose up -d」→ `--build` フラグで再ビルド（100%確実）'
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.reasons['ext-001']).toContain('docker-compose')
    expect(result!.reasons['ext-001']).toContain('--build')
  })

  it('handles stdout with noise before and after reasons', () => {
    const stdout = `
Running /recommend skill...
Collecting session data...

### 選定した問題
- **mem-001** [beginner]: メモリ管理の基本

https://ip-san.github.io/claude-code-quiz/?ids=mem-001
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.ids).toEqual(['mem-001'])
  })

  it('handles empty stdout', () => {
    expect(extractReasonsFromStdout('')).toBeNull()
  })

  it('handles coaching message with markdown bold prefix', () => {
    const stdout = `
- **bp-001** [beginner]: reason
**コーチングメッセージ:** **修正ループが3回→1回**に減少。
`
    const result = extractReasonsFromStdout(stdout)
    // replace(/^\*+\s*/, '') removes leading ** from the captured group
    expect(result!.coachingMessage).toBe('**修正ループが3回→1回**に減少。')
  })

  it('does not extract coaching from unrelated lines', () => {
    const stdout = '- **bp-001** [beginner]: コーチングメッセージを含む理由'
    const result = extractReasonsFromStdout(stdout)
    expect(result!.coachingMessage).toBeUndefined()
  })

  it('extracts from real-world mixed format output', () => {
    const stdout = `
**非インタラクティブ実行（2問）**
- \`cmd-032\`: 「-pで実行させて寝たい」で繰り返し — 対話モードとの違い
- \`cmd-079\`: ヘッドレスモードの制限

**Hooksによる自動化（2問）**
- **ext-003** [intermediate]: PostToolUseフックで自動化
- **ext-010** [beginner]: PreToolUse/PostToolUseの動作の違い

**コーチングメッセージ:** Hooksの活用が進んでいます。
`
    const result = extractReasonsFromStdout(stdout)
    expect(result).not.toBeNull()
    expect(result!.ids).toHaveLength(4)
    expect(result!.reasons['cmd-032']).toContain('-p')
    expect(result!.reasons['ext-003']).toContain('PostToolUse')
    expect(result!.coachingMessage).toBe('Hooksの活用が進んでいます。')
  })
})
