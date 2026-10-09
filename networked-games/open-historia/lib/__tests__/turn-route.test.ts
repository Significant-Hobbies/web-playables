import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import llm from '../../src/worker/routes/llm';

const app = new Hono().route('/', llm);
const request = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: 'Negotiate a humanitarian trade agreement.',
    gameState: { turn: 1939, players: { player: { name: 'United Kingdom' } } },
    config: {
      provider: 'free-ai',
      model: '@cf/meta/llama-3.1-8b-instruct-fp8',
      scenario: 'Synthetic campaign',
      difficulty: 'Realistic',
    },
  }),
};

const budgetEnv = (AI: { run: ReturnType<typeof vi.fn> }) => ({
  AI,
  NEURON_BUDGET: {
    idFromName: (name: string) => name,
    get: () => ({
      fetch: async (_url: string, init: RequestInit) => {
        const { neurons } = JSON.parse(String(init.body)) as { neurons: number };
        return Response.json({
          allowed: true,
          used: neurons,
          remaining: 9_500 - neurons,
          retryAfter: 0,
          dayKey: new Date().toISOString().slice(0, 10),
        });
      },
    }),
  },
});

describe('turn route through the real Workers AI adapter', () => {
  it('reserves shared neurons before returning parsed turn consequences', async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        message: 'The agreement is accepted.',
        updates: [{ type: 'time', amount: 1 }],
        storySoFar: 'A humanitarian agreement is in place.',
      }),
    });
    const response = await app.request('/turn', request, budgetEnv({ run }));
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][0]).toBe('@cf/meta/llama-3.1-8b-instruct-fp8');
    expect(run.mock.calls[0][1].max_tokens).toBe(2048);
    expect(run.mock.calls[0][1].response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { type: 'object', required: ['message', 'updates', 'storySoFar'] },
    });
    expect(JSON.stringify(run.mock.calls[0][1].messages)).toContain('United Kingdom');
    expect(await response.json()).toMatchObject({
      message: 'The agreement is accepted.',
      updates: [{ type: 'time', amount: 1 }],
      storySoFar: 'A humanitarian agreement is in place.',
    });
  });

  it('accepts structured binding output and retains campaign memory', async () => {
    const run = vi.fn().mockResolvedValue({
      response: {
        message: 'Relief ships depart.',
        updates: [],
        storySoFar: 'Shipping access agreed.',
      },
    });
    const response = await app.request('/turn', request, budgetEnv({ run }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ storySoFar: 'Shipping access agreed.' });
  });

  it.each([
    [
      '/chat',
      { message: 'Request aid.', playerNation: 'Britain', targetNation: 'France' },
      { message: 'Agreed.', tone: 'friendly', relationChange: null },
      ['message', 'tone', 'relationChange'],
    ],
    [
      '/advisor',
      { question: 'How can we provide aid?', playerNation: 'Britain' },
      {
        advice: 'Negotiate shipping access.',
        category: 'diplomacy',
        suggestedActions: ['Request access.'],
      },
      ['advice', 'category', 'suggestedActions'],
    ],
  ])('sends the matching response schema for %s', async (path, input, output, required) => {
    const run = vi.fn().mockResolvedValue({ response: output });
    const response = await app.request(
      path,
      {
        ...request,
        body: JSON.stringify({
          ...input,
          config: { provider: 'free-ai', model: '@cf/meta/llama-3.1-8b-instruct-fp8' },
        }),
      },
      budgetEnv({ run })
    );
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][1].response_format.json_schema.required).toEqual(required);
  });

  it.each([
    [
      '/turn',
      {
        command: 'Continue the synthetic campaign.',
        gameState: { turn: 1939, players: { player: { name: 'Britain' } } },
      },
    ],
    ['/chat', { message: 'Request aid.', playerNation: 'Britain', targetNation: 'France' }],
    ['/advisor', { question: 'How can we provide aid?', playerNation: 'Britain' }],
  ])('rejects an unsupported provider before calling an adapter for %s', async (path, input) => {
    const run = vi.fn();
    const response = await app.request(
      path,
      {
        ...request,
        body: JSON.stringify({
          ...input,
          config: {
            provider: 'unsupported-private-sentinel',
            apiKey: 'synthetic-placeholder',
          },
        }),
      },
      budgetEnv({ run })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unsupported provider' });
    expect(run).not.toHaveBeenCalled();
  });

  it('does not expose provider errors containing campaign prompts', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const run = vi.fn().mockRejectedValue(new Error('PRIVATE_CAMPAIGN_SENTINEL'));
      const response = await app.request('/turn', request, budgetEnv({ run }));
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain('PRIVATE_CAMPAIGN_SENTINEL');
      expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_CAMPAIGN_SENTINEL');
    } finally {
      log.mockRestore();
    }
  });

  it('does not return state updates when model output is malformed', async () => {
    const run = vi.fn().mockResolvedValue({ response: 'An unfinished response {' });
    const response = await app.request('/turn', request, budgetEnv({ run }));
    expect(response.status).toBe(502);
    expect((await response.json()).updates).toEqual([]);
  });

  it('repairs the legacy fast model to the exact priced identifier', async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        message: 'The agreement is accepted.',
        updates: [],
        storySoFar: 'Ready.',
      }),
    });
    const response = await app.request(
      '/turn',
      {
        ...request,
        body: JSON.stringify({
          command: 'Continue.',
          gameState: { turn: 1939, players: { player: { name: 'United Kingdom' } } },
          config: { provider: 'free-ai', model: '@cf/meta/llama-3.1-8b-instruct-fast' },
        }),
      },
      budgetEnv({ run })
    );
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][0]).toBe('@cf/meta/llama-3.1-8b-instruct-fp8-fast');
  });

  it('fails closed for an unpriced model before calling Workers AI', async () => {
    const run = vi.fn();
    const unpricedRequest = {
      ...request,
      body: JSON.stringify({
        command: 'Continue.',
        gameState: { turn: 1939, players: { player: { name: 'United Kingdom' } } },
        config: { provider: 'free-ai', model: '@cf/meta/unpriced-model' },
      }),
    };
    const response = await app.request('/turn', unpricedRequest, budgetEnv({ run }));
    expect(response.status).toBe(503);
    expect((await response.json()).updates).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('fails closed for an incomplete daily debit receipt before calling Workers AI', async () => {
    const run = vi.fn();
    const env = {
      AI: { run },
      NEURON_BUDGET: {
        idFromName: (name: string) => name,
        get: () => ({
          fetch: async () =>
            Response.json({
              allowed: true,
              used: 200,
              remaining: 9_300,
              retryAfter: 0,
              dayKey: '2000-01-01',
            }),
        }),
      },
    };
    const response = await app.request('/turn', request, env);
    expect(response.status).toBe(503);
    expect((await response.json()).updates).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });
});
