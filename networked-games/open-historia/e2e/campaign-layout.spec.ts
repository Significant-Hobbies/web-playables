import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:43187') return route.abort();
    if (url.pathname.includes('/api/auth/get-session')) return route.fulfill({ json: null });
    return route.continue();
  });
});

async function openPanel(page: import('@playwright/test').Page, name: string) {
  const active = page.locator('dialog[open]');
  if (await active.count()) await active.getByRole('button', { name: 'Back to the map' }).click();
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 844, height: 390 },
])
  test(`viewport game and modal controls at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let turns = 0;
    await page.route('**/api/turn', (route) =>
      route.fulfill({
        json: {
          message: `Delegation report ${++turns}.`,
          updates: [],
          storySoFar: 'An agreement is taking shape.',
        },
      })
    );
    await page.setViewportSize(viewport);
    await page.goto('/play');
    await page.getByRole('button', { name: /^war World War II/ }).click();
    await page.getByRole('button', { name: 'United Kingdom', exact: true }).click();
    await page.getByRole('button', { name: 'Initialize Simulation' }).click();
    await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30000,
    });
    const fit = () =>
      page.evaluate(() => {
        const shell = document.querySelector('.campaign-shell')!;
        return (
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth &&
          shell.scrollHeight <= innerHeight
        );
      });
    expect(await fit()).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('map.png') });
    for (const name of [
      'Journey',
      'Diplomacy',
      'Relations',
      'Advisor',
      'Timeline',
      'Menu',
      'Orders',
    ]) {
      await openPanel(page, name);
      await expect(
        page
          .getByRole('dialog', { name, exact: true })
          .getByRole('button', { name: 'Back to the map' })
      ).toBeInViewport();
      expect(await fit()).toBe(true);
      if (name === 'Journey' || name === 'Orders')
        await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
    }
    await openPanel(page, 'Orders');
    const input = page.getByRole('textbox', { name: /Enter orders/ });
    await input.fill('Send a diplomatic delegation.');
    await input.press('Enter');
    await expect(page.getByText('1 order queued')).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Orders' })
      .getByRole('button', { name: /^advance$/i })
      .click();
    await expect(page.getByText('Delegation report 1.', { exact: true })).toBeVisible();
    await openPanel(page, 'Menu');
    await page.getByRole('button', { name: /^save$/i }).click();
    await openPanel(page, 'Orders');
    await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
    await page.reload();
    await openPanel(page, 'Orders');
    await expect(page.getByText('Delegation report 1.', { exact: true })).toBeVisible();
    expect(await fit()).toBe(true);
    expect(errors.filter((message) => /TypeError|WebGL|layers\./i.test(message))).toEqual([]);
  });
