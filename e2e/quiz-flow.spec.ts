import { test, expect } from '@playwright/test'

test.describe('Quiz App E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('shows welcome screen on first visit', async ({ page }) => {
    await expect(page.getByText('Claude Code Quiz')).toBeVisible()
    await expect(page.getByText('はじめる')).toBeVisible()
  })

  test('welcome → menu flow', async ({ page }) => {
    // Click はじめる
    await page.getByRole('button', { name: /はじめる/ }).click()

    // Should see menu with mode heading and start button
    await expect(page.getByRole('heading', { name: 'モード' })).toBeVisible()
    await expect(page.getByRole('button', { name: /開始/ })).toBeVisible()
  })

  test('start random quiz and answer a question', async ({ page }) => {
    // Skip welcome
    await page.getByRole('button', { name: /はじめる/ }).click()

    // Click random quiz button
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()

    // Should see quiz card with options
    await page.waitForSelector('[role="listbox"], [role="group"]', { timeout: 5000 })

    // Select first option
    const firstOption = page.locator('[role="option"], [role="checkbox"]').first()
    await firstOption.click()

    // Submit answer
    await page.getByRole('button', { name: '回答する' }).click()

    // Should see feedback — either 正解 or 不正解
    const correct = page.getByText('正解！')
    const incorrect = page.getByText('不正解')
    await expect(correct.or(incorrect)).toBeVisible({ timeout: 5000 })
  })

  test('dark mode toggle works', async ({ page }) => {
    await page.getByRole('button', { name: /はじめる/ }).click()

    // Toggle dark mode
    await page.getByRole('button', { name: 'テーマ切替' }).click()

    // Check dark class is applied
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )
    expect(isDark).toBe(true)

    // Toggle back
    await page.getByRole('button', { name: 'テーマ切替' }).click()

    const isLight = await page.evaluate(() =>
      !document.documentElement.classList.contains('dark')
    )
    expect(isLight).toBe(true)
  })

  test('search finds questions and shows results', async ({ page }) => {
    await page.getByRole('button', { name: /はじめる/ }).click()

    // Open search
    await page.getByText('検索・リファレンス').click()

    // Type query
    await page.getByRole('textbox', { name: '問題を検索' }).fill('CLAUDE.md')

    // Should show results with "問に挑戦" button
    await expect(page.getByRole('button', { name: /問に挑戦/ })).toBeVisible({ timeout: 3000 })
  })

  test('progress dashboard opens and closes', async ({ page }) => {
    // Skip welcome, do a quick quiz first to have progress
    await page.getByRole('button', { name: /はじめる/ }).click()
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()

    // Answer one question
    await page.waitForSelector('[role="option"], [role="checkbox"]', { timeout: 5000 })
    await page.locator('[role="option"], [role="checkbox"]').first().click()
    await page.getByRole('button', { name: '回答する' }).click()

    // Quit back to menu
    await page.getByRole('button', { name: /中止/ }).click()
    await page.getByRole('button', { name: /続ける|中止する/ }).last().click()

    // Open progress (📊 icon in header)
    const progressButton = page.getByRole('button', { name: '学習履歴' })
    if (await progressButton.isVisible()) {
      await progressButton.click()
      await expect(page.getByText('学習進捗')).toBeVisible()
      // Close
      await page.getByRole('button', { name: '閉じる' }).click()
    }
  })

  test('app loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for app to fully load
    await page.waitForSelector('button', { timeout: 10000 })

    expect(errors).toEqual([])
  })
})
