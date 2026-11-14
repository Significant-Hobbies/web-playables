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
  await page
    .getByRole('button', { name: name === 'Orders' ? /^Orders(?: \(\d+\))?$/ : name, exact: true })
    .click();
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
    await expect(page.getByText('No orders queued')).toBeVisible();
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

async function beginCampaign(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /^war World War II/ }).click();
  await page.getByRole('button', { name: 'United Kingdom', exact: true }).click();
  await page.getByRole('button', { name: 'Initialize Simulation' }).click();
  await expect(page.getByRole('application')).toBeVisible();
}

test('save and exit starts the next campaign on the map', async ({ page }) => {
  await page.goto('/play');
  await beginCampaign(page);
  await openPanel(page, 'Menu');
  await page.getByRole('button', { name: /^save & exit$/i }).click();
  await beginCampaign(page);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Campaign controls' })).toBeVisible();
});

test('branched timeline targets remain separate inside the modal after reload', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  let turn = 0;
  await page.route('**/api/turn', (route) =>
    route.fulfill({
      json: {
        message: `Branch report ${++turn}.`,
        updates: [
          {
            type: 'event',
            description: `Delegation ${turn}`,
            eventType: 'diplomacy',
            year: 1939 + turn,
          },
        ],
        storySoFar: `Campaign memory ${turn}.`,
      },
    })
  );
  await page.goto('/play');
  await beginCampaign(page);
  await openPanel(page, 'Menu');
  await page.getByRole('combobox').selectOption('1y');
  await openPanel(page, 'Orders');
  for (let n = 1; n <= 2; n++) {
    await page
      .getByRole('dialog', { name: 'Orders' })
      .getByRole('button', { name: /^advance$/i })
      .click();
    await expect(page.getByText(`Branch report ${n}.`, { exact: true })).toBeVisible();
  }
  await openPanel(page, 'Timeline');
  await page.getByRole('button', { name: /^Turn 1940:/ }).click();
  await page.getByRole('button', { name: 'Rewind', exact: true }).click();
  await openPanel(page, 'Orders');
  await page
    .getByRole('dialog', { name: 'Orders' })
    .getByRole('button', { name: /^advance$/i })
    .click();
  await expect(page.getByText('Branch report 3.', { exact: true })).toBeVisible();
  await openPanel(page, 'Menu');
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.reload();
  await openPanel(page, 'Timeline');
  for (const width of testInfo.project.name === 'mobile' ? [390] : [768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const nodes = page.getByRole('button', { name: /^Turn 194[01]:/ });
    await expect(nodes).toHaveCount(3);
    const boxes = await nodes.evaluateAll((elements) =>
      elements.map((element) => {
        const r = element.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      })
    );
    for (const [index, a] of boxes.entries()) {
      expect(a.width).toBeGreaterThanOrEqual(44);
      expect(a.height).toBeGreaterThanOrEqual(44);
      for (const b of boxes.slice(index + 1))
        expect(a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y).toBe(false);
    }
    for (let n = 0; n < 3; n++) {
      await nodes.nth(n).click();
      await expect(page.getByText('Turn Replay', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    await page.screenshot({ path: testInfo.outputPath(`branch-${width}.png`) });
  }
});
