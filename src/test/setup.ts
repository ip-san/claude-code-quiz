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
  },
  writable: true,
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
