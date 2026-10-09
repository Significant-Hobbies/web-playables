# Web Playables

HTML5 games hub — a tiny framework (`gamekit`) + games built on it, playable on
the web, embeddable anywhere, and packaged to [YouTube Playables](https://developers.google.com/youtube/gaming/playables)
certification spec.

Live arcade: <https://idle.aliveville.com>

## Layout

```
packages/gamekit     framework: platform adapter (web/yt), loop, saves, offline, format
games/idle-startup   game #1 — idle startup simulator
apps/hub             arcade site listing all games (serves games at /play/<id>/)
networked-games/open-historia
                     Open Historia — AI grand-strategy game with its own Worker,
                     D1 and AI backend (historia.aliveville.com). Not a YouTube
                     Playables target; see its README and AGENTS.md.
```

## Quickstart

```bash
pnpm install
pnpm dev        # idle-startup at http://localhost:5173
pnpm dev:hub    # hub site
pnpm check      # biome + typecheck + vitest + full build
```

## Builds

- `pnpm build` — builds every package, then assembles the deployable site in
  `apps/hub/dist/` (hub at `/`, each game at `/play/<id>/`).
- `pnpm build:yt` — rebuilds idle-startup with the YT Playables SDK script
  injected first in `<head>`, zips it with `index.html` at the zip root →
  `games/idle-startup/dist/idle-startup-yt.zip`. Upload that in the Playables
  developer portal (access is invite-gated; the bundle is kept
  certification-ready).

## Embedding a game on any site

```html
<iframe
  src="https://<hub-domain>/play/idle-startup/"
  style="width:100%; aspect-ratio:9/16; max-height:90vh; border:0"
  loading="lazy"
  allow="fullscreen"
  title="Idle Startup"
></iframe>
```

Local proof: `pnpm build && pnpm preview`, then open
`games/idle-startup/embed-test.html` — the game in iframes at 9:16, 1:1, 16:9.

## Adding a new game

1. `cp -R` an existing game dir under `games/<new-id>` (or start from
   `index.html` + `vite.config.ts` + `src/main.ts`).
2. Depend on `"@games/gamekit": "workspace:*"`; only ever talk to the
   `Platform` interface (saves, audio, pause, ready signals) — that is what
   keeps the game YT-certifiable.
3. Register it in `apps/hub/src/games.ts` so the hub lists it and
   `scripts/assemble-site.mjs` copies its build to `/play/<id>/`.

## Asset licenses

- Scene backdrops & cover art: generated with FLUX.1-schnell on Cloudflare
  Workers AI (bundled JPEGs, no runtime fetches).
- Icon artwork: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji)
  © Microsoft, MIT license (3D set, vendored into `src/sprites/`, no runtime
  fetches). Fonts via Fontsource (OFL). Everything else is
  original/procedural.

## YouTube Playables constraints baked into this repo

Initial bundle <30 MB (ours ≪1 MB) · load <5 s · save ≤64 KiB guarded in
gamekit · **no external requests** (fonts bundled via @fontsource) · relative
paths (`base:'./'`) · all aspect ratios + live resize · touch + mouse ·
pause halts everything · saves only via SDK (web build falls back to
localStorage).


## Shareability verification and retained work — 2026-09-07

The live desktop browser experiment is shareable within its stated parked-game
scope. Fresh Chrome verification opened the public hub and retained Idle Startup
save, purchased the $80K CI pipeline upgrade, and observed net income increase
from about $1.03K to $1.99K per game day with payroll unchanged at $900/day.
Closing and reopening the game retained the upgrade, changed revenue and existing
team. The desktop game rendered a readable two-column company/org layout with
illustrated office, visible costs and revenue trade-offs.

This verifies a real upgrade decision and resumed browser persistence, not a new
player onboarding run, full economy balance, mobile/touch behavior or YouTube
certification. Those remain qualification work if broader distribution is pursued;
the parked research decision and no-promised-next-game boundary remain intact.
The public hub footer still contains a retired Journal link from the externally
served studio footer; its deployed projection needs refresh separately.

Task reconciliation found no open GitHub issues on this date; none were closed.
