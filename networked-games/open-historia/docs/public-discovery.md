# Public discovery boundary

Open Historia exposes four canonical public HTML routes to browsers, crawlers,
and agents:

- `/`
- `/play`
- `/about`
- `/privacy`

`src/public-routes.ts` is the source of truth for their route-specific titles,
descriptions, public summaries, Markdown mirrors, and structured-data types.
`pnpm generate:discovery` deterministically writes the sitemap, robots policy,
agent indexes, agent catalog fixture, and four Markdown files under `public/`.
The regular build runs this generator before Vite.

The Worker serves the structured catalog at `/api/ai`, accepts an explicit
`text/markdown` request for each canonical route, and exposes the same content
at `/index.md`, `/play.md`, `/about.md`, and `/privacy.md`. Browser HTML for the
three SPA routes receives self-canonical metadata, social metadata, JSON-LD,
and route-specific fallback content before React hydrates.

The boundary is exact, not prefix-based. `/play/:id`, save identifiers and
APIs, auth and other API routes, private gameplay state, and the archived
`/story-room` prototype never appear in the sitemap, agent catalog, or Markdown
inventory. Identifier-bearing play routes receive `noindex, nofollow` in their
SPA fallback shell.

This discovery surface does not alter authentication, saves, game behavior, or
data. Deployment remains manual.
