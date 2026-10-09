#!/usr/bin/env node
// Copies the Astro landing build over dist/index.html so GET / serves the
// static marketing page while the Vite SPA lives at dist/app.html.

import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ASTRO_DIST = resolve('landing-astro/dist');
const TARGET = resolve('dist');

const PROTECTED_PREFIXES = ['assets/', 'app.html'];

async function walk(dir, rel = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const fullSrc = join(dir, e.name);
    const fullRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push(...(await walk(fullSrc, fullRel)));
    } else {
      out.push({ src: fullSrc, rel: fullRel });
    }
  }
  return out;
}

async function mergeHeaders(astroHeadersPath, targetHeadersPath) {
  const astroHeaders = existsSync(astroHeadersPath) ? await readFile(astroHeadersPath, 'utf8') : '';
  const targetHeaders = existsSync(targetHeadersPath)
    ? await readFile(targetHeadersPath, 'utf8')
    : '';
  if (!astroHeaders) return false;
  const merged = `# --- from landing-astro/dist/_headers ---\n${astroHeaders.trim()}\n\n# --- from Vite build ---\n${targetHeaders.trim()}\n`;
  await writeFile(targetHeadersPath, merged);
  return true;
}

async function main() {
  if (!existsSync(ASTRO_DIST)) {
    console.warn('[overlay-astro] no landing-astro/dist — skipping');
    return;
  }
  if (!existsSync(TARGET)) {
    console.error('[overlay-astro] no dist/ — run vite build first');
    process.exit(1);
  }

  const files = await walk(ASTRO_DIST);
  let copied = 0;
  let skipped = 0;

  for (const { src, rel } of files) {
    if (PROTECTED_PREFIXES.some((p) => rel.startsWith(p))) {
      skipped += 1;
      continue;
    }
    if (rel === '_headers') {
      await mergeHeaders(src, join(TARGET, '_headers'));
      continue;
    }
    const dest = join(TARGET, rel);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    copied += 1;
  }

  console.log(
    `[overlay-astro] copied ${copied} file(s) from landing-astro/dist → dist/, skipped ${skipped} protected path(s)`
  );
}

main().catch((err) => {
  console.error('[overlay-astro] fatal:', err);
  process.exit(1);
});
