import { describe, expect, it } from 'vitest'
import { freshState, handlePostToolUse, handleUserPromptSubmit } from '../realtime-struggle.mjs'

describe('realtime-struggle', () => {
  // ── PostToolUse (Bash error detection) ──────────────────────

  describe('handlePostToolUse', () => {
    it('increments consecutiveErrors on tool error', () => {
      const state = freshState()
      const { state: s } = handlePostToolUse(state, {
        hook_event_name: 'PostToolUse',
        tool_response: { is_error: true, stderr: 'command not found' },
      })
      expect(s.consecutiveErrors).toBe(1)
      expect(s.totalErrors).toBe(1)
    })

    it('resets consecutiveErrors on success', () => {
      const state = freshState()
      state.consecutiveErrors = 2
      state.totalErrors = 2
      const { state: s } = handlePostToolUse(state, {
        hook_event_name: 'PostToolUse',
        tool_response: 'success output',
      })
      expect(s.consecutiveErrors).toBe(0)
      expect(s.totalErrors).toBe(2) // total preserved
    })

    it('outputs mild feedback at 2 consecutive errors', () => {
      const state = freshState()
      state.consecutiveErrors = 1
      state.totalErrors = 1
      const { output } = handlePostToolUse(state, {
        hook_event_name: 'PostToolUse',
        tool_response: { is_error: true },
      })
      expect(output).toContain('別のアプローチを検討')
    })

    it('outputs strong feedback at 3 consecutive errors', () => {
      const state = freshState()
      state.consecutiveErrors = 2
      state.totalErrors = 2
      const { output } = handlePostToolUse(state, {
        hook_event_name: 'PostToolUse',
        tool_response: { is_error: true },
      })
      expect(output).toContain('ステップバック')
    })

    it('respects strong cooldown for Claude feedback', () => {
      const state = freshState()
      state.consecutiveErrors = 2
      state.totalErrors = 2
      state.lastClaudeStrongAt = new Date().toISOString() // just now

      const { output } = handlePostToolUse(state, {
        hook_event_name: 'PostToolUse',
        tool_response: { is_error: true },
      })
      // Should NOT output strong message (cooldown active)
      expect(output).toBe('')
    })

    it('skips interrupted tool calls', () => {
      const state = freshState()
      const { state: s, output } = handlePostToolUse(state, {
        hook_event_name: 'PostToolUse',
        tool_response: { is_error: true },
        is_interrupt: true,
      })
      expect(s.consecutiveErrors).toBe(0)
      expect(output).toBe('')
    })

    it('detects errors from Bash exit code patterns', () => {
      const state = freshState()
      state.consecutiveErrors = 1
      const { state: s, output } = handlePostToolUse(state, {
        hook_event_name: 'PostToolUse',
        tool_response: 'Error: ENOENT: no such file or directory',
      })
      expect(s.consecutiveErrors).toBe(2)
      expect(output).toContain('別のアプローチ')
    })
  })

  // ── UserPromptSubmit (frustration & repeat detection) ───────

  describe('handleUserPromptSubmit', () => {
    it('skips slash commands', () => {
      const state = freshState()
      const { state: s } = handleUserPromptSubmit(state, {
        hook_event_name: 'UserPromptSubmit',
        prompt: '/compact して',
      })
      expect(s.promptCount).toBe(0)
    })

    it('skips short prompts', () => {
      const state = freshState()
      const { state: s } = handleUserPromptSubmit(state, {
        hook_event_name: 'UserPromptSubmit',
        prompt: 'はい',
      })
      expect(s.promptCount).toBe(0)
    })

    it('tracks prompt count', () => {
      const state = freshState()
      handleUserPromptSubmit(state, { prompt: 'このファイルを修正してください' })
      expect(state.promptCount).toBe(1)
    })

    it('skips detection during warmup period', () => {
      const state = freshState()
      const { output } = handleUserPromptSubmit(state, {
        prompt: 'なぜこのエラーが出るのか分からない',
      })
      expect(output).toBe('')
      expect(state.frustrationHits).toBe(0) // not counted during warmup
    })

    it('detects frustration keywords after warmup', () => {
      const state = freshState()
      state.promptCount = 3 // past warmup

      handleUserPromptSubmit(state, { prompt: 'このコードがおかしいので直してください' })
      expect(state.frustrationHits).toBe(1)
    })

    it('outputs mild tip on first frustration hit', () => {
      const state = freshState()
      state.promptCount = 3

      const { output } = handleUserPromptSubmit(state, {
        prompt: 'なぜこのエラーが消えないのですか、おかしいです',
      })
      expect(output).toContain('💡')
    })

    it('outputs strong tip at 3+ frustration hits', () => {
      const state = freshState()
      state.promptCount = 5
      state.frustrationHits = 2

      const { output, notify } = handleUserPromptSubmit(state, {
        prompt: 'まだ動かないのですが、失敗続きです',
      })
      expect(output).toContain('💡')
      expect(notify).toBe(true)
    })

    it('detects repeated prompts (3+ same text)', () => {
      const state = freshState()
      state.promptCount = 5
      state.recentPrompts = ['このファイルを修正してください', 'このファイルを修正してください']

      const { output, notify } = handleUserPromptSubmit(state, {
        prompt: 'このファイルを修正してください',
      })
      expect(output).toContain('繰り返し')
      expect(notify).toBe(true)
    })

    it('respects user tip cooldown', () => {
      const state = freshState()
      state.promptCount = 5
      state.lastUserTipAt = new Date().toISOString() // just now

      const { output } = handleUserPromptSubmit(state, {
        prompt: 'なぜこのエラーが出るのか',
      })
      expect(output).toBe('')
    })

    it('respects notification cooldown', () => {
      const state = freshState()
      state.promptCount = 5
      state.frustrationHits = 2
      state.lastNotificationAt = new Date().toISOString() // just now

      const { notify } = handleUserPromptSubmit(state, {
        prompt: 'また失敗した。動かない。エラーが出る',
      })
      expect(notify).toBe(false)
    })

    it('keeps recentPrompts to max 10', () => {
      const state = freshState()
      state.promptCount = 10
      state.recentPrompts = Array(10).fill('different prompt text here')

      handleUserPromptSubmit(state, { prompt: 'eleventh prompt text here' })
      expect(state.recentPrompts.length).toBe(10)
    })
  })

  // ── State management ────────────────────────────────────────

  describe('freshState', () => {
    it('returns zeroed counters', () => {
      const s = freshState()
      expect(s.consecutiveErrors).toBe(0)
      expect(s.totalErrors).toBe(0)
      expect(s.frustrationHits).toBe(0)
      expect(s.promptCount).toBe(0)
      expect(s.recentPrompts).toEqual([])
    })
  })
})
