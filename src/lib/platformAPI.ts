/**
 * Platform abstraction layer
 *
 * Electron 環境では window.electronAPI を使用し、
 * Web 環境ではブラウザ標準 API にフォールバックする。
 */

export const isElectron =
  typeof window !== 'undefined' && !!window.electronAPI

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function pickAndReadFile(
  accept: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve({ success: false, error: 'cancelled' })
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ success: true, data: reader.result as string })
      }
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' })
      }
      reader.readAsText(file)
    }
    // Handle cancel (no file selected)
    input.oncancel = () => {
      resolve({ success: false, error: 'cancelled' })
    }
    input.click()
  })
}

export const platformAPI = {
  openExternal: isElectron
    ? (url: string) => window.electronAPI!.openExternal(url)
    : (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer')
        return Promise.resolve(true)
      },

  copyToClipboard: isElectron
    ? (text: string) => window.electronAPI!.copyToClipboard(text)
    : async (text: string) => {
        try {
          await navigator.clipboard.writeText(text)
          return true
        } catch {
          return false
        }
      },

  exportProgress: isElectron
    ? (data: string) => window.electronAPI!.exportProgress(data)
    : async (data: string): Promise<{ success: boolean; error?: string }> => {
        downloadFile(data, 'quiz-progress.json', 'application/json')
        return { success: true }
      },

  importProgress: isElectron
    ? () => window.electronAPI!.importProgress()
    : () => pickAndReadFile('.json'),

  exportCsv: isElectron
    ? (data: string, filename: string) =>
        window.electronAPI!.exportCsv(data, filename)
    : async (data: string, filename: string): Promise<{ success: boolean; error?: string }> => {
        downloadFile(data, filename, 'text/csv')
        return { success: true }
      },
}
