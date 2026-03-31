import { defineConfig, devices } from '@playwright/test'

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
    // Visual regression — desktop + mobile
    {
      name: 'visual-desktop',
      use: { browserName: 'chromium' },
      testMatch: /visual/,
    },
    {
      name: 'visual-Pixel-7',
      use: { ...devices['Pixel 7'] },
      testMatch: /visual/,
    },
  ],
  webServer: {
    command: 'npm run preview:web',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
