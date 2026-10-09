## Why

Open Historia's public discovery files and route shells disagree about which pages are canonical, leaving crawlers and agents with an obsolete domain, incomplete Markdown coverage, and generic metadata. The archived product should have a small, truthful discovery boundary that documents its public surfaces without exposing gameplay state or private APIs.

## What Changes

- Define one source of truth for the four canonical public HTML routes: `/`, `/play`, `/about`, and `/privacy`.
- Generate matching robots, sitemap, `llms.txt`, `llms-full.txt`, `/api/ai`, route Markdown, and content-negotiated Markdown from that contract.
- Serve route-correct canonical, description, social, structured-data, and crawlable fallback content for every public HTML route.
- Keep `/play/:id`, save identifiers and APIs, auth APIs, other API routes, archived `/story-room`, and private gameplay state outside discovery output.
- Add parity and exclusion tests; update durable product status without deploying, migrating, or publishing data.

## Capabilities

### New Capabilities

- `public-route-discovery`: Defines the canonical public route inventory, human and agent representations, metadata, and private-route exclusions.

### Modified Capabilities

None.

## Impact

The change affects the Hono Worker route boundary, SPA HTML fallback generation, public crawler/agent files, build overlay behavior, tests, and public-route documentation. It adds no dependency, database change, deployment, or production-data operation.
