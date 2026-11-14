import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidence = process.env.WAR_CHEST_EVIDENCE_DIR || join(tmpdir(), "war-chest-pages-evidence");
await mkdir(evidence, { recursive: true });
const reservation = createServer();
await new Promise((done) => reservation.listen(0, "127.0.0.1", done));
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const origin = `http://127.0.0.1:${port}`;
const output = createWriteStream(join(evidence, "pages.log"));
const pages = spawn(
  process.execPath,
  [
    join(root, "node_modules/wrangler/bin/wrangler.js"),
    "pages",
    "dev",
    "apps/hub/dist",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--show-interactive-dev-session=false",
    "--persist-to",
    join(evidence, "state"),
  ],
  {
    cwd: root,
    env: { ...process.env, CI: "true", CLOUDFLARE_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
pages.stdout.pipe(output, { end: false });
pages.stderr.pipe(output, { end: false });
const closed = new Promise((done) => pages.once("exit", done));
try {
  let ready = false;
  for (let attempt = 0; attempt < 160; attempt++) {
    if (pages.exitCode !== null)
      throw new Error(`Pages exited ${pages.exitCode}; see ${evidence}/pages.log`);
    try {
      const response = await fetch(`${origin}/play/war-chest/`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((done) => setTimeout(done, 250));
  }
  assert(ready, `Pages did not start; see ${evidence}/pages.log`);
  for (const path of ["/play/war-chest/", "/play/ember-road/", "/play/idle-startup/"]) {
    const game = await fetch(`${origin}${path}`);
    assert.equal(game.status, 200);
    assert.match(
      game.headers.get("cache-control"),
      /no-transform/,
      "Game HTML must opt out of edge analytics injection",
    );
  }
  const hub = await fetch(origin);
  assert(
    !hub.headers.get("cache-control")?.includes("no-transform"),
    "The hub keeps its existing analytics policy",
  );
  const wasm = await fetch(`${origin}/play/war-chest/index.wasm`, {
    headers: { "Accept-Encoding": "br" },
  });
  assert.equal(wasm.status, 200);
  assert.equal(wasm.headers.get("content-encoding"), "br");
  assert.match(wasm.headers.get("cache-control"), /max-age=0/);
  assert.match(wasm.headers.get("content-type"), /application\/wasm/);
  const decoded = Buffer.from(await wasm.arrayBuffer());
  assert.equal(
    decoded.subarray(0, 4).toString(),
    "\0asm",
    "Pages plus middleware must deliver a correctly decoded WASM module",
  );
  const ranged = await fetch(`${origin}/play/war-chest/index.wasm`, {
    headers: { Range: "bytes=0-31", "Accept-Encoding": "br" },
  });
  assert.equal(ranged.status, 200, "Compressed WASM serves a complete body for Range requests");
  assert.equal(ranged.headers.get("content-encoding"), "br");
  assert.equal(
    Buffer.from(await ranged.arrayBuffer())
      .subarray(0, 4)
      .toString(),
    "\0asm",
  );
  const test = spawn(process.execPath, [join(root, "scripts/test-war-chest-browser.mjs")], {
    cwd: root,
    env: { ...process.env, WAR_CHEST_BASE_URL: origin, WAR_CHEST_EVIDENCE_DIR: evidence },
    stdio: "inherit",
  });
  const code = await new Promise((done) => test.once("exit", done));
  assert.equal(code, 0, "Actual Pages browser acceptance passes");
  console.log(
    `WAR CHEST PAGES: Brotli headers, decoded WASM and complete gameplay acceptance passed through Wrangler Pages and Functions. Evidence: ${evidence}`,
  );
} finally {
  pages.kill("SIGTERM");
  await Promise.race([closed, new Promise((done) => setTimeout(done, 5000))]);
  if (pages.exitCode === null) {
    pages.kill("SIGKILL");
    await closed;
  }
  output.end();
}
