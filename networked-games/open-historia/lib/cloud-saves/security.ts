import type { Context, Next } from 'hono';
import { createAuth } from '../auth';
import type { WorkerEnv } from '../worker-env';

export interface AccountSession {
  user: { id: string; name: string; email: string; image?: string | null };
  session: { id: string };
}
export type AccountEnv = { Bindings: WorkerEnv; Variables: { accountSession: AccountSession } };
const PRODUCT_ORIGINS = ['https://idle.aliveville.com', 'https://historia.aliveville.com'];
export function allowedOrigin(origin: string, mode?: string): boolean {
  if (PRODUCT_ORIGINS.includes(origin)) return true;
  if (mode === 'production') return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}
export async function accountCors(c: Context<{ Bindings: WorkerEnv }>, next: Next) {
  const origin = c.req.header('Origin');
  if (origin && !allowedOrigin(origin, c.env.NODE_ENV))
    return c.json({ error: 'Origin is not allowed' }, 403);
  const finalizeHeaders = () => {
    if (origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
      c.header('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      const vary = c.res.headers.get('Vary');
      if (!vary?.split(',').some((value) => ['origin', '*'].includes(value.trim().toLowerCase())))
        c.header('Vary', vary ? `${vary}, Origin` : 'Origin');
    }
    c.header('Cache-Control', 'no-store');
  };
  if (c.req.method === 'OPTIONS') {
    finalizeHeaders();
    return c.body(null, 204);
  }
  await next();
  // Auth returns raw Responses rather than c.json(). Finalize only after Hono
  // installs that response; prepared headers can otherwise be discarded.
  // c.header clones immutable responses while retaining body/status/cookies.
  finalizeHeaders();
}
export async function csrfToken(session: AccountSession, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`playables-csrf:${session.user.id}:${session.session.id}`)
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}
function equalToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
export async function resolveSession(c: Context<AccountEnv>): Promise<AccountSession | null> {
  return createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
}
export function accountSessionMiddleware(resolve = resolveSession) {
  return async (c: Context<AccountEnv>, next: Next) => {
    const session = await resolve(c);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);
    c.set('accountSession', session);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('Origin');
      if (!origin || !allowedOrigin(origin, c.env.NODE_ENV))
        return c.json({ error: 'An allowed request origin is required' }, 403);
      const secret = c.env.BETTER_AUTH_SECRET;
      const token = c.req.header('X-CSRF-Token') || '';
      if (!secret || !equalToken(token, await csrfToken(session, secret)))
        return c.json({ error: 'Refresh your session before saving' }, 403);
    }
    await next();
  };
}
export async function readBoundedJson(
  request: Request,
  maxBytes = 8 * 1024 * 1024 + 16384
): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length'));
  if (declared > maxBytes) throw new RangeError('Request is too large');
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('Request body is missing');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    bytes += result.value.length;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new RangeError('Request is too large');
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}
