import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const [base, output, mode] = process.argv.slice(2);
const save = JSON.parse(readFileSync(new URL('./guest-fixture.json', import.meta.url), 'utf8'));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const receipt = {
  base,
  mode,
  fixture:
    'Previously captured real guest AI campaign, three snapshots including a branch. No new AI calls.',
  views: [],
};
try {
  for (const [width, height] of [
    [390, 844],
    [768, 1000],
    [1280, 800],
    [1440, 1000],
    [1100, 741],
    [1280, 720],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    try {
      const page = await context.newPage();
      let providerCalls = 0;
      await page.route('**/api/**', (route) => {
        const u = new URL(route.request().url());
        if (u.pathname.includes('auth/get-session')) return route.fulfill({ json: null });
        if (route.request().method() !== 'GET') {
          providerCalls++;
          return route.abort();
        }
        return route.continue();
      });
      await page.addInitScript((data) => {
        if (!localStorage.getItem('open_historia_saves'))
          localStorage.setItem('open_historia_saves', JSON.stringify([data]));
      }, save);
      await page.goto(base + '/play/' + save.id);
      await page.getByRole('textbox', { name: /Enter orders/ }).waitFor();
      await page.waitForFunction(
        () => document.querySelector('[role="application"]')?.getAttribute('aria-busy') === 'false'
      );
      await page.waitForTimeout(2000);
      const overlap = await page.evaluate(() => {
        const a = document.querySelector('.campaign-story').getBoundingClientRect(),
          b = document.querySelector('.campaign-commands').getBoundingClientRect();
        return {
          story: { top: a.top, bottom: a.bottom },
          commands: { top: b.top, bottom: b.bottom },
          area:
            Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
            Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
        };
      });
      if (mode === 'after') {
        assert.equal(overlap.area, 0);
        await page.getByRole('button', { name: 'Expand step list', exact: true }).click();
        await page.getByRole('button', { name: 'Collapse step list', exact: true }).click();
        await page.locator('.campaign-story-body').evaluate((el) => {
          el.scrollTop = 0;
        });
        await page.evaluate(() => {
          document.querySelector('.campaign-shell').scrollTop = 0;
        });
      }
      await page.screenshot({ path: output + '/' + width + '-' + height + '.png' });
      await page.locator('.campaign-timeline').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const nodes = page.getByRole('button', { name: /^Turn 194[01]:/ });
      assert.equal(await nodes.count(), 3);
      const rects = await nodes.evaluateAll((es) =>
        es.map((e) => {
          const r = e.getBoundingClientRect();
          return {
            label: e.getAttribute('aria-label'),
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          };
        })
      );
      const intersect = (a, b) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      let collisions = 0;
      rects.forEach((a, i) => {
        rects.slice(i + 1).forEach((b) => {
          if (intersect(a, b)) collisions++;
        });
      });
      if (mode === 'after') {
        assert.equal(collisions, 0);
        assert.ok(rects.every((r) => r.width >= 44 && r.height >= 44));
        for (let i = 0; i < 3; i++) {
          await nodes.nth(i).click();
          await page.getByText('Turn Replay', { exact: true }).waitFor();
          await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        }
      }
      await page.mouse.move(1, 1);
      await page.waitForTimeout(500);
      await page.screenshot({ path: output + '/' + width + '-' + height + '-timeline.png' });
      const reloaded = await page.evaluate(
        () => JSON.parse(localStorage.getItem('open_historia_saves'))[0]
      );
      assert.deepEqual(reloaded.gameState.timeline, save.gameState.timeline);
      assert.equal(providerCalls, 0);
      receipt.views.push({
        width,
        height,
        overlap,
        collisions,
        targets: rects.map(({ x, y, width, height }) => ({ x, y, width, height })),
        providerCalls,
      });
    } finally {
      await context.close();
    }
  }
  writeFileSync(output + '/receipt.json', JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
