import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".css": "text/css",
  ".xml": "application/xml",
  ".json": "application/json",
  ".md": "text/markdown",
};
export function createSiteServer(dist) {
  return createServer(async (request, response) => {
    try {
      const path = new URL(request.url, "http://localhost").pathname;
      const file = resolve(dist, `.${path.endsWith("/") ? `${path}index.html` : path}`);
      if (!file.startsWith(`${dist}/`)) throw new Error("Outside site");
      const body = await readFile(file);
      const headers = { "Content-Type": types[extname(file)] || "application/octet-stream" };
      if (path === "/play/war-chest/index.wasm" && body.subarray(0, 4).toString() !== "\0asm")
        headers["Content-Encoding"] = "br";
      response.writeHead(200, headers);
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const port = Number(process.env.PORT || 4178);
  createSiteServer(resolve(root, "apps/hub/dist")).listen(port, "127.0.0.1", () =>
    console.log(`Web Playables: http://127.0.0.1:${port}`),
  );
}
