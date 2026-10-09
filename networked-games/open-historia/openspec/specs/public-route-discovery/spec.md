# public-route-discovery Specification

## Purpose
Defines a complete, consistent, and privacy-safe discovery boundary for Open Historia's canonical public pages across browsers, crawlers, and agents.
## Requirements
### Requirement: One canonical public route inventory
The system SHALL define exactly `/`, `/play`, `/about`, and `/privacy` as canonical public HTML routes and SHALL use that inventory for every generated discovery surface.

#### Scenario: Discovery inventories agree
- **WHEN** the sitemap and agent catalog are requested
- **THEN** both enumerate exactly the same four canonical public HTML routes

#### Scenario: Private and noncanonical routes stay excluded
- **WHEN** any discovery artifact is generated
- **THEN** it excludes `/play/:id`, save identifiers, save and auth APIs, all other API routes, archived `/story-room`, and private gameplay state

### Requirement: Every public route has equivalent human and agent representations
Each canonical public route SHALL have substantive crawlable HTML and readable Markdown available through both a `.md` route and Markdown content negotiation.

#### Scenario: Markdown mirror is requested
- **WHEN** an agent requests a canonical route with a `.md` suffix or an accepted Markdown media type
- **THEN** the system returns a readable Markdown representation of that route's public content

#### Scenario: Browser HTML is requested
- **WHEN** a browser requests a canonical public route
- **THEN** the response includes substantive route-specific fallback content before client rendering

### Requirement: Route-correct discovery metadata
Every canonical public HTML response SHALL identify itself with an absolute self-canonical URL, route-specific title and description, Open Graph and Twitter metadata, indexable robots metadata, and applicable JSON-LD structured data.

#### Scenario: Public route metadata is inspected
- **WHEN** any canonical public HTML route is fetched
- **THEN** its canonical and social URL equal that exact route and its metadata describes that route rather than a generic shell

### Requirement: Supporting crawler and agent files are truthful
The system SHALL serve robots, HTML-only sitemap, `llms.txt`, `llms-full.txt`, and `/api/ai` responses whose URLs use the canonical production origin and whose route claims match the public route inventory.

#### Scenario: Agent catalog is requested
- **WHEN** `/api/ai` is requested
- **THEN** the Worker returns structured JSON describing all and only the canonical public routes and their Markdown mirrors

#### Scenario: Sitemap is requested
- **WHEN** `/sitemap.xml` is requested
- **THEN** the response contains only canonical HTML URLs and contains no Markdown, API, identifier-bearing, auth, save, or archived routes

### Requirement: Discovery parity is regression-tested
Automated tests SHALL prove route inventory parity, Markdown coverage, route-specific metadata, canonical origin correctness, and private-route exclusions.

#### Scenario: Public route contract changes
- **WHEN** the route or discovery implementation is validated
- **THEN** tests fail if any canonical public route is missing, any discovery inventory disagrees, or any excluded route becomes discoverable

