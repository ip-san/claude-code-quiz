import { defineConfig, devices } from '@playwright/test'

/**
 * Multi-device E2E configuration
 *
 * Functional tests run on desktop chromium only (fast).
 * Visual regression runs on 7 device viewports covering all major screen widths:
 *   320px → 360px → 412px → 430px → 640px → 768px → 810px
 *
 * All use Chromium engine (WebKit not installed).
 * Device configs provide viewport size + user agent + touch simulation.
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
    // Functional tests — desktop chromium
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: /quiz-flow/,
    },
    // Visual regression — desktop
    {
      name: 'visual-desktop',
      use: { browserName: 'chromium' },
      testMatch: /visual/,
    },
    // Visual regression — mobile/tablet viewports (all Chromium)
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
