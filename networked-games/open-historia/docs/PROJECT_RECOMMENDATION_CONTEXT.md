# Project Recommendation Context

Generated: 2026-06-06T21:14:19.579Z

This file is a CodeVetter Repo Unpacked-inspired audit written for Starboard recommendations. It is intentionally local, evidence-oriented, and safe to commit: it records product context, feature areas, stack inventory, and recommendation guidance without secrets or environment values.

## Project Identity

- Slug: `open-historia`
- Registry description: Interactive historical timeline and storytelling platform.
- Product grouping: `public-ready`
- Source path: `open-historia`

## Product Context

Interactive historical timeline and storytelling platform.

Open Historia is an AI-powered grand strategy game where players issue natural-language commands and AI adjudicates outcomes, nation behavior, diplomacy, and emergent historical narratives.

Open Historia Rewrite history through AI-powered grand strategy. Open Historia is a unique strategy game where you command nations using natural language. Issue orders like "Invade West Coast" or "Negotiate trade with Japan", and watch as AI adjudicates outcomes, drives independent nation behavior, and creates emergent narratives spanning from ancient empires to speculative futures. --- Deployment & External Services Concern Service --------- --------- Hosting Cloudflare Workers open-historia via @opennextjs/cloudflare Database Turso libSQL via Drizzle ORM Auth better-auth + Google OAuth AI free-ai-gateway routes managed requests to available providers; Anthropic, OpenAI & Google Gemini APIs remain supported via explicit configuration CI/CD GitHub

## Feature Map

- **Cloudflare and deploy**: Workers, Pages, edge runtime, queues, storage, and deploy automation. Keywords: cloudflare, worker, workers, pages, edge, deploy, wrangler, queue.
- **UI workflows**: Dashboards, tables, forms, component systems, charts, and user workflows. Keywords: ui, ux, dashboard, table, component, react, next, tailwind.
- **Game and simulation**: Game loops, simulations, world state, NPC behavior, physics, and interactive gameplay. Keywords: game, simulation, simulator, world, npc, character, gameplay, physics.
- **Database and storage**: SQL, document storage, migrations, cache, queues, vectors, and persistence. Keywords: database, db, sql, sqlite, postgres, turso, libsql, drizzle.
- **Content and media**: Content production, video, reels, documents, markdown, and publishing workflows. Keywords: content, media, video, reel, markdown, document, publish, editor.
- **Auth and identity**: Auth, OAuth, sessions, users, permissions, and account flows. Keywords: auth, oauth, identity, session, user, permission, login, nextauth.
- **AI agents**: Agents, tool use, workflows, orchestration, RAG, evals, and model integration. Keywords: ai, agent, agents, llm, rag, embedding, eval, model.

## Runtime Surfaces and Entrypoints

- `app/[id]/page.tsx`
- `app/about/page.tsx`
- `app/api/advisor/route.ts`
- `app/api/auth/[...all]/route.ts`
- `app/api/chat/route.ts`
- `app/api/saves/[id]/route.ts`
- `app/api/saves/route.ts`
- `app/api/saves/upload/route.ts`
- `app/api/turn/route.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/privacy/page.tsx`
- `app/story-room/page.tsx`
- `worker.mjs`

## Current Stack

- Languages: `Astro`, `TypeScript`
- Frameworks/tools: `Astro`, `Cloudflare Workers`, `Drizzle`, `Next.js`, `OpenNext Cloudflare`, `Playwright`, `React`, `Tailwind CSS`, `Vitest`
- Config files:
- `drizzle.config.ts`
- `landing-astro/astro.config.mjs`
- `landing-astro/wrangler.toml`
- `next.config.ts`
- `playwright.config.ts`
- `vitest.config.ts`
- `wrangler.toml`

## OSS Already In Use

Direct dependencies:
- `@anthropic-ai/sdk`
- `@astrojs/sitemap`
- `@fontsource-variable/geist`
- `@fontsource-variable/playfair-display`
- `@google/generative-ai`
- `@libsql/client`
- `@saas-maker/changelog-widget`
- `@saas-maker/feedback`
- `@saas-maker/sdk`
- `@saas-maker/testimonials`
- `@types/d3-geo`
- `@types/topojson-client`
- `astro`
- `better-auth`
- `d3-geo`
- `drizzle-orm`
- `maplibre-gl`
- `next`
- `openai`
- `posthog-js`
- `react`
- `react-dom`
- `react-map-gl`
- `topojson-client`
- `world-atlas`

Development dependencies:
- `@opennextjs/cloudflare`
- `@playwright/test`
- `@saas-maker/eslint-config`
- `@saas-maker/prettier-config`
- `@saas-maker/tsconfig`
- `@tailwindcss/postcss`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `babel-plugin-react-compiler`
- `beasties`
- `drizzle-kit`
- `eslint`
- `eslint-config-next`
- `husky`
- `lightningcss`
- `tailwindcss`
- `topojson-server`
- `topojson-simplify`
- `typescript`
- `vitest`
- `wrangler`

Package scripts:
- `astro`
- `build`
- `cf:build`
- `db:generate`
- `db:migrate`
- `db:push`
- `db:studio`
- `deploy`
- `dev`
- `lint`
- `prepare`
- `preview`
- `start`
- `test`
- `test:e2e`
- `test:e2e:mobile`
- `test:watch`
- `typecheck`
- `validate:env:deploy`

## Testing and Quality Signals

- `e2e/mobile.spec.ts`
- `lib/__tests__/turn-parser.test.ts`
- `playwright.config.ts`
- `vitest.config.ts`

## Recommendation Guidance

Good matches:
- Repos that strengthen cloudflare and deploy without replacing already-installed libraries.
- Repos that strengthen ui workflows without replacing already-installed libraries.
- Repos that strengthen game and simulation without replacing already-installed libraries.
- Repos that strengthen database and storage without replacing already-installed libraries.
- Repos that strengthen content and media without replacing already-installed libraries.
- Repos that strengthen auth and identity without replacing already-installed libraries.
- Repos that strengthen ai agents without replacing already-installed libraries.
- Tools with concrete support for api, fill, saves, style, game, map, advisor, chat.
- Implementation repos, SDKs, CLIs, testing utilities, adapters, and focused libraries are higher value than generic awesome lists.

Avoid recommending:
- Do not recommend packages already listed under direct or development dependencies unless the task is migration research.
- Do not recommend broad framework replacements unless the project context explicitly calls for a rewrite.
- Downrank curated lists, archived repos, stale demos, and generic UI kits that do not map to the feature catalog.

## Evidence Read

Primary docs and handoff files:
- `AGENTS.md`
- `PROJECT_STATUS.md`
- `README.md`

Package manifests:
- `landing-astro/package.json`
- `package.json`

Inventory notes:
- Files scanned: 200
- This pass uses deterministic repo inventory plus local documentation/source-path evidence. It does not claim a full manual line-by-line review of every source file.

## Confidence

Confidence: **high**

Why:
- PROJECT_STATUS.md present
- README.md present
- 14 entrypoint/runtime files identified
- package dependencies inventoried
- 4 test/quality files identified

Refresh command:

```bash
cd /Users/sarthak/Desktop/fleet/starboard
pnpm fleet:audit-recommendation-context
pnpm fleet:extract-projects
```
