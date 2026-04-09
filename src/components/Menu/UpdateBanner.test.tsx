/**
 * @vitest-environment jsdom
 *
 * UpdateBanner コンポーネントのユニットテスト
 *
 * テスト対象:
 * - 更新がある場合: バナーの表示、ダウンロードボタン、閉じるボタン
 * - 更新がない場合: バナーが表示されないこと
 * - 非Electron環境: electronAPI が未定義の場合はバナーが表示されないこと
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdateBanner } from './UpdateBanner'

// platformAPI モジュールを isElectron: true でモック（ファイル全体に適用）
vi.mock('@/lib/platformAPI', () => ({
  isElectron: true,
  platformAPI: {
    openExternal: vi.fn(),
    copyToClipboard: vi.fn(),
    exportProgress: vi.fn(),
    importProgress: vi.fn(),
    exportCsv: vi.fn(),
  },
}))

// locale モジュールをモック
vi.mock('@/config/locale', () => ({
  locale: {
    updateBanner: {
      message: (v: string) => `新しいバージョン ${v} が利用可能です`,
      download: 'ダウンロード',
      dismiss: '閉じる',
    },
  },
}))

// テストごとに window.electronAPI の checkForUpdate / openExternal を設定する
// setup.ts で electronAPI はすでに writable: true で定義済みのため代入で上書き可能
beforeEach(() => {
  window.electronAPI = {
    checkForUpdate: vi.fn(),
    openExternal: vi.fn(),
  } as any
})

afterEach(() => {
  // window.electronAPI は setup.ts で configurable: false のため delete 不可。
  // undefined に設定して electronAPI が存在しない状態を再現する。
  window.electronAPI = undefined as any
  vi.clearAllMocks()
})

// ── 更新がある場合 ────────────────────────────────────────────────────────────

describe('更新がある場合', () => {
  it('バナーが表示されること', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v2.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v2.0.0',
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    render(<UpdateBanner />)

    await waitFor(() => {
      expect(screen.queryByText('新しいバージョン v2.0.0 が利用可能です')).not.toBeNull()
    })

    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1)
  })

  it('ダウンロードボタンがopenExternalを呼ぶこと', async () => {
    const releaseUrl = 'https://github.com/example/releases/tag/v2.0.0'
    const mockOpenExternal = vi.fn().mockResolvedValue(true)
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v2.0.0',
      releaseUrl,
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).openExternal = mockOpenExternal

    render(<UpdateBanner />)

    // バナーが表示されるまで待つ
    await waitFor(() => {
      expect(screen.queryByText('新しいバージョン v2.0.0 が利用可能です')).not.toBeNull()
    })

    // ダウンロードボタンは blue-500 のメインアクションボタン（aria-label なし）
    // role="button" かつクラスに bg-blue-500 を含む要素を取得する
    const downloadButton = screen.getByRole('button', { name: /ダウンロード/ })
    fireEvent.click(downloadButton)
    expect(mockOpenExternal).toHaveBeenCalledWith(releaseUrl)
  })

  it('閉じるボタンでバナーが非表示になること', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v2.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v2.0.0',
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    render(<UpdateBanner />)

    await waitFor(() => {
      expect(screen.queryByText('新しいバージョン v2.0.0 が利用可能です')).not.toBeNull()
    })

    // 閉じるボタン（aria-label="閉じる"）をクリック
    fireEvent.click(screen.getByLabelText('閉じる'))

    expect(screen.queryByText('新しいバージョン v2.0.0 が利用可能です')).toBeNull()
  })
})

// ── 更新がない場合 ────────────────────────────────────────────────────────────

describe('更新がない場合', () => {
  it('バナーが表示されないこと', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: false,
      latestVersion: 'v1.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v1.0.0',
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    const { container } = render(<UpdateBanner />)

    // async 処理が完了するまで待ってからバナーが存在しないことを確認
    await waitFor(() => {
      expect(mockCheckForUpdate).toHaveBeenCalledTimes(1)
    })

    expect(screen.queryByText(/新しいバージョン/)).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('nullレスポンスでバナーが表示されないこと', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue(null)
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    const { container } = render(<UpdateBanner />)

    await waitFor(() => {
      expect(mockCheckForUpdate).toHaveBeenCalledTimes(1)
    })

    expect(screen.queryByText(/新しいバージョン/)).toBeNull()
    expect(container.firstChild).toBeNull()
  })
})

// ── 非Electron環境 ────────────────────────────────────────────────────────────

describe('非Electron環境', () => {
  it('electronAPIが未定義の場合バナーが表示されないこと', async () => {
    // window.electronAPI を undefined にして electronAPI が存在しない状態を再現
    // isElectron モックは true のままだが、checkForUpdate の optional chaining により
    // electronAPI が undefined なら Promise が作られず updateInfo が設定されない
    window.electronAPI = undefined as any

    const { container } = render(<UpdateBanner />)

    // 非同期処理が落ち着くまで待つ
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.queryByText(/新しいバージョン/)).toBeNull()
    expect(container.firstChild).toBeNull()
  })
})
