import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createSiteServer } from "./serve-site.mjs";

test("web account controls preserve guest saves, restore real game checkpoints and pause the scene", {
  timeout: 120000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence =
    process.env.CLOUD_SAVE_EVIDENCE_DIR || join(tmpdir(), "playables-cloud-evidence");
  await mkdir(evidence, { recursive: true });
  const server = createSiteServer(join(root, "apps/hub/dist"));
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let owner = null;
  let head = null;
  let unavailable = false;
  const versions = [];
  const writes = [];
  const errors = [];
  const digest = (data) => createHash("sha256").update(data).digest("hex");
  function commit(envelope) {
    head = {
      gameId: "ember-road",
      slotId: "main",
      revision: (head?.revision || 0) + 1,
      checksum: digest(envelope.data),
      bytes: Buffer.byteLength(envelope.data),
      schemaVersion: envelope.schemaVersion,
      metadata: envelope.metadata,
      updatedAt: Date.now(),
      deleted: false,
      source: "cloud",
      data: envelope.data,
    };
    versions.unshift(structuredClone(head));
  }
  await context.route("https://historia.aliveville.com/**", async (route) => {
    if (unavailable) return route.abort();
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
      "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
    };
    const reply = (status, body) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/api/auth/sign-out") {
      owner = null;
      return reply(200, { success: true });
    }
    if (!owner) return reply(401, {});
    if (path === "/api/player")
      return reply(200, {
        user: { id: owner, name: "Fixture player", email: "fixture@example.test" },
        csrfToken: "fixture-csrf",
      });
    if (path.endsWith("/history"))
      return reply(200, { history: versions.map(({ data: _data, ...row }) => row) });
    if (path.endsWith("/restore")) {
      const body = request.postDataJSON();
      assert.equal(body.expectedRevision, head.revision);
      const old = versions.find((version) => version.revision === body.revision);
      assert(old);
      commit({ data: old.data, metadata: old.metadata, schemaVersion: old.schemaVersion });
      return reply(200, { ok: true, head });
    }
    if (request.method() === "PUT") {
      const body = request.postDataJSON();
      writes.push(body);
      if (body.expectedRevision !== (head?.revision || 0))
        return reply(409, { reason: "conflict" });
      commit(body.envelope);
      return reply(200, { ok: true, head });
    }
    if (path.endsWith("/saves")) return reply(200, { saves: head ? [head] : [] });
    return head ? reply(200, { save: head }) : reply(404, {});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  const account = page.getByRole("button", { name: "Account and saves", exact: true });
  try {
    await page.goto(`${origin}/play/ember-road/`);
    await page.waitForFunction(
      () =>
        window.playablesCloud?.getState().phase === "guest" && window.playablesCloud?.exportLocal(),
    );
    const guest = await page.evaluate(() => JSON.parse(window.playablesCloud.exportLocal().data));
    await account.click();
    await page.getByRole("dialog", { name: "Your journeys, kept." }).waitFor();
    const still = await page.locator("#world").screenshot();
    await page.waitForTimeout(300);
    assert(
      still.equals(await page.locator("#world").screenshot()),
      "Account panel pauses the actual canvas",
    );
    await page.getByRole("button", { name: "Close account", exact: true }).click();
    owner = "alice";
    await page.evaluate(() => window.playablesCloud.refreshSession());
    await page.getByRole("button", { name: "Add this journey to cloud", exact: true }).click();
    await page.waitForFunction(() => window.playablesCloud.getState().phase === "saved");
    assert.equal(writes[0].expectedRevision, 0);
    assert.equal(JSON.parse(writes[0].envelope.data).version, 2);
    const changed = JSON.parse(head.data);
    changed.state.meta.gold += 17;
    changed.state.meta.earnedGold += 17;
    commit({ data: JSON.stringify(changed), metadata: head.metadata, schemaVersion: "2" });
    await page.evaluate(() => window.playablesCloud.restore("main"));
    await page.getByRole("button", { name: "Continue cloud journey", exact: true }).click();
    await page.getByRole("button", { name: "Reload game", exact: true }).click();
    await page.waitForFunction(() => window.playablesCloud?.getState().phase === "saved");
    assert.equal(
      await page.evaluate(
        () => JSON.parse(window.playablesCloud.exportLocal().data).state.meta.gold,
      ),
      changed.state.meta.gold,
    );
    await account.click();
    await page.getByRole("button", { name: "Recent versions", exact: true }).click();
    await page
      .locator(".version-list li")
      .last()
      .getByRole("button", { name: "Restore", exact: true })
      .click();
    await page.getByRole("button", { name: "Restore this version", exact: true }).click();
    await page.getByRole("button", { name: "Reload game", exact: true }).click();
    await page.waitForFunction(() => window.playablesCloud?.getState().phase === "saved");
    assert.equal(
      await page.evaluate(
        () => JSON.parse(window.playablesCloud.exportLocal().data).state.meta.gold,
      ),
      guest.state.meta.gold,
    );
    await account.click();
    await page.screenshot({ path: join(evidence, "account-1440.png") });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Reload game", exact: true }).click();
    await page.waitForFunction(() => window.playablesCloud?.getState().phase === "guest");
    assert.equal(
      await page.evaluate(
        () => JSON.parse(window.playablesCloud.exportLocal().data).state.meta.gold,
      ),
      guest.state.meta.gold,
    );
    unavailable = true;
    await page.evaluate(() => window.playablesCloud.refreshSession());
    assert.equal(await page.evaluate(() => window.playablesCloud.getState().phase), "offline");
    assert.equal(await page.evaluate(() => window.playablesCloud.getState().paused), false);
    assert.deepEqual(errors, []);
    await writeFile(
      join(evidence, "acceptance.json"),
      JSON.stringify(
        {
          fixtureAccountOnly: true,
          actualGoogleRoundtrip: false,
          freshCheckpointVersion: 2,
          cloudRestoreAndReload: true,
          historyRestore: true,
          guestPreserved: true,
          panelPausesCanvas: true,
          offlinePlayable: true,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
});
