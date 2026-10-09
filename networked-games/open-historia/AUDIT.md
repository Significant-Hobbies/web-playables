# Security Audit -- open-historia
**Date**: 2026-03-28 | **Status**: Paused

## Secrets in Git History
No secrets found in git history. `.env*` is gitignored and `.env.local` was never committed.

## Credentials on Disk
`.env.local` contains live credentials (Turso auth token, Better Auth secret, SaasMaker API key).
These are not committed but exist on disk -- rotate if machine is shared or compromised.

## Deployment
Deployed on Cloudflare Workers via `wrangler.toml` and `@opennextjs/cloudflare`.
Do not reintroduce stale deploy targets unless the production deploy path changes.

## Code Security
- **Wide-open CORS**: `server/index.mjs:222` uses `app.use(cors())` with no origin restriction.
- **No dangerouslySetInnerHTML** usage found -- good.
- **No hardcoded secrets** in source code. All credentials accessed via `process.env`.
- Skills scripts reference `${OPENAI_API_KEY}` env var (not hardcoded).

## Action Items
- [ ] Restrict CORS in `server/index.mjs` to specific origins instead of `cors()`
- [ ] Rotate Turso auth token and Better Auth secret (exposed in local `.env.local`)
- [ ] Confirm old deployment targets are deactivated and Cloudflare Workers is the only active production deploy path
- [ ] Add Google OAuth credentials to `.env.local` or confirm they were never provisioned
