import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createSiteServer } from "./serve-site.mjs";

const require = createRequire(
  new URL("../networked-games/open-historia/package.json", import.meta.url),
);
const { chromium } = require("@playwright/test");
const chrome =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const evidence = process.env.GAME_VIEWPORT_EVIDENCE_DIR || join(tmpdir(), "game-viewport-evidence");
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 844, height: 390 },
];

async function fixture(run) {
  const server = createSiteServer(fileURLToPath(new URL("../apps/hub/dist", import.meta.url)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  try {
    await run(browser, `http://127.0.0.1:${server.address().port}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
async function fits(page) {
  assert(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
    "The game stays in its viewport",
  );
}

test("Idle Startup office and management modals fit every viewport", { timeout: 60000 }, async () =>
  fixture(async (browser, origin) => {
    await mkdir(evidence, { recursive: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/play/idle-startup/`);
    await page.locator(".founder-grid .candidate").first().click();
    await page.getByRole("button", { name: "Start building" }).click();
    await page.getByRole("button", { name: /Founder · inspect team/ }).click();
    assert(await page.getByRole("button", { name: "Back to work", exact: true }).isVisible());
    await page.getByRole("button", { name: "Back to work", exact: true }).click();
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(60);
    const worker = page.locator(".worker-figure").first();
    const restingWorker = await worker.screenshot();
    await page.waitForTimeout(250);
    assert(
      restingWorker.equals(await worker.screenshot()),
      "Background pause freezes character acting",
    );
    await page.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await fits(page);
      assert(
        (await page.locator(".scene-card").boundingBox()).height > viewport.height * 0.4,
        "The office fills the playfield",
      );
      await page.screenshot({ path: join(evidence, `office-${viewport.width}.png`) });
      for (const name of ["Team", "Upgrades", "Growth", "Funding"]) {
        const trigger = page.getByRole("button", { name, exact: true });
        await trigger.click();
        assert(await page.getByRole("dialog").isVisible());
        await fits(page);
        await page.keyboard.press("Escape");
        assert(
          await trigger.evaluate((element) => element === document.activeElement),
          "Escape returns focus to the management button",
        );
      }
    }
    await page.getByRole("button", { name: "Team", exact: true }).click();
    await page.locator(".gen-row:not(:disabled)").first().click();
    assert(
      (await page.locator("dialog[open]").count()) === 0,
      "Candidate selection takes over from management",
    );
    assert(await page.getByText("Who gets the offer?", { exact: true }).isVisible());
    await page.getByRole("button", { name: "Not now", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "additions & multipliers" }).click();
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    assert(
      !(await page.locator(".frame").evaluate((element) => element.inert)),
      "Closing the ledger restores company controls",
    );
    await page.getByRole("button", { name: "Team", exact: true }).click();
    await page.getByRole("button", { name: "See your squad", exact: true }).click();
    await page.getByRole("button", { name: "Back to work", exact: true }).click();
    assert(
      !(await page.locator(".frame").evaluate((element) => element.inert)),
      "Closing the squad restores company controls",
    );
    await page.getByRole("button", { name: "Team", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.addInitScript(() => {
      if (window.name.startsWith("idle-fixture:")) {
        localStorage.setItem("save:idle-startup", window.name.slice("idle-fixture:".length));
        window.name = "";
      }
    });
    const companySeed = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("save:idle-startup")),
    );
    async function companyFixture(cash, age, office, questIndex = 0) {
      const envelope = structuredClone(companySeed);
      envelope.state.cash = cash;
      envelope.state.ageSeconds = age;
      envelope.state.officeIndex = office;
      envelope.state.lastDecisionQuarter = 0;
      envelope.state.questIndex = questIndex;
      envelope.savedAt = Date.now();
      await page.evaluate((raw) => {
        window.name = "idle-fixture:" + JSON.stringify(raw);
      }, envelope);
      await page.reload();
      await page.getByRole("button", { name: "Team", exact: true }).click();
    }
    // The named goal assertion guards this intentionally advanced quest fixture.
    await companyFixture(25000, 10, 0, 7);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".company-story-goal").innerText(), "Move out of the garage");
    await page.getByRole("button", { name: "Plan the next step", exact: true }).click();
    assert.match(await page.getByRole("dialog").innerText(), /^GROWTH/);
    assert(await page.getByRole("button", { name: /20K.*morale/ }).isVisible());
    await page.keyboard.press("Escape");
    await companyFixture(25000, 88, 0);
    await page.locator(".decision-modal").waitFor({ timeout: 6000 });
    assert.equal(
      await page.locator("dialog[open]").count(),
      0,
      "A board decision takes over from management",
    );
    assert(
      await page.locator(".frame").evaluate((element) => element.inert),
      "Management cannot replace the pending decision",
    );
    await page.locator(".decision-option").first().click();
    assert(!(await page.locator(".frame").evaluate((element) => element.inert)));
    await companyFixture(1500, 10, 1);
    await page.locator(".crash-veil:not(.hidden)").waitFor({ timeout: 15000 });
    assert.equal(
      await page.locator("dialog[open]").count(),
      0,
      "A crash takes over from management",
    );
    await page.getByRole("button", { name: "Start over" }).click();
    assert(!(await page.locator(".frame").evaluate((element) => element.inert)));
    assert.equal(errors.length, 0, errors.join("\n"));
  }),
);

test(
  "War Chest reports a broken WASM download and reloads instead of hanging",
  { timeout: 60000 },
  async () =>
    fixture(async (browser, origin) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.route("**/index.wasm", (route) =>
        route.fulfill({ body: "invalid wasm", contentType: "application/wasm" }),
      );
      await page.goto(`${origin}/play/war-chest/`);
      await page.locator("#play").click();
      await page.getByRole("button", { name: "Reload game", exact: true }).waitFor();
      assert(await page.locator("#loading.error").isVisible(), "Startup failure is explained");
      await page.unroute("**/index.wasm");
      await page.getByRole("button", { name: "Reload game", exact: true }).click();
      await page.locator("#play").click();
      await page.locator("#start-cover").waitFor({ state: "hidden", timeout: 45000 });
      await fits(page);
    }),
);

test(
  "War Chest detects a real blocked save database without deleting data",
  { timeout: 60000 },
  async () =>
    fixture(async (browser, origin) => {
      const page = await browser.newPage();
      await page.goto(`${origin}/play/war-chest/`);
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open("/userfs", 1);
            request.onupgradeneeded = () => request.result.createObjectStore("recovery-check");
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              window.heldSaveDatabase = request.result;
              const tx = request.result.transaction("recovery-check", "readwrite");
              tx.objectStore("recovery-check").put("saved-company-must-survive", "company");
              tx.oncomplete = () => resolve();
            };
          }),
      );
      await page.locator("#play").click();
      await page.getByRole("button", { name: "Reload game", exact: true }).waitFor();
      assert.match(await page.locator("#loading").innerText(), /Another War Chest tab/);
      const kept = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const request = window.heldSaveDatabase
              .transaction("recovery-check")
              .objectStore("recovery-check")
              .get("company");
            request.onsuccess = () => {
              resolve(request.result);
              window.heldSaveDatabase.close();
            };
          }),
      );
      assert.equal(kept, "saved-company-must-survive");
      await page.locator("#start-cover").waitFor({ state: "hidden", timeout: 45000 });
    }),
);
