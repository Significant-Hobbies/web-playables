import { expect, test } from '@playwright/test';
import { gunzipSync } from 'node:zlib';

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

test('unavailable URL save explains recovery and preserves existing saves', async ({
  page,
}, testInfo) => {
  await startCampaign(page);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('open_historia_saves'));
  await page.goto('/play/synthetic-unavailable-save');
  await expect(page.getByRole('heading', { name: 'Saved game is unavailable' })).toBeVisible();
  await expect(page.getByText(/could not restore this saved game/i)).toBeVisible();
  await expect(page.getByText('synthetic-unavailable-save', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved game is unavailable' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('open_historia_saves'))).toBe(saved);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeInViewport();
    await expect(page.getByRole('link', { name: 'New game', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(`unavailable-${width}.png`) });
  }
  await page.getByRole('link', { name: 'New game', exact: true }).click();
  await expect(page.getByRole('button', { name: /^war World War II/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('open_historia_saves'))).toBe(saved);
});

test('retry restores a URL save that becomes available', async ({ page }) => {
  await startCampaign(page);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  const save = await page.evaluate(
    () => JSON.parse(localStorage.getItem('open_historia_saves')!)[0]
  );
  const url = page.url();
  await page.evaluate(() => localStorage.removeItem('open_historia_saves'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Saved game is unavailable' })).toBeVisible();
  await page.evaluate(
    (save) => localStorage.setItem('open_historia_saves', JSON.stringify([save])),
    save
  );
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved game is unavailable' })).toHaveCount(0);
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('open_historia_saves')!)[0])
  ).toEqual(save);
});

test('PostHog before_send sanitizes generated play-route metadata', async ({ page }) => {
  // Exercise the real SDK while preserving an explicit QA label. Its default
  // bot filtering remains unchanged in the product; this test adjusts signals.
  await page.addInitScript(() => {
    const userAgent = navigator.userAgent.replace(/HeadlessChrome/g, 'Chrome');
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgent', { get: () => userAgent });
  });
  const syntheticId = 'synthetic-private-save';
  const records: {
    outcome: unknown;
    origin: unknown;
    traffic: unknown;
    currentUrl: unknown;
    pathname: unknown;
    containsId: boolean;
  }[] = [];
  await page.route('https://us.i.posthog.com/**', async (route) => {
    const request = route.request();
    const body = request.postDataBuffer();
    if (request.method() === 'POST' && body) {
      const url = new URL(request.url());
      const json =
        url.searchParams.get('compression') === 'gzip-js'
          ? gunzipSync(body).toString()
          : body.toString();
      const payload = JSON.parse(
        json.startsWith('data=')
          ? Buffer.from(new URLSearchParams(json).get('data') || '', 'base64').toString()
          : json
      );
      for (const event of Array.isArray(payload) ? payload : payload.batch || [payload]) {
        if (event.event !== 'foundry_restore_result') continue;
        records.push({
          outcome: event.properties.outcome,
          origin: event.properties.origin,
          traffic: event.properties.measurement_traffic,
          currentUrl: event.properties.$current_url,
          pathname: event.properties.$pathname,
          containsId: JSON.stringify(event).includes(syntheticId),
        });
      }
    }
    // This is an SDK integration test with a local collector. The separate
    // shipped-runtime acceptance uses the actual collector without routing.
    await route.fulfill({ json: {} });
  });
  await page.goto(`/play/${syntheticId}?measurement_traffic=qa`);
  await expect(page.getByRole('heading', { name: 'Saved game is unavailable' })).toBeVisible();
  await expect.poll(() => records.length).toBeGreaterThan(0);
  expect(records).toEqual([
    {
      outcome: 'unavailable',
      origin: 'url',
      traffic: 'qa',
      currentUrl: 'http://127.0.0.1:43187/play/:id',
      pathname: '/play/:id',
      containsId: false,
    },
  ]);
});

test('failed turn retains orders and year; retry commits once and save reloads', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/api/turn', async (route) => {
    requests++;
    await route.fulfill(
      requests === 1
        ? { status: 503, json: { message: 'Synthetic provider unavailable' } }
        : {
            json: {
              message: 'Humanitarian agreement accepted.',
              updates: [
                {
                  type: 'event',
                  description: 'Aid agreement recorded.',
                  eventType: 'diplomacy',
                  year: 1940,
                },
                {
                  type: 'relation',
                  nationA: 'United Kingdom',
                  nationB: 'France',
                  relationType: 'friendly',
                },
                { type: 'owner', provinceName: 'France', newOwnerId: 'player' },
              ],
              storySoFar: 'Aid agreement established.',
            },
          }
    );
  });
  await startCampaign(page);
  await expect(page).toHaveURL(/\/play\/[^/]+$/);
  const input = page.getByRole('textbox', { name: /Enter orders/ });
  await input.fill('Negotiate humanitarian shipping access.');
  await input.press('Enter');
  await page.getByRole('combobox').selectOption('1y');
  await page
    .getByRole('button', { name: /^advance$/i })
    .first()
    .click();
  await expect(page.getByText('Synthetic provider unavailable')).toBeVisible();
  await expect(page.getByText('No orders queued')).toHaveCount(0);
  await expect(page.getByText('1940', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: /^advance$/i })
    .first()
    .click();
  await expect(page.getByText('Humanitarian agreement accepted.')).toBeVisible();
  await expect(page.getByText('No orders queued')).toBeVisible();
  await expect(page.getByText('1940', { exact: true }).first()).toBeVisible();
  expect(requests).toBe(2);
  await input.fill('Prepare a follow-up shipment.');
  await input.press('Enter');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  const savedState = await page.evaluate(
    () => JSON.parse(localStorage.getItem('open_historia_saves') || '[]')[0].gameState
  );
  expect(savedState.relations).toHaveLength(1);
  expect(savedState.timeline).toHaveLength(1);
  expect(savedState.timeline[0].gameStateSlim.provinceOwners).toEqual(
    Object.fromEntries(
      savedState.provinceOwners.map((p: { id: string; ownerId: string | null }) => [
        String(p.id),
        p.ownerId,
      ])
    )
  );
  const savedUrl = page.url();
  await page.reload();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
  await expect(page.getByText('Humanitarian agreement accepted.')).toBeVisible();
  await expect(page.getByText('1940', { exact: true }).first()).toBeVisible();
  expect(page.url()).toBe(savedUrl);
  await expect(page.getByRole('button', { name: /Relations.*1/i })).toBeVisible();
  await expect(page.getByText('No timeline snapshots yet.', { exact: false })).toHaveCount(0);
  await expect(page.getByText('1 order queued')).toBeVisible();
  // Saving again proves that restored UI state, not just the old JSON, survives.
  await page.getByRole('button', { name: /^save$/i }).click();
  const restoredState = await page.evaluate(
    () => JSON.parse(localStorage.getItem('open_historia_saves') || '[]')[0].gameState
  );
  expect(restoredState.relations).toEqual(savedState.relations);
  expect(restoredState.timeline).toEqual(savedState.timeline);
  expect(restoredState.pendingOrders).toEqual(['Prepare a follow-up shipment.']);
});

test('save failure keeps the active campaign open', async ({ page }) => {
  await startCampaign(page);
  const url = page.url();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'open_historia_saves')
        throw new DOMException('Synthetic quota limit', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: /^save & exit$/i }).click();
  await expect(page.getByText(/Save failed: Storage quota exceeded/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
  expect(page.url()).toBe(url);
});

test('rewind restores prompt memory across save and reload', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/turn', async (route) => {
    requests.push(route.request().postDataJSON());
    const turn = requests.length;
    await route.fulfill({
      json: {
        message: `Turn ${turn} narrative`,
        storySoFar: `Memory ${turn}`,
        updates: [
          {
            type: 'event',
            description: `Event ${turn}`,
            eventType: 'diplomacy',
            year: 1939 + turn,
          },
          { type: 'storyStep', stepId: `objective-${turn}`, message: `Objective ${turn}` },
        ],
      },
    });
  });
  await startCampaign(page);
  await page.getByRole('combobox').selectOption('1y');
  for (let n = 1; n <= 2; n++) {
    await page
      .getByRole('button', { name: /^advance$/i })
      .first()
      .click();
    await expect(page.getByText(`Turn ${n} narrative`, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: /^Turn 1940:/ }).click();
  await page.getByRole('button', { name: 'Rewind', exact: true }).click();
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
  await page
    .getByRole('button', { name: /^advance$/i })
    .first()
    .click();
  await expect(page.getByText('Turn 3 narrative', { exact: true })).toBeVisible();
  expect(requests[2].storySoFar).toBe('Memory 1');
  expect(requests[2].completedStepIds).toEqual(['objective-1']);
  expect(JSON.stringify(requests[2].events)).not.toContain('Event 2');
  expect(JSON.stringify(requests[2].history)).not.toContain('Turn 2 narrative');
  await page.getByRole('button', { name: /^save$/i }).click();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('open_historia_saves') || '[]')[0].gameState
  );
  expect(state.timeline.at(-1).parentSnapshotId).toBe(state.timeline[0].id);
});

test('older snapshots remain inspectable without inventing rewind memory', async ({
  page,
}, testInfo) => {
  await page.route('**/api/turn', (route) =>
    route.fulfill({
      json: {
        message: 'Historical fixture turn',
        updates: [
          { type: 'event', description: 'Legacy event', eventType: 'diplomacy', year: 1940 },
        ],
      },
    })
  );
  await startCampaign(page);
  await page.getByRole('combobox').selectOption('1y');
  await page
    .getByRole('button', { name: /^advance$/i })
    .first()
    .click();
  await expect(page.getByText('Historical fixture turn', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const saves = JSON.parse(localStorage.getItem('open_historia_saves') || '[]');
    delete saves[0].gameState.timeline[0].memory;
    delete saves[0].gameState.currentTimelineSnapshotId;
    localStorage.setItem('open_historia_saves', JSON.stringify(saves));
  });
  await page.reload();
  await page.getByRole('button', { name: /^Turn 1940:/ }).click();
  await expect(
    page.getByText('Older snapshot: historical memory was not saved. Replay inspection only.')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rewind', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Branch', exact: true })).toHaveCount(0);
  const replay = page
    .getByText('Older snapshot: historical memory was not saved. Replay inspection only.')
    .locator('..');
  await replay.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  const bounds = await replay.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const heading = replay.getByText('Turn Replay', { exact: true });
  expect(
    await heading.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      );
    })
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`legacy-${testInfo.project.name}.png`) });
});

test('rewind cannot replace state beneath an in-flight turn', async ({ page }) => {
  let count = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/turn', async (route) => {
    count++;
    if (count === 3) await pending;
    await route.fulfill({
      json: {
        message: `Response ${count}`,
        storySoFar: `Memory ${count}`,
        updates: [
          {
            type: 'event',
            description: `Event ${count}`,
            eventType: 'diplomacy',
            year: 1939 + count,
          },
        ],
      },
    });
  });
  await startCampaign(page);
  await page.getByRole('combobox').selectOption('1y');
  for (let n = 1; n <= 2; n++) {
    await page
      .getByRole('button', { name: /^advance$/i })
      .first()
      .click();
    await expect(page.getByText(`Response ${n}`, { exact: true })).toBeVisible();
  }
  await page
    .getByRole('button', { name: /^advance$/i })
    .first()
    .click();
  await expect.poll(() => count).toBe(3);
  await page.getByRole('button', { name: /^Turn 1940:/ }).click();
  await page.getByRole('button', { name: 'Rewind', exact: true }).click();
  await expect(page.getByText('Rewound to Year 1940.', { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByText('Response 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^save$/i }).click();
  const save = await page.evaluate(
    () => JSON.parse(localStorage.getItem('open_historia_saves') || '[]')[0]
  );
  expect(save.storySoFar).toBe('Memory 3');
  expect(save.gameState.timeline.at(-1).parentSnapshotId).toBe(save.gameState.timeline[1].id);
});

test('explicit empty summary survives a later rewind and reload', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/turn', async (route) => {
    requests.push(route.request().postDataJSON());
    const n = requests.length;
    await route.fulfill({
      json: {
        message: `Empty-check response ${n}`,
        storySoFar: n === 2 ? '' : `Memory ${n}`,
        updates: [
          { type: 'event', description: `Event ${n}`, eventType: 'diplomacy', year: 1939 + n },
        ],
      },
    });
  });
  await startCampaign(page);
  await page.getByRole('combobox').selectOption('1y');
  for (let n = 1; n <= 3; n++) {
    await page
      .getByRole('button', { name: /^advance$/i })
      .first()
      .click();
    await expect(page.getByText(`Empty-check response ${n}`, { exact: true })).toBeVisible();
  }
  expect(requests[2].storySoFar).toBe('');
  await page.getByRole('button', { name: /^Turn 1941:/ }).click();
  await page.getByRole('button', { name: 'Rewind', exact: true }).click();
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole('button', { name: /^advance$/i })
    .first()
    .click();
  await expect(page.getByText('Empty-check response 4', { exact: true })).toBeVisible();
  expect(requests[3].storySoFar).toBe('');
});

test('rewind waits for a pending advisor response before restoring context', async ({ page }) => {
  let turns = 0;
  let started = false;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/turn', async (route) => {
    turns++;
    await route.fulfill({
      json: {
        message: `Advisor-check turn ${turns}`,
        updates: [
          {
            type: 'event',
            description: `Event ${turns}`,
            eventType: 'diplomacy',
            year: 1939 + turns,
          },
        ],
      },
    });
  });
  await page.route('**/api/advisor', async (route) => {
    started = true;
    await pending;
    await route.fulfill({ json: { advice: 'Future advice response' } });
  });
  await startCampaign(page);
  await page.getByRole('combobox').selectOption('1y');
  for (let n = 1; n <= 2; n++) {
    await page
      .getByRole('button', { name: /^advance$/i })
      .first()
      .click();
    await expect(page.getByText(`Advisor-check turn ${n}`, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Open Strategic Advisor' }).click();
  await page.getByPlaceholder('Ask your advisor...').fill('What follows this future event?');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await page.getByRole('button', { name: 'Close advisor' }).click();
  await page.getByRole('button', { name: /^Turn 1940:/ }).click();
  await page.getByRole('button', { name: 'Rewind', exact: true }).click();
  await expect(page.getByText('Rewound to Year 1940.', { exact: true })).toHaveCount(0);
  release();
  await page.getByRole('button', { name: 'Open Strategic Advisor' }).click();
  await expect(page.getByText('Future advice response', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close advisor' }).click();
  await page.getByRole('button', { name: /^Turn 1940:/ }).click();
  await page.getByRole('button', { name: 'Rewind', exact: true }).click();
  await expect(page.getByText('Rewound to Year 1940.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^save$/i }).click();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('open_historia_saves') || '[]')[0].gameState
  );
  expect(state.advisorHistory).toEqual([]);
});
