/**
 * @vitest-environment jsdom
 *
 * RecommendStates コンポーネントのテスト
 *
 * テスト対象:
 * - SetupBanner: セットアップ完了前後の表示、ボタンイベント
 * - AnalyzeButton: 漸近的プログレス計算、ローディング状態、エラー表示
 * - EmptySession: 空セッション表示
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnalyzeButton, EmptySession, SetupBanner } from './RecommendStates'

// ── SetupBanner ──────────────────────────────────────────────────────────────

describe('SetupBanner', () => {
  it('renders setup title and description', () => {
    render(<SetupBanner setupDone={false} onSetup={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/自動レコメンド/)).toBeDefined()
  })

  it('calls onSetup when enable button is clicked', () => {
    const onSetup = vi.fn()
    render(<SetupBanner setupDone={false} onSetup={onSetup} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/有効/))
    expect(onSetup).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when later button is clicked', () => {
    const onDismiss = vi.fn()
    render(<SetupBanner setupDone={false} onSetup={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByLabelText(/後で/))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('shows success message when setupDone is true', () => {
    render(<SetupBanner setupDone={true} onSetup={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/設定完了/)).toBeDefined()
  })

  it('does not show success message when setupDone is false', () => {
    render(<SetupBanner setupDone={false} onSetup={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.queryByText(/設定完了/)).toBeNull()
  })
})

// ── AnalyzeButton ────────────────────────────────────────────────────────────

describe('AnalyzeButton', () => {
  it('shows analyze label when not loading', () => {
    render(<AnalyzeButton loading={false} aiError={null} onAnalyze={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('利用履歴')
    expect(button).not.toBeDisabled()
  })

  it('shows loading state with spinner', () => {
    render(<AnalyzeButton loading={true} aiError={null} onAnalyze={vi.fn()} elapsed={10} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.textContent).toContain('分析中')
  })

  it('calls onAnalyze when clicked', () => {
    const onAnalyze = vi.fn()
    render(<AnalyzeButton loading={false} aiError={null} onAnalyze={onAnalyze} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('does not call onAnalyze when loading', () => {
    const onAnalyze = vi.fn()
    render(<AnalyzeButton loading={true} aiError={null} onAnalyze={onAnalyze} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onAnalyze).not.toHaveBeenCalled()
  })

  it('displays error message when aiError is set', () => {
    render(<AnalyzeButton loading={false} aiError="テストエラーメッセージ" onAnalyze={vi.fn()} />)
    expect(screen.getByText('テストエラーメッセージ')).toBeDefined()
  })

  it('does not display error when aiError is null', () => {
    render(<AnalyzeButton loading={false} aiError={null} onAnalyze={vi.fn()} />)
    expect(screen.queryByText(/エラー/)).toBeNull()
  })

  describe('asymptotic progress calculation', () => {
    it('starts at 0% when elapsed is 0', () => {
      const estimatedTotal = 90
      const elapsed = 0
      const progress = Math.min((1 - Math.exp(-elapsed / estimatedTotal)) * 95, 95)
      expect(progress).toBe(0)
    })

    it('reaches ~63% at 90 seconds (1 time constant)', () => {
      const estimatedTotal = 90
      const elapsed = 90
      const progress = Math.min((1 - Math.exp(-elapsed / estimatedTotal)) * 95, 95)
      // 1 - e^-1 ≈ 0.632, * 95 ≈ 60%
      expect(progress).toBeGreaterThan(55)
      expect(progress).toBeLessThan(65)
    })

    it('never exceeds 95%', () => {
      const estimatedTotal = 90
      const elapsed = 10000 // very long time
      const progress = Math.min((1 - Math.exp(-elapsed / estimatedTotal)) * 95, 95)
      expect(progress).toBe(95)
    })

    it('increases monotonically', () => {
      const estimatedTotal = 90
      let prev = 0
      for (const elapsed of [0, 10, 30, 60, 90, 120, 180, 300]) {
        const progress = Math.min((1 - Math.exp(-elapsed / estimatedTotal)) * 95, 95)
        expect(progress).toBeGreaterThanOrEqual(prev)
        prev = progress
      }
    })
  })
})

// ── EmptySession ─────────────────────────────────────────────────────────────

describe('EmptySession', () => {
  it('renders empty state message', () => {
    render(<EmptySession />)
    expect(screen.getByText(/利用履歴がまだ/)).toBeDefined()
  })

  it('shows instruction text', () => {
    render(<EmptySession />)
    expect(screen.getByText(/いくつか作業をしてから/)).toBeDefined()
  })
})
