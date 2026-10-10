import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLM_TIMEOUT_MS } from '../llm-timeout';
import llm from '../../src/worker/routes/llm';

const app = new Hono().route('/', llm);
const routes = [
  {
    path: '/turn',
    input: {
      command: 'Negotiate aid.',
      gameState: { turn: 1940, players: { player: { name: 'Britain' } } },
    },
    output: { message: 'Aid agreed.', updates: [], storySoFar: 'Aid agreed.' },
    fallback: { message: expect.any(String), updates: [] },
  },
  {
    path: '/chat',
    input: { message: 'Request aid.', playerNation: 'Britain', targetNation: 'France' },
    output: { message: 'Agreed.', tone: 'friendly', relationChange: null },
    fallback: { message: expect.any(String), tone: 'neutral', relationChange: null },
  },
  {
    path: '/advisor',
    input: { question: 'How can we help?', playerNation: 'Britain' },
    output: { advice: 'Offer aid.', category: 'diplomacy', suggestedActions: ['Offer supplies.'] },
    fallback: {
      advice: expect.any(String),
      category: 'general',
      suggestedActions: ['Wait and try consulting the advisor again'],
    },
  },
];
let requestId = 0;

function requestRoute(route: (typeof routes)[number], fetch: ReturnType<typeof vi.fn>) {
  return app.request(
    route.path,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-ip': `synthetic-gateway-test-${++requestId}`,
      },
      body: JSON.stringify({ ...route.input, config: { provider: 'free-ai', model: 'auto' } }),
    },
    { FREE_AI: { fetch } as unknown as Fetcher, NODE_ENV: 'production' } as never
  );
}

function gatewayOutput(content: string) {
  return Response.json({
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
  });
}

function gatewayFailure() {
  return Response.json({ error: { message: 'SYNTHETIC_PRIVATE_PROVIDER_ERROR' } }, { status: 503 });
}

describe('gateway route errors', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  for (const route of routes.filter(({ path }) => path !== '/turn')) {
    it.each([
      '',
      'SYNTHETIC_PRIVATE_OUTPUT {',
    ])(`returns 502 for ${route.path} output %j`, async (text) => {
      const fetch = vi.fn().mockResolvedValue(gatewayOutput(text));
      const response = await requestRoute(route, fetch);
      expect(response.status).toBe(502);
      expect(await response.json()).toMatchObject({
        ...route.fallback,
        error: 'The AI provider returned malformed output. Please try again.',
      });
      expect(fetch).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalledWith(
        route.path === '/chat' ? 'Diplomacy Chat Error:' : 'Advisor Error:',
        'malformed-provider-output'
      );
    });
  }

  it.each(routes)('retries one transient gateway 503 for $path', async (route) => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(gatewayFailure())
      .mockResolvedValueOnce(gatewayOutput(JSON.stringify(route.output)));
    const pending = requestRoute(route, fetch);
    await vi.advanceTimersByTimeAsync(3_000);
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(route.output);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(routes)('returns 500 after one failed gateway retry for $path', async (route) => {
    const fetch = vi.fn().mockImplementation(async () => gatewayFailure());
    const pending = requestRoute(route, fetch);
    await vi.advanceTimersByTimeAsync(3_000);
    const response = await pending;
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject(route.fallback);
    if (route.path !== '/turn')
      expect(body.error).toBe('The AI provider could not complete this request.');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(body)).not.toContain('SYNTHETIC_PRIVATE_PROVIDER_ERROR');
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'SYNTHETIC_PRIVATE_PROVIDER_ERROR'
    );
  });

  it.each(routes)('keeps the shared deadline across the gateway retry for $path', async (route) => {
    let finishRetry!: (response: Response) => void;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(gatewayFailure())
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finishRetry = resolve;
          })
      );
    const pending = requestRoute(route, fetch);
    await vi.advanceTimersByTimeAsync(LLM_TIMEOUT_MS - 1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject(route.fallback);
    finishRetry(gatewayOutput(JSON.stringify(route.output)));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
