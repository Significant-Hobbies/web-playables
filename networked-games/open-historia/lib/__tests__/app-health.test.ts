import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import type { WorkerEnv } from '../worker-env';
import { createAppHealthMiddleware } from '../../src/worker/app-health';

type Bindings = Pick<WorkerEnv, 'APP_HEALTH_INGEST_KEY' | 'APP_HEALTH_ENVIRONMENT'>;
type TestEnv = { Bindings: Bindings };

function executionContext() {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise);
    },
    passThroughOnException() {},
    props: {},
  };
}

describe('Open Historia App Health middleware', () => {
  it('leaves the API response alone and sends nothing when telemetry is not configured', async () => {
    const fetch = vi.fn(async () => ({ status: 202 }));
    const app = new Hono<TestEnv>();
    app.use('*', createAppHealthMiddleware({ fetch }));
    app.get('/api/saves/:saveId', (context) => context.json({ ok: true }, 201));
    const ctx = executionContext();

    const response = await app.request(
      'https://historia.example/api/saves/save-private',
      undefined,
      {},
      ctx
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(ctx.pending).toHaveLength(0);
  });

  it('sends only the matched route template and approved summary fields', async () => {
    let submitted = '';
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      submitted = String(init.body);
      return { status: 202 };
    });
    const app = new Hono<TestEnv>();
    app.use('*', createAppHealthMiddleware({ fetch }));
    app.post('/api/saves/:saveId', (context) => context.json({ ok: true }, 201));
    const ctx = executionContext();

    const response = await app.request(
      'https://historia.example/api/saves/save-private?token=query-private',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer header-private',
          cookie: 'session=cookie-private',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ command: 'body-private' }),
      },
      { APP_HEALTH_INGEST_KEY: 'test-only-key', APP_HEALTH_ENVIRONMENT: 'staging' },
      ctx
    );
    await Promise.all(ctx.pending);

    expect(response.status).toBe(201);
    expect(fetch).toHaveBeenCalledOnce();
    expect(ctx.pending).toHaveLength(1);
    const request = JSON.parse(submitted) as {
      events: Array<Record<string, unknown>>;
    };
    expect(request.events).toHaveLength(1);
    expect(request.events[0]).toMatchObject({
      method: 'POST',
      route: '/api/saves/:saveId',
      status_code: 201,
    });
    expect(JSON.stringify(request)).not.toContain('save-private');
    expect(JSON.stringify(request)).not.toContain('query-private');
    expect(JSON.stringify(request)).not.toContain('header-private');
    expect(JSON.stringify(request)).not.toContain('cookie-private');
    expect(JSON.stringify(request)).not.toContain('body-private');
  });
});
