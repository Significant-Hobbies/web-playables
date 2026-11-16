import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  beginBattle,
  heroStats,
  initialState,
  startRun,
  validState,
} from "../games/ember-road/src/model.ts";
import { questBoard } from "../games/ember-road/src/quests.ts";
import { createSiteServer } from "./serve-site.mjs";

const storageKey = "save:ember-road:v1";
test("Ember Road Fleet camp, grouped combat, powers and durable saves", {
  timeout: 120000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence = process.env.EMBER_ROAD_EVIDENCE_DIR || join(tmpdir(), "ember-road-web-evidence");
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
    external = [],
    result = {};
  async function context(raw) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    if (raw)
      await c.addInitScript(
        ({ key, raw, expectedOrigin }) => {
          if (location.origin !== expectedOrigin) return;
          if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
        },
        { key: storageKey, raw, expectedOrigin: origin },
      );
    await c.addInitScript(() => {
      window.__draws = {
        hero: 0,
        foe: 0,
        companion: 0,
        pet: 0,
        archer: 0,
        arrows: 0,
        group: false,
        backdrops: 0,
      };
      let frame = {};
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      const move = CanvasRenderingContext2D.prototype.moveTo;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.id === "world") {
          if (frame.hero && frame.companion && frame.pet && frame.foe && frame.archer)
            window.__draws.group = true;
          frame = {};
        }
        return clear.apply(this, args);
      };
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        if (this.canvas.id === "world") {
          let key;
          if (/\/toon-roads-/.test(image.src || "")) window.__draws.backdrops++;
          if (/\/toon-knight-/.test(image.src || "")) key = "hero";
          if (/\/toon-enemies-/.test(image.src || "")) key = "foe";
          if (/\/toon-pets-/.test(image.src || "")) key = "pet";
          if (/\/toon-(party|walk)-/.test(image.src || ""))
            key = args[1] > image.naturalHeight * 0.7 ? "archer" : "companion";
          if (key) {
            window.__draws[key]++;
            frame[key] = true;
          }
        }
        return draw.call(this, image, ...args);
      };
      CanvasRenderingContext2D.prototype.moveTo = function (x, y) {
        if (this.canvas.id === "world" && x === -22 && y === 0) window.__draws.arrows++;
        return move.call(this, x, y);
      };
    });
    c.on("page", (p) => {
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("request", (r) => {
        if (!r.url().startsWith(origin) && !/^(data|blob):/.test(r.url())) external.push(r.url());
      });
    });
    return c;
  }
  async function ready(page) {
    await page.goto(origin);
    await page.waitForFunction(
      () => !document.getElementById("save-status")?.textContent.includes("Loading"),
    );
  }
  async function stored(page) {
    return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  }
  async function fixture(state) {
    assert(validState(state), "Fixture uses the real state validator");
    return JSON.stringify({ version: 3, savedAt: Date.now(), state });
  }
  async function assertCampActors(page) {
    const actors = await page.locator(".chapter-hub .toon-actor").evaluateAll(async (nodes) =>
      Promise.all(
        nodes.map(async (el) => {
          const style = getComputedStyle(el),
            rect = el.getBoundingClientRect();
          const match = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
          const image = new Image();
          image.src = match?.[1] || "";
          await image.decode();
          return {
            visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden",
            loaded: image.naturalWidth > 0,
          };
        }),
      ),
    );
    assert.equal(actors.length, 3, "Camp shows exactly Rook, companion and pet");
    assert(
      actors.every((a) => a.visible && a.loaded),
      "Visible camp actors use decoded real sprite assets",
    );
    assert.equal(
      await page.locator(".chapter-hub .enemy").count(),
      0,
      "Camp has no visible phantom foes",
    );
  }
  async function openCollection(page, label) {
    if (await page.locator(".collection-dialog[open]").count()) await page.keyboard.press("Escape");
    await page
      .locator(".game-dock")
      .getByRole("button", { name: label === "Companions" ? "Company" : label, exact: true })
      .click();
  }
  async function depart(page) {
    await page.locator("#start").click();
    await page.locator("#depart").click();
  }
  try {
    const c = await context();
    const page = await c.newPage();
    await ready(page);
    await page.waitForFunction(
      () =>
        document.querySelector(".island-art")?.complete &&
        document.querySelector(".island-art").naturalWidth > 0,
    );
    await assertCampActors(page);
    assert.equal(
      (await page.locator('[data-slot="button"]').count()) > 10,
      true,
      "Actual Fleet controls render",
    );
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
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
        `No document overflow at ${viewport.width}`,
      );
      assert(
        await page.locator("#start").evaluate((button) => {
          const r = button.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
        }),
        `Begin action is visible without scrolling at ${viewport.width}x${viewport.height}`,
      );
      await page.screenshot({ path: join(evidence, `camp-${viewport.width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openCollection(page, "Pets");
    assert(
      await page.locator('[data-equip="pet:hound"]').isDisabled(),
      "Chapter-locked pets cannot equip",
    );
    await page.keyboard.press("Escape");
    await depart(page);
    await page.waitForFunction(() => window.__draws.backdrops > 0);
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert(
        await page.locator("#world").evaluate((canvas) => {
          const row = canvas
            .getContext("2d")
            .getImageData(0, canvas.height - 1, canvas.width, 1).data;
          for (let i = 3; i < row.length; i += 4) if (row[i] !== 255) return false;
          return true;
        }),
        `Actual atlas covers the bottom pixel row at ${viewport.width}x${viewport.height}`,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#pause").click();
    await page.getByRole("dialog", { name: "The road can wait.", exact: true }).waitFor();
    const paused = await page.locator("#world").evaluate((c) => c.toDataURL());
    await page.waitForTimeout(400);
    assert.equal(
      paused,
      await page.locator("#world").evaluate((c) => c.toDataURL()),
      "Pause freezes the actual canvas pixels, independently of the composited dialog",
    );
    await page.screenshot({ path: join(evidence, "paused-1440.png") });
    await page.getByRole("button", { name: "Resume journey", exact: true }).click();
    await page.waitForFunction(() => window.__draws.group && window.__draws.arrows > 0, null, {
      timeout: 10000,
    });
    result.groupedFrontRearCompanionPetAndArrows = await page.evaluate(() => window.__draws);
    await page.screenshot({ path: join(evidence, "battle-1440.png") });
    await page.locator(".decision--choice[open]").waitFor({ timeout: 30000 });
    const beforeSkip = await stored(page);
    const options = await page
      .locator("[data-perk]")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.perk));
    await page.locator(".choice-tools").getByRole("button", { name: "Current stats" }).click();
    const statsDialog = page.getByRole("dialog", { name: "Current stats", exact: true });
    assert(await statsDialog.getByText("Critical chance", { exact: true }).isVisible());
    await page.getByRole("button", { name: "Close Current stats", exact: true }).click();
    await page.locator(".choice-tools").getByRole("button", { name: "Current powers" }).click();
    assert(
      await page
        .getByRole("dialog", { name: "Current powers", exact: true })
        .getByText("Whirlwind", { exact: true })
        .isVisible(),
    );
    await page.getByRole("button", { name: "Close Current powers", exact: true }).click();
    assert.deepEqual(
      await page.locator("[data-perk]").evaluateAll((nodes) => nodes.map((n) => n.dataset.perk)),
      options,
      "Inspection preserves the exact offer",
    );
    await page.screenshot({ path: join(evidence, "choice-1440.png") });
    await page.locator("#skip-perk").click();
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.phase.kind !== "choice",
      storageKey,
    );
    const afterSkip = await stored(page);
    assert.deepEqual(afterSkip.state.run.perks, beforeSkip.state.run.perks, "Skip grants no perk");
    assert.equal(afterSkip.state.meta.gold, beforeSkip.state.meta.gold, "Skip grants no reward");
    await page.getByRole("button", { name: "Camp", exact: true }).click();
    await openCollection(page, "Equipment");
    assert(
      await page.locator('[data-equip="weapon:greatsword"]').isDisabled(),
      "Mid-run gear cannot change",
    );
    await page.keyboard.press("Escape");
    await page.locator("#start").waitFor();
    assert.match(await page.locator("#start").innerText(), /^RESUME/);
    const inspectedBefore = await stored(page);
    await page.waitForTimeout(350);
    assert.equal(
      (await stored(page)).state.run.distance,
      inspectedBefore.state.run.distance,
      "Dismiss collection stays in paused hub",
    );
    await openCollection(page, "Equipment");
    await page
      .getByRole("button", { name: "Return to camp and change build", exact: true })
      .click();
    await page.getByRole("button", { name: "Keep this journey", exact: true }).click();
    assert.notEqual(
      (await stored(page)).state.phase.kind,
      "camp",
      "Cancelling retreat preserves the run",
    );
    await page
      .getByRole("button", { name: "Return to camp and change build", exact: true })
      .click();
    await page.getByRole("button", { name: "Return to camp", exact: true }).click();
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.phase.kind === "camp",
      storageKey,
    );
    const retreated = await stored(page);
    assert.equal(retreated.state.meta.gold, afterSkip.state.meta.gold);
    assert.deepEqual(retreated.state.run.perks, {});
    await c.close();

    const questContext = await context();
    const questPage = await questContext.newPage();
    await ready(questPage);
    await depart(questPage);
    const questDeadline = Date.now() + 45000;
    let earned;
    while (Date.now() < questDeadline) {
      earned = await stored(questPage);
      if (questBoard(earned.state.quests).daily.every((q) => q.ready)) break;
      if (await questPage.locator(".decision--choice[open]").count())
        await questPage.locator("[data-perk]").first().click();
      else if (await questPage.locator(".cast-skill").isEnabled())
        await questPage.locator(".cast-skill").click();
      await questPage.waitForTimeout(150);
    }
    assert(
      questBoard(earned.state.quests).daily.every((q) => q.ready),
      "Real combat, skill casts and oath choices earn all daily goals",
    );
    if (await questPage.locator(".decision--choice[open]").count())
      await questPage.locator("[data-perk]").first().click();
    await questPage.getByRole("button", { name: "Camp", exact: true }).click();
    await questPage
      .getByRole("button", { name: "Return to camp and change build", exact: true })
      .click();
    await questPage.getByRole("button", { name: "Return to camp", exact: true }).click();
    if (await questPage.locator(".collection-dialog[open]").count())
      await questPage.keyboard.press("Escape");
    await questPage.getByRole("button", { name: /Missions and quests/ }).click();
    await questPage.getByRole("button", { name: /Daily quests/ }).click();
    const goldBeforeClaims = (await stored(questPage)).state.meta.gold;
    for (const quest of questBoard((await stored(questPage)).state.quests).daily)
      await questPage.locator(`[data-claim-quest="${quest.id}"]`).click();
    await questPage.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.quests.daily.claimed.length === 3,
      storageKey,
    );
    const claimed = await stored(questPage);
    assert.equal(claimed.version, 3);
    assert.equal(
      claimed.state.meta.gold,
      goldBeforeClaims + 45,
      "Daily rewards pay their exact gold once",
    );
    await questPage.screenshot({ path: join(evidence, "daily-quests-1440.png") });
    await ready(questPage);
    if (await questPage.locator(".collection-dialog[open]").count())
      await questPage.keyboard.press("Escape");
    await questPage.getByRole("button", { name: /Missions and quests/ }).click();
    await questPage.getByRole("button", { name: /Daily quests/ }).click();
    assert.equal(
      await questPage.locator("[data-claim-quest]").count(),
      0,
      "Claimed rewards do not reappear after reload",
    );
    assert.equal((await stored(questPage)).state.meta.gold, claimed.state.meta.gold);
    await questPage.getByRole("button", { name: /Weekly quests/ }).click();
    assert.equal(await questPage.locator("[data-quest]").count(), 3);
    await questPage.screenshot({ path: join(evidence, "weekly-quests-1440.png") });
    await questPage.getByRole("button", { name: /Story missions/ }).click();
    assert.equal(await questPage.locator("[data-quest]").count(), 5);
    await questPage.screenshot({ path: join(evidence, "story-missions-1440.png") });
    result.earnedDailyWeeklyAndStoryBoard = true;
    result.questRewardsPersistOnce = true;
    await questContext.close();

    const build = initialState();
    build.meta.gold = 200;
    build.meta.earnedGold = 200;
    build.meta.unlockedChapter = 3;
    const buildContext = await context(await fixture(build));
    const buildPage = await buildContext.newPage();
    await ready(buildPage);
    await openCollection(buildPage, "Equipment");
    await buildPage.locator('[data-upgrade="blade"]').click();
    await buildPage.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).state.meta.upgrades.blade === 1,
      storageKey,
    );
    assert.equal(
      (await stored(buildPage)).state.meta.gold,
      176,
      "Forge spends its exact 24 gold cost once",
    );
    await buildPage.locator('[data-equip="weapon:spear"]').click();
    await openCollection(buildPage, "Companions");
    await buildPage.locator('[data-equip="companion:sable"]').click();
    await openCollection(buildPage, "Pets");
    await buildPage.locator('[data-equip="pet:owl"]').click();
    await openCollection(buildPage, "Skills");
    await buildPage.locator('[data-equip="skill:aegis"]').click();
    await ready(buildPage);
    const gearSave = await stored(buildPage);
    assert.equal(gearSave.state.meta.gold, 176);
    assert.equal(gearSave.state.meta.upgrades.blade, 1);
    assert.equal(gearSave.state.meta.loadout.weapon, "spear");
    assert.equal(gearSave.state.meta.loadout.companion, "sable");
    assert.equal(gearSave.state.meta.loadout.pet, "owl");
    assert.equal(gearSave.state.meta.loadout.skill, "aegis");
    result.loadoutAndForgePersist = true;
    const savedJourney = JSON.stringify(gearSave);
    await buildContext.close();

    for (const phase of ["choice", "victory", "defeat", "camp", "travel"]) {
      const state = initialState();
      if (phase === "choice") {
        startRun(state);
        state.run.level = 2;
        state.phase = { kind: "choice", options: ["edge", "ward", "chain"] };
      }
      if (phase === "victory") {
        state.run.cleared = 12;
        state.meta.unlockedChapter = 2;
        state.meta.victories = 1;
        state.phase = { kind: "victory", reward: 50 };
      }
      if (phase === "defeat") {
        state.run.hp = 0;
        state.meta.defeats = 1;
        state.phase = { kind: "defeat", enemy: "Briar archer" };
      }
      if (phase === "travel") startRun(state);
      const terminal = await context(await fixture(state));
      const p = await terminal.newPage();
      await ready(p);
      if (phase === "travel") await p.locator("#pause").click();
      await p.waitForFunction(
        () =>
          window.__draws.hero > 0 ||
          document.querySelector(".decision--defeat[open]") ||
          document.querySelector(".chapter-hub"),
      );
      if (phase === "camp") await assertCampActors(p);
      assert.equal(
        await p.evaluate(() => window.__draws.foe + window.__draws.archer),
        0,
        `${phase} reload draws no phantom foes`,
      );
      await terminal.close();
    }
    const squad = initialState();
    startRun(squad);
    squad.run.cleared = 8;
    squad.phase = beginBattle(squad);
    squad.run.hp = heroStats(squad).hp;
    const squadContext = await context(await fixture(squad));
    const squadPage = await squadContext.newPage();
    await ready(squadPage);
    await squadPage.waitForFunction(() => window.__draws.group);
    await squadPage.locator("#pause").click();
    await squadPage.screenshot({ path: join(evidence, "four-foe-squad-1440.png") });
    await squadContext.close();

    const delayed = await context();
    await delayed.addInitScript((raw) => {
      window.__sdkWrites = [];
      window.__sdkStored = raw;
      let reads = 0;
      const loading = new Promise((done) => {
        window.__finishSdkLoad = () => done(raw);
      });
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
          onPause: (cb) => {
            window.__sdkPause = cb;
          },
          onResume() {},
        },
      };
    }, savedJourney);
    const delayedPage = await delayed.newPage();
    await delayedPage.goto(origin);
    await delayedPage.waitForFunction(() => typeof window.__sdkPause === "function");
    await delayedPage.locator("#settings-toggle").click();
    await delayedPage.evaluate(() => window.__sdkPause());
    await delayedPage.waitForTimeout(100);
    assert.equal(
      await delayedPage.evaluate(() => window.__sdkWrites.length),
      0,
      "Pause/settings cannot save a fresh game before SDK load",
    );
    await delayedPage.evaluate(() => window.__finishSdkLoad());
    await delayedPage.waitForFunction(() => window.__sdkWrites.length > 0);
    assert.equal(
      await delayedPage.evaluate(() => JSON.parse(window.__sdkStored).state.meta.gold),
      176,
    );
    result.delayedSdkLoadPreservesProgress = true;
    await delayed.close();

    const future = '{"version":999,"state":{"gold":777}}';
    const protectedContext = await context(future);
    const protectedPage = await protectedContext.newPage();
    await ready(protectedPage);
    assert.match(await protectedPage.locator("#save-status").innerText(), /untouched/);
    assert(await protectedPage.locator("[data-save-warning]").isVisible());
    await depart(protectedPage);
    assert(
      await protectedPage.locator(".battle-layout > [data-save-warning]").isVisible(),
      "Protected save warning remains visible during the journey",
    );
    await protectedPage.locator("#pause").click();
    assert.equal(
      await protectedPage.evaluate((key) => localStorage.getItem(key), storageKey),
      future,
      "Future schema stays byte-for-byte untouched",
    );
    await protectedContext.close();
    const unavailableContext = await context();
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
    await depart(unavailable);
    await unavailable.waitForFunction(() => window.__draws.group);
    assert(await unavailable.locator("[data-save-warning]").isVisible());
    result.storageFailureKeepsPlayable = true;
    await unavailableContext.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], "Raw certified build makes no network requests");
    result.errors = errors;
    result.externalRequests = external;
    await writeFile(join(evidence, "acceptance.json"), `${JSON.stringify(result, null, 2)}\n`);
    console.log(`EMBER ROAD WEB passed. Evidence: ${evidence}`);
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
