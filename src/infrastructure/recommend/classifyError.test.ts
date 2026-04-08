/**
 * @vitest-environment jsdom
 *
 * classifyCliError のテスト
 *
 * Claude CLI のエラーメッセージを正しいエラータイプに分類するか検証。
 */

import { describe, expect, it } from 'vitest'
import { classifyCliError } from './classifyError'

describe('classifyCliError', () => {
  // ── CLI not found ──────────────────────────────────────────

  it('detects ENOENT (CLI not installed)', () => {
    expect(classifyCliError('spawn claude ENOENT')).toBe('cli_not_found')
  })

  it('detects "not found" message', () => {
    expect(classifyCliError('claude: not found')).toBe('cli_not_found')
  })

  it('detects "command not found" from shell', () => {
    expect(classifyCliError('zsh: command not found: claude')).toBe('cli_not_found')
  })

  // ── Authentication ─────────────────────────────────────────

  it('detects "unauthorized" HTTP error', () => {
    expect(classifyCliError('Error: 401 Unauthorized')).toBe('auth_required')
  })

  it('detects "auth" keyword', () => {
    expect(classifyCliError('Authentication failed. Please login.')).toBe('auth_required')
  })

  it('detects "login" keyword', () => {
    expect(classifyCliError('Please login to continue')).toBe('auth_required')
  })

  it('detects "api key" message', () => {
    expect(classifyCliError('Invalid API key provided')).toBe('auth_required')
  })

  it('detects "not logged in" message', () => {
    expect(classifyCliError('You are not logged in')).toBe('auth_required')
  })

  // ── Model unavailable ──────────────────────────────────────

  it('detects "model" keyword', () => {
    expect(classifyCliError('Model claude-opus-4 is not available')).toBe('model_unavailable')
  })

  it('detects "quota" exceeded', () => {
    expect(classifyCliError('Quota exceeded for this billing period')).toBe('model_unavailable')
  })

  it('detects "rate limit" error', () => {
    expect(classifyCliError('Rate limit exceeded. Try again later.')).toBe('model_unavailable')
  })

  it('detects HTTP 403', () => {
    expect(classifyCliError('Error: 403 Forbidden')).toBe('model_unavailable')
  })

  it('detects "permission" error', () => {
    expect(classifyCliError('Permission denied for this model')).toBe('model_unavailable')
  })

  it('detects "billing" issue', () => {
    expect(classifyCliError('Billing issue: please update payment method')).toBe('model_unavailable')
  })

  it('detects "subscription" issue', () => {
    expect(classifyCliError('Your subscription does not include this model')).toBe('model_unavailable')
  })

  // ── Timeout ────────────────────────────────────────────────

  it('detects timeout', () => {
    expect(classifyCliError('Operation timed out after 300000ms')).toBe('timeout')
  })

  it('detects TIMEOUT keyword', () => {
    expect(classifyCliError('TIMEOUT: process exceeded limit')).toBe('timeout')
  })

  // ── Unknown ────────────────────────────────────────────────

  it('returns unknown for unrecognized errors', () => {
    expect(classifyCliError('Something unexpected happened')).toBe('unknown')
  })

  it('returns unknown for empty string', () => {
    expect(classifyCliError('')).toBe('unknown')
  })

  // ── Priority ───────────────────────────────────────────────

  it('prioritizes cli_not_found over auth (ENOENT comes first)', () => {
    expect(classifyCliError('ENOENT: authentication failed')).toBe('cli_not_found')
  })

  it('prioritizes timeout over model errors', () => {
    expect(classifyCliError('timeout while loading model')).toBe('timeout')
  })

  // ── Case insensitivity ─────────────────────────────────────

  it('handles mixed case error messages', () => {
    expect(classifyCliError('UNAUTHORIZED access')).toBe('auth_required')
  })

  it('handles uppercase ENOENT', () => {
    expect(classifyCliError('Error: ENOENT')).toBe('cli_not_found')
  })
})
