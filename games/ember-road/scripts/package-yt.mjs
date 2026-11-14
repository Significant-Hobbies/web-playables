import { execFileSync } from "node:child_process";
import { renameSync } from "node:fs";
import { resolve } from "node:path";

const pending = resolve(`dist/.ember-road-yt-${process.pid}.zip`);
execFileSync("zip", ["-rq", pending, "."], { cwd: resolve("dist/yt"), stdio: "inherit" });
renameSync(pending, resolve("dist/ember-road-yt.zip"));
