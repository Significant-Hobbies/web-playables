export const PUBLIC_ORIGIN = 'https://historia.aliveville.com';

export type PublicRoute = {
  id: 'home' | 'play' | 'about' | 'privacy' | 'pax-historia-alternative';
  path: '/' | '/play' | '/about' | '/privacy' | '/pax-historia-alternative';
  title: string;
  description: string;
  heading: string;
  summary: string;
  sections: ReadonlyArray<{ heading: string; body: string }>;
  schemaType: 'WebSite' | 'VideoGame' | 'AboutPage' | 'PrivacyPolicy' | 'WebPage';
};

export const PUBLIC_ROUTES: ReadonlyArray<PublicRoute> = [
  {
    id: 'home',
    path: '/',
    title: 'Open Historia — AI Grand Strategy Game',
    description:
      'Play an experimental AI grand-strategy game with natural-language orders, persistent campaign memory, and 20+ scenarios.',
    heading: 'Rewrite history, one order at a time',
    summary:
      'Open Historia is a playable, open-source grand-strategy experiment where an AI Game Master adjudicates diplomacy, conflict, territory, and alternate timelines.',
    sections: [
      {
        heading: 'Start playing',
        body: 'Choose a historical, modern, alternate, or fictional scenario, command a nation in plain English, and watch the map and timeline respond.',
      },
      {
        heading: 'Current product boundary',
        body: 'The natural-language turn loop, campaign memory, local saves, optional cloud saves, and timeline branching are playable. The map and campaign pacing remain prototype-grade, so the project is held rather than presented as a finished strategy game.',
      },
    ],
    schemaType: 'WebSite',
  },
  {
    id: 'play',
    path: '/play',
    title: 'Play Open Historia — AI Grand Strategy',
    description:
      'Choose a scenario and command a civilization with natural-language orders in Open Historia.',
    heading: 'Start an alternate history',
    summary:
      'Pick a scenario, nation, difficulty, and AI provider, then issue strategic orders in natural language.',
    sections: [
      {
        heading: 'How play works',
        body: 'The AI Game Master returns structured consequences that update territory, diplomacy, events, and the campaign timeline.',
      },
      {
        heading: 'Account boundary',
        body: 'Guests can play with local saves. Sign-in enables private cloud saves; no save identifier or campaign state is part of public discovery.',
      },
    ],
    schemaType: 'VideoGame',
  },
  {
    id: 'about',
    path: '/about',
    title: 'About Open Historia — AI as the Rules Engine',
    description:
      'Learn how Open Historia combines natural-language strategy, an AI rules engine, and rewindable timelines.',
    heading: 'Steer history, one order at a time',
    summary:
      'Open Historia is an open-source AI grand-strategy game built around natural-language command and inspectable turn consequences.',
    sections: [
      {
        heading: 'AI as rules engine',
        body: 'A large language model adjudicates each turn through a strict structured contract rather than fixed combat menus.',
      },
      {
        heading: 'Rewind and branch',
        body: 'Every turn becomes a timeline snapshot, so a player can revisit a prior decision and branch a new alternate history.',
      },
    ],
    schemaType: 'AboutPage',
  },
  {
    id: 'privacy',
    path: '/privacy',
    title: 'Privacy — Open Historia',
    description:
      'How Open Historia handles sign-in identity, private saves, provider requests, and deletion.',
    heading: 'Privacy',
    summary:
      'Guests can play locally. Signed-in identity, cloud saves, and saved provider keys are used only for the requested product functions.',
    sections: [
      {
        heading: 'What is stored',
        body: 'Google OAuth identity and cloud saves are stored only when a player signs in. Saved API keys are encrypted.',
      },
      {
        heading: 'Provider requests and deletion',
        body: 'Turn context goes only to the AI provider selected by the player. Individual cloud saves can be deleted from the product.',
      },
    ],
    schemaType: 'PrivacyPolicy',
  },
  {
    id: 'pax-historia-alternative',
    path: '/pax-historia-alternative',
    title: 'Pax Historia Alternative — Free, Open-Source AI Grand Strategy',
    description:
      'Open Historia is a free, open-source, browser-playable alternative to Pax Historia: natural-language orders, 20+ scenarios, campaign memory, and no credit meter.',
    heading: 'A free, open-source Pax Historia alternative',
    summary:
      'Open Historia is an open-source AI grand-strategy experiment playable in the browser: command a nation in plain English, keep long-running campaign memory, and bring your own AI provider or play through the shared free gateway.',
    sections: [
      {
        heading: 'Why players look for alternatives',
        body: 'Pax Historia is a hosted AI sandbox platform where scenario play runs through its own service. Open Historia takes the same idea in an open direction: MIT-licensed code, browser play with local saves, and your choice of AI provider — including a local model — instead of a metered credit system.',
      },
      {
        heading: 'What you get today',
        body: 'Natural-language turns adjudicated by an AI Game Master, 20+ historical and alternate scenarios, a living world map, diplomacy threads, and a rewindable timeline that can branch into alternate histories. Cloud saves are optional and require sign-in.',
      },
      {
        heading: 'Where it is honest about its limits',
        body: 'Open Historia is a held experiment, not a polished platform: the map detail and campaign pacing are prototype-grade, and there is no multiplayer or community scenario marketplace yet.',
      },
    ],
    schemaType: 'WebPage',
  },
] as const;

export function publicRoute(pathname: string): PublicRoute | undefined {
  return PUBLIC_ROUTES.find((route) => route.path === pathname);
}

export function markdownPath(route: PublicRoute): string {
  return route.path === '/' ? '/index.md' : `${route.path}.md`;
}

export function renderMarkdown(route: PublicRoute): string {
  const sections = route.sections
    .map(({ heading, body }) => `## ${heading}\n\n${body}`)
    .join('\n\n');
  return `# ${route.heading}\n\n${route.summary}\n\n${sections}\n\n## Canonical page\n\n${PUBLIC_ORIGIN}${route.path}\n`;
}

export function agentCatalog(origin = PUBLIC_ORIGIN) {
  return {
    name: 'Open Historia',
    version: '1',
    url: origin,
    llms: `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
    sitemap: `${origin}/sitemap.xml`,
    robots: `${origin}/robots.txt`,
    markdown: { suffix: '.md', negotiation: true },
    surfaces: PUBLIC_ROUTES.map((route) => ({
      id: route.id,
      url: `${origin}${route.path}`,
      md: `${origin}${markdownPath(route)}`,
      kind: 'public',
      description: route.description,
    })),
    exclusions: [
      'dynamic play identifiers',
      'save and auth APIs',
      'private gameplay state',
      'archived Story Room',
    ],
  };
}

export function sitemapXml(origin = PUBLIC_ORIGIN): string {
  const urls = PUBLIC_ROUTES.map((route) => `  <url><loc>${origin}${route.path}</loc></url>`).join(
    '\n'
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

type OpenApiPathItem = {
  get: {
    tags: string[];
    summary: string;
    description: string;
    parameters?: unknown[];
    responses: Record<
      number,
      { description: string; content: Record<string, { schema: { type: string } }> }
    >;
  };
};

const MACHINE_SURFACES: ReadonlyArray<{
  path: string;
  tag: string;
  summary: string;
  description: string;
  responseDescription: string;
  contentType: string;
  schemaType: string;
}> = [
  {
    path: '/api/ai',
    tag: 'agent-surfaces',
    summary: 'Agent catalog',
    description: 'JSON inventory of all public agent surfaces, public routes, and exclusions.',
    responseDescription: 'Agent catalog JSON',
    contentType: 'application/json',
    schemaType: 'object',
  },
  {
    path: '/openapi.json',
    tag: 'agent-surfaces',
    summary: 'OpenAPI specification',
    description: 'OpenAPI 3.1 description of public agent and page surfaces.',
    responseDescription: 'OpenAPI 3.1 JSON',
    contentType: 'application/json',
    schemaType: 'object',
  },
  {
    path: '/sitemap.xml',
    tag: 'agent-surfaces',
    summary: 'Sitemap',
    description: 'Canonical XML sitemap of public routes.',
    responseDescription: 'XML sitemap',
    contentType: 'application/xml',
    schemaType: 'string',
  },
  {
    path: '/robots.txt',
    tag: 'agent-surfaces',
    summary: 'Robots policy',
    description: 'Crawler allow/disallow rules and sitemap pointer.',
    responseDescription: 'Plain-text robots policy',
    contentType: 'text/plain',
    schemaType: 'string',
  },
];

function machinePathItem(surface: (typeof MACHINE_SURFACES)[number]): OpenApiPathItem {
  return {
    get: {
      tags: [surface.tag],
      summary: surface.summary,
      description: surface.description,
      responses: {
        200: {
          description: surface.responseDescription,
          content: {
            [surface.contentType]: { schema: { type: surface.schemaType } },
          },
        },
      },
    },
  };
}

function publicPagePathItem(route: PublicRoute): OpenApiPathItem {
  return {
    get: {
      tags: ['public-pages'],
      summary: route.title,
      description: route.description,
      responses: {
        200: {
          description: 'HTML page with a Markdown alternate.',
          content: {
            'text/html': { schema: { type: 'string' } },
            'text/markdown': { schema: { type: 'string' } },
          },
        },
      },
    },
  };
}

export function openApiSpec(origin = PUBLIC_ORIGIN) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Open Historia',
      version: '1.0.0',
      description:
        'Open-source AI grand-strategy game where an AI Game Master adjudicates natural-language commands.',
      contact: { url: origin },
    },
    servers: [{ url: origin }],
    tags: [
      { name: 'agent-surfaces', description: 'Machine-readable discovery surfaces' },
      { name: 'public-pages', description: 'Public HTML pages with Markdown alternates' },
    ],
    paths: Object.fromEntries([
      ...MACHINE_SURFACES.map((surface) => [surface.path, machinePathItem(surface)]),
      ...PUBLIC_ROUTES.map((route) => [route.path, publicPagePathItem(route)]),
    ]),
  };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character
  );
}

export function renderPublicHtml(shell: string, route: PublicRoute): string {
  const canonical = `${PUBLIC_ORIGIN}${route.path}`;
  const structured = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': route.schemaType,
    name: route.heading,
    description: route.description,
    url: canonical,
  }).replace(/</g, '\\u003c');
  const head = `<title>${escapeHtml(route.title)}</title>\n    <meta name="description" content="${escapeHtml(route.description)}" />\n    <meta name="robots" content="index, follow" />\n    <link rel="canonical" href="${canonical}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:site_name" content="Open Historia" />\n    <meta property="og:title" content="${escapeHtml(route.title)}" />\n    <meta property="og:description" content="${escapeHtml(route.description)}" />\n    <meta property="og:url" content="${canonical}" />\n    <meta property="og:image" content="${PUBLIC_ORIGIN}/og.png" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:title" content="${escapeHtml(route.title)}" />\n    <meta name="twitter:description" content="${escapeHtml(route.description)}" />\n    <script type="application/ld+json">${structured}</script>`;
  const fallback = `<main data-public-fallback><h1>${escapeHtml(route.heading)}</h1><p>${escapeHtml(route.summary)}</p>${route.sections.map(({ heading, body }) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`).join('')}<p><a href="${markdownPath(route)}">Read this page as Markdown</a></p></main>`;
  return shell
    .replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="icon"/, `${head}\n    <link rel="icon"`)
    .replace(/<div id="root"([^>]*)><\/div>/, `<div id="root"$1>${fallback}</div>`);
}
