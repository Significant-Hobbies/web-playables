import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createSiteServer } from "./serve-site.mjs";

test("Ember Road playable loop, pauses and durable saves", { timeout: 120000 }, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence = process.env.EMBER_ROAD_EVIDENCE_DIR || join(tmpdir(), "ember-road-web-evidence");
  await mkdir(evidence, { recursive: true });
  const server = createSiteServer(join(root, "apps/hub/dist"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
  });
  const errors = [];
  const external = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith(origin) && !/^(data|blob):/.test(request.url()))
      external.push(request.url());
  });
  const url = `${origin}/play/ember-road/`;
  const result = {};
  async function ready(target = page) {
    await target.goto(url);
    await target.waitForFunction(
      () => !document.getElementById("save-status").textContent.includes("Loading"),
    );
  }
  try {
    await ready();
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      assert(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
        `No overflow at ${viewport.width}`,
      );
      await page.screenshot({ path: join(evidence, `camp-${viewport.width}.png`) });
      await page.locator("#visit-forge").click();
      await page.screenshot({ path: join(evidence, `forge-${viewport.width}.png`) });
      await page.locator("#back-camp").click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#camp-settings").click();
    await page.getByRole("button", { name: "Return to the road", exact: true }).click();
    await page.getByRole("button", { name: "Begin chapter 1", exact: true }).click();
    await page.locator("#pause").click();
    const paused = await page.locator("#world").screenshot();
    const pausedHealth = await page.locator("#hp-text").innerText();
    await page.waitForTimeout(500);
    assert(
      paused.equals(await page.locator("#world").screenshot()),
      "Pause stops character animation",
    );
    assert.equal(await page.locator("#hp-text").innerText(), pausedHealth);
    await page.getByRole("button", { name: "Resume journey", exact: true }).click();
    await page.locator(".decision--choice").waitFor({ timeout: 30000 });
    const choiceHealth = await page.locator("#hp-text").innerText();
    await page.waitForTimeout(500);
    assert.equal(
      await page.locator("#hp-text").innerText(),
      choiceHealth,
      "Choosing a perk cannot cost health",
    );
    await page.screenshot({ path: join(evidence, "choice-390.png") });
    result.choices = [];
    for (let decision = 0; decision < 6; decision++) {
      const ids = await page
        .locator("[data-perk]")
        .evaluateAll((buttons) => buttons.map((button) => button.dataset.perk));
      const preference = [
        "blood",
        "bastion",
        "renewal",
        "storm",
        "edge",
        "heart",
        "tempo",
        "execution",
        "thorns",
      ];
      const id = ids.sort((a, b) => preference.indexOf(a) - preference.indexOf(b))[0];
      assert(id, "A real offered perk is available");
      await page.locator(`[data-perk="${id}"]`).click();
      result.choices.push(id);
      await page.waitForFunction(
        () => document.querySelector(".decision--choice,.decision--victory,.decision--defeat"),
        null,
        { timeout: 30000 },
      );
      if (await page.locator(".decision--victory,.decision--defeat").count()) break;
    }
    assert(
      await page.locator(".decision--victory").count(),
      "A real first chapter reaches its boss victory",
    );
    result.gold = await page.locator("#gold").innerText();
    assert(Number(result.gold) > 0, "Victories earn spendable gold");
    await page.screenshot({ path: join(evidence, "victory-390.png") });
    await ready();
    assert(
      await page.locator(".decision--victory").count(),
      "Full reload retains the terminal run",
    );
    assert.equal(
      await page.locator("#gold").innerText(),
      result.gold,
      "Full reload retains earned gold",
    );
    await page.getByRole("button", { name: "Return to the forge", exact: true }).click();
    assert(await page.locator(".forge").isVisible(), "Victory returns directly to the forge");
    await page.locator('[data-upgrade="blade"]').click();
    assert.equal(
      Number(await page.locator("#gold").innerText()),
      Number(result.gold) - 24,
      "The forge spends its exact displayed cost once",
    );
    await ready();
    assert.match(await page.locator('[data-upgrade="blade"]').innerText(), /Rank 1/);
    result.upgradeGold = await page.locator("#gold").innerText();

    const savedJourney = await page.evaluate(() => localStorage.getItem("save:ember-road:v1"));
    const delayedContext = await browser.newContext();
    await delayedContext.addInitScript((raw) => {
      window.__sdkWrites = [];
      window.__sdkStored = raw;
      const loading = new Promise((resolve) => {
        window.__finishSdkLoad = () => resolve(raw);
      });
      let reads = 0;
      window.ytgame = {
        IN_PLAYABLES_ENV: true,
        game: {
          firstFrameReady() {},
          gameReady() {},
          loadData: () => (reads++ === 0 ? loading : Promise.resolve(window.__sdkStored)),
          saveData: async (value) => {
            window.__sdkWrites.push(value);
            window.__sdkStored = value;
          },
        },
        system: {
          isAudioEnabled: () => true,
          onAudioEnabledChange() {},
          onPause: (callback) => {
            window.__sdkPause = callback;
          },
          onResume() {},
        },
      };
    }, savedJourney);
    const delayedPage = await delayedContext.newPage();
    await delayedPage.goto(url);
    await delayedPage.waitForFunction(() => typeof window.__sdkPause === "function");
    await delayedPage.locator("#settings-toggle").click();
    await delayedPage.evaluate(() => window.__sdkPause());
    await delayedPage.waitForTimeout(100);
    assert.equal(
      await delayedPage.evaluate(() => window.__sdkWrites.length),
      0,
      "Pause and settings during an unfinished SDK load cannot write a fresh game",
    );
    await delayedPage.evaluate(() => window.__finishSdkLoad());
    await delayedPage.waitForFunction(() =>
      document.getElementById("save-status").textContent.includes("saved"),
    );
    assert.equal(
      await delayedPage.locator("#gold").innerText(),
      result.upgradeGold,
      "Delayed SDK loading preserves earned gold",
    );
    assert.equal(
      await delayedPage.evaluate(() => JSON.parse(window.__sdkStored).state.meta.upgrades.blade),
      1,
    );
    result.delayedSdkLoadPreservesProgress = true;
    await delayedContext.close();

    const protectedContext = await browser.newContext();
    const invalid = '{"version":999,"state":{"gold":777}}';
    await protectedContext.addInitScript(
      (raw) => localStorage.setItem("save:ember-road:v1", raw),
      invalid,
    );
    const protectedPage = await protectedContext.newPage();
    await ready(protectedPage);
    assert.match(await protectedPage.locator("#save-status").innerText(), /untouched/);
    assert(
      await protectedPage.locator("#journey [data-save-warning]").isVisible(),
      "Protected-save warning is visible before starting",
    );
    await protectedPage.locator("#start").click();
    assert(
      await protectedPage.locator("#save-alert").isVisible(),
      "Protected-save warning remains visible on the road",
    );
    await protectedPage.locator("#pause").click();
    assert.equal(
      await protectedPage.evaluate(() => localStorage.getItem("save:ember-road:v1")),
      invalid,
      "An unsupported save remains byte-for-byte intact after actions",
    );
    await protectedContext.close();

    const unavailableContext = await browser.newContext();
    await unavailableContext.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("Storage is full", "QuotaExceededError");
      };
    });
    const unavailable = await unavailableContext.newPage();
    await ready(unavailable);
    await unavailable.waitForFunction(() =>
      document.getElementById("save-status").textContent.includes("unavailable"),
    );
    assert(
      await unavailable.locator("#journey [data-save-warning]").isVisible(),
      "Failed-save warning is visible in camp",
    );
    await unavailable.locator("#start").click();
    assert(
      await unavailable.locator("#save-alert").isVisible(),
      "Failed-save warning remains visible while playing",
    );
    await unavailable.waitForFunction(() =>
      document.getElementById("enemy-label").textContent.includes("ENCOUNTER"),
    );
    result.storageFailureKeepsPlayable = true;
    await unavailableContext.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    result.errors = errors;
    result.externalRequests = external;
    await writeFile(join(evidence, "acceptance.json"), `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      `EMBER ROAD WEB: pause, perk choice, boss victory, reload, exact upgrade spend, protected save, storage failure and three viewports passed. Evidence: ${evidence}`,
    );
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
