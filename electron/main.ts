/**
 * Electron Main Process
 *
 * 【このファイルの役割】
 * - BrowserWindow の作成と管理
 * - IPC ハンドラーの定義（Renderer プロセスとの通信）
 * - セキュリティ設定
 *
 * 【アーキテクチャ】
 * Main Process (このファイル) <-- IPC --> Preload Script <-- contextBridge --> Renderer Process
 *
 * 【セキュリティ方針】
 * Electron のセキュリティベストプラクティスに従い、以下を実装：
 * - nodeIntegration: false（Renderer で Node.js API を直接使用不可）
 * - contextIsolation: true（Preload と Renderer のコンテキストを分離）
 * - sandbox: true（Renderer プロセスをサンドボックス化）
 * - HTTPS のみ外部 URL を開く
 * - 新規ウィンドウの作成を禁止
 */

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  Notification as ElectronNotification,
  ipcMain,
  nativeImage,
  shell,
} from 'electron'
import { readdirSync, readFileSync, statSync } from 'fs'
import { readFile, stat, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { basename, join } from 'path'

/**
 * 【ハードウェアアクセラレーション無効化】
 *
 * GPU 関連の問題を回避するため。
 * 特に仮想環境や特定の GPU ドライバーでクラッシュすることがある。
 * クイズアプリでは高度なグラフィックス処理は不要なため、無効化しても問題ない。
 */
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

/**
 * 開発/本番環境の判定
 *
 * 【判定ロジック】
 * - NODE_ENV が 'production' でない、または
 * - app.isPackaged が false（ビルドされていない状態）
 * の場合は開発モードとみなす
 */
// app.isPackaged が最も信頼性の高い判定方法
const isDev = !app.isPackaged

// 開発時のみ: CSP 警告を抑制（webRequest で CSP ヘッダーを設定済みだが、
// Electron 内部の sandbox_bundle チェックが先に走るため警告が出る。
// 本番ビルドでは自動的に表示されない）
if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

function createWindow(): void {
  // アプリのルートパス（開発時は __dirname から、本番時は app.getAppPath() から）
  const appRoot = isDev ? join(__dirname, '..') : app.getAppPath()

  // アプリアイコンの設定（Windows は .ico、それ以外は .png）
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  const iconPath = join(appRoot, 'build', iconFile)
  const appIcon = nativeImage.createFromPath(iconPath)

  // macOS の Dock アイコンを設定
  if (process.platform === 'darwin' && app.dock && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon)
  }

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    icon: appIcon.isEmpty() ? undefined : appIcon,
    webPreferences: {
      /**
       * 【重要】preload.cjs を指定
       *
       * .cjs 拡張子である理由は vite.config.ts のコメントを参照。
       * package.json の "type": "module" との競合を避けるため。
       */
      preload: join(appRoot, 'dist-electron', 'preload.cjs'),

      /**
       * 【セキュリティ設定】
       *
       * nodeIntegration: false
       *   - Renderer プロセスで require() や Node.js API を使用不可にする
       *   - XSS 攻撃があっても Node.js API にアクセスできない
       *
       * contextIsolation: true
       *   - Preload スクリプトと Renderer のグローバルオブジェクトを分離
       *   - window.electronAPI 経由でのみ通信可能
       *
       * sandbox: true
       *   - Renderer プロセスを Chromium のサンドボックス内で実行
       *   - ファイルシステムやプロセスへのアクセスを制限
       *
       * webSecurity: true
       *   - 同一オリジンポリシーを有効化
       *   - CORS 違反を防ぐ
       */
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    backgroundColor: '#FAF9F5', // Claude ブランドカラー（クリーム系）
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true, // Windows/Linux でメニューバーを自動非表示
    show: false, // 準備完了まで非表示（ちらつき防止）
  })

  // ウィンドウ準備完了後に表示（白い画面のちらつきを防ぐ）
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // CSP ヘッダーを設定（Electron Security Warning 対策）
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; img-src 'self' data: https://www.googletagmanager.com https://www.google-analytics.com"
      : "default-src 'self'; script-src 'self' https://www.googletagmanager.com; img-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; style-src 'self' 'unsafe-inline'"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  // 開発/本番でロード元を切り替え
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // DevTools を別ウィンドウで開く（デバッグ用）
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // 本番環境では app.getAppPath() を使用（ASAR でも正しく動作）
    mainWindow.loadFile(join(app.getAppPath(), 'dist', 'index.html'))
  }

  /**
   * 【セキュリティ】外部 URL へのナビゲーション防止
   *
   * 悪意のあるリンクで外部サイトに誘導されることを防ぐ。
   * 許可するのは開発サーバーとローカルファイルのみ。
   */
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })

  /**
   * 【セキュリティ】新規ウィンドウ作成の禁止
   *
   * target="_blank" などで新しいウィンドウが開くことを防ぐ。
   * 外部リンクは shell.openExternal で既定ブラウザで開く。
   */
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ============================================================
// IPC Handlers
// ============================================================
// Renderer プロセス（React アプリ）からの呼び出しを処理する
// Preload スクリプトの window.electronAPI 経由で呼び出される

/**
 * 外部 URL をシステムのデフォルトブラウザで開く
 *
 * 【セキュリティ】HTTPS のみ許可
 * HTTP や file:// プロトコルは拒否する。
 * これにより、悪意のあるローカルファイルへのアクセスを防ぐ。
 */
ipcMain.handle('open-external', async (_event, url: string): Promise<boolean> => {
  try {
    const parsedUrl = new URL(url)
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

/**
 * クリップボードにテキストをコピー
 */
ipcMain.handle('copy-to-clipboard', async (_event, text: string): Promise<boolean> => {
  try {
    clipboard.writeText(text)
    return true
  } catch {
    return false
  }
})

/**
 * 学習進捗データのエクスポート
 *
 * ファイル名にはエクスポート日付を含める。
 */
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
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

/**
 * CSV ファイルのエクスポート
 *
 * BOM 付き UTF-8 で書き出すことで、Excel での日本語文字化けを防ぐ。
 */
ipcMain.handle(
  'export-csv',
  async (_event, data: string, defaultFilename: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!mainWindow) {
        return { success: false, error: 'Window not available' }
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'CSV をエクスポート',
        defaultPath: defaultFilename,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'cancelled' }
      }

      // BOM 付き UTF-8 で Excel 互換性を確保
      const bom = '\uFEFF'
      await writeFile(result.filePath, bom + data, 'utf-8')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
)

/**
 * 学習進捗データのインポート
 */
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

    // ファイルサイズチェック（最大1MB）- 進捗データは小さいはず
    const MAX_PROGRESS_FILE_SIZE = 1 * 1024 * 1024 // 1MB
    const fileStats = await stat(filePath)
    if (fileStats.size > MAX_PROGRESS_FILE_SIZE) {
      return {
        success: false,
        error: `ファイルサイズが大きすぎます（最大1MB）。現在のサイズ: ${Math.round((fileStats.size / 1024) * 10) / 10}KB`,
      }
    }

    const content = await readFile(filePath, 'utf-8')

    return { success: true, data: content }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

// ============================================================
// Usage Analysis (Electron-only feature)
// ============================================================

interface UsageAnalysis {
  tools: Record<string, number>
  topics: { topic: string; hits: number }[]
  categoryScores: Record<string, number>
  recommendedIds: string[]
  sessionCount: number
  promptSamples: string[]
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  memory: ['CLAUDE.md', 'claude.md', 'memory', 'MEMORY.md', '/memory', '/init', 'rules/', '@import'],
  skills: ['skill', 'SKILL.md', '/batch', '/loop', '/schedule', 'context: fork', 'frontmatter'],
  tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebFetch', 'tool_use'],
  commands: [
    '/compact',
    '/clear',
    '/resume',
    '/model',
    '/context',
    '/branch',
    '/voice',
    '/rewind',
    'claude -p',
    '--bare',
  ],
  extensions: ['MCP', 'mcp', 'hook', 'Hook', 'plugin', 'subagent', 'Agent', 'Chrome', 'Slack'],
  session: ['コンテキスト', 'token', 'compact', 'checkpoint', 'resume', 'session', 'fork', 'worktree', 'effort'],
  keyboard: ['Ctrl+', 'Shift+', 'Alt+', 'Esc', 'Tab', 'shortcut', 'vim', 'keybind'],
  bestpractices: ['plan mode', 'Plan', 'verify', 'test', 'review', 'IMPORTANT', 'best practice'],
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'CLAUDE.mdの書き方': ['CLAUDE.md', '/init', 'ルール', '指示'],
  コンテキスト管理: ['コンテキスト', '/compact', '/clear', 'context', '圧縮'],
  MCP: ['MCP', 'mcp', 'ツール連携', 'stdio'],
  Hooks: ['hook', 'Hook', 'フック', 'PreToolUse', 'PostToolUse'],
  サブエージェント: ['subagent', 'サブエージェント', 'Agent', 'worktree', '並列'],
  Skills: ['skill', 'SKILL.md', 'スキル', 'frontmatter'],
  デバッグ: ['debug', 'デバッグ', 'エラー', 'error', 'バグ'],
  テスト: ['test', 'テスト', 'vitest', 'playwright'],
  'CI/CD': ['CI', 'GitHub Actions', 'deploy', 'デプロイ'],
  セキュリティ: ['security', 'セキュリティ', 'permission', 'sandbox'],
  コスト管理: ['cost', 'コスト', '料金', 'effort'],
}

ipcMain.handle('analyze-usage', async (_event, daysBack: number): Promise<UsageAnalysis | null> => {
  try {
    const projectsDir = join(homedir(), '.claude', 'projects')
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000

    // Find recent session files across all projects
    const sessionFiles: string[] = []
    for (const projDir of readdirSync(projectsDir)) {
      const projPath = join(projectsDir, projDir)
      try {
        for (const f of readdirSync(projPath)) {
          if (!f.endsWith('.jsonl')) continue
          const fPath = join(projPath, f)
          if (statSync(fPath).mtimeMs > cutoff) sessionFiles.push(fPath)
        }
      } catch {
        /* skip */
      }
    }

    if (sessionFiles.length === 0) return null

    // Parse sessions
    const tools: Record<string, number> = {}
    const prompts: string[] = []
    const files = new Set<string>()

    for (const file of sessionFiles) {
      const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const j = JSON.parse(line)
          if (j.type === 'user' && j.message?.content) {
            const text =
              typeof j.message.content === 'string'
                ? j.message.content
                : j.message.content
                    .filter((c: { type: string }) => c.type === 'text')
                    .map((c: { text: string }) => c.text)
                    .join(' ')
            if (text.length > 5) prompts.push(text)
          }
          if (j.message?.content && Array.isArray(j.message.content)) {
            for (const c of j.message.content) {
              if (c.type === 'tool_use') {
                tools[c.name] = (tools[c.name] || 0) + 1
                if (c.input?.file_path) files.add(basename(c.input.file_path))
                if (c.input?.command) prompts.push(c.input.command)
              }
            }
          }
        } catch {
          /* skip */
        }
      }
    }

    // Score categories
    const allText = [...prompts, ...files, ...Object.keys(tools)].join(' ')
    const categoryScores: Record<string, number> = {}
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      categoryScores[cat] = keywords.reduce((score, kw) => {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        return score + (allText.match(regex) || []).length
      }, 0)
    }

    // Detect topics
    const topics: { topic: string; hits: number }[] = []
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      const hits = keywords.filter((kw) => allText.toLowerCase().includes(kw.toLowerCase())).length
      if (hits >= 1) topics.push({ topic, hits })
    }
    topics.sort((a, b) => b.hits - a.hits)

    // Sample prompts for display
    const promptSamples = prompts
      .filter((p) => p.length > 10 && p.length < 200 && !p.startsWith('node ') && !p.startsWith('git '))
      .slice(0, 5)

    return {
      tools,
      topics,
      categoryScores,
      recommendedIds: [], // Renderer will compute based on quiz data
      sessionCount: sessionFiles.length,
      promptSamples,
    }
  } catch {
    return null
  }
})

// ============================================================
// AI-powered Recommendation (runs /recommend skill via Claude CLI)
// ============================================================

import type { ChildProcess } from 'child_process'

let recommendProc: ChildProcess | null = null

ipcMain.handle('run-recommend-skill', async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Kill any existing recommend process (prevents duplicate runs on reload)
    if (recommendProc && !recommendProc.killed) {
      recommendProc.kill()
      recommendProc = null
    }

    const projectDir = app.getAppPath()

    // Run claude CLI with the recommend skill
    // Use spawn to explicitly close stdin (avoids "no stdin data" warning)
    const { spawn } = await import('child_process')
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('claude', ['-p', '/recommend'], {
        cwd: projectDir,
        timeout: 300_000, // 5 minutes — skill needs time for AI analysis
        env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      recommendProc = proc
      let stderr = ''
      proc.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString()
      })
      proc.on('close', (code) => {
        if (proc === recommendProc) recommendProc = null
        if (code === 0) resolve()
        else if (code === 143 || code === null) reject(new Error('タイムアウトしました。もう一度お試しください。'))
        else reject(new Error(stderr || `claude exited with code ${code}`))
      })
      proc.on('error', (err) => {
        if (proc === recommendProc) recommendProc = null
        reject(err)
      })
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    // Check if claude CLI is not found
    if (msg.includes('ENOENT') || msg.includes('not found')) {
      return { success: false, error: 'Claude Code CLI が見つかりません。インストールしてください。' }
    }
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
      return { success: false, error: 'タイムアウトしました。もう一度お試しください。' }
    }
    return { success: false, error: msg }
  }
})

ipcMain.handle('is-recommend-running', (): boolean => {
  return recommendProc !== null && !recommendProc.killed
})

ipcMain.handle('cancel-recommend', (): boolean => {
  if (recommendProc && !recommendProc.killed) {
    recommendProc.kill()
    recommendProc = null
    return true
  }
  return false
})

ipcMain.handle('clear-recommend-cache', async (): Promise<void> => {
  try {
    const { unlink } = await import('fs/promises')
    await unlink(join(homedir(), '.claude-quiz-recommend', 'latest-recommend.json'))
  } catch {
    // File doesn't exist — fine
  }
})

ipcMain.handle('show-notification', (_event: unknown, title: string, body: string): void => {
  if (ElectronNotification.isSupported()) {
    new ElectronNotification({ title, body, silent: false }).show()
  }
  // System beep as fallback (macOS notification center may suppress Electron notifications)
  shell.beep()
})

// ============================================================
// Hook Setup (global ~/.claude/settings.json)
// ============================================================

ipcMain.handle('setup-global-hooks', async (_event, remove: boolean): Promise<{ success: boolean; error?: string }> => {
  try {
    const claudeDir = join(homedir(), '.claude')
    const settingsPath = join(claudeDir, 'settings.json')
    const scriptPath = join(app.getAppPath(), 'scripts', 'collect-session.mjs')
    const MARKER = 'claude-quiz-recommend'

    // Ensure .claude dir exists
    const { mkdirSync: mkdir } = await import('fs')
    mkdir(claudeDir, { recursive: true })

    let settings: Record<string, unknown> = {}
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
    }

    const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>

    const filterOurs = (arr: unknown[]) =>
      (arr ?? [])
        .map((entry: unknown) => {
          const e = entry as { hooks?: { _marker?: string }[] }
          if (e.hooks) {
            e.hooks = e.hooks.filter((h) => h._marker !== MARKER)
            return e.hooks.length > 0 ? e : null
          }
          return entry
        })
        .filter(Boolean)

    // Remove existing
    if (hooks.SessionStart) hooks.SessionStart = filterOurs(hooks.SessionStart)
    if (hooks.SessionEnd) hooks.SessionEnd = filterOurs(hooks.SessionEnd)

    if (!remove) {
      // Add hooks
      const startHook = {
        type: 'command',
        command: `node ${scriptPath} --scan-all-today`,
        timeout: 30,
        async: true,
        _marker: MARKER,
      }
      const endHook = { type: 'command', command: `node ${scriptPath}`, timeout: 30, async: true, _marker: MARKER }

      if (!hooks.SessionStart) hooks.SessionStart = []
      hooks.SessionStart.push({ hooks: [startHook] })
      if (!hooks.SessionEnd) hooks.SessionEnd = []
      hooks.SessionEnd.push({ hooks: [endHook] })
    }

    // Clean up empty arrays
    for (const key of Object.keys(hooks)) {
      if (Array.isArray(hooks[key]) && hooks[key].length === 0) delete hooks[key]
    }
    settings.hooks = Object.keys(hooks).length > 0 ? hooks : undefined
    if (!settings.hooks) delete settings.hooks

    const { writeFileSync: writeSync } = await import('fs')
    writeSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})

ipcMain.handle('check-global-hooks', async (): Promise<boolean> => {
  try {
    const settingsPath = join(homedir(), '.claude', 'settings.json')
    const content = readFileSync(settingsPath, 'utf8')
    return content.includes('claude-quiz-recommend')
  } catch {
    return false
  }
})

// ============================================================
// Cached Recommendations (from SessionEnd hook)
// ============================================================

ipcMain.handle(
  'get-cached-recommend',
  async (): Promise<{
    date: string
    sessionCount: number
    questionCount: number
    ids: string[]
    topCategories: string[]
    topics: { topic: string; hits: number }[]
    promptSamples: string[]
  } | null> => {
    try {
      const storeDir = join(homedir(), '.claude-quiz-recommend')
      const filePath = join(storeDir, 'latest-recommend.json')
      const content = readFileSync(filePath, 'utf8')
      const data = JSON.parse(content)
      // Return if within last 7 days
      const dataDate = new Date(data.date).getTime()
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      if (dataDate < sevenDaysAgo) return null
      // Enrich promptSamples from rolling-7d.json (has more variety)
      try {
        const rolling = JSON.parse(readFileSync(join(storeDir, 'rolling-7d.json'), 'utf8'))
        if (rolling.prompts?.length > 0) {
          data.promptSamples = rolling.prompts
        }
      } catch {
        /* rolling not available — use recommend's own samples */
      }
      return data
    } catch {
      return null
    }
  }
)

// ============================================================
// App Lifecycle
// ============================================================

app.whenReady().then(createWindow)

/**
 * 【macOS 対応】
 * macOS ではウィンドウを閉じてもアプリは終了しない（Dock に残る）。
 * Windows/Linux では全ウィンドウを閉じるとアプリを終了する。
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 【macOS 対応】
 * Dock アイコンクリック時にウィンドウがなければ再作成する。
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

/**
 * 【セキュリティ】全 WebContents に対するナビゲーション制限
 *
 * 新しく作成される WebContents（iframe 等）にも制限を適用する。
 */
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (parsedUrl.protocol !== 'file:' && parsedUrl.origin !== 'http://localhost:5173') {
      event.preventDefault()
    }
  })
})
