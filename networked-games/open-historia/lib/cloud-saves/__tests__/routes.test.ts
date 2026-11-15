import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createPlayerRoutes } from '../../../src/worker/routes/player-saves';
import { accountCors, csrfToken, type AccountEnv, type AccountSession } from '../security';
import type { WorkerEnv } from '../../worker-env';
import { sqliteD1 } from './sqlite-d1';
const secret = 'test-only-account-cookie-secret-32-characters';
const session: AccountSession = {
  user: { id: 'alice', name: 'Alice', email: 'alice@example.test' },
  session: { id: 'session-alice' },
};
const write = {
  expectedRevision: 0,
  writeId: 'write-1',
  envelope: {
    schemaVersion: '1',
    metadata: { title: 'Journey' },
    data: JSON.stringify({ version: 1, savedAt: 1, state: { chapter: 1 } }),
  },
};
function setup() {
  const fixture = sqliteD1();
  let active: AccountSession | null = session;
  const app = new Hono<AccountEnv>();
  app.use('*', accountCors);
  app.route(
    '/api/player',
    createPlayerRoutes(async () => active)
  );
  const env = { DB: fixture.db, NODE_ENV: 'production', BETTER_AUTH_SECRET: secret } as WorkerEnv;
  return {
    ...fixture,
    app,
    env,
    setSession(value: AccountSession | null) {
      active = value;
    },
  };
}
describe('account save HTTP boundaries', () => {
  it('resolves a signed Better Auth cookie against the existing D1 session and rejects forgery/expiry', async () => {
    const f = sqliteD1();
    try {
      const now = Math.floor(Date.now() / 1000);
      const token = 'fixture-session-token-only-not-a-real-account';
      f.sqlite
        .prepare(
          'INSERT INTO session(id,expiresAt,token,createdAt,updatedAt,userId) VALUES(?,?,?,?,?,?)'
        )
        .run('actual-session', now + 3600, token, now, now, 'alice');
      const app = new Hono<AccountEnv>();
      app.use('*', accountCors);
      app.route('/api/player', createPlayerRoutes());
      const env = {
        DB: f.db,
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: secret,
        BETTER_AUTH_URL: 'https://historia.aliveville.com',
      } as WorkerEnv;
      const signature = createHmac('sha256', secret).update(token).digest('base64');
      const cookie = `__Secure-better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
      const response = await app.request(
        '/api/player',
        { headers: { Cookie: cookie, Origin: 'https://idle.aliveville.com' } },
        env
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ user: { id: 'alice' } });
      expect(
        (await app.request('/api/player', { headers: { Cookie: cookie + 'forged' } }, env)).status
      ).toBe(401);
      f.sqlite.prepare('UPDATE session SET expiresAt=?').run(now - 3600);
      expect((await app.request('/api/player', { headers: { Cookie: cookie } }, env)).status).toBe(
        401
      );
    } finally {
      f.sqlite.close();
    }
  });
  it('requires a real resolved session and returns non-cacheable exact-origin metadata', async () => {
    const f = setup();
    try {
      f.setSession(null);
      expect((await f.app.request('/api/player', {}, f.env)).status).toBe(401);
      f.setSession(session);
      const response = await f.app.request(
        '/api/player',
        { headers: { Origin: 'https://idle.aliveville.com' } },
        f.env
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://idle.aliveville.com'
      );
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(await response.json()).toMatchObject({
        user: { id: 'alice' },
        csrfToken: await csrfToken(session, secret),
      });
      expect(
        (await f.app.request('/api/player', { headers: { Origin: 'https://evil.example' } }, f.env))
          .status
      ).toBe(403);
      expect(
        (
          await f.app.request(
            '/api/player',
            { headers: { Origin: 'http://localhost:5173' } },
            f.env
          )
        ).status
      ).toBe(403);
    } finally {
      f.sqlite.close();
    }
  });
  it('rejects absent/wrong/session-replayed CSRF tokens and foreign origins before mutation', async () => {
    const f = setup();
    try {
      for (const headers of [
        {},
        { Origin: 'https://idle.aliveville.com' },
        { Origin: 'https://evil.example', 'X-CSRF-Token': await csrfToken(session, secret) },
        {
          Origin: 'https://idle.aliveville.com',
          'X-CSRF-Token': await csrfToken({ ...session, session: { id: 'old-session' } }, secret),
        },
      ]) {
        expect(
          (
            await f.app.request(
              '/api/player/games/ember-road/saves/main',
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(write),
              },
              f.env
            )
          ).status
        ).toBe(403);
      }
      expect(f.sqlite.prepare('SELECT COUNT(*) n FROM account_game_slot').get()?.n).toBe(0);
      const headers = {
        Origin: 'https://idle.aliveville.com',
        'Content-Type': 'application/json',
        'X-CSRF-Token': await csrfToken(session, secret),
      };
      expect(
        (
          await f.app.request(
            '/api/player/games/ember-road/saves/main',
            { method: 'PUT', headers, body: JSON.stringify(write) },
            f.env
          )
        ).status
      ).toBe(200);
      expect(
        (
          await f.app.request(
            '/api/player/games/ember-road/saves/main',
            { method: 'PUT', headers, body: JSON.stringify({ ...write, writeId: 'second' }) },
            f.env
          )
        ).status
      ).toBe(409);
      f.setSession({ user: { ...session.user, id: 'bob' }, session: { id: 'bob-session' } });
      expect(
        (await f.app.request('/api/player/games/ember-road/saves/main', {}, f.env)).status
      ).toBe(404);
    } finally {
      f.sqlite.close();
    }
  });
  it('bounds body/slot/game ids and does not return private storage errors', async () => {
    const f = setup();
    try {
      const headers = {
        Origin: 'https://idle.aliveville.com',
        'Content-Type': 'application/json',
        'X-CSRF-Token': await csrfToken(session, secret),
      };
      expect(
        (
          await f.app.request(
            '/api/player/games/unknown/saves/main',
            { method: 'PUT', headers, body: JSON.stringify(write) },
            f.env
          )
        ).status
      ).toBe(404);
      expect(
        (
          await f.app.request(
            '/api/player/games/ember-road/saves/main',
            { method: 'PUT', headers, body: 'broken' },
            f.env
          )
        ).status
      ).toBe(400);
      const preflight = await f.app.request(
        '/api/player/games/ember-road/saves/main',
        { method: 'OPTIONS', headers: { Origin: 'https://idle.aliveville.com' } },
        f.env
      );
      expect(preflight.status).toBe(204);
    } finally {
      f.sqlite.close();
    }
  });
});
