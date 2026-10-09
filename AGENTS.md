## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../AGENTS.md`. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

## Project

- **Stack**: pnpm monorepo — `packages/gamekit` (TS game framework, no build step), `games/*` (Vite vanilla-TS games), `apps/hub` (arcade site listing all games), `networked-games/*` (games that need a backend; see below)
- **Local dev**: `pnpm install`, then `pnpm dev` (first game) or `pnpm dev:hub`
- **Checks**: `pnpm check` = biome + typecheck + vitest + build for the certified lane (`packages/`, `games/`, `apps/`); `pnpm historia:check` and `pnpm historia:e2e` for Open Historia. CI runs both as separate jobs.
- **Deploy**: manual Cloudflare Pages; `pnpm build` assembles hub + games under `apps/hub/dist/` (games served at `/play/<id>/`). Networked games deploy separately (see below).

## Two lanes

- **Certified lane** — `packages/gamekit`, `games/*`, `apps/hub`. Offline, network-free, YouTube Playables submission-ready. The rules in the next section apply here.
- **Networked lane** — `networked-games/*`. Games that need AI/backend services and larger saves. They are **not** YouTube Playables targets and must not be described as certified, offline or network-free. They are excluded from root `lint`/`typecheck`/`test`/`build`/`build:yt` and the Pages site assembly; each keeps its own toolchain, checks, `AGENTS.md` and deploy. Certified code must never import from `networked-games/`, and networked games must not use `@games/gamekit`'s 64 KiB save envelope as a constraint.
  - `networked-games/open-historia` — Open Historia, an AI grand-strategy game (React + MapLibre SPA, Hono Worker, D1, better-auth, multi-provider AI). It deploys as the Cloudflare Worker `open-historia` at historia.aliveville.com through `.github/workflows/deploy-historia.yml` (manual dispatch). Read `networked-games/open-historia/AGENTS.md` before working there. It was merged from `Significant-Hobbies/open-historia` at `84e83aa9eddc63f82e3be2d5175eb47da275b622`.

## Rules that exist because of YouTube Playables certification (certified lane only)

Every game in `games/*` must stay submission-ready for YouTube Playables. Concretely:

- Game code must only touch the `Platform` interface from `@games/gamekit` — never `ytgame`, `localStorage`, or the Page Visibility API directly.
- No external network requests from game code or assets: fonts/audio/art are bundled (fonts via `@fontsource-*` packages). No CDNs, no analytics.
- All timers/animation must stop when the platform reports pause; the game loop and autosave are the only clocks.
- Layout must be fluid across 9:16, 1:1, 16:9 and live resize; input must work with both touch and mouse (pointer events).
- Saves go through gamekit's save manager (versioned envelope + migrations, 64 KiB guard). Never write a second persistence path.
- `pnpm build:yt` must keep producing a zip with `index.html` at its root and the YT SDK script tag first in `<head>`.
