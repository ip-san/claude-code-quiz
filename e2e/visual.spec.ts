import { expect, type Page, test } from '@playwright/test'

/**
 * Visual Regression テスト
 *
 * welcome + menu: 全デバイスで実行（固定レイアウト）
 * quiz + reader: desktop のみ（可変コンテンツ + チュートリアルの問題）
 *
 * 実行: npm run test:e2e
 * ベースライン更新: npx playwright test --update-snapshots
 */

/** Skip welcome + tutorial to reach menu screen */
async function goToMenu(page: Page) {
  await page.getByRole('button', { name: /はじめる/ }).click()
  const skip = page.getByRole('button', { name: 'スキップ' })
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skip.click()
  }
  await page.getByRole('button', { name: 'メニューを開く' }).waitFor({ timeout: 5000 })
}

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('welcome screen — light mode', async ({ page }) => {
    await expect(page).toHaveScreenshot('welcome-light.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('welcome screen — dark mode', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await expect(page).toHaveScreenshot('welcome-dark.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('menu screen — light mode', async ({ page }) => {
    await goToMenu(page)
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('menu-light.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('menu screen — dark mode', async ({ page }) => {
    await goToMenu(page)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('menu-dark.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  /**
   * quiz / reader — desktop-only regression.
   * Content is variable across viewports so mobile snapshots would churn on every question add.
   * `reducedMotion: 'reduce'` pins the terminal typing animation to its complete state,
   * making the snapshot deterministic even with animated diagrams.
   */
  async function prepareDeepLink(page: Page, url: string) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('claude-code-quiz-welcomed', '1')
        localStorage.setItem('claude-code-quiz-tutorial-seen', '1')
      } catch {
        /* ignore */
      }
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(url)
    await page.waitForLoadState('networkidle')
  }

  test('quiz screen — light mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'visual-desktop', 'quiz snapshot tracked on desktop only')
    await prepareDeepLink(page, '/?q=mem-001')
    await page.getByRole('progressbar', { name: '問題の進捗' }).waitFor({ timeout: 10000 })
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('quiz-light.png', { maxDiffPixelRatio: 0.05 })
  })

  test('quiz screen — dark mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'visual-desktop', 'quiz snapshot tracked on desktop only')
    await prepareDeepLink(page, '/?q=mem-001')
    await page.getByRole('progressbar', { name: '問題の進捗' }).waitFor({ timeout: 10000 })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('quiz-dark.png', { maxDiffPixelRatio: 0.05 })
  })

  test('quiz explanation with terminal diagram — light mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'visual-desktop', 'explanation snapshot tracked on desktop only')
    await prepareDeepLink(page, '/?q=mem-001')
    await page.getByRole('progressbar', { name: '問題の進捗' }).waitFor({ timeout: 10000 })
    // Answer the question to unlock the explanation + diagram
    await page.locator('[role="option"], [role="radio"], [role="checkbox"]').first().click()
    await page.getByRole('button', { name: '回答する' }).click()
    // Terminal renders inside the explanation — wait for the window chrome to appear
    await page.locator('.bg-stone-900').first().waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('quiz-explanation-light.png', { maxDiffPixelRatio: 0.05 })
  })

  test('quiz explanation with terminal diagram — dark mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'visual-desktop', 'explanation snapshot tracked on desktop only')
    await prepareDeepLink(page, '/?q=mem-001')
    await page.getByRole('progressbar', { name: '問題の進捗' }).waitFor({ timeout: 10000 })
    await page.locator('[role="option"], [role="radio"], [role="checkbox"]').first().click()
    await page.getByRole('button', { name: '回答する' }).click()
    await page.locator('.bg-stone-900').first().waitFor({ timeout: 10000 })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('quiz-explanation-dark.png', { maxDiffPixelRatio: 0.05 })
  })

  test('reader screen — light mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'visual-desktop', 'reader snapshot tracked on desktop only')
    await prepareDeepLink(page, '/?view=reader')
    await page.getByRole('heading', { name: '解説リーダー' }).waitFor({ timeout: 10000 })
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('reader-light.png', { maxDiffPixelRatio: 0.05 })
  })

  test('reader screen — dark mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'visual-desktop', 'reader snapshot tracked on desktop only')
    await prepareDeepLink(page, '/?view=reader')
    await page.getByRole('heading', { name: '解説リーダー' }).waitFor({ timeout: 10000 })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('reader-dark.png', { maxDiffPixelRatio: 0.05 })
  })
})
