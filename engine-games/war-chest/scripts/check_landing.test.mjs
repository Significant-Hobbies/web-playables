import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const validator = join(root, 'scripts/check_landing.py');

function runValidator(fixtureRoot) {
  return spawnSync('python3', [validator], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, WAR_CHEST_LANDING_ROOT: fixtureRoot ?? root },
  });
}

test('approved static landing assets satisfy the source contract', () => {
  const result = runValidator();
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Landing checks passed/u);
});

test('rejects a landing whose intrinsic screenshot dimensions regress', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'war-chest-landing-'));
  mkdirSync(join(fixtureRoot, 'site/images'), { recursive: true });
  copyFileSync(join(root, 'ASSETS.md'), join(fixtureRoot, 'ASSETS.md'));
  copyFileSync(join(root, 'site/index.html'), join(fixtureRoot, 'site/index.html'));
  for (const name of ['battle-1440.png', 'chest-1440.png']) {
    copyFileSync(join(root, `site/images/${name}`), join(fixtureRoot, `site/images/${name}`));
  }
  const html = readFileSync(join(root, 'site/index.html'), 'utf8');
  writeFileSync(join(fixtureRoot, 'site/index.html'), html.replace('width="1440"', 'width="1439"'));

  const result = runValidator(fixtureRoot);
  assert.equal(result.error, undefined, result.error?.message);
  assert.notEqual(result.status, 0, 'invalid intrinsic dimensions must fail the check');
  assert.match(result.stderr, /intrinsic 1440x900 dimensions/u);
});

test('rejects screenshot bytes that no longer match the reviewed native captures', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'war-chest-landing-'));
  mkdirSync(join(fixtureRoot, 'site/images'), { recursive: true });
  copyFileSync(join(root, 'ASSETS.md'), join(fixtureRoot, 'ASSETS.md'));
  copyFileSync(join(root, 'site/index.html'), join(fixtureRoot, 'site/index.html'));
  for (const name of ['battle-1440.png', 'chest-1440.png']) {
    copyFileSync(join(root, `site/images/${name}`), join(fixtureRoot, `site/images/${name}`));
  }
  const screenshot = join(fixtureRoot, 'site/images/battle-1440.png');
  const bytes = readFileSync(screenshot);
  bytes[bytes.length - 1] ^= 1;
  writeFileSync(screenshot, bytes);

  const result = runValidator(fixtureRoot);
  assert.equal(result.error, undefined, result.error?.message);
  assert.notEqual(result.status, 0, 'unreviewed screenshot bytes must fail the check');
  assert.match(result.stderr, /does not match the reviewed screenshot provenance/u);
});
