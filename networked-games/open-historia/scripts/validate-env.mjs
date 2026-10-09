import { spawnSync } from 'node:child_process';

const REQUIRED_WORKER_SECRETS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

function parseSecretNames(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => item?.name ?? item).filter(Boolean);
    }
  } catch {
    // Fall through to line parsing for older wrangler output.
  }

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^([A-Z][A-Z0-9_]+)\b/)?.[1])
    .filter(Boolean);
}

function fail(message) {
  console.error(`[env] ${message}`);
  process.exit(1);
}

function validateDeploySecrets() {
  const result = spawnSync('pnpm', ['exec', 'wrangler', 'secret', 'list', '--format', 'json'], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    fail(`Unable to list Cloudflare Worker secrets.\n${result.stderr || result.stdout}`);
  }

  const present = new Set(parseSecretNames(result.stdout));
  const missing = REQUIRED_WORKER_SECRETS.filter((name) => !present.has(name));

  if (missing.length > 0) {
    fail(`Missing Cloudflare Worker secrets: ${missing.join(', ')}`);
  }
}

const mode = process.argv[2] ?? 'deploy';

if (mode !== 'deploy') {
  fail(`Unknown validation mode: ${mode}`);
}

validateDeploySecrets();
console.log('[env] Cloudflare deploy secrets are configured.');
