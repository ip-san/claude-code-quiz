import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

// Security: Disable hardware acceleration for better security
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      // Security best practices
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    backgroundColor: '#FAF9F5',
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  // Graceful window display
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // Production: Load from built files
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers

// Open external URL in default browser (HTTPS only for security)
ipcMain.handle('open-external', async (_event, url: string): Promise<boolean> => {
  try {
    const parsedUrl = new URL(url)
    // Security: Only allow HTTPS URLs
    if (parsedUrl.protocol !== 'https:') {
      console.warn('Blocked non-HTTPS URL:', url)
      return false
    }
    await shell.openExternal(url)
    return true
  } catch {
    return false
  }
})

// Copy text to clipboard
ipcMain.handle('copy-to-clipboard', async (_event, text: string): Promise<boolean> => {
  try {
    clipboard.writeText(text)
    return true
  } catch {
    return false
  }
})

// Import quiz JSON file
ipcMain.handle('import-quiz-file', async (): Promise<{ success: boolean; data?: string; error?: string }> => {
  try {
    // Safety check for window availability
    if (!mainWindow) {
      return { success: false, error: 'Window not available' }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'クイズファイルを選択',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'cancelled' }
    }

    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf-8')

    return { success: true, data: content }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// Export progress data to file
ipcMain.handle('export-progress', async (_event, data: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Window not available' }
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: '学習進捗をエクスポート',
      defaultPath: `quiz-progress-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'cancelled' }
    }

    await writeFile(result.filePath, data, 'utf-8')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// Import progress data from file
ipcMain.handle('import-progress', async (): Promise<{ success: boolean; data?: string; error?: string }> => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Window not available' }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: '学習進捗をインポート',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'cancelled' }
    }

    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf-8')

    return { success: true, data: content }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// App lifecycle
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Security: Limit navigation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (parsedUrl.protocol !== 'file:' && parsedUrl.origin !== 'http://localhost:5173') {
      event.preventDefault()
    }
  })
})
