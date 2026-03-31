import { expect, test } from '@playwright/test'

/**
 * Visual Regression テスト
 *
 * welcome + menu: 全デバイスで実行（固定レイアウト）
 * quiz + reader: desktop のみ（可変コンテンツ + チュートリアルの問題）
 *
 * 実行: npm run test:e2e
 * ベースライン更新: npx playwright test --update-snapshots
 */

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
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.waitForTimeout(500)
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
})
