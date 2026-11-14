import { readFile, writeFile } from "node:fs/promises";
import { brotliCompressSync, constants } from "node:zlib";

const file = new URL("../engine-games/war-chest/dist/web/index.wasm", import.meta.url);
const raw = await readFile(file);
if (raw.subarray(0, 4).toString() !== "\0asm")
  throw new Error("Expected a fresh uncompressed WebAssembly export.");
const compressed = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });
if (compressed.length > 25 * 1024 * 1024)
  throw new Error("War Chest exceeds the Pages single-asset limit.");
await writeFile(file, compressed);
console.log(
  `War Chest WASM: ${raw.length} raw bytes, ${compressed.length} Brotli bytes. Serve with Content-Encoding: br.`,
);
