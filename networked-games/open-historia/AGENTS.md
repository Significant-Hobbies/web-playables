# agents.md — open-historia

## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../../../AGENTS.md` and the Web Playables `../../AGENTS.md`.

## Home

Open Historia lives in the Web Playables monorepo at `networked-games/open-historia` (merged from `Significant-Hobbies/open-historia` at `84e83aa9eddc63f82e3be2d5175eb47da275b622`). It is a **networked** game: it is not a YouTube Playables target, and the certified-lane rules (no network, gamekit `Platform`, 64 KiB save envelope) do not apply here. Do not import Historia code into `games/*`, `packages/*` or `apps/*`. Install from the repo root (`pnpm install`); root shortcuts are `pnpm historia:dev|check|e2e|deploy`. CI is the `historia` job in the root `.github/workflows/ci.yml`; deploy is the manual `deploy-historia.yml`. Track work in Web Playables GitHub Issues. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

## Purpose
AI grand-strategy history game — players issue natural language commands to control civilizations; LLM acts as game master returning strict JSON state updates.

## Stack
- Frontend: Vite 8 + React 19 SPA (`src/main.tsx` → `src/router.tsx`, react-router-dom). React Compiler ON via `babel-plugin-react-compiler`.
- Worker/API: Hono on Cloudflare Workers — `src/worker.ts` mounts route modules under `src/worker/routes/*.ts`. Serves the SPA + Astro landing from the `ASSETS` binding.
- Language: TypeScript (strict)
- Styling: Tailwind CSS v4 (`@tailwindcss/vite`; dark/monospace; amber = actions, emerald = success, rose = war)
- Map: MapLibre GL JS (WebGL) via `react-map-gl/maplibre` — 3-tier hierarchical LOD
- DB: Cloudflare D1 + Drizzle ORM
- Auth: better-auth (Google OAuth, optional + Drizzle adapter)
- AI: multi-provider, called server-side in `src/worker/routes/llm.ts` — Anthropic, OpenAI, Google Gemini, DeepSeek, free-ai-gateway, local dev bridge
- Testing: Vitest unit (`lib/__tests__/`) + Playwright e2e (`e2e/`, desktop + mobile)
- Deploy: Cloudflare Workers (`open-historia`) via `wrangler deploy` (NOT OpenNext — Next.js was removed in the Vite + Hono migration)
- Package manager: pnpm

## Repo structure
```
src/
  main.tsx              # SPA entry — mounts RouterProvider
  router.tsx            # react-router routes: /play, /play/:id, /about, /privacy, /story-room
  RootLayout.tsx        # Shared SPA layout (analytics/feedback providers)
  worker.ts             # Hono fetch handler — routes /api/*, else serves ASSETS + SPA fallback
  worker/
    bind-env.ts         # Binds WorkerEnv onto module-level accessors per request
    routes/
      llm.ts            # POST /api/turn, /api/chat, /api/advisor — multi-provider LLM calls
      saves.ts          # /api/saves CRUD + /api/saves/upload (D1, Drizzle)
  pages/                # Route components: GamePage, AboutPage, PrivacyPage, StoryRoomPage, NotFoundPage
  styles/globals.css    # Tailwind v4 entry
components/
  GameClient.tsx        # Main game orchestrator (mounted by GamePage)
  MapView.tsx           # MapLibre GL JS renderer — 3-tier LOD, hit-testing (largest file)
  MapShell.tsx          # Map container/chrome
  CommandTerminal.tsx   # Terminal-style command input + history
  DiplomacyChat.tsx     # Multi-threaded nation chat UI
  Timeline.tsx          # Timeline with rewind + alternate history branching
  Advisor.tsx           # Strategic advisor panel
  GameSetup.tsx         # Scenario/nation/provider/difficulty config
  PresetBrowser.tsx     # 20+ preset scenario gallery
  SavedGamesList.tsx    # Cloud save browser
  StoryRoomPrototype.tsx# Story Rooms v0.1 local prototype
  AuthModal.tsx / UserMenu.tsx  # better-auth UI
hooks/
  useGameState.ts       # Central game state
  useTurnProcessing.ts  # POSTs command to /api/turn, handles JSON response
  useDiplomacy.ts       # /api/chat diplomacy flow
  useAdvisor.ts         # /api/advisor flow
  useSaveLoad.ts        # cloud/local save orchestration
  useTimeline.ts        # Timeline snapshots
lib/
  ai-prompts.ts         # All LLM prompt templates (strict JSON contract)
  turn-parser.ts        # Parses/validates AI turn JSON
  types.ts              # Province, Player, GameState, GameEvent, ChatThread
  world-loader.ts       # TopoJSON loading, province neighbor computation
  presets.ts            # 20+ scenario presets (historical/modern/alternate/fictional)
  worker-env.ts         # WorkerEnv type (Cloudflare bindings + secrets)
  auth.ts               # better-auth server config (createAuth)
  auth-client.ts        # better-auth browser client
  local-ai.ts           # Local dev AI bridge client
  rate-limit.ts         # In-memory sliding-window rate limiter for AI routes
  crypto.ts             # API key encryption helpers
  db/
    schema.ts           # Drizzle schema: user/session/account/verification + saved_game
    index.ts            # createDb() — Drizzle over the Worker D1 binding
landing-astro/          # Astro marketing landing, overlaid at / by scripts/overlay-astro-landing.mjs
public/
  world-50m.json        # TopoJSON world (mid-res, primary)
  world-110m.json       # TopoJSON world (low-res)
  provinces-combined.json
  admin1-detail.json    # Admin1-level detail (lazy-loaded at zoom >= 5)
scripts/
  build-provinces-map.mjs
  overlay-astro-landing.mjs  # cf:build step — overlays Astro landing onto dist/
  validate-env.mjs           # pre-deploy env validation
app.html                # SPA shell (served for /play, /about, /privacy, /story-room)
index.html              # landing entry (replaced by Astro overlay in cf:build)
wrangler.jsonc          # main = src/worker.ts; assets dir = dist; nodejs_compat (JSONC so it wins over the root Pages wrangler.jsonc)
```

## Key commands
```bash
pnpm dev          # concurrently: `wrangler dev` (worker, :8787) + `vite` (FE, :5173)
pnpm dev:worker   # wrangler dev only
pnpm dev:fe       # vite only
pnpm build        # vite build → dist/
pnpm cf:build     # vite build + build landing-astro + overlay onto dist/
pnpm deploy       # validate env → cf:build → wrangler deploy
pnpm lint         # eslint (components lib src scripts)
pnpm typecheck    # tsc on tsconfig.app.json + tsconfig.worker.json
pnpm test         # vitest run
pnpm test:e2e     # playwright (test:e2e:mobile for mobile project)
pnpm format | pnpm check  # biome

# Database
pnpm db:generate  # drizzle-kit generate (migration files)
pnpm db:migrate:local   # apply migrations to isolated local D1
pnpm db:migrate:remote  # apply reviewed migrations to production D1
```

## Architecture notes
- **Vite SPA + Hono worker**: the browser loads a React SPA (`app.html`); `/api/*` requests hit the Hono worker (`src/worker.ts`). All AI calls and DB access happen server-side in the worker — provider API keys never run in the browser. SPA routes (`/play`, `/about`, `/privacy`, `/story-room`) fall back to `app.html`; `/` serves the Astro landing.
- **React Compiler ON** — do NOT add manual `useMemo`/`useCallback`.
- **AI as game engine**: AI returns strict JSON — `{ message, updates[], newEvents[], relationChanges[], updatedStorySoFar }`. Always validate AI JSON before applying (`lib/turn-parser.ts`). Contract defined in `lib/ai-prompts.ts`.
- **`storySoFar` pattern**: each turn, AI compresses full history into a running summary to keep token count constant. Only last 8 logs + last 5 events sent as detailed context.
- **Difficulty as AI personality**: `DIFFICULTY_PROFILES` change AI behavior instructions (not numeric stats).
- **Map 3-tier LOD**: Countries (zoom 0–3.5) → Regions/provinces (2.5–6.5) → States/admin1 (5.5+). Admin1 lazy-loaded at zoom 5. Use `queryRenderedFeatures` for hit-testing. Import `MapGL` (not `Map`) from `react-map-gl/maplibre` — avoids shadowing `globalThis.Map`.
- **Auth**: better-auth (not NextAuth). Client: `lib/auth-client.ts`. Server: `lib/auth.ts`. Google OAuth only.
- **Save format**: only `provinceOwners` (id + ownerId) serialized — survives TopoJSON ID changes.
- **Province name matching**: AI may return fuzzy names — `findProvince()` tries exact → suffix-stripped → parent country name.
- **`MapView.tsx` and `GameClient.tsx`** are the largest files — be careful with edits.
- Worker bindings and secrets (`lib/worker-env.ts`, `wrangler.jsonc`): D1 binding `DB`, plus `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AI_GATEWAY_API_KEY` (legacy alias `FREE_AI_API_KEY`), `FREE_AI_GATEWAY_URL`, and `LOCAL_AI_URL`. Vite-baked client vars use the `VITE_` prefix.

<!-- FLEET-GUIDANCE:START -->

## Fleet Guidance

### Adding Tasks
- Add durable work items in SaaS Maker Cockpit Tasks when the task affects product behavior, deployment, user feedback, or fleet maintenance.
- Include the project slug, a concise title, acceptance criteria, priority/status, and links to relevant code, issues, traces, or dashboards.
- If task discovery starts locally in an editor or agent session, mirror the durable next step back into SaaS Maker before handoff.

### Using SaaS Maker
- Treat SaaS Maker as the system of record for project metadata, feedback, tasks, analytics, testimonials, changelog, and fleet visibility.
- Prefer API-first workflows through `fnd api`, the SDK, or widgets instead of one-off scripts when interacting with SaaS Maker features.
- Keep this agent file aligned with the project record when operating rules, integrations, or deployment conventions change.

### Free AI First
- Prefer free/local AI paths for routine development and analysis: the `free-ai` gateway, local models, provider free tiers, and cached context.
- Escalate to paid models only when complexity, correctness risk, or missing capability justifies the cost.
- Note any paid-AI use in the task or handoff when it materially affects cost, reproducibility, or future maintenance.

<!-- FLEET-GUIDANCE:END -->
