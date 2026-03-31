import { expect, type Page, test } from '@playwright/test'

/** Skip welcome + tutorial to reach menu screen */
async function goToMenu(page: Page) {
  const welcome = page.getByRole('button', { name: /はじめる/ })
  if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
    await welcome.click()
  }
  const skip = page.getByRole('button', { name: 'スキップ' })
  if (await skip.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skip.click()
  }
}

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

    // Should see menu with hamburger, search, and first-time guide
    await expect(page.getByRole('button', { name: 'メニューを開く' })).toBeVisible()
    await expect(page.getByText('検索・リファレンス')).toBeVisible()
  })

  test('start random quiz and answer a question', async ({ page }) => {
    // Skip welcome
    await goToMenu(page)

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
    await goToMenu(page)

    // Open hamburger menu
    await page.getByRole('button', { name: 'メニューを開く' }).click()

    // Toggle dark mode (menu stays open)
    await page.getByRole('button', { name: 'ダークモード' }).click()

    // Check dark class is applied
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(isDark).toBe(true)

    // Toggle back (menu is still open, label changed to ライトモード)
    await page.getByRole('button', { name: 'ライトモード' }).click()

    const isLight = await page.evaluate(() => !document.documentElement.classList.contains('dark'))
    expect(isLight).toBe(true)
  })

  test('search finds questions and shows results', async ({ page }) => {
    await goToMenu(page)

    // Open search
    await page.getByText('検索・リファレンス').click()

    // Type query
    await page.getByRole('textbox', { name: '問題を検索' }).fill('CLAUDE.md')

    // Should show results with "問に挑戦" button
    await expect(page.getByRole('button', { name: /問に挑戦/ })).toBeVisible({ timeout: 3000 })
  })

  test('progress dashboard opens and closes', async ({ page }) => {
    // Skip welcome + tutorial, do a quick quiz first to have progress
    await goToMenu(page)
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()

    // Answer one question
    await page.waitForSelector('[role="option"], [role="checkbox"]', { timeout: 5000 })
    await page.locator('[role="option"], [role="checkbox"]').first().click()
    await page.getByRole('button', { name: '回答する' }).click()

    // Quit back to menu
    await page.getByRole('button', { name: /中止/ }).click()
    await page
      .getByRole('button', { name: /続ける|中止する/ })
      .last()
      .click()

    // Open progress via hamburger menu
    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const progressButton = page.getByRole('button', { name: '学習進捗' })
    if (await progressButton.isVisible()) {
      await progressButton.click()
      await expect(page.getByText('学習進捗')).toBeVisible()
      // Close
      await page.getByRole('button', { name: '閉じる' }).click()
    }
  })

  test('hamburger menu opens and lists quiz modes', async ({ page }) => {
    await goToMenu(page)

    // Open hamburger
    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const menu = page.getByRole('dialog', { name: 'メニュー' })
    await expect(menu.getByText('クイズモード')).toBeVisible()

    // Expand quiz modes accordion
    await menu.getByText('クイズモード').click()
    await expect(menu.getByText('実力テスト')).toBeVisible()

    // Close hamburger
    await menu.getByRole('button', { name: 'メニューを閉じる' }).click()
  })

  test('explanation reader opens and shows questions', async ({ page }) => {
    await goToMenu(page)

    // Click reader shortcut on main screen
    await page.getByText('解説リーダー').first().click()

    // Should see reader header and question count
    await expect(page.getByRole('heading', { name: '解説リーダー' })).toBeVisible()
    await expect(page.getByText(/\d+ \/ \d+件/)).toBeVisible()

    // Go back
    await page.getByRole('button', { name: '戻る' }).click()
  })

  test('start quiz from hamburger menu', async ({ page }) => {
    await goToMenu(page)

    // Open hamburger → expand modes → start random
    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const menu = page.getByRole('dialog', { name: 'メニュー' })
    await menu.getByText('クイズモード').click()
    await menu.getByText('全カテゴリからランダムに20問').click()

    // Should enter quiz screen
    await page.waitForSelector('[role="listbox"], [role="group"]', { timeout: 5000 })
  })

  test('start overview mode and verify scroll after chapter intro', async ({ page }) => {
    await goToMenu(page)

    // Click chapter from map
    const chapter1 = page.getByText('Ch.1')
    if (await chapter1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chapter1.click()

      // Chapter intro should appear
      const startBtn = page.getByRole('button', { name: /学習をはじめる|はじめる/ })
      if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Scroll down to simulate user reading the intro
        await page.evaluate(() => window.scrollTo(0, 500))

        // Dismiss chapter intro
        await startBtn.click()

        // Scroll should reset to top after dismissing intro
        const scrollY = await page.evaluate(() => window.scrollY)
        expect(scrollY).toBe(0)
      }

      // Quiz should be visible
      await page.waitForSelector('[role="listbox"], [role="group"]', { timeout: 5000 })
    }
  })

  test('hamburger menu shows all modes when expanded', async ({ page }) => {
    await goToMenu(page)

    // Open hamburger → expand modes accordion
    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const menu = page.getByRole('dialog', { name: 'メニュー' })

    // Click the accordion button to expand
    const modesButton = menu.getByRole('button', { name: /クイズモード/ })
    await modesButton.click()

    // Wait for expansion and verify modes are listed
    await expect(menu.getByText('実力テスト')).toBeVisible({ timeout: 3000 })
    await expect(menu.getByText('カテゴリ別学習')).toBeVisible()
    await expect(menu.getByText('ランダム20問')).toBeVisible()
  })

  test('session resume after quit', async ({ page }) => {
    await goToMenu(page)

    // Start random quiz and answer one question
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()
    await page.waitForSelector('[role="option"], [role="checkbox"]', { timeout: 5000 })
    await page.locator('[role="option"], [role="checkbox"]').first().click()
    await page.getByRole('button', { name: '回答する' }).click()

    // Quit quiz → back to menu
    await page.getByRole('button', { name: /中止/ }).click()
    await page
      .getByRole('button', { name: /中止する/ })
      .last()
      .click()

    // Resume banner should appear
    await expect(page.getByText('前回の続きがあります')).toBeVisible({ timeout: 3000 })

    // Click resume
    await page.getByRole('button', { name: /続きから再開/ }).click()

    // Should be back in quiz with options visible
    await page.waitForSelector('[role="option"], [role="checkbox"]', { timeout: 5000 })
  })

  test('full test mode: deferFeedback and finish', async ({ page }) => {
    await goToMenu(page)

    // Start full test via hamburger menu
    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const menu = page.getByRole('dialog', { name: 'メニュー' })
    await menu.getByRole('button', { name: /クイズモード/ }).click()
    await menu.getByText('実力テスト').click()

    // Should show quiz with dot indicators (deferFeedback mode)
    await page.waitForSelector('[role="listbox"], [role="group"]', { timeout: 5000 })

    // Verify no 正解/不正解 feedback after answering (deferFeedback)
    await page.locator('[role="option"], [role="checkbox"]').first().click()
    await page.getByRole('button', { name: '回答する' }).click()

    // Auto-advances to next question — feedback NOT shown (deferFeedback)

    // Navigate back to answered question 1 via dot
    await page.getByRole('button', { name: '問題1（回答済み）' }).click()

    // Now テスト終了 button should be visible (viewing answered question)
    const finishButton = page.getByRole('button', { name: /テスト終了/ })
    await expect(finishButton).toBeVisible({ timeout: 3000 })

    // Click finish test
    await finishButton.click()

    // Should see result screen with score
    await expect(page.getByText(/正答率|%/)).toBeVisible({ timeout: 5000 })
  })

  test('browser back button returns to menu from quiz', async ({ page }) => {
    await goToMenu(page)

    // Start random quiz
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()
    await page.waitForSelector('[role="listbox"], [role="group"]', { timeout: 5000 })

    // Press browser back
    await page.goBack()

    // Should return to menu (or quit dialog)
    const menuVisible = page.getByRole('button', { name: 'メニューを開く' })
    const quitDialog = page.getByText('クイズを中止しますか？')
    await expect(menuVisible.or(quitDialog)).toBeVisible({ timeout: 5000 })
  })

  test('navigate back to previous question restores selection', async ({ page }) => {
    await goToMenu(page)

    // Start random quiz
    await page.getByRole('button', { name: /気軽にチャレンジ/ }).click()
    await page.waitForSelector('[role="option"], [role="checkbox"]', { timeout: 5000 })

    // Remember question text of Q1
    const q1Text = await page.locator('h2').textContent()

    // Select first option and submit
    await page.locator('[role="option"], [role="checkbox"]').first().click()
    await page.getByRole('button', { name: '回答する' }).click()

    // Click "次の問題へ" to advance to Q2
    await page.getByRole('button', { name: '次の問題へ' }).click({ timeout: 5000 })

    // Should now be on Q2
    await page.waitForSelector('[role="option"], [role="checkbox"]', { timeout: 5000 })
    const q2Text = await page.locator('h2').textContent()
    expect(q2Text).not.toBe(q1Text)

    // Go back to Q1 — click the ◀ button (first button in bottom bar)
    await page.locator('.fixed.bottom-0 button').first().click()

    // Should see Q1's text again
    await expect(page.locator('h2')).toContainText(q1Text ?? '', { timeout: 3000 })
  })

  test('unanswered mode shows category picker with progress', async ({ page }) => {
    await goToMenu(page)

    // Open hamburger → find unanswered item
    await page.getByRole('button', { name: 'メニューを開く' }).click()
    const menu = page.getByRole('dialog', { name: 'メニュー' })

    // Scroll down if needed and click unanswered
    const unansweredItem = menu.getByRole('button', { name: /未回答に挑戦/ })
    await expect(unansweredItem).toBeVisible({ timeout: 3000 })
    await unansweredItem.click()

    // Category picker should show with progress info
    await expect(page.getByText(/回答済み/)).toBeVisible({ timeout: 3000 })
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
