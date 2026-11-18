import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  heroStats,
  initialState,
  startEmberMarch,
  stepGame,
} from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

const key = "save:ember-road:v1";
test("Ember March real browser: build choices, saved live battle, result and permanent upgrade", {
  timeout: 240000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence = process.env.EMBER_MARCH_EVIDENCE_DIR || join(tmpdir(), "ember-march-evidence");
  await mkdir(evidence, { recursive: true });
  const server = createSiteServer(join(root, "games/ember-road/dist/web"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const errors = [],
    checks = [],
    picks = [],
    screenSizes = [
      [1440, 900],
      [1280, 720],
      [1920, 1080],
      [2560, 1080],
      [768, 1024],
      [390, 844],
      [844, 390],
    ];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const read = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  const waitSaved = (phase) =>
    page.waitForFunction(
      ({ key, phase }) =>
        JSON.parse(localStorage.getItem(key) || "null")?.state.phase.kind === phase,
      { key, phase },
    );
  async function shot(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(evidence, `${name}.png`) });
  }
  async function noScroll() {
    assert.deepEqual(
      await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ]),
      await page.evaluate(() => [innerWidth, innerHeight]),
    );
    assert.deepEqual(
      await page.locator(".main-content").evaluate((node) => [node.scrollLeft, node.scrollTop]),
      [0, 0],
    );
    const dialogs = await page.locator("dialog[open]").count();
    assert(dialogs <= 1, "Only the top overlay is visible");
  }
  try {
    await page.goto(origin);
    await page.waitForFunction(() => {
      const button = document.querySelector("[data-start-first-light]");
      return button && !button.disabled;
    });
    await page.getByRole("button", { name: "Return to camp", exact: true }).click();
    await page.getByRole("button", { name: "Ember March", exact: true }).click();
    await page.locator("[data-start-march]").waitFor();
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await noScroll();
    await shot("march-camp");
    await page.locator("[data-start-march]").click();
    await page.getByRole("button", { name: "Pause Ember March", exact: true }).click();
    await page.getByRole("button", { name: "Resume Ember March", exact: true }).waitFor();
    await waitSaved("battle");
    const pausedClock = await page.locator(".ember-march-ui").getAttribute("data-run-time");
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".ember-march-ui").getAttribute("data-run-time"), pausedClock);
    await shot("march-battle");
    await page.getByRole("button", { name: "Resume Ember March", exact: true }).click();
    await page.waitForFunction(
      (t) => Number(document.querySelector(".ember-march-ui").dataset.runTime) > Number(t),
      pausedClock,
    );
    const began = Date.now();
    let reloaded = false,
      refreshed = false,
      gift = false;
    const priority = [
      "cleave",
      "blood",
      "tempo",
      "chain",
      "storm",
      "pierce",
      "heart",
      "bastion",
      "edge",
      "ward",
      "execution",
      "interrupt",
      "thorns",
    ];
    for (let attempt = 0; attempt < 20; attempt++) {
      await page.waitForFunction(
        () =>
          document.querySelector("[data-march-perk]") ||
          document.querySelector("[data-march-gift]") ||
          document.querySelector("[data-march-finish]"),
        null,
        { timeout: 180000 },
      );
      if (await page.locator("[data-march-finish]").count()) break;
      if (await page.locator("[data-march-gift]").count()) {
        await waitSaved("march-gift");
        const offer = await read();
        const snapshot = structuredClone(offer.state);
        const clock = await page.locator(".ember-march-ui").getAttribute("data-run-time");
        await page.waitForTimeout(350);
        assert.equal(await page.locator(".ember-march-ui").getAttribute("data-run-time"), clock);
        assert.deepEqual((await read()).state, snapshot, "The encounter freezes the model");
        await shot("march-gift");
        await page.locator("[data-march-gift]").first().click();
        gift = true;
        continue;
      }
      await waitSaved("choice");
      let offer = await read();
      assert.equal(offer.version, 7);
      assert.equal(offer.state.run.context.kind, "ember-march");
      assert.equal(offer.state.phase.options.length, 3);
      assert.equal(
        offer.state.phase.resume.battle.kind,
        "battle",
        "Choices retain the actual battle even if an area attack cleared its current enemies",
      );
      console.log(
        JSON.stringify({ level: offer.state.run.level, kills: offer.state.run.context.kills }),
      );
      const frozen = structuredClone(offer.state);
      assert.equal(
        await page
          .locator(".march-stats dd")
          .first()
          .evaluate((el) => getComputedStyle(el).animationPlayState),
        "paused",
        "Combat HUD motion is suspended with the live battle",
      );
      const liveClock = await page.locator(".ember-march-ui").getAttribute("data-run-time");
      const frame = await page.locator("#world").evaluate((canvas) => canvas.toDataURL());
      await page.waitForTimeout(250);
      assert.equal(await page.locator(".ember-march-ui").getAttribute("data-run-time"), liveClock);
      assert.equal(
        await page.locator("#world").evaluate((canvas) => canvas.toDataURL()),
        frame,
        "Combat canvas stays frozen during the offer",
      );
      assert.deepEqual((await read()).state, frozen, "Choice doesn't advance battle, XP or timers");
      if (!refreshed) {
        await page.locator("[data-march-reroll]").click();
        await page.waitForFunction(
          ({ key }) => JSON.parse(localStorage.getItem(key)).state.phase.rerolls === 0,
          { key, id: offer.state.phase.offerId },
        );
        const rerolled = await read();
        assert.deepEqual(rerolled.state.phase.resume, offer.state.phase.resume);
        assert.equal(rerolled.state.phase.rerolls, 0);
        assert(
          rerolled.state.phase.options.every((id) => !offer.state.phase.options.includes(id)),
          "Reroll replaces every old option",
        );
        refreshed = true;
        offer = rerolled;
      }
      if (!reloaded) {
        await shot("march-level-up");
        await page.reload();
        await page.locator("[data-march-perk]").first().waitFor();
        const restored = await read();
        assert.deepEqual(
          restored.state,
          offer.state,
          "Reload restores the exact interrupted fight and offer",
        );
        offer = restored;
        for (const [width, height] of screenSizes) {
          await page.setViewportSize({ width, height });
          await noScroll();
          const row = page.locator("[data-march-perk]").first();
          assert(await row.isVisible());
          assert(
            await page
              .locator("dialog[open]")
              .evaluate((node) => node.contains(document.activeElement)),
            "Choice owns keyboard focus",
          );
          await shot(`march-choice-${width}x${height}`);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator("[data-march-inspect]").click();
        await page.getByRole("dialog", { name: "Current build", exact: true }).waitFor();
        assert.equal(await page.locator("dialog[open]").count(), 1);
        assert.deepEqual((await read()).state, offer.state);
        await shot("march-inspect-build");
        await page.keyboard.press("Escape");
        await page.getByRole("dialog", { name: "Choose a new power", exact: true }).waitFor();
        assert.deepEqual((await read()).state, offer.state);
        reloaded = true;
      }
      const pick = priority.find((id) => offer.state.phase.options.includes(id));
      assert(pick);
      picks.push({ level: offer.state.run.level, id: pick, kills: offer.state.run.context.kills });
      await page.locator(`[data-march-perk="${pick}"]`).click();
      await page.waitForFunction(
        ({ key, id }) => JSON.parse(localStorage.getItem(key)).state.phase.offerId !== id,
        { key, id: offer.state.phase.offerId },
      );
      assert.equal((await read()).state.run.perks[pick], (offer.state.run.perks[pick] || 0) + 1);
      assert(
        await page.locator(`[data-march-power="${pick}"]`).isVisible(),
        "Chosen power remains visible",
      );
      if (picks.length === 1) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator(`[data-march-power="${pick}"]`).click();
        await page.getByRole("dialog", { name: "Current build", exact: true }).waitFor();
        assert.equal(await page.locator("dialog[open]").count(), 1);
        assert((await page.locator(".march-build-powers > div").count()) > 0);
        await page.keyboard.press("Escape");
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    }
    await page.locator("[data-march-finish]").waitFor();
    await waitSaved("victory");
    const won = await read();
    assert.equal(won.state.run.context.kills, 54);
    assert.equal(won.state.run.context.earnedGold, 90);
    assert.equal(won.state.meta.gold, 90);
    assert.equal(picks.length, 10);
    assert(gift && reloaded && refreshed);
    assert.equal(won.state.meta.unlockedChapter, 1);
    assert.equal(won.state.meta.firstLight.cleared, false);
    assert.deepEqual(won.state.meta.gear.owned, []);
    assert.equal(won.state.meta.emberMarch.cleared, true);
    await noScroll();
    await shot("march-victory");
    await page.reload();
    await page.locator("[data-march-finish]").waitFor();
    assert.equal((await read()).state.meta.gold, 90, "Reload doesn't repay result");
    await page.locator("[data-march-finish]").click();
    await page.getByRole("dialog", { name: "Equipment & forge", exact: true }).waitFor();
    await page.locator('[data-march-upgrade="blade"]').click();
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.meta.upgrades.blade === 1,
      key,
    );
    const improved = await read();
    assert.equal(improved.state.meta.gold, 66);
    await shot("march-permanent-upgrade");
    await page.keyboard.press("Escape");
    await page.reload();
    await page.locator("[data-start-march]").waitFor();
    assert.equal((await read()).state.meta.upgrades.blade, 1);
    assert.equal((await read()).state.meta.gold, 66);
    await page.locator("[data-start-march]").click();
    await page.getByRole("button", { name: "Pause Ember March", exact: true }).click();
    await waitSaved("battle");
    assert.equal(
      await page
        .locator(".march-ledger .march-stats > div")
        .filter({ hasText: "Damage" })
        .locator("dd")
        .innerText(),
      String(Number(heroStats(improved.state).damage.toFixed(1))),
    );
    const restarted = (await read()).state;
    assert(
      restarted.run.context.kills < 6,
      "A learned automatic skill can defeat the opening pair before pause",
    );
    assert.equal(restarted.run.level, 1);
    assert.deepEqual(restarted.run.perks, {});
    assert.notEqual(restarted.run.context.runId, won.state.run.context.runId);
    assert.equal(restarted.meta.gold, 66 + restarted.run.context.kills);
    checks.push(
      "Fresh automatic run completed with10 real level choices, one gift, one free reroll, exact suspended-fight reload and no early company/pet grants",
    );
    checks.push(
      "90 earned gold persisted once; a24-gold permanentblade upgrade reduced wallet to66 and improved next-run damage",
    );
    checks.push("Seven viewport sizes retain the choice and focus without page or scene scrolling");
    assert.deepEqual(errors, []);
    await writeFile(
      join(evidence, "march-browser-result.json"),
      JSON.stringify(
        { checks, picks, elapsedMs: Date.now() - began, final: improved, errors },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});

test("Ember March layout preserves choices and build inspection", { timeout: 30000 }, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const server = createSiteServer(join(root, "games/ember-road/dist/web"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const state = initialState(42);
    state.meta.experience.introSeen = true;
    startEmberMarch(state);
    for (let i = 0; i < 10000 && state.phase.kind !== "choice"; i++) stepGame(state, 1 / 60);
    assert.equal(state.phase.kind, "choice");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
      key,
      raw: JSON.stringify({ version: 7, savedAt: Date.now(), state }),
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/?march=1`);
    const decision = page.getByRole("dialog", { name: "Choose a new power", exact: true });
    await decision.waitFor();
    for (const [width, height] of [
      [1440, 900],
      [1280, 720],
      [1920, 1080],
      [2560, 1080],
      [768, 1024],
      [390, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      assert(
        await decision.evaluate((d) => d.scrollWidth <= d.clientWidth + 1),
        `${width}x${height}: no horizontal modal scrolling`,
      );
      assert.deepEqual(
        await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
        ]),
        [width, height],
      );
      for (const b of await decision
        .locator("[data-march-perk], [data-march-inspect], [data-march-skip], [data-march-reroll]")
        .all()) {
        const bounds = await b.boundingBox();
        const frame = await decision.boundingBox();
        assert(
          bounds.x >= frame.x && bounds.x + bounds.width <= frame.x + frame.width + 1,
          "Choice controls fit horizontally",
        );
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator("[data-march-inspect]").click();
    await page.getByRole("dialog", { name: "Current build", exact: true }).waitFor();
    assert.equal(await page.locator("dialog[open]").count(), 1);
    assert.equal(
      await page
        .locator(".march-build-dialog .march-stats dd")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    await page.keyboard.press("Escape");
    await decision.waitFor();
    assert.deepEqual(
      (await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).state, key)).phase,
      state.phase,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator("[data-march-perk]")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
