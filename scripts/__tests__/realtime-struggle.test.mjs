import { describe, expect, it } from 'vitest'
import {
  freshState,
  handlePostToolUseFailure,
  handlePostToolUseSuccess,
  handleUserPromptSubmit,
} from '../realtime-struggle.mjs'

describe('realtime-struggle', () => {
  // ── PostToolUseFailure (Bash error detection) ─────────────────

  describe('handlePostToolUseFailure', () => {
    it('increments consecutiveErrors on tool failure', () => {
      const state = freshState()
      const { state: s } = handlePostToolUseFailure(state, {
        hook_event_name: 'PostToolUseFailure',
        error: 'command not found',
      })
      expect(s.consecutiveErrors).toBe(1)
      expect(s.totalErrors).toBe(1)
    })

    it('outputs mild JSON feedback at 2 consecutive errors', () => {
      const state = freshState()
      state.consecutiveErrors = 1
      state.totalErrors = 1
      const { json } = handlePostToolUseFailure(state, {
        hook_event_name: 'PostToolUseFailure',
        error: 'exit code 1',
      })
      expect(json).toBeTruthy()
      expect(json.reason).toContain('別のアプローチを検討')
      expect(json.decision).toBeUndefined() // mild = no decision
    })

    it('outputs strong JSON feedback at 3 consecutive errors', () => {
      const state = freshState()
      state.consecutiveErrors = 2
      state.totalErrors = 2
      const { json } = handlePostToolUseFailure(state, {
        hook_event_name: 'PostToolUseFailure',
        error: 'exit code 1',
      })
      expect(json).toBeTruthy()
      expect(json.decision).toBe('block')
      expect(json.reason).toContain('ステップバック')
    })

    it('respects strong cooldown for Claude feedback', () => {
      const state = freshState()
      state.consecutiveErrors = 2
      state.totalErrors = 2
      state.lastClaudeStrongAt = new Date().toISOString() // just now

      const { json } = handlePostToolUseFailure(state, {
        hook_event_name: 'PostToolUseFailure',
        error: 'exit code 1',
      })
      // Should NOT output strong message (cooldown active)
      expect(json).toBeNull()
    })

    it('skips interrupted tool calls (is_interrupt is PostToolUseFailure-only)', () => {
      const state = freshState()
      const { state: s, json } = handlePostToolUseFailure(state, {
        hook_event_name: 'PostToolUseFailure',
        error: 'interrupted',
        is_interrupt: true,
      })
      expect(s.consecutiveErrors).toBe(0)
      expect(json).toBeNull()
    })

    it('re-fires strong message after cooldown expires', () => {
      const state = freshState()
      state.consecutiveErrors = 2
      state.totalErrors = 2
      // Set cooldown to 4 minutes ago (exceeds 3-minute cooldown)
      state.lastClaudeStrongAt = new Date(Date.now() - 4 * 60 * 1000).toISOString()

      const { json } = handlePostToolUseFailure(state, {
        hook_event_name: 'PostToolUseFailure',
        error: 'exit code 1',
      })
      expect(json.decision).toBe('block')
      expect(json.reason).toContain('ステップバック')
    })

    it('returns null json when below threshold', () => {
      const state = freshState()
      const { json } = handlePostToolUseFailure(state, {
        hook_event_name: 'PostToolUseFailure',
        error: 'some error',
      })
      expect(json).toBeNull()
      expect(state.consecutiveErrors).toBe(1)
    })
  })

  // ── PostToolUse (success → reset) ─────────────────────────────

  describe('handlePostToolUseSuccess', () => {
    it('resets consecutiveErrors on success', () => {
      const state = freshState()
      state.consecutiveErrors = 3
      state.totalErrors = 5
      const { state: s } = handlePostToolUseSuccess(state)
      expect(s.consecutiveErrors).toBe(0)
      expect(s.totalErrors).toBe(5) // total preserved
    })

    it('is a no-op when already zero', () => {
      const state = freshState()
      const { state: s } = handlePostToolUseSuccess(state)
      expect(s.consecutiveErrors).toBe(0)
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
