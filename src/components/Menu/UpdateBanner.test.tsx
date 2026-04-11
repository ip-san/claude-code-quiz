/**
 * @vitest-environment jsdom
 *
 * UpdateBanner コンポーネントのユニットテスト
 *
 * UpdateBanner は強制更新時のみ表示。通常の更新はメニューの「更新を確認」ボタンに統合済み。
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdateBanner } from './UpdateBanner'

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

vi.mock('@/config/locale', () => ({
  locale: {
    updateBanner: {
      message: (v: string) => `新しいバージョン ${v} が利用可能です`,
      forceMessage: (v: string) => `重要な更新 ${v} があります`,
      download: 'ダウンロード',
      openRelease: 'リリースページ',
      dismiss: '閉じる',
    },
  },
}))

beforeEach(() => {
  window.electronAPI = {
    checkForUpdate: vi.fn(),
    openExternal: vi.fn(),
  } as any
})

afterEach(() => {
  window.electronAPI = undefined as any
  vi.clearAllMocks()
})

describe('強制更新（forceUpdate: true）', () => {
  it('強制更新バナーが表示されること', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v3.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v3.0.0',
      downloadUrl: 'https://github.com/example/releases/download/v3.0.0/app.dmg',
      forceUpdate: true,
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    render(<UpdateBanner />)

    await waitFor(() => {
      expect(screen.queryByText(/重要な更新 v3.0.0/)).not.toBeNull()
    })
  })

  it('閉じるボタンが表示されないこと', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v3.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v3.0.0',
      downloadUrl: 'https://github.com/example/releases/download/v3.0.0/app.dmg',
      forceUpdate: true,
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    render(<UpdateBanner />)

    await waitFor(() => {
      expect(screen.queryByText(/重要な更新 v3.0.0/)).not.toBeNull()
    })

    expect(screen.queryByLabelText('閉じる')).toBeNull()
  })

  it('ダウンロードボタンが直接ダウンロード URL を開くこと', async () => {
    const downloadUrl = 'https://github.com/example/releases/download/v3.0.0/app.dmg'
    const mockOpenExternal = vi.fn().mockResolvedValue(true)
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v3.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v3.0.0',
      downloadUrl,
      forceUpdate: true,
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).openExternal = mockOpenExternal

    render(<UpdateBanner />)

    await waitFor(() => {
      expect(screen.queryByText(/重要な更新 v3.0.0/)).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /ダウンロード/ }))
    expect(mockOpenExternal).toHaveBeenCalledWith(downloadUrl)
  })

  it('downloadUrl がない場合リリースページボタンのみ表示', async () => {
    const releaseUrl = 'https://github.com/example/releases/tag/v3.0.0'
    const mockOpenExternal = vi.fn().mockResolvedValue(true)
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v3.0.0',
      releaseUrl,
      downloadUrl: null,
      forceUpdate: true,
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).openExternal = mockOpenExternal

    render(<UpdateBanner />)

    await waitFor(() => {
      expect(screen.queryByText(/重要な更新 v3.0.0/)).not.toBeNull()
    })

    expect(screen.queryByRole('button', { name: /ダウンロード/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /リリースページ/ }))
    expect(mockOpenExternal).toHaveBeenCalledWith(releaseUrl)
  })
})

describe('通常の更新（forceUpdate: false）', () => {
  it('バナーが表示されないこと（メニューに統合済み）', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: true,
      latestVersion: 'v2.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v2.0.0',
      downloadUrl: 'https://github.com/example/releases/download/v2.0.0/app.dmg',
      forceUpdate: false,
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    const { container } = render(<UpdateBanner />)

    await waitFor(() => {
      expect(mockCheckForUpdate).toHaveBeenCalledTimes(1)
    })

    expect(container.firstChild).toBeNull()
  })
})

describe('更新がない場合', () => {
  it('バナーが表示されないこと', async () => {
    const mockCheckForUpdate = vi.fn().mockResolvedValue({
      hasUpdate: false,
      latestVersion: 'v1.0.0',
      releaseUrl: 'https://github.com/example/releases/tag/v1.0.0',
      downloadUrl: null,
      forceUpdate: false,
    })
    ;(window.electronAPI as NonNullable<typeof window.electronAPI>).checkForUpdate = mockCheckForUpdate

    const { container } = render(<UpdateBanner />)

    await waitFor(() => {
      expect(mockCheckForUpdate).toHaveBeenCalledTimes(1)
    })

    expect(container.firstChild).toBeNull()
  })
})

describe('非Electron環境', () => {
  it('electronAPIが未定義の場合バナーが表示されないこと', async () => {
    window.electronAPI = undefined as any

    const { container } = render(<UpdateBanner />)

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(container.firstChild).toBeNull()
  })
})
