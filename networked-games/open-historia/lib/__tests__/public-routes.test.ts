import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

import worker from '../../src/worker';
import {
  PUBLIC_ORIGIN,
  PUBLIC_ROUTES,
  agentCatalog,
  markdownPath,
  publicRoute,
  renderMarkdown,
  renderPublicHtml,
  sitemapXml,
} from '../../src/public-routes';

const shell = `<!doctype html><html><head><title>Generic</title><meta name="description" content="Generic"><link rel="icon" href="/icon.png"></head><body><div id="root"></div></body></html>`;

const assets = {
  async fetch(request: Request) {
    const path = new URL(request.url).pathname;
    if (path === '/app') {
      return new Response(shell, { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('missing', { status: 404 });
  },
};

const env = { ASSETS: assets } as never;
const context = {} as ExecutionContext;

describe('public route discovery', () => {
  it('uses exactly five canonical public routes across catalog and sitemap', () => {
    expect(PUBLIC_ROUTES.map(({ path }) => path)).toEqual([
      '/',
      '/play',
      '/about',
      '/privacy',
      '/pax-historia-alternative',
    ]);
    expect(agentCatalog().surfaces.map(({ url }) => new URL(url).pathname)).toEqual(
      PUBLIC_ROUTES.map(({ path }) => path)
    );
    const sitemap = sitemapXml();
    for (const route of PUBLIC_ROUTES) {
      expect(sitemap).toContain(`<loc>${PUBLIC_ORIGIN}${route.path}</loc>`);
      expect(renderMarkdown(route)).toContain(`${PUBLIC_ORIGIN}${route.path}`);
      expect(markdownPath(route)).toMatch(/\.md$/);
    }
    expect(sitemap).not.toMatch(/\.md|\/api\/|\/play\/[^<]|story-room|saves|auth/);
  });

  it('keeps generated discovery assets in parity with the route contract', async () => {
    expect(await readFile('public/sitemap.xml', 'utf8')).toBe(sitemapXml());
    expect(JSON.parse(await readFile('public/api-ai.json', 'utf8'))).toEqual(agentCatalog());
    for (const route of PUBLIC_ROUTES) {
      expect(await readFile(`public${markdownPath(route)}`, 'utf8')).toBe(renderMarkdown(route));
    }
  });

  it('matches only exact public routes', () => {
    expect(publicRoute('/play')?.id).toBe('play');
    expect(publicRoute('/play/save-123')).toBeUndefined();
    expect(publicRoute('/story-room')).toBeUndefined();
    expect(publicRoute('/api/saves')).toBeUndefined();
    expect(publicRoute('/api/auth/session')).toBeUndefined();
  });

  it('renders route-correct metadata, structured data, and fallback content', () => {
    const route = publicRoute('/about');
    if (!route) throw new Error('Missing about route fixture');
    const html = renderPublicHtml(shell, route);
    expect(html).toContain(`<link rel="canonical" href="${PUBLIC_ORIGIN}/about"`);
    expect(html).toContain(`<meta property="og:url" content="${PUBLIC_ORIGIN}/about"`);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('data-public-fallback');
    expect(html).toContain(route.heading);
    expect(html).not.toContain('<title>Generic</title>');
  });

  it('serves the agent catalog and all Markdown variants', async () => {
    const catalogResponse = await worker.fetch(
      new Request('https://example.test/api/ai'),
      env,
      context
    );
    expect(catalogResponse.status).toBe(200);
    const runtimeCatalog = (await catalogResponse.json()) as ReturnType<typeof agentCatalog>;
    expect(runtimeCatalog).toEqual(agentCatalog('https://example.test'));
    expect(catalogResponse.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(catalogResponse.headers.get('RateLimit-Limit')).toBe('60');
    expect(catalogResponse.headers.get('RateLimit-Remaining')).toBe('59');
    expect(catalogResponse.headers.get('RateLimit-Reset')).toBe('60');

    const catalogHead = await worker.fetch(
      new Request('https://example.test/api/ai', { method: 'HEAD' }),
      env,
      context
    );
    expect(catalogHead.status).toBe(catalogResponse.status);
    expect([...catalogHead.headers]).toEqual([...catalogResponse.headers]);
    expect(catalogHead.body).toBeNull();
    expect(await catalogHead.text()).toBe('');

    const runtimeSitemap = await worker.fetch(
      new Request('https://example.test/sitemap.xml'),
      env,
      context
    );
    expect(await runtimeSitemap.text()).toContain('<loc>https://example.test/play</loc>');

    for (const route of PUBLIC_ROUTES) {
      const suffixResponse = await worker.fetch(
        new Request(`https://example.test${markdownPath(route)}`),
        env,
        context
      );
      expect(suffixResponse.headers.get('Content-Type')).toContain('text/markdown');
      expect(await suffixResponse.text()).toContain(route.heading);

      const negotiatedResponse = await worker.fetch(
        new Request(`https://example.test${route.path}`, {
          headers: { Accept: 'text/markdown, text/html;q=0.9' },
        }),
        env,
        context
      );
      expect(negotiatedResponse.headers.get('Content-Type')).toContain('text/markdown');
      expect(await negotiatedResponse.text()).toContain(route.heading);
    }
  });

  it.each([
    ['POST', '/api/ai'],
    ['GET', '/api/ai/'],
    ['HEAD', '/api/ai/'],
    ['GET', '/api/ai/private'],
    ['HEAD', '/api/ai/private'],
  ])('does not serve the public catalog for %s %s', async (method, path) => {
    const response = await worker.fetch(
      new Request(`https://example.test${path}`, { method }),
      env,
      context
    );
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).not.toBe('public, max-age=300');
    expect(response.headers.get('RateLimit-Limit')).toBeNull();
    if (method === 'HEAD') {
      expect(await response.text()).toBe('');
    } else {
      expect(await response.text()).not.toContain('Open Historia');
    }
  });

  it('renders canonical SPA shells and noindexes identifier-bearing play routes', async () => {
    const about = await worker.fetch(new Request('https://example.test/about'), env, context);
    const aboutHtml = await about.text();
    expect(aboutHtml).toContain(`${PUBLIC_ORIGIN}/about`);
    expect(aboutHtml).toContain('data-public-fallback');

    const save = await worker.fetch(
      new Request('https://example.test/play/save-123'),
      env,
      context
    );
    expect(await save.text()).toContain('name="robots" content="noindex, nofollow"');
  });
});
