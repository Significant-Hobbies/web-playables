import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

async function freePort() {
  const socket = createServer();
  await new Promise((done) => socket.listen(0, "127.0.0.1", done));
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  return port;
}

for (const product of ["idle", "historia"]) {
  test(`${product}: actual local runtime preserves public and private representations`, {
    timeout: 60000,
  }, async () => {
    const port = await freePort();
    const inspector = await freePort();
    const runtime = `http://127.0.0.1:${port}`;
    const directory = await mkdtemp(join(tmpdir(), "web-playables-readable-"));
    let args;
    if (product === "idle") {
      for (const folder of ["functions", "shared"])
        await symlink(resolve(folder), join(directory, folder), "dir");
      args = ["pages", "dev", resolve("apps/hub/dist")];
    } else {
      const config = join(directory, "wrangler.json");
      await writeFile(
        config,
        JSON.stringify({
          name: "historia-readability-local",
          main: resolve("networked-games/open-historia/src/worker.ts"),
          compatibility_date: "2026-06-09",
          compatibility_flags: ["nodejs_compat"],
          assets: {
            directory: resolve("networked-games/open-historia/dist"),
            binding: "ASSETS",
            run_worker_first: true,
          },
        }),
      );
      args = ["dev", "--config", config, "--local"];
    }
    const server = spawn(
      process.execPath,
      [
        resolve("node_modules/wrangler/bin/wrangler.js"),
        ...args,
        "--ip",
        "127.0.0.1",
        "--port",
        String(port),
        "--inspector-port",
        String(inspector),
        "--log-level",
        "error",
      ],
      { cwd: directory, detached: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let logs = "";
    server.stdout.on("data", (data) => {
      logs += data;
    });
    server.stderr.on("data", (data) => {
      logs += data;
    });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 150; attempt++) {
        try {
          if ((await fetch(runtime + "/robots.txt")).ok) {
            ready = true;
            break;
          }
        } catch {
          /* Local server is starting. */
        }
        if (server.exitCode !== null) break;
        await new Promise((done) => setTimeout(done, 200));
      }
      assert.ok(ready, logs);
      const catalog = await (await fetch(runtime + "/api/md/_catalog")).json();
      assert.equal(catalog.length, product === "idle" ? 2 : 5);
      const agent = await (await fetch(`${runtime}/api/ai`)).json();
      assert.equal(agent.markdown.negotiation, true);
      assert.equal(agent.surfaces.length, catalog.length);
      const api = await (await fetch(`${runtime}/openapi.json`)).json();
      assert.ok(api.paths["/api/md/_catalog"]);
      for (const route of catalog) {
        const suffix = await fetch(runtime + new URL(route.md).pathname);
        assert.equal(suffix.status, 200, route.path + logs);
        assert.match(suffix.headers.get("content-type"), /text\/markdown/);
        assert.equal(suffix.headers.get("x-robots-tag"), "noindex, follow");
        assert.equal(suffix.headers.get("access-control-allow-origin"), "*");
        assert.ok(
          [route.url, runtime + new URL(route.url).pathname].includes(
            suffix.headers.get("content-location"),
          ),
        );
        const body = await suffix.text();
        assert.ok(body.includes("Canonical: " + route.url));
        assert.ok(Number(suffix.headers.get("x-markdown-tokens")) > 0);
        for (const path of ["/api/md" + route.path, route.path]) {
          const response = await fetch(runtime + path, { headers: { accept: "text/markdown" } });
          assert.equal(response.status, 200);
          assert.equal(await response.text(), body);
        }
        const head = await fetch(runtime + new URL(route.md).pathname, { method: "HEAD" });
        assert.equal(await head.text(), "");
        for (const name of ["content-type", "content-location", "x-markdown-tokens"])
          assert.equal(head.headers.get(name), suffix.headers.get(name));
        const options = await fetch(runtime + "/api/md" + route.path, { method: "OPTIONS" });
        assert.equal(options.status, 204);
        const html = await fetch(runtime + route.path);
        assert.equal(html.status, 200);
        assert.match(html.headers.get("content-type"), /text\/html/);
        assert.match(html.headers.get("link"), /llms-full.txt/);
        const text = await html.text();
        assert.ok(text.includes('name="ai-summary"'));
        assert.ok(text.includes(`href="${route.md}"`));
      }
      for (const accept of [
        "*/*",
        "text/markdown;q=0",
        "text/markdown, text/html",
        "text/markdown;q=0.5, text/html;q=0.9",
      ])
        assert.match(
          (await fetch(runtime + "/", { headers: { accept } })).headers.get("content-type"),
          /text\/html/,
        );
      const excluded =
        product === "idle"
          ? ["/missing.md", "/auth/private.md", "/api/md/dashboard"]
          : [
              "/play/private-save.md",
              "/admin/private.md",
              "/story-room.md",
              "/api/md/play/private-save",
              "/api/md/api/saves",
            ];
      for (const path of excluded) assert.equal((await fetch(runtime + path)).status, 404, path);
      if (product === "idle") {
        const alias = await fetch(runtime + "/play/idle-startup/index.md");
        const canonical = await fetch(runtime + "/play/idle-startup.md");
        assert.equal(await alias.text(), await canonical.text());
      }
      const policy = await (await fetch(runtime + "/ai.txt")).text();
      assert.ok(policy.includes("training: allowed on public pages only"));
      const robots = await (await fetch(runtime + "/robots.txt")).text();
      for (const bot of [
        "GPTBot",
        "ClaudeBot",
        "Google-Extended",
        "Applebot-Extended",
        "CCBot",
        "Bytespider",
      ])
        assert.ok(robots.includes(`User-agent: ${bot}\nAllow: /`));
      const full = await (await fetch(runtime + "/llms-full.txt")).text();
      assert.ok(full.length <= 500000);
      console.log(
        JSON.stringify({
          product,
          routes: catalog.map((route) => route.path),
          fullCharacters: full.length,
        }),
      );
    } finally {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        /* Already stopped. */
      }
      await new Promise((done) => (server.exitCode !== null ? done() : server.once("exit", done)));
      execFileSync("/usr/bin/trash", [directory]);
    }
  });
}
