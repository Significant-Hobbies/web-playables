import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { beginBattle, initialState, startRun, validState } from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

test("Ember Road restores visible queued shards and freezes them on pause", {
  timeout: 60000,
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
  // Synthetic rendering fixture: no earned-progression or balance claims.
  const state = initialState(42);
  state.meta.unlockedChapter = 3;
  state.meta.experience.introSeen = true;
  for (const key of Object.keys(state.meta.experience.lessons))
    state.meta.experience.lessons[key] = true;
  assert(startRun(state, 3));
  state.phase = beginBattle(state);
  state.phase.heroCooldown = state.phase.companionCooldown = state.phase.petCooldown = 2;
  for (const foe of state.phase.enemies) foe.cooldown = 2;
  state.phase.reactions = [
    {
      actor: "hero",
      target: state.phase.enemies[0].id,
      remaining: 0.2,
      damage: 3,
      effect: "shatterguard",
    },
  ];
  assert(validState(state));
  const raw = JSON.stringify({ version: 5, state, savedAt: Date.now() });
  const errors = [];
  try {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion,
      });
      await context.addInitScript(
        ({ raw }) => {
          localStorage.setItem("save:ember-road:v1", raw);
          window.__shards = 0;
          window.__heldFrames = new Map();
          let id = -1;
          const raf = requestAnimationFrame.bind(window);
          const cancel = cancelAnimationFrame.bind(window);
          window.requestAnimationFrame = (fn) => {
            const key = id--;
            window.__heldFrames.set(key, fn);
            return key;
          };
          window.cancelAnimationFrame = (key) => {
            window.__heldFrames.delete(key);
            cancel(key);
          };
          // Hold the loop's background watchdog alongside RAF while assets decode.
          const interval = setInterval.bind(window);
          window.setInterval = (fn, ms, ...args) =>
            interval(() => {
              if (!window.__heldFrames) fn(...args);
            }, ms);
          const Original = window.Image;
          window.__images = [];
          window.Image = class extends Original {
            constructor(...args) {
              super(...args);
              window.__images.push(this);
            }
          };
          const fill = CanvasRenderingContext2D.prototype.fill;
          CanvasRenderingContext2D.prototype.fill = function (...args) {
            if (this.canvas.id === "world" && this.fillStyle === "#bcefff") window.__shards++;
            return fill.apply(this, args);
          };
          window.__resumeFrames = () => {
            const held = window.__heldFrames;
            window.__heldFrames = null;
            window.requestAnimationFrame = raf;
            window.cancelAnimationFrame = cancel;
            for (const fn of held.values()) raf(fn);
          };
        },
        { raw },
      );
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin);
      await page
        .waitForFunction(
          () =>
            !document.querySelector("#save-status")?.textContent.includes("Loading") &&
            window.__images.length >= 5 &&
            window.__images.every((image) => image.complete && image.naturalWidth),
          undefined,
          { polling: 50, timeout: 10000 },
        )
        .catch(async (error) => {
          console.error(
            await page.evaluate(() => ({
              status: document.querySelector("#save-status")?.textContent,
              images: window.__images.map((image) => ({
                src: image.src,
                complete: image.complete,
                width: image.naturalWidth,
              })),
              errors: document.body.innerText.slice(0, 500),
            })),
            errors,
          );
          throw error;
        });
      await page.evaluate(() => document.fonts.ready);
      // Loading a saved queue must paint without replaying a launch event.
      assert(await page.evaluate(() => window.__shards > 0), "Reload paints the saved projectile");
      // Playwright's stability checks need RAF; dispatch the real pause control first.
      await page.locator("#pause").evaluate((button) => button.click());
      const before = await page.locator("#world").evaluate((canvas) => canvas.toDataURL());
      await page.evaluate(() => window.__resumeFrames());
      await page.waitForTimeout(350);
      assert.equal(
        await page.locator("#world").evaluate((canvas) => canvas.toDataURL()),
        before,
        "Pause freezes cosmetic and simulation clocks",
      );
      await page.screenshot({ path: join(evidence, `restored-shards-${reducedMotion}.png`) });
      await page
        .getByRole("dialog", { name: "The road can wait." })
        .getByRole("button", { name: "Resume journey", exact: true })
        .click();
      await page.waitForTimeout(400);
      await page.locator("#pause").click();
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("save:ember-road:v1")),
      );
      assert.equal(saved.version, 5);
      assert.equal(saved.state.phase.reactions.length, 0, "The saved queue resolves exactly once");
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollHeight > innerHeight),
        false,
      );
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
});
