import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { accountCors } from '../security';
import type { WorkerEnv } from '../../worker-env';

const idle = 'https://idle.aliveville.com';
const historia = 'https://historia.aliveville.com';
const cookies = [
  'fixture_session=one; Path=/; HttpOnly; Secure; SameSite=Lax',
  'fixture_state=two; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/; HttpOnly; Secure',
];
function fixture() {
  const app = new Hono<{ Bindings: WorkerEnv }>();
  let called = 0;
  app.use('/api/auth/*', accountCors);
  app.post('/api/auth/sign-in/social', () => {
    called++;
    const headers = new Headers({
      Vary: 'Cookie, Accept-Encoding',
      'Cache-Control': 'public, max-age=60',
    });
    for (const cookie of cookies) headers.append('Set-Cookie', cookie);
    return Response.json(
      { url: 'https://accounts.google.com/o/oauth2/v2/auth?fixture=1', redirect: true },
      { headers }
    );
  });
  app.get('/api/auth/callback/google', () => {
    called++;
    return Response.redirect('https://idle.aliveville.com/play/ember-road/', 302);
  });
  app.post('/api/auth/error', () => {
    called++;
    return Response.json({ error: 'fixture-only-provider-error' }, { status: 400 });
  });
  const env = { NODE_ENV: 'production' } as WorkerEnv;
  return { app, env, called: () => called };
}
function assertPrivateCors(response: Response, origin: string) {
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(
    response.headers
      .get('Vary')
      ?.split(',')
      .map((value) => value.trim().toLowerCase())
  ).toContain('origin');
}
describe('raw auth response CORS finalization', () => {
  for (const origin of [idle, historia])
    it(`preserves raw auth JSON and multiple cookies for ${origin}`, async () => {
      const { app, env } = fixture();
      const response = await app.request(
        '/api/auth/sign-in/social',
        { method: 'POST', headers: { Origin: origin } },
        env
      );
      assertPrivateCors(response, origin);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?fixture=1',
        redirect: true,
      });
      expect(response.headers.getSetCookie()).toEqual(cookies);
      expect(response.headers.get('Vary')?.toLowerCase()).toContain('accept-encoding');
      expect(response.headers.get('Vary')?.toLowerCase()).toContain('cookie');
    });
  it('finalizes immutable raw redirects without changing status, destination or body', async () => {
    const { app, env } = fixture();
    const response = await app.request(
      '/api/auth/callback/google',
      { headers: { Origin: idle } },
      env
    );
    assertPrivateCors(response, idle);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(`${idle}/play/ember-road/`);
    expect(await response.text()).toBe('');
  });
  it('adds private CORS to raw auth error responses too', async () => {
    const { app, env } = fixture();
    const response = await app.request(
      '/api/auth/error',
      { method: 'POST', headers: { Origin: idle } },
      env
    );
    assertPrivateCors(response, idle);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'fixture-only-provider-error' });
  });
  it('serves trusted preflights without invoking auth handlers', async () => {
    const f = fixture();
    const response = await f.app.request(
      '/api/auth/sign-in/social',
      { method: 'OPTIONS', headers: { Origin: idle, 'Access-Control-Request-Method': 'POST' } },
      f.env
    );
    assertPrivateCors(response, idle);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-CSRF-Token');
    expect(f.called()).toBe(0);
  });
  it('rejects foreign origins before auth and never grants them credentialed CORS', async () => {
    const f = fixture();
    for (const method of ['POST', 'OPTIONS']) {
      const response = await f.app.request(
        '/api/auth/sign-in/social',
        { method, headers: { Origin: 'https://evil.example' } },
        f.env
      );
      expect(response.status).toBe(403);
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
      expect(response.headers.has('Access-Control-Allow-Credentials')).toBe(false);
      expect(f.called()).toBe(0);
    }
  });
  it('keeps originless auth callbacks private without inventing an allowed origin', async () => {
    const { app, env } = fixture();
    const response = await app.request('/api/auth/callback/google', {}, env);
    expect(response.status).toBe(302);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
  });
});
