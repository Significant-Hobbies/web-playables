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
    ]) {
      await page.setViewportSize(viewport);
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `No overflow at ${viewport.width}`,
      );
      await page.screenshot({ path: join(evidence, `camp-${viewport.width}.png`), fullPage: true });
    }
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
    await page.screenshot({ path: join(evidence, "choice-390.png"), fullPage: true });
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
    await page.screenshot({ path: join(evidence, "victory-390.png"), fullPage: true });
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
    await page.locator('[data-upgrade="blade"]').click();
    assert.equal(
      Number(await page.locator("#gold").innerText()),
      Number(result.gold) - 24,
      "The forge spends its exact displayed cost once",
    );
    await ready();
    assert.match(await page.locator('[data-upgrade="blade"]').innerText(), /Rank 1/);
    result.upgradeGold = await page.locator("#gold").innerText();

    const protectedContext = await browser.newContext();
    const invalid = '{"version":999,"state":{"gold":777}}';
    await protectedContext.addInitScript(
      (raw) => localStorage.setItem("save:ember-road:v1", raw),
      invalid,
    );
    const protectedPage = await protectedContext.newPage();
    await ready(protectedPage);
    assert.match(await protectedPage.locator("#save-status").innerText(), /untouched/);
    await protectedPage.locator("#start").click();
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
    await unavailable.locator("#start").click();
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
