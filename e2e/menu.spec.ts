import { expect, type Page, test } from '@playwright/test'

/** Skip welcome + tutorial to reach menu screen */
async function goToMenu(page: Page) {
  const welcome = page.getByRole('button', { name: /はじめる/ })
  if (await welcome.isVisible({ timeout: 3000 }).catch(() => false)) {
    await welcome.click()
  }
  const skip = page.getByRole('button', { name: 'スキップ' })
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skip.click()
  }
  // Confirm we reached the menu screen
  await page.getByRole('button', { name: 'メニューを開く' }).waitFor({ timeout: 5000 })
}

test.describe('Menu screen', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('navigates to menu via welcome and tutorial skip', async ({ page }) => {
    // Welcome screen should appear first
    const welcomeButton = page.getByRole('button', { name: /はじめる/ })
    await expect(welcomeButton).toBeVisible({ timeout: 5000 })

    // Click はじめる
    await welcomeButton.click()

    // Skip tutorial if shown
    const skip = page.getByRole('button', { name: 'スキップ' })
    if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skip.click()
    }

    // Should be on menu screen with hamburger button visible
    await expect(page.getByRole('button', { name: 'メニューを開く' })).toBeVisible({ timeout: 5000 })
  })

  test('shows クイズで学ぶ button on menu screen', async ({ page }) => {
    await goToMenu(page)

    // クイズで学ぶ button is part of FirstTimeGuide (PWA first-time user)
    await expect(page.getByRole('button', { name: /クイズで学ぶ/ })).toBeVisible({ timeout: 5000 })
  })

  test('shows 読んでから解く button on menu screen', async ({ page }) => {
    await goToMenu(page)

    // 読んでから解く button is part of FirstTimeGuide
    await expect(page.getByRole('button', { name: /読んでから解く/ })).toBeVisible({ timeout: 5000 })
  })

  test('shows すでに活用されている方へ button on menu screen', async ({ page }) => {
    await goToMenu(page)

    // Experience user button
    await expect(page.getByRole('button', { name: /すでに活用されている方へ/ })).toBeVisible({ timeout: 5000 })
  })

  test('shows search button on menu screen', async ({ page }) => {
    await goToMenu(page)

    // QuizSearch component renders a text link / button for search
    await expect(page.getByText('検索・リファレンス')).toBeVisible({ timeout: 5000 })
  })

  test('hamburger menu opens on click', async ({ page }) => {
    await goToMenu(page)

    // Click hamburger button to open menu
    await page.getByRole('button', { name: 'メニューを開く' }).click()

    // Dialog with メニュー label should appear
    await expect(page.getByRole('dialog', { name: 'メニュー' })).toBeVisible({ timeout: 3000 })
  })

  test('hamburger menu closes on close button click', async ({ page }) => {
    await goToMenu(page)

    // Open menu
    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const menu = page.getByRole('dialog', { name: 'メニュー' })
    await expect(menu).toBeVisible({ timeout: 3000 })

    // Close menu
    await menu.getByRole('button', { name: 'メニューを閉じる' }).click()

    // Dialog should be gone
    await expect(menu).not.toBeVisible({ timeout: 3000 })
  })

  test('hamburger menu shows クイズモード section', async ({ page }) => {
    await goToMenu(page)

    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const menu = page.getByRole('dialog', { name: 'メニュー' })

    await expect(menu.getByText('クイズモード')).toBeVisible({ timeout: 3000 })
  })
})
