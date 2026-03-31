import { defineConfig, devices } from '@playwright/test'

/**
 * Multi-device E2E configuration
 *
 * - quiz-flow: functional tests on desktop chromium (17 tests)
 * - visual: layout regression on 7 devices × 4 screens × 2 themes
 *
 * Screens: welcome, menu (fixed layout — good for regression)
 *          quiz, reader (variable content — desktop only)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    // Functional tests
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: /quiz-flow/,
    },
    // Visual regression — all devices (welcome + menu)
    {
      name: 'visual-desktop',
      use: { browserName: 'chromium' },
      testMatch: /visual/,
    },
    {
      name: 'visual-iPhone-SE',
      use: { ...devices['iPhone SE'], defaultBrowserType: undefined, browserName: 'chromium' },
      testMatch: /visual/,
    },
    {
      name: 'visual-Galaxy-S8',
      use: { ...devices['Galaxy S8'] },
      testMatch: /visual/,
    },
    {
      name: 'visual-Pixel-7',
      use: { ...devices['Pixel 7'] },
      testMatch: /visual/,
    },
    {
      name: 'visual-iPhone-14-Pro-Max',
      use: { ...devices['iPhone 14 Pro Max'], defaultBrowserType: undefined, browserName: 'chromium' },
      testMatch: /visual/,
    },
    {
      name: 'visual-Galaxy-Tab-S9',
      use: { ...devices['Galaxy Tab S9'] },
      testMatch: /visual/,
    },
    {
      name: 'visual-iPad',
      use: { ...devices['iPad (gen 7)'], defaultBrowserType: undefined, browserName: 'chromium' },
      testMatch: /visual/,
    },
  ],
  webServer: {
    command: 'npm run preview:web',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
