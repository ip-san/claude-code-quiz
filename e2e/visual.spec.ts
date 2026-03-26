import { expect, test } from '@playwright/test'

/**
 * Visual Regression テスト
 * 各画面のスクリーンショットを撮影し、前回と比較。
 * 初回実行時はベースラインを作成。
 *
 * 実行: npm run test:e2e
 * ベースライン更新: npx playwright test --update-snapshots
 */

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }) // iPhone 13
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
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.waitForTimeout(500) // Wait for animations
    await expect(page).toHaveScreenshot('menu-light.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('menu screen — dark mode', async ({ page }) => {
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('menu-dark.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('quiz screen — light mode', async ({ page }) => {
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()
    await page.waitForSelector('[role="listbox"], [role="group"]', { timeout: 5000 })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('quiz-light.png', {
      maxDiffPixelRatio: 0.1, // Quiz content varies
    })
  })

  test('quiz screen — dark mode', async ({ page }) => {
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()
    await page.waitForSelector('[role="listbox"], [role="group"]', { timeout: 5000 })
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('quiz-dark.png', {
      maxDiffPixelRatio: 0.1,
    })
  })

  test('reader screen — light mode', async ({ page }) => {
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.getByText('解説リーダー').first().click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('reader-light.png', {
      maxDiffPixelRatio: 0.1,
    })
  })

  test('reader screen — dark mode', async ({ page }) => {
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.getByText('解説リーダー').first().click()
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('reader-dark.png', {
      maxDiffPixelRatio: 0.1,
    })
  })
})
