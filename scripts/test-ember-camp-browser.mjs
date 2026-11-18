import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { initialState, startRun, validState } from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

test("Living Camp locations remain reachable before departure and during a journey", {
  timeout: 60000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence = process.env.EMBER_CAMP_EVIDENCE_DIR || join(tmpdir(), "ember-camp-evidence");
  await mkdir(evidence, { recursive: true });
  const server = createSiteServer(join(root, "apps/hub/dist"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}/play/ember-road/`;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
  });
  try {
    for (const midRun of [false, true]) {
      const state = initialState(73);
      state.meta.unlockedChapter = 3;
      state.run.chapter = 3;
      state.meta.experience.introSeen = true;
      for (const key in state.meta.experience.lessons) state.meta.experience.lessons[key] = true;
      Object.assign(state.adventures.discoveries, {
        mira: true,
        cinder: true,
        whirlwind: true,
        daily: true,
        weekly: true,
      });
      if (midRun) assert(startRun(state, 3));
      assert(validState(state));
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(
        (raw) => {
          if (!localStorage.getItem("save:ember-road:v1"))
            localStorage.setItem("save:ember-road:v1", raw);
        },
        JSON.stringify({ version: 5, savedAt: Date.now(), state }),
      );
      await context.route("https://historia.aliveville.com/**", (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": new URL(origin).origin,
            "Access-Control-Allow-Credentials": "true",
          },
          body: "{}",
        }),
      );
      const page = await context.newPage();
      await page.goto(origin);
      if (midRun) await page.getByRole("button", { name: "Camp", exact: true }).click();
      await page.locator(".living-camp").waitFor();
      for (const [width, height] of [
        [1440, 900],
        [1280, 720],
        [768, 1024],
        [390, 844],
        [844, 390],
        [667, 375],
        [640, 360],
        [600, 360],
        [568, 320],
        [500, 375],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        });
        const account = await page
          .getByRole("button", { name: "Account and saves", exact: true })
          .boundingBox();
        const header = await page.locator(".game-topbar").boundingBox();
        assert(
          account &&
            header &&
            account.x >= header.x &&
            account.y >= header.y &&
            account.x + account.width <= header.x + header.width &&
            account.y + account.height <= header.y + header.height,
          `Account stays in the header at ${width}x${height}`,
        );
        const covered = await page
          .locator(
            ".camp-sign, .camp-contracts button, .camp-renown, #start, .retreat-from-hub, .camp-arrow:not(:disabled)",
          )
          .evaluateAll((buttons) =>
            buttons.flatMap((button) => {
              const r = button.getBoundingClientRect();
              const exposed = [0.25, 0.5, 0.75].every((x) =>
                [0.25, 0.5, 0.75].every((y) => {
                  const hit = document.elementFromPoint(r.x + r.width * x, r.y + r.height * y);
                  return hit && button.contains(hit);
                }),
              );
              return r.x < 0 ||
                r.y < 0 ||
                r.right > innerWidth ||
                r.bottom > innerHeight ||
                !exposed
                ? [button.getAttribute("aria-label") || button.textContent]
                : [];
            }),
          );
        await page.screenshot({
          path: join(evidence, `camp-${width}-${midRun ? "resume" : "ready"}.png`),
        });
        assert.deepEqual(
          covered,
          [],
          `All camp actions are reachable at ${width}x${height}, mid-run=${midRun}`,
        );
      }
      if (!midRun) {
        await page.getByRole("button", { name: "Open game settings", exact: true }).click();
        const settings = page.getByRole("dialog", { name: "The campfire.", exact: true });
        assert(
          await settings.getByRole("button", { name: "Ember March", exact: true }).isVisible(),
        );
        assert(
          await settings.getByRole("button", { name: "First Light", exact: true }).isVisible(),
        );
        await page.keyboard.press("Escape");
      }
      await page
        .locator(".camp-locations")
        .getByRole("button", { name: "Skills", exact: true })
        .click();
      await page.getByRole("dialog", { name: "Skills & powers", exact: true }).waitFor();
      assert.equal(await page.locator("dialog[open]").count(), 1);
      await page.keyboard.press("Escape");
      await page.locator("#start").click();
      if (midRun) {
        await page.locator(".living-camp").waitFor({ state: "detached" });
      } else {
        await page.locator("#depart").waitFor();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
