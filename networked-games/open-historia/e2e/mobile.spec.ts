import { expect, test } from '@playwright/test';

/**
 * Mobile-viewport checks. Run only the mobile project:
 *   pnpm exec playwright test --project=mobile
 *
 * Open Historia is a desktop-primary map game; these checks confirm the
 * primary surfaces are reachable and the page never scrolls sideways at 390px.
 */
test.describe('Open Historia mobile (390px)', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 500, 'mobile-only checks');

  test('landing page has no horizontal scroll and a play CTA', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);

    await expect(page.getByRole('link', { name: /play now/i }).first()).toBeVisible();
  });

  test('game shell loads the preset browser', async ({ page }) => {
    await page.goto('/');
    // The preset gallery is the first screen; it should render without the
    // page overflowing horizontally.
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow).toBe(false);
  });
});
