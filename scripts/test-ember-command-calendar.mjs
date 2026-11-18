import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  activityPreview,
  advanceAdventures,
  DAY_MS,
  runLength,
} from "../games/ember-road/src/adventures.ts";
import {
  beginBattle,
  initialState,
  startActivity,
  validState,
} from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

function finalWave(kind, now) {
  const state = initialState(927113);
  state.meta.unlockedChapter = 5;
  state.quests.story.completed = [1, 2, 3, 4];
  state.meta.experience.introSeen = true;
  for (const key in state.meta.experience.lessons) state.meta.experience.lessons[key] = true;
  Object.assign(state.adventures.discoveries, { mira: true, cinder: true, whirlwind: true });
  advanceAdventures(state, now);
  const offer = activityPreview(state, kind, 1);
  assert(startActivity(state, kind, 1, offer.period, offer.id, now));
  state.run.cleared = runLength(state) - 1;
  state.phase = beginBattle(state);
  state.phase.heroCooldown = state.phase.companionCooldown = state.phase.petCooldown = 5;
  state.phase.enemies.forEach((enemy, i) => {
    enemy.hp = i === state.phase.enemies.length - 1 ? 1 : 0;
    enemy.pendingHit = null;
    enemy.cooldown = 5;
  });
  assert(validState(state), "Final-wave fixture is a valid canonical save");
  return state;
}

test("command kills cannot claim expired daily or weekly first-clear rewards", {
  timeout: 60000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const server = createSiteServer(join(root, "games/ember-road/dist/web"));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const evidence =
    process.env.EMBER_COMMAND_EVIDENCE_DIR || join(tmpdir(), "ember-command-calendar");
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined,
  });
  const results = [];
  try {
    for (const kind of ["daily", "hunt"]) {
      const now = Date.UTC(2026, 10, 16, 12);
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await context.addInitScript(
        ({ raw, now }) => {
          localStorage.setItem("save:ember-road:v1", raw);
          window.__qaNow = now;
          Date.now = () => window.__qaNow;
        },
        { raw: JSON.stringify({ version: 5, savedAt: now, state: finalWave(kind, now) }), now },
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin);
      await page.getByRole("button", { name: "Breakthrough E", exact: true }).waitFor();
      await page.waitForFunction(() => {
        const button = document.querySelector('[aria-label="Breakthrough E"]');
        return button && !button.disabled;
      });
      const before = await page.evaluate(
        () => JSON.parse(localStorage.getItem("save:ember-road:v1")).state,
      );
      await page.evaluate(
        (next) => {
          window.__qaNow = next;
          document.querySelector('[aria-label="Breakthrough E"]').click();
        },
        now + DAY_MS * (kind === "daily" ? 1 : 7),
      );
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem("save:ember-road:v1")).state.phase.kind === "victory",
      );
      const after = await page.evaluate(
        () => JSON.parse(localStorage.getItem("save:ember-road:v1")).state,
      );
      assert(validState(after));
      assert.equal(
        after.phase.bonusStatus,
        "expired",
        `${kind} command kill refreshes the calendar before awarding`,
      );
      assert.equal(after.phase.reward, kind === "daily" ? 20 : 35);
      assert.equal(after.phase.bonus, 0);
      assert(
        after.adventures[kind === "daily" ? "day" : "week"] >
          before.adventures[kind === "daily" ? "day" : "week"],
      );
      assert.deepEqual(errors, []);
      results.push({ kind, reward: after.phase.reward, bonusStatus: after.phase.bonusStatus });
      await context.close();
    }
    await writeFile(join(evidence, "result.json"), JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
