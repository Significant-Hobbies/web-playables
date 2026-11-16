import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as M from "../games/ember-road/src/model.ts";
import { createSiteServer } from "./serve-site.mjs";

test("Ember account prompt suspends and restores decisions without changing the checkpoint", {
  timeout: 90000,
}, async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(root, "networked-games/open-historia/package.json"));
  const { chromium } = require("@playwright/test");
  const evidence =
    process.env.CLOUD_SAVE_EVIDENCE_DIR || join(tmpdir(), "playables-cloud-evidence", "overlay");
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
  const errors = [],
    results = [];
  function fresh() {
    const state = M.initialState(927113);
    state.meta.experience.introSeen = true;
    for (const lesson in state.meta.experience.lessons)
      state.meta.experience.lessons[lesson] = true;
    return state;
  }
  const choice = fresh();
  M.startRun(choice);
  for (let i = 0; i < 10000 && choice.phase.kind !== "choice"; i++) {
    if (choice.phase.kind === "route") M.chooseRoute(choice, "spring");
    M.stepGame(choice, 1 / 30);
  }
  assert.equal(choice.phase.kind, "choice");
  assert(M.validState(choice));
  const checkpoint = (page) =>
    page.evaluate(() => JSON.parse(window.playablesCloud.exportLocal().data).state);
  async function session(state, viewport, { storageBlocked = false } = {}) {
    const context = await browser.newContext({ viewport });
    let signedIn = false,
      head = null,
      expireWrites = false,
      signInAttempts = 0,
      releaseIdentity;
    const identityGate = storageBlocked
      ? new Promise((resolve) => {
          releaseIdentity = resolve;
        })
      : Promise.resolve();
    await context.addInitScript(
      ({ raw, storageBlocked }) => {
        localStorage.setItem("save:ember-road:v1", raw);
        if (storageBlocked) {
          Storage.prototype.getItem = () => {
            throw new DOMException("Storage denied", "SecurityError");
          };
          Storage.prototype.setItem = () => {
            throw new DOMException("Storage denied", "SecurityError");
          };
        }
      },
      { raw: JSON.stringify({ version: 5, savedAt: Date.now(), state }), storageBlocked },
    );
    await context.route("https://historia.aliveville.com/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
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
      if (path === "/api/auth/sign-in/social") {
        signInAttempts++;
        return reply(503, {});
      }
      if (path === "/api/auth/sign-out") {
        signedIn = false;
        return reply(200, { success: true });
      }
      if (path === "/api/player") await identityGate;
      if (!signedIn) return reply(401, {});
      if (path === "/api/player")
        return reply(200, {
          user: { id: "alice", name: "Sarthak", email: "fixture@example.test" },
          csrfToken: "fixture-csrf",
        });
      if (request.method() === "PUT") {
        if (expireWrites) return reply(401, {});
        const body = request.postDataJSON();
        assert.equal(body.expectedRevision, head?.revision || 0);
        const { envelope } = body;
        head = {
          ...envelope,
          gameId: "ember-road",
          slotId: "main",
          revision: (head?.revision || 0) + 1,
          checksum: createHash("sha256").update(envelope.data).digest("hex"),
          bytes: Buffer.byteLength(envelope.data),
          updatedAt: Date.now(),
          deleted: false,
          source: "cloud",
        };
        return reply(200, { ok: true, head });
      }
      if (path.endsWith("/saves")) return reply(200, { saves: head ? [head] : [] });
      return head ? reply(200, { save: head }) : reply(404, {});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/play/ember-road/`, { waitUntil: "domcontentloaded" });
    if (storageBlocked)
      await page.waitForFunction(() =>
        window.playablesCloud?.getState().message?.includes("Browser storage is unavailable"),
      );
    else await page.waitForFunction(() => window.playablesCloud?.getState().phase === "guest");
    return {
      context,
      page,
      login: async () => {
        signedIn = true;
        await page.evaluate(() => window.playablesCloud.refreshSession());
      },
      head: () => head,
      expire: () => {
        expireWrites = true;
      },
      signInAttempts: () => signInAttempts,
      releaseIdentity,
      futureCloud: () => {
        const data = JSON.stringify({ version: 6, savedAt: Date.now(), state });
        head = {
          gameId: "ember-road",
          slotId: "main",
          revision: 1,
          schemaVersion: "6",
          checksum: createHash("sha256").update(data).digest("hex"),
          bytes: Buffer.byteLength(data),
          data,
          metadata: { title: "A newer journey" },
          updatedAt: Date.now(),
          source: "cloud",
          deleted: false,
        };
      },
    };
  }
  try {
    for (const [width, height] of [
      [1280, 800],
      [768, 1024],
      [390, 844],
    ]) {
      const { context, page, login, head } = await session(choice, { width, height });
      const oath = page.locator(".decision--choice[open]");
      await oath.waitFor();
      const before = await checkpoint(page);
      await login();
      await page.locator("#playables-account-host").locator("dialog[open]").waitFor();
      await page.screenshot({ path: join(evidence, `checkpoint-${width}.png`) });
      assert.equal(
        await page.locator(".game-dialog[open], .story-opening[open]").count(),
        0,
        "Account and game decisions must not be stacked",
      );
      const prompt = page.getByRole("dialog", { name: "Keep your journey safe.", exact: true });
      await prompt.waitFor();
      assert(
        (
          await page.getByRole("button", { name: "Account and saves", exact: true }).textContent()
        ).includes("Save your journey"),
      );
      assert(
        await prompt.locator(".checkpoint-portrait").evaluate(async (node) => {
          const url = getComputedStyle(node).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
          if (!url) return false;
          const image = new Image();
          image.src = url;
          try {
            await image.decode();
            return image.naturalWidth > 0;
          } catch {
            return false;
          }
        }),
        "Rook's checkpoint portrait must load through the assembled host boundary",
      );
      assert.equal(await prompt.getByText("No cloud journey", { exact: true }).count(), 0);
      assert.equal(
        await prompt.getByRole("button", { name: "Download local save", exact: true }).isVisible(),
        false,
      );
      const rect = await prompt.boundingBox();
      assert(rect.width <= 480 && rect.y >= 0 && rect.y + rect.height <= height + 1);
      await page.keyboard.press("1");
      await page.waitForTimeout(300);
      assert.deepEqual(
        (await checkpoint(page)).phase,
        before.phase,
        "Host prompt must not consume a power choice",
      );
      if (width === 1280) {
        await prompt.getByRole("button", { name: "Not now · keep playing", exact: true }).click();
        await oath.waitFor();
        assert.deepEqual((await checkpoint(page)).phase, before.phase);
        assert.equal((await checkpoint(page)).run.time, before.run.time);
        await page.keyboard.press("1");
        await page.waitForFunction(
          () => JSON.parse(window.playablesCloud.exportLocal().data).state.phase.kind !== "choice",
        );
        assert.equal(
          (await checkpoint(page)).run.perks[before.phase.options[0]],
          (before.run.perks[before.phase.options[0]] || 0) + 1,
        );
        assert.equal(head(), null, "Declining cloud setup must not upload progress");
        await page.getByRole("button", { name: "Account and saves", exact: true }).click();
        await page.getByRole("button", { name: "Reconnect cloud saves", exact: true }).click();
        await page.getByRole("button", { name: "Save to my account", exact: true }).click();
        await page.waitForFunction(() => window.playablesCloud.getState().phase === "saved");
        assert(head(), "The reconnect action must lead to actual save setup");
      } else {
        await prompt.getByRole("button", { name: "Save to my account", exact: true }).click();
        await oath.waitFor();
        assert(head());
        assert.deepEqual(JSON.parse(head().data).state.phase, before.phase);
        assert.equal(await page.locator("#playables-account-host dialog[open]").count(), 0);
      }
      results.push({ width, height, oneOverlay: true, checkpointPreserved: true });
      await context.close();
    }
    const opening = M.initialState(47);
    const { context, page, login } = await session(opening, { width: 1280, height: 800 });
    await page.locator('.story-opening[open] #prologue-next[data-scene="0"]').click();
    await page.locator('.story-opening[open] #prologue-next[data-scene="1"]').waitFor();
    await login();
    await page.getByRole("dialog", { name: "Keep your journey safe.", exact: true }).waitFor();
    assert.equal(await page.locator(".game-dialog[open], .story-opening[open]").count(), 0);
    await page.getByRole("button", { name: "Not now · keep playing", exact: true }).click();
    await page.locator('.story-opening[open] #prologue-next[data-scene="1"]').waitFor();
    await context.close();
    {
      const s = await session(fresh(), { width: 1280, height: 800 });
      await s.page.getByRole("button", { name: "Account and saves", exact: true }).click();
      await s.page.getByRole("button", { name: "Continue with Google", exact: true }).click();
      await s.page
        .getByText("Google sign-in is unavailable. Local progress is kept.", { exact: true })
        .waitFor();
      assert.equal(s.signInAttempts(), 1);
      await s.page.screenshot({ path: join(evidence, "sign-in-unavailable.png") });
      await s.context.close();
    }
    {
      const s = await session(fresh(), { width: 1280, height: 800 });
      s.futureCloud();
      await s.login();
      const update = s.page.getByRole("dialog", { name: "Keep your checkpoint.", exact: true });
      await update.waitFor();
      assert(
        await update.getByRole("button", { name: "Download local save", exact: true }).isVisible(),
      );
      const exportBounds = await update
        .getByRole("button", { name: "Download local save", exact: true })
        .boundingBox();
      const updateBounds = await update.boundingBox();
      assert(
        exportBounds.y >= updateBounds.y &&
          exportBounds.y + exportBounds.height <= updateBounds.y + updateBounds.height,
        "Required recovery export must be visible without scrolling past account management",
      );
      assert.equal(
        JSON.parse((await s.page.evaluate(() => window.playablesCloud.exportLocal())).data).version,
        5,
      );
      await s.page.screenshot({ path: join(evidence, "update-required.png") });
      await s.context.close();
    }
    {
      const s = await session(fresh(), { width: 1280, height: 800 }, { storageBlocked: true });
      try {
        await s.page.locator("#skip-prologue").click();
        await s.page.getByRole("button", { name: "Account and saves", exact: true }).click();
        await s.page
          .getByText(
            "Browser storage is unavailable. Keep this tab open; progress cannot be saved here.",
            { exact: true },
          )
          .waitFor();
        assert.equal(
          await s.page.locator(".ember-checkpoint").count(),
          0,
          "Unavailable storage must not show a saved checkpoint checkmark",
        );
        await s.page.screenshot({ path: join(evidence, "storage-unavailable.png") });
      } finally {
        s.releaseIdentity();
        await s.page.waitForFunction(() => window.playablesCloud.getState().phase === "guest");
        await s.context.close();
      }
    }
    {
      const s = await session(choice, { width: 1280, height: 800 });
      await s.login();
      await s.page.getByRole("button", { name: "Save to my account", exact: true }).click();
      await s.page.locator(".decision--choice[open]").waitFor();
      s.expire();
      await s.page.keyboard.press("1");
      await s.page.evaluate(() => window.playablesCloud.checkpoint());
      await s.page
        .getByText("Your session expired. Sign in again; local progress is kept.", { exact: true })
        .waitFor();
      await s.page
        .getByRole("dialog")
        .filter({ has: s.page.getByRole("button", { name: "Sign in again", exact: true }) })
        .waitFor();
      await s.page.getByRole("button", { name: "Sign in again", exact: true }).first().click();
      await s.page
        .getByText("Google sign-in is unavailable. Local progress is kept.", { exact: true })
        .waitFor();
      assert.equal(
        s.signInAttempts(),
        1,
        "Expired sessions must re-authenticate instead of switching to a guest journey",
      );
      assert.equal(
        await s.page.evaluate(() => window.playablesCloud.getState().reloadRequired),
        false,
      );
      await s.page.screenshot({ path: join(evidence, "session-expired.png") });
      await s.page.getByRole("button", { name: "Close account", exact: true }).click();
      const before = (await checkpoint(s.page)).run.time;
      await s.page.waitForTimeout(350);
      await s.page.evaluate(() => window.playablesCloud.checkpoint());
      assert(
        (await checkpoint(s.page)).run.time > before,
        "Expired cloud sessions must still permit local play",
      );
      assert.equal(await s.page.locator("#playables-account-host dialog[open]").count(), 0);
      await s.context.close();
    }
    assert.deepEqual(errors, []);
    await writeFile(
      join(evidence, "overlay-acceptance.json"),
      JSON.stringify(
        {
          fixtureAccountOnly: true,
          actualGoogleRoundtrip: false,
          results,
          prologueStepPreserved: true,
          signInFailureVisible: true,
          updateExportsVisible: true,
          storageWarningVisible: true,
          expiryReauthenticatesAndKeepsLocalPlay: true,
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
