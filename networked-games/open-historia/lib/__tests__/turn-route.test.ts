import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import llm from '../../src/worker/routes/llm';

afterEach(() => vi.unstubAllGlobals());

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
  it('adjudicates a production service-binding response using auto and the project identity', async () => {
    let outgoing: Record<string, unknown> = {};
    let project = '';
    const requests: Record<string, unknown>[] = [];
    const fetch = vi.fn(async (request: Request) => {
      outgoing = await request.json();
      requests.push(outgoing);
      project = request.headers.get('x-gateway-project-id') ?? '';
      return Response.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify(
                requests.length === 2
                  ? {
                      stepId: 'poland-invasion',
                      achieved: true,
                      evidence: 'RAF raids were executed in response to the invasion.',
                    }
                  : {
                      message: 'RAF raids begin in response to the invasion.',
                      updates: [],
                      storySoFar: 'Britain has responded.',
                      storyDecision: {
                        stepId: 'poland-invasion',
                        achieved: true,
                        evidence: 'RAF raids were executed in response to the invasion.',
                      },
                    }
              ),
            },
            finish_reason: 'stop',
          },
        ],
      });
    });
    const input = JSON.parse(request.body);
    input.config = { ...input.config, provider: 'free-ai', model: 'auto', presetId: 'ww2-1939' };
    const response = await app.request(
      '/turn',
      {
        ...request,
        headers: { ...request.headers, 'cf-connecting-ip': '198.51.100.64' },
        body: JSON.stringify(input),
      },
      { FREE_AI: { fetch } as unknown as Fetcher, NODE_ENV: 'production' } as never
    );
    expect(response.status).toBe(200);
    expect(outgoing.model).toBe('auto');
    expect(project).toBe('open-historia');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(outgoing.messages)).toContain('ALREADY RESOLVED');
    expect(outgoing.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { strict: true },
    });
    expect(requests[0].response_format).toMatchObject({ type: 'json_object' });
    expect((await response.json()).updates).toEqual([
      {
        type: 'storyStep',
        stepId: 'poland-invasion',
        message: 'RAF raids were executed in response to the invasion.',
      },
    ]);
  });
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

  it('passes canonical objectives through the real adapter and rejects invented completions', async () => {
    const run = vi.fn().mockResolvedValueOnce({
      response: {
        message: 'Blockade patrols depart. Britain has responded to the invasion.',
        updates: ['invented', 'battle-of-france', 'poland-invasion', 'poland-invasion'].map(
          (stepId) => ({ type: 'storyStep', stepId, message: 'Response underway.' })
        ),
      },
    });
    const input = JSON.parse(request.body);
    input.config.presetId = 'ww2-1939';
    input.completedStepIds = ['invalid'];
    run.mockResolvedValueOnce({
      response: {
        stepId: 'poland-invasion',
        achieved: true,
        evidence: 'Blockade patrols departed.',
      },
    });
    const response = await app.request(
      '/turn',
      {
        ...request,
        headers: { ...request.headers, 'cf-connecting-ip': '198.51.100.41' },
        body: JSON.stringify(input),
      },
      budgetEnv({ run })
    );
    expect(response.status).toBe(200);
    expect(JSON.stringify(run.mock.calls[0][1].messages)).toContain(
      'CURRENT STEP ID: poland-invasion'
    );
    expect((await response.json()).updates).toEqual([
      { type: 'storyStep', stepId: 'poland-invasion', message: 'Blockade patrols departed.' },
    ]);
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
    true,
    false,
  ])('requires an explicit current-objective decision: achieved=%s', async (achieved) => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({
        response: {
          message: 'RAF raids begin in response to the invasion.',
          updates: [
            { type: 'event', description: 'The RAF begins raids.', eventType: 'war', year: 1939 },
            {
              type: 'storyStep',
              stepId: 'poland-invasion',
              message: 'Untrusted main-model award.',
            },
          ],
          storySoFar: 'Britain has responded.',
        },
      })
      .mockResolvedValueOnce({
        response: {
          stepId: 'poland-invasion',
          achieved,
          evidence: achieved ? 'The RAF executed raids.' : 'The raids are only planned.',
        },
      });
    const input = JSON.parse(request.body);
    input.config.presetId = 'ww2-1939';
    const response = await app.request(
      '/turn',
      {
        ...request,
        headers: {
          ...request.headers,
          'cf-connecting-ip': achieved ? '198.51.100.61' : '198.51.100.62',
        },
        body: JSON.stringify(input),
      },
      budgetEnv({ run })
    );
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledTimes(2);
    const schema = run.mock.calls[1][1].response_format.json_schema;
    expect(schema.required).toEqual(['stepId', 'achieved', 'evidence']);
    expect(schema.properties.stepId.enum).toEqual(['poland-invasion']);
    expect(run.mock.calls[1][1].max_tokens).toBe(512);
    const data = await response.json();
    expect(data.updates.filter((update: { type: string }) => update.type === 'event')).toHaveLength(
      1
    );
    expect(
      data.updates.filter((update: { type: string }) => update.type === 'storyStep')
    ).toHaveLength(achieved ? 1 : 0);
  });

  it('keeps an unadjudicated narrated action on the retry path instead of silently committing', async () => {
    const run = vi.fn().mockResolvedValue({
      response: {
        message: 'RAF raids begin in response to the invasion.',
        updates: [
          { type: 'event', description: 'The RAF begins raids.', eventType: 'war', year: 1939 },
        ],
        storySoFar: 'Britain has responded.',
      },
    });
    run
      .mockResolvedValueOnce({ response: { message: 'RAF raids begin.', updates: [] } })
      .mockResolvedValueOnce({
        response: { stepId: 'invented', achieved: true, evidence: 'Invalid ID' },
      });
    const input = JSON.parse(request.body);
    input.config.presetId = 'ww2-1939';
    const response = await app.request(
      '/turn',
      {
        ...request,
        headers: { ...request.headers, 'cf-connecting-ip': '198.51.100.63' },
        body: JSON.stringify(input),
      },
      budgetEnv({ run })
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      updates: [],
      message: expect.stringContaining('No changes were applied'),
    });
  });

  it('judges BYO-provider turns without requiring a decision in the world response', async () => {
    const fetch = vi.fn().mockImplementation(async () =>
      Response.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify(
                fetch.mock.calls.length === 1
                  ? {
                      message: 'RAF raids were executed.',
                      updates: [],
                      storySoFar: 'Britain responded.',
                    }
                  : { stepId: 'poland-invasion', achieved: true, evidence: 'RAF raids executed.' }
              ),
            },
            finish_reason: 'stop',
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetch);
    const input = JSON.parse(request.body);
    input.config = {
      ...input.config,
      provider: 'openai',
      model: 'synthetic-model',
      apiKey: 'synthetic-test-key',
      presetId: 'ww2-1939',
    };
    const response = await app.request('/turn', {
      ...request,
      headers: { ...request.headers, 'x-real-ip': 'synthetic-byo-judge' },
      body: JSON.stringify(input),
    });
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await response.json()).updates).toEqual([
      { type: 'storyStep', stepId: 'poland-invasion', message: 'RAF raids executed.' },
    ]);
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
