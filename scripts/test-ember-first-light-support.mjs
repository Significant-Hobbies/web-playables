import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as M from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

test("First Light platform capabilities, delayed restore and opening replay", {
  timeout: 30000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const server = createSiteServer(join(root, "games/ember-road/dist/web"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const errors = [];
  try {
    const choice = M.initialState(31);
    choice.meta.experience.introSeen = true;
    for (const k in choice.meta.experience.lessons) choice.meta.experience.lessons[k] = true;
    M.startRun(choice);
    for (let i = 0; i < 20000 && choice.phase.kind !== "choice"; i++) {
      if (choice.phase.kind === "route") M.chooseRoute(choice, "spring");
      M.stepGame(choice, 1 / 60);
    }
    assert.equal(choice.phase.kind, "choice");
    const yt = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await yt.addInitScript(
      (raw) => {
        let reads = 0;
        window.__sdkStored = raw;
        const loading = new Promise((done) => {
          window.__finishSdkLoad = () => done(raw);
        });
        window.ytgame = {
          IN_PLAYABLES_ENV: true,
          game: {
            firstFrameReady() {},
            gameReady() {},
            loadData: () => (reads++ === 0 ? loading : Promise.resolve(window.__sdkStored)),
            saveData: async (v) => {
              window.__sdkStored = v;
            },
          },
          system: {
            isAudioEnabled: () => true,
            onAudioEnabledChange() {},
            onPause() {},
            onResume() {},
          },
        };
      },
      JSON.stringify({ version: 6, savedAt: Date.now(), state: choice }),
    );
    const delayed = await yt.newPage();
    delayed.on("pageerror", (e) => errors.push(e.message));
    await delayed.goto(origin);
    const inspect = delayed.getByRole("button", { name: "Inspect Rook’s equipment", exact: true });
    await inspect.waitFor();
    assert(
      await inspect.isDisabled(),
      "The loading placeholder cannot open equipment before a checkpoint restores",
    );
    assert(
      await delayed.getByRole("button", { name: "First Light settings", exact: true }).isDisabled(),
    );
    assert.equal(
      await delayed.getByRole("button", { name: /^(Mute|Enable) game audio$/ }).count(),
      0,
      "YouTube owns mute controls",
    );
    await delayed.evaluate(() => window.__finishSdkLoad());
    await delayed.locator(".decision--choice[open]").waitFor();
    assert.equal(await delayed.locator("dialog[open]").count(), 1);
    assert.equal(await delayed.locator(".fl-wardrobe[open]").count(), 0);
    assert.equal(
      await delayed.evaluate(() => JSON.parse(window.__sdkStored).state.phase.kind),
      "choice",
    );
    await yt.close();

    const state = M.initialState(42);
    state.meta.experience.introSeen = true;
    state.meta.gear.owned.push("sunfang");
    M.equipGear(state, "sunfang");
    M.startFirstLight(state);
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await c.addInitScript(
      (raw) => {
        if (!localStorage.getItem("save:ember-road:v1"))
          localStorage.setItem("save:ember-road:v1", raw);
      },
      JSON.stringify({ version: 6, savedAt: Date.now(), state }),
    );
    const page = await c.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin);
    for (const finish of [false, true]) {
      await page.getByRole("button", { name: "First Light settings", exact: true }).click();
      await page.getByRole("button", { name: "Watch the opening", exact: true }).click();
      await page.getByRole("dialog", { name: "How the journey began", exact: true }).waitFor();
      const before = await page.evaluate(
        () => JSON.parse(localStorage.getItem("save:ember-road:v1")).state.run.time,
      );
      if (finish) {
        for (let i = 0; i < 3; i++) await page.locator("#prologue-next").click();
      } else await page.locator("#skip-prologue").click();
      await page.waitForFunction(() => !document.querySelector("dialog[open]"));
      await page.waitForFunction(
        (before) =>
          JSON.parse(localStorage.getItem("save:ember-road:v1")).state.run.time > before + 0.2,
        before,
        { timeout: 5000 },
      );
      assert.equal(await page.locator(".first-light-ui").count(), 1);
      assert.equal(
        await page.locator(".app-shell").evaluate((e) => e.classList.contains("is-dashboard")),
        false,
        "A story replay cannot strand First Light behind the hidden campaign dashboard",
      );
    }
    await c.close();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
