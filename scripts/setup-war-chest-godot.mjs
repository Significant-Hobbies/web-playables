import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const version = "4.7.2";
const cache = join(homedir(), ".cache", `war-chest-godot-${version}`);
const mac = platform() === "darwin";
if (!mac && platform() !== "linux")
  throw new Error("Use GODOT_BIN and matching official web templates on this platform.");
const assets = [
  {
    name: mac ? "Godot_macos.zip" : "Godot_linux.zip",
    upstream: mac
      ? "Godot_v4.7.2-stable_macos.universal.zip"
      : "Godot_v4.7.2-stable_linux.x86_64.zip",
    sha: mac
      ? "c58a24e31d720be9d62f60cb5627c4e695fb72f21b0cfe1bc9ccaa9a3b3ba63e"
      : "cadd3204e728a35d3f13adb7fd0d7902636b79f6b95c40c265eb73b6c35329e4",
  },
  {
    name: "templates.tpz",
    upstream: "Godot_v4.7.2-stable_export_templates.tpz",
    sha: "f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011",
  },
];
mkdirSync(cache, { recursive: true });
for (const asset of assets) {
  const path = join(cache, asset.name);
  if (!existsSync(path)) {
    console.log(`Downloading official ${asset.upstream}`);
    const response = await fetch(
      `https://github.com/godotengine/godot-builds/releases/download/4.7.2-stable/${asset.upstream}`,
    );
    if (!response.ok || !response.body)
      throw new Error(`Godot download failed: ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(path));
  }
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const digest = hash.digest("hex");
  if (digest !== asset.sha)
    throw new Error(
      `Checksum mismatch for ${path}; preserve the file for inspection and retry with a clean cache location.`,
    );
  console.log(`Verified ${asset.upstream}`);
}
execFileSync("unzip", ["-q", "-o", join(cache, assets[0].name), "-d", cache]);
const templates = mac
  ? join(homedir(), "Library/Application Support/Godot/export_templates/4.7.2.stable")
  : join(homedir(), ".local/share/godot/export_templates/4.7.2.stable");
mkdirSync(templates, { recursive: true });
execFileSync("unzip", [
  "-q",
  "-j",
  "-o",
  join(cache, "templates.tpz"),
  "templates/web_nothreads_*.zip",
  "-d",
  templates,
]);
console.log(`Godot ${version} and web templates ready.`);
