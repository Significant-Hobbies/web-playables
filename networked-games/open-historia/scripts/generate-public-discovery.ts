import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  PUBLIC_ORIGIN,
  PUBLIC_ROUTES,
  agentCatalog,
  markdownPath,
  renderMarkdown,
  sitemapXml,
} from '../src/public-routes.ts';

const output = resolve('public');

async function write(relativePath: string, content: string) {
  const destination = resolve(output, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

await write(
  'robots.txt',
  `User-agent: *\nAllow: /\nAllow: /*.md$\nAllow: /api/ai\nDisallow: /api/\nDisallow: /play/\nDisallow: /story-room\nSitemap: ${PUBLIC_ORIGIN}/sitemap.xml\n`
);
await write('sitemap.xml', sitemapXml());
await write('api-ai.json', `${JSON.stringify(agentCatalog(), null, 2)}\n`);

const links = PUBLIC_ROUTES.map(
  (route) => `- [${route.heading}](${PUBLIC_ORIGIN}${markdownPath(route)}): ${route.description}`
).join('\n');
await write(
  'llms.txt',
  `# Open Historia\n\n> AI-powered grand-strategy history game — command nations through natural language.\n\n## Public pages\n\n${links}\n\n## Machine surfaces\n\n- [Agent catalog](${PUBLIC_ORIGIN}/api/ai)\n- [Sitemap](${PUBLIC_ORIGIN}/sitemap.xml)\n- [Robots](${PUBLIC_ORIGIN}/robots.txt)\n`
);
await write(
  'llms-full.txt',
  `# Open Historia — full agent brief\n\nOpen Historia is an open-source AI grand-strategy game. An AI Game Master adjudicates natural-language orders and returns structured changes to the map, diplomacy, events, and timeline.\n\n${PUBLIC_ROUTES.map(renderMarkdown).join('\n---\n\n')}\n## Discovery boundary\n\nOnly the ${PUBLIC_ROUTES.length} canonical public pages above are indexed. Dynamic play identifiers, save and auth APIs, private gameplay state, and the archived Story Room are excluded.\n`
);

for (const route of PUBLIC_ROUTES) {
  await write(markdownPath(route).slice(1), renderMarkdown(route));
}

console.log(`[discovery] generated ${PUBLIC_ROUTES.length} public route representations`);
