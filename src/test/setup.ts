import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.electronAPI for tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    openExternal: vi.fn().mockResolvedValue(true),
    copyToClipboard: vi.fn().mockResolvedValue(true),
    importQuizFile: vi.fn().mockResolvedValue({ success: true, data: '{}' }),
    exportProgress: vi.fn().mockResolvedValue({ success: true }),
    importProgress: vi.fn().mockResolvedValue({ success: true, data: '{}' }),
    exportCsv: vi.fn().mockResolvedValue({ success: true }),
  },
  writable: true,
})

// Mock localStorage with in-memory store (define on both window and globalThis)
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(localStorageStore)) delete localStorageStore[key]
  }),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
