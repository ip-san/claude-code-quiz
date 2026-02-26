/**
 * Type declarations for Electron preload API
 */

interface ElectronAPI {
  openExternal: (url: string) => Promise<boolean>
  copyToClipboard: (text: string) => Promise<boolean>
  exportProgress: (data: string) => Promise<{ success: boolean; error?: string }>
  importProgress: () => Promise<{ success: boolean; data?: string; error?: string }>
  exportCsv: (data: string, defaultFilename: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
