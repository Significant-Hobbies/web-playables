import { Hono } from 'hono';

import { createAuth } from '../lib/auth';
import type { WorkerEnv } from '../lib/worker-env';

import { createAppHealthMiddleware } from './worker/app-health';
import { bindWorkerEnv } from './worker/bind-env';
import llmRoutes from './worker/routes/llm';
import savesRoutes from './worker/routes/saves';
import {
  agentCatalog,
  openApiSpec,
  publicRoute,
  renderMarkdown,
  renderPublicHtml,
  sitemapXml,
} from './public-routes';

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60;

const SPA_PREFIXES = ['/play', '/about', '/privacy'];

function isSpaRoute(pathname: string) {
  return SPA_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function requestOrigin(request: Request, url: URL): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');
  if (!host || host === url.host) return url.origin;
  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  return `${forwardedProtocol ?? url.protocol.replace(':', '')}://${host}`;
}

function withRateLimit(headers: Record<string, string>): Record<string, string> {
  return {
    ...headers,
    'RateLimit-Limit': String(RATE_LIMIT),
    'RateLimit-Remaining': String(RATE_LIMIT - 1),
    'RateLimit-Reset': String(RATE_LIMIT_WINDOW),
  };
}

function wantsMarkdown(request: Request): boolean {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function markdown404(pathname: string, origin: string, method: string): Response {
  const body = `# 404 — Not Found

\`${pathname}\` does not exist on ${origin}.

## Where to look next

- [Home](${origin}/)
- [Play](${origin}/play)
- [About](${origin}/about)
- [Sitemap](${origin}/sitemap.xml)
- [Agent catalog (JSON)](${origin}/api/ai)
- [OpenAPI spec](${origin}/openapi.json)
`;
  return new Response(method === 'HEAD' ? null : body, {
    status: 404,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

const api = new Hono<{ Bindings: WorkerEnv }>();

api.use('*', async (c, next) => {
  bindWorkerEnv(c.env);
  await next();
});

api.use('*', createAppHealthMiddleware());

api.on(['GET', 'POST'], '/api/auth/*', (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

api.route('/api/saves', savesRoutes);
api.route('/api', llmRoutes);

api.onError((err, c) => {
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err.message, err.stack);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = requestOrigin(request, url);

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/ai') {
      const response = Response.json(agentCatalog(origin), {
        headers: withRateLimit({ 'Cache-Control': 'public, max-age=300' }),
      });
      return request.method === 'HEAD'
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }

    if (request.method === 'GET' && url.pathname === '/openapi.json') {
      return Response.json(openApiSpec(origin), {
        headers: withRateLimit({ 'Cache-Control': 'public, max-age=300' }),
      });
    }

    if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
      return new Response(sitemapXml(origin), {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/robots.txt') {
      return new Response(
        `User-agent: *\nAllow: /\nAllow: /*.md$\nAllow: /api/ai\nDisallow: /api/\nDisallow: /play/\nDisallow: /story-room\nSitemap: ${origin}/sitemap.xml\n`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    if (request.method === 'GET') {
      const markdownRoute = url.pathname.endsWith('.md')
        ? publicRoute(url.pathname === '/index.md' ? '/' : url.pathname.slice(0, -3))
        : undefined;
      const negotiatedRoute = publicRoute(url.pathname);
      const acceptsMarkdown = request.headers
        .get('Accept')
        ?.split(',')
        .some((mediaType) => mediaType.trim().split(';')[0] === 'text/markdown');
      const route = markdownRoute ?? (acceptsMarkdown ? negotiatedRoute : undefined);
      if (route) {
        return new Response(renderMarkdown(route), {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            Link: `<${origin}${route.path}>; rel="canonical"`,
            Vary: 'Accept',
          },
        });
      }
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        return await api.fetch(request, env, ctx);
      } catch (err) {
        console.error(`[error] fetch ${url.pathname}:`, err instanceof Error ? err.message : err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const exactPublicRoute = publicRoute(url.pathname);
    if (exactPublicRoute && exactPublicRoute.path !== '/') {
      const spaRequest = new Request(new URL('/app', url), request);
      const shell = await env.ASSETS.fetch(spaRequest);
      if (!shell.ok) return shell;
      return new Response(renderPublicHtml(await shell.text(), exactPublicRoute), {
        status: shell.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          Vary: 'Accept',
        },
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    if (isSpaRoute(url.pathname)) {
      const spaRequest = new Request(new URL('/app', url), request);
      const shell = await env.ASSETS.fetch(spaRequest);
      if (!shell.ok) return shell;
      const html = await shell.text();
      return new Response(
        html.replace(
          '</head>',
          '    <meta name="robots" content="noindex, nofollow" />\n  </head>'
        ),
        { status: shell.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (url.pathname === '/') {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }

    // Agent-friendly 404: return markdown body when Accept: text/markdown.
    if (assetResponse.status === 404 && wantsMarkdown(request)) {
      return markdown404(url.pathname, origin, request.method);
    }

    return assetResponse;
  },
};
