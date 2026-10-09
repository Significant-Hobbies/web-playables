# landing-astro

Static Astro marketing landing for **Open Historia**. Deploys to
Cloudflare Pages. Intended to take over the `/` route from the
Next.js / OpenNext Worker — **but cutover is blocked** until the game
moves off `/`. See "Cutover blocker" below.

## Why a separate project?

The Worker at `historia.aliveville.com` currently
serves the entire game at `/`. `app/page.tsx` returns
`<GameClientWrapper />`, which `next/dynamic`-imports the full
MapLibre GL game client with `ssr: false`. That means:

- The HTML envelope is empty (no LCP text). The visible LCP element is
  the game's loading state, painted after the React runtime hydrates.
- The Worker still pays cold-start + OpenNext routing on every miss,
  and the Cloudflare placement is `smart` to compensate.
- There is no above-game marketing surface — search engines, OG
  unfurls, and first-time visitors get the heavy game shell.

This Astro deploy is the **marketing landing** that should sit in
front of the game once the game itself has been moved to a dedicated
URL (`/play` or `/game`).

## Stack

- Astro 5 — `output: 'static'`
- Lightning CSS — transformer + minifier (fleet web-stack standard;
  see `../../AGENTS.md` → "Fleet web stack standard")
- `@astrojs/sitemap`
- Cloudflare Pages — see `wrangler.toml`
  (`pages_build_output_dir = "dist"`)

No SSR adapter, no React, no client JS. All visuals are pure CSS.

## Structure

```
landing-astro/
  astro.config.mjs          # output: 'static', inlineStylesheets:
                            # 'always', Lightning CSS.
  wrangler.toml             # CF Pages — project name
                            # `open-historia-landing`.
  src/
    pages/index.astro       # Composes Hero / ValueProp / Features / Cta.
    layouts/Layout.astro    # Meta tags + font preloads (Playfair +
                            # Geist Sans; Geist Mono NOT preloaded).
    components/             # 4 .astro components — no React.
    styles/landing.css      # Single CSS file. Palette and typography
                            # rooted in app/globals.css.
  public/_headers           # CF Pages cache headers.
```

## Commands

```bash
pnpm install
pnpm dev        # astro dev → http://localhost:4321
pnpm build      # static HTML → dist/
pnpm preview    # serve dist/ locally
pnpm deploy     # wrangler pages deploy dist/
                #   --project-name open-historia-landing
```

## Visual / typographic system

- **Palette** — pulled from `app/globals.css`:
  - `#0B0F19` background, `#151B2B`/`#1E2538` surfaces
  - `#d97706` / `#f59e0b` (amber) — primary CTA, headings accent
  - `#10b981` (emerald) — success accent on feature II (save & share)
  - `#f43f5e` (rose) — war / branch accent on feature III (alternate
    history)
- **Type** — Playfair Display 700/900 on the hero H1 (LCP element) +
  on all section H2s. Geist Sans on body. Geist Mono on eyebrows,
  buttons, and labels (terminal flavor without preload cost).

## Cutover blocker

**The Astro landing cannot take over `/` yet.** The Worker renders
the game at `/`, and there is no separate `/play` or `/game` route
in `app/`. To unblock:

1. Move the game UI to `/play` (or `/game`). Concretely: rename
   `app/page.tsx` → `app/play/page.tsx`, and keep `app/[id]/page.tsx`
   as the existing per-session route. Update any in-game links that
   currently point at `/` (e.g. "New game" buttons in
   `GameClient.tsx`) to point at `/play` instead.
2. Verify the move on the Worker — `/play` returns the game,
   `/play/<id>` works, and the Worker no longer 404s for those.
3. Deploy this Astro project to Cloudflare Pages — covered by
   `pnpm deploy` or wire the CF dashboard build.
4. In the Cloudflare dashboard, route `open-historia.<host>/` (exact)
   → Pages project; leave everything else on the Worker.
5. Verify `/play`, `/about`, `/privacy`, `/story-room/*`, `/api/*`,
   `/[id]` etc still resolve via the Worker.

Until step 1 ships, `pnpm deploy` will publish to
`open-historia-landing.pages.dev` and the "Start a game" CTA will
404 against the live Worker.

## Compromises vs. the Worker original

- **OG image** — Next.js generates `/opengraph-image` via the
  `opengraph-image.tsx` file convention. The Astro layout points
  `og:image` at `${SITE_URL}/opengraph-image`; post-cutover the
  Worker still owns that path, so the URL keeps resolving.
- **Analytics** — the landing uses the origin-bound App Health browser
  tracker for page views and named CTA events. The `/play` links remain
  ordinary anchors; event tracking does not intercept navigation.
- **Client JS** — no React or hydration. A small click listener tracks
  marked links, while the SaaS Maker capture element loads independently.

## Notes

- The deploy is **additive** until you complete the cutover steps
  above. Nothing about the existing Worker deploy changes.
- See `../app/layout.tsx` for the canonical metadata copy that the
  Astro `Layout.astro` mirrors.
