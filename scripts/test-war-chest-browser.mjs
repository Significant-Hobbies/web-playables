import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSiteServer } from "./serve-site.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "networked-games/open-historia/package.json"));
const { chromium } = require("@playwright/test");
const dist = join(root, "apps/hub/dist");
const evidence = process.env.WAR_CHEST_EVIDENCE_DIR || join(tmpdir(), "war-chest-web-evidence");
await mkdir(evidence, { recursive: true });
const server = createSiteServer(dist);
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1040 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" && /SCRIPT ERROR|Parse Error|ERROR:/.test(message.text()))
    errors.push(message.text());
});
const external = [];
page.on("request", (request) => {
  if (!request.url().startsWith(origin) && !/^(data|blob):/.test(request.url()))
    external.push(request.url());
});
async function launch() {
  await page.goto(`${origin}/play/war-chest/`);
  await page.locator("#play").click();
  await page.waitForFunction(() => document.getElementById("start-cover").hidden, null, {
    timeout: 45000,
  });
}
async function clickGame(x, y) {
  const box = await page.locator("#canvas").boundingBox();
  await page.mouse.click(box.x + (x / 1440) * box.width, box.y + (y / 900) * box.height);
  await page.waitForTimeout(100);
}
async function snapshot() {
  const downloaded = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloaded;
  return JSON.parse(await readFile(await download.path(), "utf8"));
}
try {
  await launch();
  assert.equal((await snapshot()).campaign.story.phase, "intro");
  await page.screenshot({ path: join(evidence, "story-1440.png"), fullPage: true });
  for (let line = 0; line < 3; line++) await clickGame(1200, 792);
  assert.equal((await snapshot()).campaign.story.phase, "prepare");
  await clickGame(990, 193);
  const packed = (await snapshot()).campaign.placements.blade;
  assert(packed, "Starter sword is packed");
  await clickGame(435, 809);
  assert.equal(
    (await snapshot()).campaign.placements.blade,
    undefined,
    "Storing gear changes the actual loadout",
  );
  await clickGame(110 + (packed[0] * 70 + 35) * 1.1, 340 + (packed[1] * 70 + 35) * 1.1);
  assert.deepEqual(
    (await snapshot()).campaign.placements.blade,
    packed,
    "Pointer packing restores the sword footprint",
  );
  await page.screenshot({ path: join(evidence, "chest-1440.png"), fullPage: true });
  await clickGame(180, 226);
  await clickGame(400, 620);
  const initial = await snapshot();
  assert.equal(initial.battle.phase, "playing");
  assert.equal(initial.battle.commands, 6);
  await page.screenshot({ path: join(evidence, "battle-1440.png"), fullPage: true });
  await clickGame(870, 755);
  await page.locator("#canvas").focus();
  await page.keyboard.press("t");
  await page.keyboard.press("f");
  await page.waitForTimeout(100);
  const impactFrame = await page.locator("#canvas").screenshot();
  const attacked = await snapshot();
  assert(attacked.battle.commands < initial.battle.commands, "The attack spends real orders");
  assert(
    attacked.battle.enemies.reduce((sum, enemy) => sum + enemy.hp, 0) <
      initial.battle.enemies.reduce((sum, enemy) => sum + enemy.hp, 0),
    "The attack damages actual enemies",
  );
  await page.waitForTimeout(700);
  const settledFrame = await page.locator("#canvas").screenshot();
  assert(!impactFrame.equals(settledFrame), "Combat visibly animates between impact and rest");
  if (await page.locator("#pause-cover").isVisible()) await page.locator("#resume").click();
  await page.locator("#pause").click();
  assert(await page.locator("#pause-cover").isVisible());
  await page.locator("#canvas").focus();
  await page.keyboard.press("Space");
  assert.deepEqual(
    (await snapshot()).battle,
    attacked.battle,
    "Paused keyboard input cannot advance battle",
  );
  await page.locator("#resume").click();
  await page.keyboard.press("z");
  assert.deepEqual(
    (await snapshot()).battle,
    initial.battle,
    "Undo restores the actual pre-attack battle",
  );
  if (await page.locator("#pause-cover").isVisible()) await page.locator("#resume").click();
  await page.locator("#canvas").focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  const afterTurn = await snapshot();
  assert(afterTurn.battle.round > initial.battle.round, "Ending a turn resolves the enemy phase");
  await page.waitForTimeout(2000);
  await launch();
  assert.deepEqual(await snapshot(), afterTurn, "Browser save survives a full page reload");
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `No horizontal overflow at ${viewport.width}`,
    );
    await page.screenshot({ path: join(evidence, `battle-${viewport.width}.png`), fullPage: true });
  }
  assert.deepEqual(external, [], "The game makes no external network requests");
  assert.deepEqual(errors, [], "No engine or JavaScript errors");
  console.log(
    `WAR CHEST WEB: launch, story, pointer chest packing, animated attack, pause, undo, enemy turn, save reload and four viewports passed. Evidence: ${evidence}`,
  );
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
