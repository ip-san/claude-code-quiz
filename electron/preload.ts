import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script is running!')

/**
 * Secure API exposed to the renderer process via contextBridge.
 * All Node.js/Electron APIs are accessed through this interface only.
 */
const electronAPI = {
  /**
   * Open a URL in the system's default browser
   */
  openExternal: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke('open-external', url)
  },

  /**
   * Copy text to the system clipboard
   */
  copyToClipboard: (text: string): Promise<boolean> => {
    return ipcRenderer.invoke('copy-to-clipboard', text)
  },

  /**
   * Open file dialog and import quiz JSON file
   */
  importQuizFile: (): Promise<{ success: boolean; data?: string; error?: string }> => {
    return ipcRenderer.invoke('import-quiz-file')
  },

  /**
   * Export progress data to a JSON file
   */
  exportProgress: (data: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('export-progress', data)
  },

  /**
   * Import progress data from a JSON file
   */
  importProgress: (): Promise<{ success: boolean; data?: string; error?: string }> => {
    return ipcRenderer.invoke('import-progress')
  },
} as const

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for TypeScript
export type ElectronAPI = typeof electronAPI
