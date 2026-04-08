/**
 * Electron Security & Packaging Safety Tests
 *
 * DMG/exe 配布時のセキュリティ設定が壊れないことを自動検証する。
 * Electron API のモック不要 — ソースコードの静的解析で担保する。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mainSource = readFileSync('electron/main.ts', 'utf8')
const preloadSource = readFileSync('electron/preload.ts', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

describe('Electron Security: BrowserWindow configuration', () => {
  it('nodeIntegration is disabled', () => {
    expect(mainSource).toContain('nodeIntegration: false')
  })

  it('contextIsolation is enabled', () => {
    expect(mainSource).toContain('contextIsolation: true')
  })

  it('sandbox is enabled', () => {
    expect(mainSource).toContain('sandbox: true')
  })

  it('webSecurity is enabled', () => {
    expect(mainSource).toContain('webSecurity: true')
  })

  it('does NOT enable nodeIntegration anywhere', () => {
    expect(mainSource).not.toMatch(/nodeIntegration:\s*true/)
  })

  it('does NOT disable contextIsolation', () => {
    expect(mainSource).not.toMatch(/contextIsolation:\s*false/)
  })

  it('does NOT disable sandbox', () => {
    expect(mainSource).not.toMatch(/sandbox:\s*false/)
  })
})

describe('Electron Security: CSP headers', () => {
  it('production CSP does not allow unsafe-eval', () => {
    // Extract production CSP (the else branch)
    const cspMatch = mainSource.match(/:\s*"default-src 'self'; script-src 'self' https:\/\/www\.googletagmanager\.com/)
    expect(cspMatch, 'Production CSP should exist').not.toBeNull()
    // Production CSP should NOT have unsafe-eval
    expect(mainSource).not.toContain("script-src 'self' 'unsafe-eval'")
  })

  it('CSP is applied to all responses', () => {
    expect(mainSource).toContain('Content-Security-Policy')
    expect(mainSource).toContain('onHeadersReceived')
  })
})

describe('Electron Security: Navigation restrictions', () => {
  it('blocks external navigation via will-navigate', () => {
    expect(mainSource).toContain('will-navigate')
    expect(mainSource).toContain('event.preventDefault()')
  })

  it('denies new window creation', () => {
    expect(mainSource).toContain('setWindowOpenHandler')
    expect(mainSource).toContain("action: 'deny'")
  })
})

describe('Electron Security: IPC handler safety', () => {
  it('open-external validates HTTPS only', () => {
    // Must check protocol before calling shell.openExternal
    const openExternalBlock = mainSource.slice(
      mainSource.indexOf("ipcMain.handle('open-external'"),
      mainSource.indexOf("ipcMain.handle('copy-to-clipboard'")
    )
    expect(openExternalBlock).toContain("protocol !== 'https:'")
    expect(openExternalBlock).toContain('shell.openExternal')
  })

  it('import-progress has file size limit', () => {
    expect(mainSource).toMatch(/1\s*\*\s*1024\s*\*\s*1024|1048576/)
  })

  it('recommend skill has timeout', () => {
    expect(mainSource).toMatch(/timeout:\s*300[_0]*/)
  })
})

describe('Electron Security: Preload script', () => {
  it('uses contextBridge.exposeInMainWorld', () => {
    expect(preloadSource).toContain('contextBridge.exposeInMainWorld')
  })

  it('exposes API under electronAPI namespace only', () => {
    // Count actual code calls (exclude comments)
    const codeLines = preloadSource
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'))
    const exposeCount = codeLines.filter((l) => l.includes('exposeInMainWorld(')).length
    expect(exposeCount, 'Should have exactly one exposeInMainWorld call').toBe(1)
    expect(preloadSource).toContain("exposeInMainWorld('electronAPI'")
  })

  it('does NOT use require() to expose Node modules', () => {
    // Preload should not expose raw Node modules
    expect(preloadSource).not.toMatch(/require\(['"]fs['"]\)/)
    expect(preloadSource).not.toMatch(/require\(['"]child_process['"]\)/)
    expect(preloadSource).not.toMatch(/require\(['"]os['"]\)/)
  })
})

describe('Electron Security: Import completeness', () => {
  it('all used fs functions are imported', () => {
    // Check that existsSync is imported if used
    if (mainSource.includes('existsSync(')) {
      const importBlock = mainSource.slice(0, mainSource.indexOf('\n\n'))
      const hasExistsSyncImport = importBlock.includes('existsSync') || mainSource.includes('import { existsSync')
      expect(hasExistsSyncImport, 'existsSync is used but not imported — runtime crash risk').toBe(true)
    }
  })
})

describe('Electron Packaging: Build configuration', () => {
  const buildConfig = packageJson.build

  it('has appId configured', () => {
    expect(buildConfig.appId).toBeDefined()
    expect(buildConfig.appId).toMatch(/^com\./)
  })

  it('ASAR is not explicitly disabled', () => {
    // asar: false would be insecure
    expect(buildConfig.asar).not.toBe(false)
  })

  it('files list does not include source code', () => {
    const files = buildConfig.files as string[]
    // Should not ship raw TypeScript source
    expect(files).not.toContain('src/**/*')
    expect(files).not.toContain('electron/**/*')
  })

  it('has platform-specific targets', () => {
    expect(buildConfig.mac).toBeDefined()
    expect(buildConfig.win).toBeDefined()
    expect(buildConfig.linux).toBeDefined()
  })

  it('asarUnpack only includes necessary files', () => {
    const unpack = buildConfig.asarUnpack as string[]
    expect(unpack).toBeDefined()
    // Should NOT unpack everything
    expect(unpack).not.toContain('**/*')
    // Should unpack scripts and data needed at runtime
    expect(unpack).toContain('scripts/*.mjs')
  })
})

describe('Electron Security: PATH modification safety', () => {
  it('only adds well-known paths', () => {
    // Extract PATH modification block
    const pathBlock = mainSource.slice(
      mainSource.indexOf('// パッケージ版 Electron'),
      mainSource.indexOf('/**\n * ASAR')
    )
    // Should NOT contain dangerous patterns
    expect(pathBlock).not.toContain('/tmp')
    expect(pathBlock).not.toContain('/var')
    // Verify it appends (not prepends) to PATH
    expect(pathBlock).toContain('`${currentPath}${sep}${missing.join(sep)}`')
  })
})
