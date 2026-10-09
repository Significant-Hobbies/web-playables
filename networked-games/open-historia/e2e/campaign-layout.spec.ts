import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    // WebKit routes MapLibre blob workers too; allow only this local origin.
    if (url.origin !== 'http://127.0.0.1:43187') return route.abort();
    if (route.request().url().includes('/api/auth/get-session')) {
      return route.fulfill({ json: null });
    }
    return route.continue();
  });
});

async function startCampaign(page: import('@playwright/test').Page) {
  await page.goto('/play');
  await page.getByRole('button', { name: /^war World War II/ }).click();
  await page.getByRole('button', { name: 'United Kingdom', exact: true }).click();
  await page.getByRole('button', { name: 'Initialize Simulation' }).click();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
}

for (const width of [390, 768, 1440]) {
  test(`campaign controls at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.route('**/api/turn', (route) =>
      route.fulfill({
        json: {
          message: 'Diplomatic delegation received.',
          updates: [
            {
              type: 'relation',
              nationA: 'United Kingdom',
              nationB: 'France',
              relationType: 'friendly',
            },
          ],
          storySoFar: 'A delegation reached France.',
        },
      })
    );
    await startCampaign(page);
    await page.getByRole('button', { name: 'Hide Timeline', exact: true }).click();
    await page.getByRole('button', { name: 'Show Timeline', exact: true }).click();
    if (width < 1100) {
      const panels = await page
        .locator('.campaign-shell > [class*="campaign-"]')
        .evaluateAll((elements) =>
          elements
            .map((el) => {
              const r = el.getBoundingClientRect();
              return {
                name: el.className,
                x: r.x,
                y: r.y,
                right: r.right,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
              };
            })
            .filter((r) => r.width && r.height)
        );
      expect(panels.length).toBeGreaterThan(5);
      for (const [index, a] of panels.entries()) {
        expect(a.x, a.name).toBeGreaterThanOrEqual(0);
        expect(a.right, a.name).toBeLessThanOrEqual(width);
        for (const b of panels.slice(index + 1)) {
          const overlaps = a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
          expect(overlaps, `${a.name} overlaps ${b.name}`).toBe(false);
        }
      }
      await page
        .getByRole('textbox', { name: /Enter orders/ })
        .fill('Send a diplomatic delegation.');
      await page.getByRole('textbox', { name: /Enter orders/ }).press('Enter');
      await expect(page.getByText('1 order queued')).toBeVisible();
      await page
        .getByRole('button', { name: /^advance$/i })
        .first()
        .click();
      await expect(page.getByText('Diplomatic delegation received.')).toBeVisible();
      await expect(page.getByText('No orders queued')).toBeVisible();
      await page.getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByText('Game saved.', { exact: true })).toBeAttached();
      await page.getByRole('button', { name: 'Hide Timeline', exact: true }).click();
      await page.getByRole('button', { name: 'Show Timeline', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Hide Timeline', exact: true })).toBeVisible();
    }
    await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30_000,
    });
    // Wait for the existing 1500ms initial map fit and transient save notice.
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      document.querySelector('.campaign-shell')!.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    await expect(page.locator('.campaign-toolbar')).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath(`after-${width}-${testInfo.project.name}.png`),
    });
    writeFileSync(testInfo.outputPath('browser-errors.json'), JSON.stringify(errors, null, 2));
    expect(errors.filter((error) => /layers\.|WebGL|TypeError/i.test(error))).toEqual([]);
  });
}

test('branched campaign panels and timeline targets remain separate', async ({
  page,
}, testInfo) => {
  // Exercise native mobile in WebKit and desktop boundaries in Chromium.
  // The separate retained harness covers all six viewport reflows.
  page.setDefaultTimeout(10_000);
  let turn = 0;
  await page.route('**/api/turn', (route) =>
    route.fulfill({
      json: {
        message: `Delegation report ${++turn}.`,
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
  await page.setViewportSize(
    testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 800 }
  );
  await startCampaign(page);
  await page.getByRole('combobox').selectOption('1y');
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole('button', { name: /^advance$/i })
      .first()
      .click();
    await expect(page.getByText(`Delegation report ${i + 1}.`, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: /^Turn 1940:/ }).click();
  await page.getByRole('button', { name: 'Rewind', exact: true }).click();
  await page
    .getByRole('button', { name: /^advance$/i })
    .first()
    .click();
  await expect(page.getByText('Delegation report 3.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true }).last()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Delegation report 3.', { exact: true })).toBeVisible();
  for (const width of testInfo.project.name === 'mobile' ? [390] : [1280, 1100, 1440])
    await test.step(`${width}px branch controls`, async () => {
      await page.setViewportSize({
        width,
        height: width === 1280 ? 800 : width === 1100 ? 741 : 1000,
      });
      await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'false');
      await page.waitForTimeout(1700);
      if (width >= 1100) {
        const story = await page.locator('.campaign-story').boundingBox();
        const terminal = await page.locator('.campaign-commands').boundingBox();
        expect(story!.y + story!.height).toBeLessThanOrEqual(terminal!.y - 8);
        const advance = page
          .locator('.campaign-commands')
          .getByRole('button', { name: /^advance$/i });
        expect(
          await advance.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          })
        ).toBe(true);
        await page.getByRole('button', { name: 'Expand step list' }).click();
        await page.getByRole('button', { name: 'Collapse step list' }).click();
        await page.locator('.campaign-story-body').evaluate((el) => {
          el.scrollTop = 0;
        });
      }
      await page.locator('.campaign-timeline').scrollIntoViewIfNeeded();
      const nodes = page.getByRole('button', { name: /^Turn 194[01]:/ });
      await expect(nodes).toHaveCount(3);
      const boxes = await nodes.evaluateAll((elements) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect();
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
        for (const b of boxes.slice(index + 1)) {
          expect(a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y).toBe(false);
        }
      }
      for (let i = 0; i < 3; i++) {
        await nodes.nth(i).click();
        await expect(page.getByText('Turn Replay', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      }
      await page.screenshot({ path: testInfo.outputPath(`branches-${width}.png`) });
    });
});
