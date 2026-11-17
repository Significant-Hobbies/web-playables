import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  initialState,
  startFirstLight,
  stepGame,
  validV6State,
} from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

const key = "save:ember-road:v1";
test("First Light real browser: passive combat, visible permanent loot, reloads and layout", {
  timeout: 120000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence =
    process.env.EMBER_FIRST_LIGHT_EVIDENCE_DIR || join(tmpdir(), "ember-first-light-evidence");
  await mkdir(evidence, { recursive: true });
  const server = createSiteServer(join(root, "games/ember-road/dist/web"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const errors = [],
    checks = [];
  async function make(raw) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await c.addInitScript(
      ({ key, raw }) => {
        if (raw && !localStorage.getItem(key)) localStorage.setItem(key, raw);
        window.__firstLightDraws = { ordinary: 0, sunfang: 0, companion: 0, pet: 0 };
        const draw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
          if (this.canvas.id === "world") {
            const src = image.src || "",
              d = window.__firstLightDraws;
            if (src.includes("toon-knight-sunfang")) d.sunfang++;
            else if (src.includes("toon-knight-")) d.ordinary++;
            if (src.includes("toon-pets-")) d.pet++;
            if (src.includes("toon-party-") && args[1] < image.naturalHeight * 0.7) d.companion++;
          }
          return draw.call(this, image, ...args);
        };
      },
      { key, raw },
    );
    const page = await c.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin);
    await page.locator(".first-light-ui").waitFor();
    return { c, page };
  }
  const stored = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  async function noScroll(page) {
    assert.deepEqual(
      await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ]),
      await page.evaluate(() => [innerWidth, innerHeight]),
    );
  }
  async function screenshot(page, name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await page.screenshot({ path: join(evidence, `${name}.png`) });
  }
  try {
    const { c, page } = await make();
    await page.getByRole("button", { name: /Take the first step/ }).waitFor({ state: "visible" });
    await noScroll(page);
    await screenshot(page, "welcome");
    assert.equal(
      await page.locator("dialog[open]").count(),
      0,
      "Fresh entry has one clear action and no stacked onboarding",
    );
    await page.getByRole("button", { name: /Take the first step/ }).click();
    await page.getByRole("button", { name: "Pause First Light", exact: true }).click();
    const paused = (await stored(page)).state.run.time;
    await page.waitForTimeout(350);
    assert.equal((await stored(page)).state.run.time, paused, "Pause actually stops the model");
    await page.getByRole("button", { name: "Resume First Light", exact: true }).click();
    await page
      .getByRole("button", { name: "Open the woodland cache", exact: true })
      .waitFor({ timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector("[data-open-cache]")?.disabled);
    const loot = await stored(page);
    assert.equal(loot.version, 6);
    assert.equal(loot.state.phase.kind, "loot");
    assert.deepEqual(loot.state.meta.gear, { owned: ["sunfang"], equipped: null });
    assert(loot.state.run.time < 10, "Reward arrives without waiting through several empty fights");
    await screenshot(page, "cache");
    await page.reload();
    await page.getByRole("button", { name: "Open the woodland cache", exact: true }).click();
    await page.locator("[data-equip-sunfang]").waitFor();
    assert.match(await page.locator(".fl-upgrade").innerText(), /23\s*35/);
    await screenshot(page, "sunfang-discovered");
    await page.locator("[data-equip-sunfang]").click();
    await page.waitForFunction(() => window.__firstLightDraws.sunfang > 0);
    assert.match(await page.locator(".fl-damage").innerText(), /35/);
    await page.getByRole("button", { name: "Inspect Rook’s equipment", exact: true }).click();
    const wardrobe = page.getByRole("dialog", { name: "Rook’s equipment", exact: true });
    await wardrobe.waitFor();
    assert.equal(await page.locator("dialog[open]").count(), 1);
    assert(await wardrobe.evaluate((d) => d.contains(document.activeElement)));
    assert.match(
      await wardrobe.locator(".fl-standing-rook").getAttribute("style"),
      /toon-knight-sunfang/,
    );
    assert(
      await wardrobe
        .getByRole("button", { name: "Equip the road blade", exact: true })
        .isDisabled(),
      "Battle inspection cannot silently swap live attack stats",
    );
    await screenshot(page, "equipped");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 0);
    const before = await stored(page);
    await page.reload();
    await page.waitForFunction(() => window.__firstLightDraws.sunfang > 0);
    assert.equal((await stored(page)).state.meta.gear.equipped, "sunfang");
    await page.locator(".fl-victory").waitFor({ timeout: 60000 });
    const finished = await stored(page);
    assert.equal(finished.state.run.cleared, 5);
    assert.equal(finished.state.meta.firstLight.cleared, true);
    assert.equal(finished.state.meta.gold, 0);
    assert.equal(finished.state.meta.progression.renown, 0);
    const draws = await page.evaluate(() => window.__firstLightDraws);
    assert(draws.sunfang > 0);
    assert.equal(draws.companion, 0);
    assert.equal(draws.pet, 0);
    assert(before.state.run.cleared < finished.state.run.cleared);
    await noScroll(page);
    await screenshot(page, "complete");
    checks.push(
      "Fresh entry, actual pause/resume, passive five-fight completion, reward under ten seconds, permanent ownership and equipped art survive reload",
    );
    await page.getByRole("button", { name: /Return to camp/ }).click();
    await page.locator(".living-camp").waitFor();
    assert.match(
      await page.locator(".camp-rook").evaluate((e) => getComputedStyle(e).backgroundImage),
      /toon-knight-sunfang/,
    );
    assert.equal((await stored(page)).state.meta.gear.equipped, "sunfang");
    checks.push(
      "Sunfang carries into the original campaign camp without advancing its quests or economy",
    );
    await c.close();

    const state = initialState(73);
    startFirstLight(state);
    for (let i = 0; i < 1200 && state.phase.kind !== "loot"; i++) stepGame(state, 1 / 60);
    assert(validV6State(state));
    const { c: layoutContext, page: layout } = await make(
      JSON.stringify({ version: 6, savedAt: Date.now(), state }),
    );
    for (const [width, height] of [
      [1440, 900],
      [1280, 720],
      [1000, 600],
      [2560, 1080],
      [768, 1024],
      [390, 844],
      [844, 390],
    ]) {
      await layout.setViewportSize({ width, height });
      await layout.reload();
      await layout.getByRole("button", { name: "Open the woodland cache", exact: true }).click();
      await layout.locator("[data-equip-sunfang]").waitFor();
      await noScroll(layout);
      const action = layout.locator("[data-equip-sunfang]");
      assert(
        await action.evaluate((b) => {
          const r = b.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= innerWidth + 1 &&
            r.bottom <= innerHeight + 1 &&
            b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
          );
        }),
        `Equip is reachable at ${width}x${height}`,
      );
      await screenshot(layout, `loot-${width}x${height}`);
      await layout.getByRole("button", { name: "Inspect Rook’s equipment", exact: true }).click();
      const d = layout.getByRole("dialog", { name: "Rook’s equipment", exact: true });
      await d.waitFor();
      await noScroll(layout);
      await d.evaluate((d) => {
        d.scrollTop = d.scrollHeight;
      });
      assert(
        await d.locator(".dialog-heading button").evaluate((b) => {
          const r = b.getBoundingClientRect();
          return (
            r.top >= 0 &&
            r.bottom <= innerHeight &&
            b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
          );
        }),
        `Close remains reachable at ${width}x${height}`,
      );
      await screenshot(layout, `wardrobe-${width}x${height}`);
      await layout.keyboard.press("Escape");
    }
    await layout.emulateMedia({ reducedMotion: "reduce" });
    await layout.getByRole("button", { name: "Inspect Rook’s equipment", exact: true }).click();
    assert.equal(
      await layout
        .locator(".fl-wardrobe .fl-standing-rook")
        .evaluate((e) => getComputedStyle(e).animationPlayState),
      "paused",
    );
    checks.push(
      "Loot and equipment work at seven viewports; page stays fullscreen, modal close stays reachable, reduced motion stops the hero animation",
    );
    await layoutContext.close();
    assert.deepEqual(errors, []);
    await writeFile(
      join(evidence, "result.json"),
      JSON.stringify({ status: "passed", checks, pageErrors: errors }, null, 2),
    );
    console.log(JSON.stringify({ status: "passed", checks, pageErrors: errors }, null, 2));
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
