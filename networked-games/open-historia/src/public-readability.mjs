import {
  wantsMarkdown as prefersMarkdown,
  markdownResponse,
} from '../../../shared/agent-surfaces/http.mjs';
import { PUBLIC_ORIGIN, PUBLIC_ROUTES, markdownPath, renderMarkdown } from './public-routes.ts';
import { createAgentSurfaceManifest } from '../../../shared/agent-surfaces/manifest.mjs';
import { createAgentSurfaceHandler } from '../../../shared/agent-surfaces/handler.mjs';
import { advertiseMarkdown } from '../../../shared/agent-surfaces/adapters/static-assets.mjs';
import { robotsPolicy } from '../../../shared/robots-policy.mjs';

export const identity = {
  name: 'Open Historia',
  url: PUBLIC_ORIGIN,
  summary: PUBLIC_ROUTES[0].description,
  contact: 'https://github.com/Significant-Hobbies/web-playables',
  sitemap: PUBLIC_ORIGIN + '/sitemap.xml',
  openapi: PUBLIC_ORIGIN + '/openapi.json',
  trainingAllowed: true,
  updatedAt: '2026-10-27',
  excludedPaths: ['/api', '/auth', '/admin', '/dashboard', '/play/', '/story-room'],
};
export const routes = PUBLIC_ROUTES.map((route) => ({
  path: route.path,
  url: PUBLIC_ORIGIN + route.path,
  md: PUBLIC_ORIGIN + markdownPath(route),
  title: route.title,
  description: route.description,
}));
const pages = Object.fromEntries(PUBLIC_ROUTES.map((route) => [route.path, renderMarkdown(route)]));
export const manifest = createAgentSurfaceManifest({ ...identity, pages });
const handler = createAgentSurfaceHandler({
  manifest,
  listMarkdownRoutes: () => routes,
  loadMarkdown: (path) => pages[path] ?? null,
});
export async function handleReadability(request) {
  const path = new URL(request.url).pathname;
  if (
    !path.endsWith('.md') &&
    !path.startsWith('/api/md') &&
    !['/llms.txt', '/llms-full.txt', '/ai.txt'].includes(path) &&
    !routes.some((route) => route.path === path)
  )
    return null;
  if (/^\/(?:auth|admin|dashboard)\//.test(path) && path.endsWith('.md')) {
    const response = markdownResponse('# Not found\n', request, { 'Cache-Control': 'no-store' });
    return new Response(response.body, { status: 404, headers: response.headers });
  }
  return handler(request);
}
export const wantsMarkdown = (request) => prefersMarkdown(request);
export const robots = () => robotsPolicy(identity);
export function publicResponse(request, response) {
  const route = routes.find((route) => route.path === new URL(request.url).pathname);
  const result =
    route && response.headers.get('content-type')?.includes('text/html')
      ? advertiseMarkdown(response, PUBLIC_ORIGIN, new URL(route.md).pathname)
      : response;
  return request.method === 'HEAD'
    ? new Response(null, { status: result.status, headers: result.headers })
    : result;
}
