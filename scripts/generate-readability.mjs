import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { GAMES } from "../apps/hub/src/games.ts";
import { PUBLIC_COPY } from "../apps/hub/src/public-copy.ts";
import {
  buildAiTxt,
  buildFullMarkdown,
  buildMarkdownIndex,
} from "../shared/agent-surfaces/documents.mjs";
import { absoluteMarkdownLinks } from "../shared/agent-surfaces/format.mjs";
import { markdownPathFor } from "../shared/agent-surfaces/http.mjs";
import { createAgentSurfaceManifest } from "../shared/agent-surfaces/manifest.mjs";
import { robotsPolicy } from "../shared/robots-policy.mjs";

const require = createRequire(new URL("../apps/hub/package.json", import.meta.url));
const ts = require("typescript");
const origin = "https://idle.aliveville.com";
const identity = {
  name: "Idle — Web Playables",
  url: origin,
  summary: PUBLIC_COPY.intro,
  sitemap: origin + "/sitemap.xml",
  openapi: origin + "/openapi.json",
  contact: "https://github.com/Significant-Hobbies/web-playables",
  trainingAllowed: true,
  updatedAt: "2026-10-27",
  excludedPaths: ["/api", "/auth", "/admin", "/dashboard"],
};
const pages = {
  "/": `# ${PUBLIC_COPY.wordmark}\n\n${PUBLIC_COPY.status}\n\n${PUBLIC_COPY.intro}\n\n${GAMES.map((game) => `## ${game.title}\n\n${game.tagline}\n\n[Play →](${origin}/play/${game.id}/)`).join("\n\n")}\n\n## ${PUBLIC_COPY.proofTitle}\n\n${PUBLIC_COPY.proofEyebrow}\n\n${PUBLIC_COPY.proofBody}\n`,
};
for (const game of GAMES.filter((game) => game.status === "live")) {
  const source = await readFile(resolve("games", game.id, "src/ui.ts"), "utf8");
  const tree = ts.createSourceFile("ui.ts", source, ts.ScriptTarget.Latest, true);
  let setup;
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "showFounderPicker")
      setup = node.initializer;
    else ts.forEachChild(node, find);
  }
  find(tree);
  if (!setup) throw new Error(`Missing public setup source for ${game.id}`);
  const text = [];
  function collect(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === "el" &&
      node.arguments[2] &&
      ts.isStringLiteral(node.arguments[2])
    )
      text.push(node.arguments[2].text);
    if (
      ts.isBinaryExpression(node) &&
      node.left.getText(tree).endsWith(".placeholder") &&
      ts.isStringLiteral(node.right)
    )
      text.push(node.right.text);
    ts.forEachChild(node, collect);
  }
  collect(setup);
  const brief = (await readFile(resolve("apps/hub/public/play", game.id, "index.md"), "utf8"))
    .replace(/## Canonical page[\s\S]*$/, "")
    .trim();
  pages[`/play/${game.id}/`] =
    `${brief}\n\n${game.tagline}\n\n## New game setup\n\n${text.map((line) => "- " + line).join("\n")}\n\nThe playable page keeps player names, company names, saves, balances, progress and generated candidates in the game. This public representation contains only the authored entry instructions.\n\n[Play ${game.title}](${origin}/play/${game.id}/) · [Game directory](${origin}/)\n`;
}
const routes = Object.entries(pages).map(([path, body]) => ({
  path,
  url: origin + path,
  md: origin + markdownPathFor(path),
  title: body.match(/^# (.+)/)[1],
  description:
    path === "/" ? identity.summary : GAMES.find((game) => path.includes(game.id)).tagline,
}));
for (const route of routes)
  pages[route.path] = absoluteMarkdownLinks(
    pages[route.path].replace(/^(# [^\n]+)\n/, `$1\n\nCanonical: ${route.url}\n`),
    route.url,
  );
const manifest = createAgentSurfaceManifest({ ...identity, pages });
async function write(path, value) {
  const file = resolve("apps/hub/public", path.replace(/^\//, ""));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, value);
}
for (const route of routes) await write(markdownPathFor(route.path), pages[route.path]);
await write("api/md/_catalog", JSON.stringify(routes));
await write("api/md/_identity", JSON.stringify(identity));
await write(
  "api-ai.json",
  JSON.stringify({ ...manifest.catalog, openapi: identity.openapi }, null, 2) + "\n",
);
await write("llms.txt", buildMarkdownIndex(manifest, routes));
await write("llms-full.txt", await buildFullMarkdown(manifest, routes, (path) => pages[path]));
await write("ai.txt", buildAiTxt(manifest, routes));
await write("robots.txt", robotsPolicy(identity));
console.log(`Generated ${routes.length} public Idle route representations.`);
