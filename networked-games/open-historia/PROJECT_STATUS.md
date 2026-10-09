# open-historia — PROJECT STATUS

**Portfolio state (2026-07-10): Archived.** Preserve the repository and last known-good build; reopen only for an explicit new research decision.

Last updated: 2026-09-09

## Free AI gateway source update — 2 October

Managed `free-ai` generation now calls the Fleet gateway with canonical
`open-historia` attribution. Existing explicit provider choices remain intact;
production fails closed if the binding is absent, and the existing structured
output validation, timeout and output bound are preserved. Real SDK tests cover
JSON mode, SSE passthrough, `/turn`, `/chat`, `/advisor`, and missing-binding
behavior. Typecheck, lint, 102 tests, Cloudflare build, and Wrangler top-level
dry-run pass. Pending PR review and release; no deployment was performed.
Tracked in [Free AI issue #83](https://github.com/sass-maker/free-ai/issues/83).

## Why/What

**Sub-product of [ai-game](../ai-game)** (the fleet's AI-game research umbrella). Separate repo and deploy, worked on together with ai-game as one research effort.

**Thesis:** AI-powered grand strategy game — players issue natural-language commands; AI adjudicates outcomes, nation behavior, diplomacy, and emergent historical narratives. Single-player campaign loop is the focus.

**In scope:** Vite + React SPA game, Hono worker API, MapLibre 3-tier map, diplomacy engine, order queue, timeline rewind, AI advisor, 20+ scenario presets, optional cloud saves (Cloudflare D1 + Google auth), Astro marketing landing at `/`.

**Out / parked:** Multiplayer, marketplace scenarios, generic collaborative writing unless it strengthens the game. **Story Rooms archived 2026-07-02** (see Decision below) — local-only prototype removed from navigation; code retained in-repo.

## Dependencies

### External

- **Deploy:** Cloudflare Workers (Hono worker + Vite static assets).
- **Map:** MapLibre GL JS + Natural Earth / world-atlas TopoJSON.
- **DB:** Cloudflare D1 + Drizzle — cloud saves.
- **Auth:** better-auth + Google OAuth (optional).
- **AI:** Managed inference routes through free-ai-gateway; explicit Anthropic, OpenAI, Gemini, and DeepSeek providers remain available; in-memory rate limiting on AI routes (`lib/rate-limit.ts`).
- **Offline saves:** Browser localStorage works without auth. Cloud saves require the D1 binding and Google OAuth configuration.
- **Repository:** github.com/sarthak-fleet/open-historia.

### Internal fleet

- **Landing overlay:** `landing-astro/` overlaid at `/` via `scripts/overlay-astro-landing.mjs`.
- **@saas-maker/feedback:** widget integration.

### Stack & commands

| Layer | Technology |
| --- | --- |
| Frontend | Vite 8 + React 19 SPA (`app.html`); React Compiler via babel plugin |
| Game routes | `/play`, `/play/:id`, `/about`, `/privacy` |
| Map | MapLibre GL JS + Natural Earth / world-atlas TopoJSON |
| Worker | Hono on Cloudflare Workers — `src/worker.ts` + `src/worker/routes/*` |
| DB | Cloudflare D1 + Drizzle — cloud saves |
| Auth | better-auth + Google OAuth (optional) |
| AI | free-ai-gateway chokepoint |
| Landing | `landing-astro/` overlaid at `/` |
| Tests | Vitest unit; Playwright e2e (desktop + mobile) |

```bash
pnpm install
pnpm dev                    # wrangler dev + vite concurrently
pnpm dev:fe | pnpm dev:worker
pnpm build | pnpm cf:build  # vite build + Astro landing overlay
pnpm validate:env:deploy && pnpm deploy
pnpm lint | pnpm typecheck | pnpm test | pnpm test:e2e | pnpm test:e2e:mobile
pnpm db:generate | db:migrate | db:push | db:studio
pnpm format | pnpm check    # biome
```

```
Browser → Cloudflare Worker
  ├─ /api/auth/*     better-auth handler
  ├─ /api/saves/*    D1 CRUD + upload
  ├─ /api/turn       execute commands (LLM proxy)
  ├─ /api/chat       diplomacy chat
  ├─ /api/advisor    strategic advice
  └─ ASSETS          Vite build + landing index.html + SPA fallback for /play/*
```

**De-OpenNext migration complete:** Vite SPA + Hono worker replaces prior OpenNext stack. README and `AGENTS.md` stack/deploy/structure sections were realigned to the Vite + Hono reality (2026-06-23); `package.json` scripts remain authoritative on commands.

## Timeline

- **2026-09-08** — Campaign-save repair adds backward-compatible v3.2 snapshots for relations, diplomacy chats, advisor history, timelines, queued orders and story-step IDs. Initial and manual loads restore these fields; turn snapshots capture post-update territory ownership. Failed Save & Exit preserves the active campaign, and unreadable stored saves are not overwritten. Local browser regressions exercise reload/re-save and quota failure; hosted acceptance remains tracked in issue 27.

- **2026-09-08** — Live replacement-model call reached inference but returned unreadable JSON. Follow-up requests JSON output explicitly with a 2048-token budget; adapter tests cover text and structured responses, memory retention and safe malformed-output handling. Live completion remains pending issue 27.

- **2026-09-08** — Guest qualification found a live retired-model error, dropped orders on failure and root-level save URLs returning 404. Source repairs keep campaign links under `/play/<id>`, retain year/orders until a successful AI response, and reject overlapping turn requests. Browser regression covers provider failure, retry, local save and reload. Release and remaining campaign quality are tracked in [issue 27](https://github.com/sarthakagrawal927/open-historia/issues/27); source tests alone do not qualify the live game.

- **2026-08-02** — Migrated cloud-save and Better Auth persistence from Turso/libSQL to the project-owned Cloudflare D1 database; production now uses the `DB` binding.
- **2026-08-01** — Completed a four-route public discovery boundary for `/`, `/play`, `/about`, and `/privacy`: canonical HTML metadata and crawlable fallback content, equivalent Markdown, and matching runtime sitemap and agent catalog. Dynamic play identifiers, saves, auth/API paths, private game state, and archived Story Room remain excluded. No deployment, migration, or data publication was performed.
- **2026-07-17** — Assigned the canonical owned domain `historia.aliveville.com` to the production Cloudflare Worker.
- **2026-07-02** — **Story Rooms archived.** Decision: hide, not graduate. The local-only `/story-room` prototype (v0.1) was a divergent collaborative-writing experiment with no persistence, no API, no tests, and no path to the core strategy loop; it split polish and confused users about the product. Removed the route from `src/router.tsx`, dropped `/story-room` from `SPA_PREFIXES` in `src/worker.ts`, and removed the AboutPage link. Code retained in-repo as an archived experiment (`StoryRoomPrototype.tsx`, `StoryRoomPage.tsx`, `lib/story-room-fixtures.ts`, `STORY-ROOMS.md`). Resolves planned item #2.
- **2026-07-02** — Added `api.onError()` global error handler + outer try/catch in worker fetch handler; added React `<ErrorBoundary>` wrapping `RouterProvider` in `main.tsx`.
- **Stack migration:** De-OpenNext complete — Vite SPA + Hono worker is current production path.
- **Story Rooms v0.1:** local prototype at `/story-room` — no shared database with core strategy saves.
- **README/AGENTS drift fixed (2026-06-23):** stack, deploy, and repo-structure sections now describe the Vite SPA + Hono worker stack.

## Decision log

### 2026-07-02 — Story Rooms: archive (hide), not graduate

**Context:** Two competing game experiences shipped in nav — the primary AI grand-strategy game (`/play`) and the Story Rooms local prototype (`/story-room`). This sprint's task was to decide Story Rooms' fate: graduate or delete.

**Evaluation:**
- Primary game (`/play`): full-stack product — MapLibre map, diplomacy, timeline, AI advisor, 20+ presets, cloud saves, auth, server-side multi-provider AI, Vitest + Playwright tests. This *is* the product thesis.
- Story Rooms (`/story-room`): v0.1 local-only prototype — 825-line component + fixtures, no persistence, no API/network, fixture-only "AI", **zero tests**, no shared state with the core game. A divergent product concept (collaborative writing/canon-voting, "StoryTunes") with no path to the strategy loop.

**Decision:** Archive (hide from user-facing surfaces). The primary experience is decisively more complete, polished, tested, and on-thesis. Story Rooms split polish and confused users about what open-historia is.

**What changed (no code deleted):**
- `src/router.tsx` — removed `/story-room` route + `StoryRoomPage` import (left an archival note).
- `src/worker.ts` — removed `/story-room` from `SPA_PREFIXES`.
- `src/pages/AboutPage.tsx` — removed the "Experiments & prototypes" Story Room link.
- `README.md` — Story Room section marked ARCHIVED with rationale.
- Code retained in-repo: `components/StoryRoomPrototype.tsx`, `src/pages/StoryRoomPage.tsx`, `lib/story-room-fixtures.ts`, `STORY-ROOMS.md`.

**Resolves:** planned item #2 ("Decide whether Story Rooms graduates").

## Products

| Product | Route / surface | Role |
| --- | --- | --- |
| Grand strategy game | `/play`, `/play/:id` | Natural-language orders, map, diplomacy, timeline |
| Story Rooms | _(archived 2026-07-02)_ | Local collaborative canon prototype (v0.1) — route removed from nav; code retained in-repo |
| Marketing landing | `/` | Astro overlay with WWII sample timeline + CTA |
| Cloud saves | `/api/saves/*` | Cloudflare D1 persistence with optional Google auth |
| Local saves | Browser localStorage | Works without authentication |

## Features (shipped)

### Core game systems

- **AI Game Master:** Multiple providers, 5 difficulty levels, era-aware narrative, dynamic events.
- **Interactive map:** 3-tier LOD (country → region → province); click-to-select; relation borders (war/hostile/allied styling); themes (classic, cyberpunk, parchment, blueprint).
- **Diplomacy engine:** Direct chat with AI leaders; relationship tracking (neutral, friendly, allied, hostile, war, vassal).
- **Order queue:** Queue multiple commands; advance time to execute.
- **Timeline rewind:** Review past turns; branch alternate timelines.
- **AI advisor:** Military/diplomatic/economic advice on demand.
- **20+ presets:** Historical (WWII, Cold War, Fall of Rome, …), modern, alternate history, fictional scenarios — see `lib/presets.ts`.

### Persistence & auth

- Cloudflare D1 persistence for cloud saves; Drizzle schema + deterministic migrations.
- better-auth Google login; save CRUD + upload endpoints in worker.
- Local-only saves without authentication.

### Story Rooms (v0.1 prototype) — ARCHIVED 2026-07-02

- **Archived:** route removed from navigation; code retained in-repo as an experiment.
- Was an isolated local demo — voted collaborative canon, branch archive, fixture AI co-author suggestions. No shared database with core strategy saves, no persistence, no API, no tests.
- **Decision rationale:** divergent product concept (collaborative writing/canon-voting) with no path to the core grand-strategy loop; split polish and confused users. The primary `/play` experience is the product. Files kept: `components/StoryRoomPrototype.tsx`, `src/pages/StoryRoomPage.tsx`, `lib/story-room-fixtures.ts`, `STORY-ROOMS.md`.

### Landing & activation

- Astro landing at `/` with WWII sample timeline from `ww2-1939` preset + "Start exploring" CTA in `PresetBrowser`.
- Four canonical public routes share one discovery contract with HTML metadata,
  structured data, Markdown mirrors, an HTML-only sitemap, and `/api/ai`; see
  [`docs/public-discovery.md`](docs/public-discovery.md).

### Quality

- React Compiler enabled.
- Vitest + Playwright coverage; mobile e2e project.
- Biome format/check in CI scripts.
- Rate limiting on AI routes via in-memory sliding-window limiter (`lib/rate-limit.ts`).

## Todo / Planned / Deferred / Blocked

### Planned

1. Tighten end-to-end campaign loop — natural-language orders, map state, timeline, and AI adjudication in one coherent turn cycle.
2. ~~Decide whether Story Rooms graduates into main game or stays local experiment.~~ **Resolved 2026-07-02 — archived (hidden from nav, code retained).**
3. Improve diplomacy and nation behavior — inspectable, explainable turn consequences.
4. Revisit CORS audit residuals before production expansion.

### Deferred

- Generic collaborative writing/editor scope unless it directly strengthens the game.
- Paid multiplayer, marketplace scenarios, community publishing — behind stable single-player loop.
- Story Rooms — archived 2026-07-02 (route removed from nav; code retained in-repo). Cloud persistence / API-backed AI for it will not be pursued.
- Real-time multiplayer.
- **Closure decision (2026-07-10):** pause new campaign features and retain the current single-player prototype under the ai-game research umbrella. Reopen only for a demonstrated coherent turn-cycle playtest.

### Blocked

- AI providers require internet; local dev AI bridge (`lib/local-ai.ts`, `LOCAL_AI_URL`) for dev mode only.
- API cost varies by provider ($0.10–$0.50/hr typical on GPT-4 class models) — user-supplied keys.
- Deploy: push to `main` triggers GitHub Actions; PRs get preview workers.
- Env validation: `pnpm validate:env:deploy` before production deploy.
- `AGENTS.md` — comprehensive file map and prompt system for AI agents.

- September 8 responsive repair: campaign panels reflow below 1100px; desktop diplomacy clears the toolbar; empty timeline can reopen; terminal scroll stays local. Map zoom-expression validation and same-origin WebKit worker testing are repaired. Source/browser verification and release evidence: artifacts/design/README.md. Live release qualification remains pending.

### September 9 — bounded rewind source repair

Guest rewind now restores saved prompt/context memory and the branch parent across reload; older incomplete snapshots remain inspection-only. Fixed timeline node/popup interaction defects found by actual desktop/mobile clicks and screenshots. See [qualification](docs/qualification/rewind-2026-09-09/README.md) and [issue 27](https://github.com/sarthakagrawal927/open-historia/issues/27). Guarded source d6d052f is deployed at 100%; real guest rewind/save/reload and next-request parent checks pass at 390px, with final 1280px reopen. The subsequent layout repair is recorded below; historical/cloud-save gates remain.

### September 9 — bounded panel and branch layout repair

Desktop panels now share vertical space; short viewports use the established stacked layout. Timeline branches have separate centered touch targets and labels. The same captured real guest campaign passed six viewport checks including 1100×741 and 1280×720, with story and replay controls reachable. See [layout qualification](docs/qualification/layout-2026-09-09/README.md). Source 9445110 passed exact CI 34326491238 and the six deploy gates, then deployed at 100%; public six-viewport layout checks and guest UI Save/reload passed. Exact version/rollback receipt is linked there. Inactive experimental status and historical/account qualification gates are unchanged.
