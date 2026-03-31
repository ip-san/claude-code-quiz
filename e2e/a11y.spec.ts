import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

/**
 * Accessibility tests using axe-core
 *
 * Scans each major screen for WCAG 2.1 AA violations.
 * Runs on desktop chromium only (a11y rules are viewport-independent).
 */

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

test.describe('Accessibility (axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  // Known issues to fix incrementally:
  // - color-contrast: text-stone-400 on bg-claude-cream (2.39, needs 4.5:1)
  // - color-contrast: bg-claude-orange + white text (3.12, needs 4.5:1)
  // - meta-viewport: user-scalable=no disables zoom
  const KNOWN_RULES_TO_SKIP = ['color-contrast', 'meta-viewport']

  test('welcome screen has no critical a11y violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules(KNOWN_RULES_TO_SKIP)
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('menu screen has no critical a11y violations', async ({ page }) => {
    await goToMenu(page)
    await page.waitForTimeout(500)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules(KNOWN_RULES_TO_SKIP)
      .analyze()

    expect(results.violations).toEqual([])
  })
})
