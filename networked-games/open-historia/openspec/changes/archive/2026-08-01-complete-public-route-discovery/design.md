## Context

See `proposal.md` for motivation. The Astro build owns `/`, Vite builds one generic `app.html` for the remaining SPA routes, and the Hono Worker selects that shell for known prefixes. Public crawler files are currently hand-maintained assets, which has allowed route and origin drift.

## Goals / Non-Goals

**Goals:**

- Make a typed four-route manifest the authority for discovery output and route metadata.
- Keep HTML and Markdown content aligned without importing the interactive React application into the Worker.
- Preserve the existing Astro landing and SPA runtime while making their initial responses useful without JavaScript.
- Fail closed for dynamic play identifiers and every private or operational path.

**Non-Goals:**

- Server-rendering the React game.
- Indexing save-specific play routes or exposing gameplay state.
- Restoring Story Room, changing application navigation, or redesigning public pages.
- Deploying, migrating data, or changing runtime secrets.

## Decisions

### Centralize public discovery data in a dependency-free module

A small typed module will contain route path, title, description, Markdown, fallback HTML, and structured-data kind. Both build-time asset generation and Worker routing can consume it. This avoids a second route list while keeping browser-only React modules out of Worker and script contexts. Hand-maintaining each output independently was rejected because it caused the current drift.

### Generate static files and serve negotiation at the Worker boundary

A repository script will materialize robots, sitemap, agent indexes, catalog JSON, and `.md` files under `public/`. The Worker will also map exact canonical paths to Markdown when requested via `Accept`, and will serve `/api/ai` explicitly. Static generation keeps direct asset behavior cheap; Worker handling provides content negotiation and closes the missing API route.

### Inject metadata and fallback content into built HTML

The build overlay will transform the landing output and SPA shell using the route manifest, while the Worker will select or render the exact route shell for `/play`, `/about`, and `/privacy`. This preserves the Vite/React architecture and avoids adding SSR. A generic client-only shell was rejected because crawlers receive neither route identity nor substantive content.

### Match routes exactly

Only exact paths in the manifest participate in discovery or negotiation. `/play/:id` continues through the interactive SPA path but is non-indexable and absent from inventories. Prefix-based discovery was rejected because it could leak identifiers or future private routes.

## Risks / Trade-offs

- **[Static files can drift if generation is skipped]** → Run the generator as part of builds and add a deterministic clean-tree/parity test.
- **[Fallback copy can diverge from hydrated UI]** → Keep it concise, route-level, and sourced from the same public manifest used for Markdown and metadata.
- **[Worker HTML rewriting adds response work]** → Cache the small generated shells in module scope and limit rewriting to four exact public routes.
- **[Content negotiation can surprise browser clients]** → Return Markdown only for an explicit Markdown media type; normal browser requests continue to receive HTML.

## Migration Plan

Land the generated assets, Worker routes, build integration, and tests together. No database or production migration is required. Deployment remains a separate manual operation; rollback is a code revert to the prior static assets and shell routing.
