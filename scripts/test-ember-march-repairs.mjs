import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as M from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

test("March reviewed save, retreat and equipment boundaries", { timeout: 45000 }, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const server = createSiteServer(join(root, "games/ember-road/dist/web"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const key = "save:ember-road:v1";
  const errors = [];
  async function open(state, freeze = false, route = "") {
    assert(M.validV7State(state));
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(
      ({ key, raw, freeze }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
        // Render UI frames while holding both simulation-clock inputs at zero.
        if (freeze) {
          const raf = window.requestAnimationFrame.bind(window);
          Object.defineProperty(performance, "now", { value: () => 0, configurable: true });
          window.requestAnimationFrame = (callback) => raf(() => callback(0));
        }
      },
      { key, raw: JSON.stringify({ version: 7, savedAt: Date.now(), state }), freeze },
    );
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/${route}`);
    if (route) {
      await page.locator(route === "?campaign=1" ? ".living-camp" : ".first-light-ui").waitFor();
      assert.equal(await page.locator(".is-ember-march").count(), 0);
      return { context, page };
    }
    await page.waitForFunction(
      () => document.querySelector(".march-profile")?.disabled === false,
      null,
      { polling: 50 },
    );
    return { context, page };
  }
  const read = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).state, key);
  try {
    const manual = M.initialState(927113);
    manual.meta.experience.introSeen = true;
    manual.meta.unlockedChapter = 3;
    manual.meta.upgrades.blade = 2;
    manual.meta.progression.renown = 54;
    manual.adventures.discoveries.whirlwind = true;
    manual.adventures.discoveries.oaths = 2;
    M.startEmberMarch(manual, 3);
    assert.equal(
      M.useSkill(structuredClone(manual)).filter((event) => event.type === "kill").length,
      2,
      "Replay fixture has a lethal manual cast",
    );
    const q = await open(manual, true);
    await q.page.keyboard.press("q");
    await q.page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.run.context.kills === 2,
      key,
      { polling: 50 },
    );
    const cast = await read(q.page);
    assert.equal(cast.run.time, 0);
    assert(
      M.validV7State(cast),
      "The actual keyboard handler immediately persists a valid checkpoint",
    );
    await q.page.reload();
    await q.page.waitForFunction(
      () => document.querySelector(".march-profile")?.disabled === false,
      null,
      { polling: 50 },
    );
    assert.deepEqual(await read(q.page), cast);
    assert.equal(await q.page.locator(".march-save-warning").count(), 0);
    await q.context.close();

    const retreat = M.initialState(42);
    retreat.meta.experience.introSeen = true;
    retreat.meta.unlockedChapter = 3;
    M.startEmberMarch(retreat, 3);
    const r = await open(retreat);
    await r.page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.run.context.kills > 0,
      key,
    );
    await r.page.getByRole("button", { name: "Inspect Rook’s equipment", exact: true }).click();
    const forge = r.page.getByRole("dialog", { name: "Equipment & forge", exact: true });
    await forge.waitFor();
    const clock = await r.page.locator(".ember-march-ui").getAttribute("data-run-time");
    for (const cancel of ["button", "escape"]) {
      await forge.locator("[data-march-retreat]").click();
      const dialog = r.page.getByRole("dialog", { name: "Return to camp?", exact: true });
      await dialog.waitFor();
      if (cancel === "button")
        await dialog.getByRole("button", { name: "Keep this journey", exact: true }).click();
      else await r.page.keyboard.press("Escape");
      await forge.waitFor();
      await r.page.waitForTimeout(200);
      assert.equal(await r.page.locator("dialog[open]").count(), 1);
      assert.equal(await r.page.locator(".ember-march-ui").getAttribute("data-run-time"), clock);
    }
    await r.page.keyboard.press("Escape");
    await r.page.getByRole("button", { name: "Pause Ember March", exact: true }).click();
    const before = await read(r.page);
    await r.page.locator(".march-paused-sign [data-march-retreat]").click();
    const confirm = r.page.getByRole("dialog", { name: "Return to camp?", exact: true });
    await confirm.waitFor();
    assert.equal(await r.page.locator("dialog[open]").count(), 1);
    await confirm.getByRole("button", { name: "Return to camp", exact: true }).click();
    await r.page.locator("[data-start-march]").waitFor();
    const back = await read(r.page);
    assert.equal(back.run.chapter, 3);
    assert.equal(back.meta.gold, before.meta.gold);
    assert.equal(back.meta.emberMarch.selected, true);
    assert.deepEqual(back.run.perks, {});
    await r.page.reload();
    await r.page.locator("[data-start-march]").waitFor();
    await r.page.getByRole("button", { name: "Other roads", exact: true }).click();
    await r.page.locator(".living-camp").waitFor({ state: "visible" });
    assert.equal((await read(r.page)).meta.emberMarch.selected, false);
    await r.context.close();

    const gear = M.initialState(17);
    gear.meta.experience.introSeen = true;
    gear.meta.unlockedChapter = 2;
    gear.meta.gear = { owned: ["sunfang"], equipped: "sunfang" };
    gear.meta.firstLight.cleared = true;
    gear.meta.loadout.weapon = "greatsword";
    M.selectMarchCamp(gear, true);
    const g = await open(gear);
    await g.page.getByRole("button", { name: "Inspect Rook’s equipment", exact: true }).click();
    const equip = g.page.locator(".march-owned-blade button");
    assert.equal(await equip.innerText(), "Equip");
    assert(await equip.isEnabled());
    await equip.click();
    await g.page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.meta.loadout.weapon === "sword",
      key,
    );
    assert.equal((await read(g.page)).meta.gear.equipped, "sunfang");
    await g.context.close();
    for (const route of ["?campaign=1", "?first-light=1"]) {
      const explicit = await open(gear, false, route);
      await explicit.context.close();
    }

    const result = M.initialState(42);
    let laterOffer;
    result.meta.experience.introSeen = true;
    M.startEmberMarch(result);
    for (let i = 0; i < 40000 && !["victory", "defeat"].includes(result.phase.kind); i++) {
      const phase = result.phase;
      if (!laterOffer && phase.kind === "choice" && result.run.level === 4)
        laterOffer = structuredClone(result);
      if (phase.kind === "choice")
        M.choosePerk(
          result,
          ["blood", "heart", "bastion", "edge", "tempo"].find((id) => phase.options.includes(id)) ??
            phase.options[0],
          phase.offerId,
        );
      else if (phase.kind === "march-gift")
        M.chooseMarchGift(result, phase.options[0], phase.offerId);
      else M.stepGame(result, 1 / 60);
    }
    assert.equal(result.phase.kind, "victory");
    assert(laterOffer);
    const reloaded = await open(laterOffer, true);
    await reloaded.page.reload();
    await reloaded.page.locator(".march-choice-row").first().waitFor();
    const powers = reloaded.page.locator(".march-power, .march-auto-skill");
    assert((await powers.count()) >= 2);
    for (const power of await powers.all())
      assert.equal(
        await power.evaluate((el) => getComputedStyle(el).opacity),
        "1",
        "Earned powers stay visible on a suspended checkpoint reload",
      );
    assert.equal(
      await reloaded.page
        .locator(".march-xp progress")
        .evaluate((el) => getComputedStyle(el, "::-webkit-progress-value").transitionDuration),
      "0s",
    );
    assert.equal(
      await reloaded.page
        .locator(".march-choice-row")
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState),
      "running",
    );
    await reloaded.context.close();
    const won = await open(result, true);
    await won.page.getByRole("button", { name: "Inspect equipment", exact: true }).click();
    const resultForge = won.page.getByRole("dialog", { name: "Equipment & forge", exact: true });
    await resultForge.locator("[data-march-retreat]").click();
    await won.page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.phase.kind === "camp",
      key,
    );
    assert.equal(await resultForge.count(), 1);
    assert.equal(
      await won.page.getByRole("dialog", { name: "Return to camp?", exact: true }).count(),
      0,
    );
    assert.equal((await read(won.page)).meta.gold, 90);
    await won.context.close();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
