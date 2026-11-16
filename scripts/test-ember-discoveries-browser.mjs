import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { initialState, startRun, validState } from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

test("Ember discoveries guide real routes without granting early unlocks", {
  timeout: 90000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence =
    process.env.EMBER_DISCOVERY_EVIDENCE_DIR || join(tmpdir(), "ember-discovery-evidence");
  await mkdir(evidence, { recursive: true });
  const server = createSiteServer(join(root, "games/ember-road/dist/web"));
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
  const errors = [],
    results = [];
  function fresh(chapter = 1) {
    const state = initialState(927113);
    state.meta.unlockedChapter = chapter;
    state.run.chapter = chapter;
    state.quests.story.completed = Array.from({ length: chapter - 1 }, (_, i) => i + 1);
    state.meta.experience.introSeen = true;
    for (const lesson in state.meta.experience.lessons)
      state.meta.experience.lessons[lesson] = true;
    assert(validState(state));
    return state;
  }
  async function session(state, width, height) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(
      (raw) => {
        if (!localStorage.getItem("discovery-fixture-seeded")) {
          localStorage.setItem("save:ember-road:v1", raw);
          localStorage.setItem("discovery-fixture-seeded", "true");
        }
      },
      JSON.stringify({ version: 5, savedAt: Date.now(), state }),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin);
    await page.getByRole("button", { name: "Discoveries", exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    return { context, page };
  }
  const read = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem("save:ember-road:v1")).state);
  try {
    for (const [width, height] of [
      [1440, 900],
      [768, 1024],
      [390, 844],
    ]) {
      const { context, page } = await session(fresh(), width, height);
      await page.getByRole("button", { name: "Discoveries", exact: true }).click();
      await page.getByRole("region", { name: "Discoveries of the old road" }).waitFor();
      assert.equal(await page.getByRole("button", { name: /^Cinder/ }).count(), 0);
      await page.getByRole("button", { name: /^Mira/ }).click();
      assert(await page.getByRole("button", { name: "Open chapter 2 first" }).isDisabled());
      assert.equal((await read(page)).adventures.discoveries.mira, false);
      await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete));
      await page.screenshot({ path: join(evidence, `discovery-${width}.png`) });
      const dialog = page.locator(".collection-journey[open]"),
        rect = await dialog.boundingBox();
      assert(
        rect.x >= -1 &&
          rect.y >= -1 &&
          rect.x + rect.width <= width + 1 &&
          rect.y + rect.height <= height + 1,
      );
      assert(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1));
      assert(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      );
      results.push({ width, height, noViewportScroll: true, chapterGate: true });
      await context.close();
    }
    {
      const state = fresh(3),
        { context, page } = await session(state, 1440, 900);
      await page.getByRole("button", { name: "Discoveries", exact: true }).click();
      assert.equal(await page.locator(".valley-beacons .is-lit").count(), 2);
      await page.getByRole("button", { name: /^Cinder/ }).click();
      await page.screenshot({ path: join(evidence, "cinder-trail.png") });
      await page.getByRole("button", { name: "Plan this expedition", exact: true }).click();
      await page.locator("#depart").waitFor();
      await page.waitForFunction(
        () => getComputedStyle(document.querySelector("#depart").closest("dialog")).opacity === "1",
      );
      assert((await page.locator("#depart").textContent()).includes("Begin chapter 3"));
      assert.equal(await page.locator(".game-dialog[open]").count(), 1);
      assert(
        (await page.locator(".departure-discoveries").textContent()).includes("after fight 9"),
      );
      assert.equal((await read(page)).adventures.discoveries.cinder, false);
      await page.screenshot({ path: join(evidence, "discovery-departure.png") });
      await page.getByRole("button", { name: "Back", exact: true }).click();
      assert.equal(await page.locator(".game-dialog[open]").count(), 0);
      await context.close();
    }
    {
      const state = fresh(2);
      assert(startRun(state, 2));
      state.run.cleared = 3;
      state.phase = { kind: "route", at: 3 };
      assert(validState(state));
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(
        (raw) => {
          if (!localStorage.getItem("discovery-fixture-seeded")) {
            localStorage.setItem("save:ember-road:v1", raw);
            localStorage.setItem("discovery-fixture-seeded", "true");
          }
        },
        JSON.stringify({ version: 5, savedAt: Date.now(), state }),
      );
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin);
      await page.locator('[data-route="rescue"]').click();
      await page.getByRole("dialog", { name: "Mira joins the company." }).waitFor();
      await page.getByRole("button", { name: "Continue the journey", exact: true }).click();
      await page.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem("save:ember-road:v1")).state.adventures.discoveries.mira,
      );
      await page.reload();
      assert.equal((await read(page)).adventures.discoveries.mira, true);
      assert(validState(await read(page)));
      await context.close();
    }
    assert.deepEqual(errors, []);
    await writeFile(
      join(evidence, "acceptance.json"),
      JSON.stringify(
        {
          results,
          realRescueRetainedAfterReload: true,
          noEarlyUnlocks: true,
          planningKeepsOneOverlay: true,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
