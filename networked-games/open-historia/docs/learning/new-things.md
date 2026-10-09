# New things to learn — open-historia

Novel tech powering an LLM-as-game-master grand strategy game on the edge.

---

## Multi-LLM as Game Engine (JSON contract)
- What: LLM is the sole arbiter of game logic — player types natural language, AI returns typed JSON state patches.
- Why here: TBD
- Gotcha: LLM frequently wraps JSON in markdown fences or emits prose preamble; `lib/turn-parser.ts:76-80` (`extractJsonCandidate`) strips ` ```json ` / ` ``` ` then greedy-matches the outermost `{...}` before `JSON.parse`. A hard parse failure returns `parseError: true` with zero state mutations.
- Source: https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview

---

## `storySoFar` Compression Strategy
- What: Each turn the AI is told to rewrite its own rolling summary (max 500 words) so total token spend stays flat regardless of game length.
- Why here: TBD
- Gotcha: Anything the AI omits from `storySoFar` is permanently forgotten — incomplete rewrites silently lose history. The actual context window sent per turn is `logs.slice(-15)` + `events.slice(-10)` (`hooks/useTurnProcessing.ts:109-110`); the `formatHistory` helper inside `lib/ai-prompts.ts:31` further trims display to the last 8 entries, so the raw payload and the rendered prompt window differ.
- Source: https://developers.openai.com/api/docs/guides/conversation-state (same pattern, different provider)

---

## MapLibre GL JS — WebGL Tile Rendering
- What: Open-source WebGL map renderer; renders GeoJSON as GPU fill/line layers with data-driven paint expressions.
- Why here: TBD
- Gotcha: `import Map from 'maplibre-gl'` shadows `globalThis.Map`; the codebase imports as `MapGL` from `react-map-gl/maplibre` (`components/MapView.tsx:19`) to avoid the collision. `globalThis.Map` is used explicitly in the tier-3 color-inheritance `useMemo` (`MapView.tsx:561`).
- Source: https://maplibre.org/maplibre-gl-js/docs/

---

## 3-Tier Hierarchical LOD (zoom-gated layers)
- What: Three GeoJSON datasets swap visibility via MapLibre `minzoom`/`maxzoom` paint interpolations: countries (0–3.5), regions (2.5–6.5), admin1 states (5.5+).
- Why here: TBD
- Gotcha: Admin1 detail (`admin1-detail.json`) is lazy-fetched only once zoom ≥ 5 fires (`MapView.tsx:680-685`). Color inheritance runs client-side in `tier3Colored` (`MapView.tsx:559-574`): a `regionColorMap` is built from tier-2 features keyed on their `.id` property mapped to `.fillColor`, then each tier-3 feature looks up its own `.regionId` in that map; missing entries fall back to `#334155`.
- Source: https://maplibre.org/maplibre-style-spec/layers/

---

## Antimeridian Fix for GeoJSON Polygons
- What: Polygons crossing ±180° longitude produce a horizontal rendering artifact unless consecutive vertex longitudes are normalized to within 180° of each other.
- Why here: TBD
- Gotcha: The fix must be applied per ring, not per feature — `fixRing()` at `components/MapView.tsx:171-181` walks adjacent vertices and nudges ±360° to keep the delta ≤ 180°. `fixGeometry()` (line 184) fans it out to both `Polygon` and `MultiPolygon` coordinate arrays.
- Source: https://macwright.com/2016/09/26/the-180th-meridian.html

---

## Turso (libSQL) Edge Database
- What: SQLite-compatible database replicated to Cloudflare edge PoPs; accessed via HTTP from Workers without a persistent TCP connection.
- Why here: TBD
- Source: https://docs.turso.tech/introduction

---

## OpenNext on Cloudflare Workers
- What: Adapter that compiles a Next.js App Router build into a Cloudflare Worker + static assets binding, replacing Node.js primitives with CF equivalents.
- Why here: TBD
- Gotcha: Incremental cache must be overridden to `staticAssetsIncrementalCache` (`open-next.config.ts:2`); without it the Worker re-renders pages at runtime and any build-time inlined critical CSS (Beasties, run via `scripts/inline-critical-css.mjs` in `cf:build`) is lost because the runtime re-renders from `page.js` rather than serving the prerendered HTML.
- Source: https://opennext.js.org/cloudflare

---

## Difficulty as AI Personality (not numeric stats)
- What: Instead of adjusting numeric modifiers, difficulty level injects a prose paragraph into the system prompt that changes the AI's adjudication disposition.
- Why here: TBD
- Gotcha: `DIFFICULTY_PROFILES` at `lib/ai-prompts.ts:6` is a plain `Record<string, string>` — five entries from "Sandbox" to "Impossible". An unrecognised difficulty string silently falls back to `"Realistic"` (line 146). Adding a new tier requires only a new key; no numeric tuning or separate code path exists.
- Source: TBD

---

## TopoJSON + topojson-client in the Browser
- What: Compact topology-aware format that shares arcs between adjacent polygons; `topojson-client` converts it to standard GeoJSON at runtime.
- Why here: TBD
- Source: https://github.com/topojson/topojson-client

---

## Next.js 16 + React Compiler
- What: Babel/SWC plugin that automatically inserts memoization, making manual `useMemo`/`useCallback` redundant.
- Why here: TBD
- Gotcha: React Compiler is ON (`package.json` devDependency `babel-plugin-react-compiler: 1.0.0`) — adding manual memo hooks conflicts with the compiler's own output and can produce double-memoization bugs. `components/MapView.tsx` still contains manual `useMemo` calls (pre-compiler era) that should be left as-is until a dedicated cleanup pass.
- Source: https://react.dev/learn/react-compiler
