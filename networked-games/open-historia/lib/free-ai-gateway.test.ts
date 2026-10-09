import { generateText, jsonSchema, Output, streamText } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import llm, { selectFreeAiGatewayModel } from '../src/worker/routes/llm';

const app = new Hono().route('/', llm);

function gatewayBinding(responses: string[]) {
  const requests: Request[] = [];
  const fetch = vi.fn(async (request: Request) => {
    requests.push(request);
    const body = JSON.parse(await request.clone().text()) as { stream?: boolean };
    if (body.stream) {
      return new Response(
        'data: {"choices":[{"delta":{"content":"streamed"},"finish_reason":null}]}' +
          '\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}' +
          '\n\ndata: [DONE]\n\n',
        { headers: { 'content-type': 'text/event-stream' } }
      );
    }
    return Response.json({
      choices: [
        { message: { role: 'assistant', content: responses.shift() }, finish_reason: 'stop' },
      ],
    });
  });
  return { binding: { fetch } as unknown as Fetcher, fetch, requests };
}

describe('Free AI gateway SDK adapter', () => {
  it('attributes actual SDK JSON-mode and streaming calls and fails closed without production binding', async () => {
    const { binding, fetch, requests } = gatewayBinding(['{"message":"ok"}']);
    const model = selectFreeAiGatewayModel(binding, 'production');
    if (!model) throw new Error('Gateway model was not selected');

    await generateText({
      model,
      prompt: 'Synthetic JSON probe',
      output: Output.object({
        schema: jsonSchema({
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        }),
      }),
      maxOutputTokens: 2048,
      maxRetries: 0,
    });
    const streamed = streamText({ model, prompt: 'Synthetic stream probe', maxRetries: 0 });
    await expect(streamed.text).resolves.toBe('streamed');

    expect(fetch).toHaveBeenCalledTimes(2);
    for (const request of requests) {
      expect(request.url).toBe('https://fleet-gateway.internal/v1/chat/completions');
      expect(request.headers.get('x-gateway-project-id')).toBe('open-historia');
      expect(request.headers.get('authorization')).toBe('Bearer service-binding');
      expect(JSON.parse(await request.clone().text()).model).toBe('auto');
    }
    const jsonBody = JSON.parse(await requests[0].clone().text());
    expect(jsonBody.response_format).toEqual({ type: 'json_object' });
    expect(jsonBody.max_tokens).toBe(2048);
    expect(JSON.parse(await requests[1].clone().text()).stream).toBe(true);
    expect(() => selectFreeAiGatewayModel(undefined, 'production')).toThrow(
      /required in production/
    );
    expect(selectFreeAiGatewayModel(undefined, 'development')).toBeNull();
  });

  it.each([
    [
      '/turn',
      {
        command: 'Negotiate aid.',
        gameState: { turn: 1940, players: { player: { name: 'Britain' } } },
        config: { provider: 'free-ai', model: 'auto' },
      },
      { message: 'Aid agreed.', updates: [], storySoFar: 'Aid agreed.' },
    ],
    [
      '/chat',
      {
        message: 'Can we arrange relief?',
        playerNation: 'Britain',
        targetNation: 'France',
        config: { provider: 'free-ai', model: 'auto' },
      },
      { message: 'Yes.', tone: 'friendly', relationChange: null },
    ],
    [
      '/advisor',
      {
        question: 'How can we help?',
        playerNation: 'Britain',
        config: { provider: 'free-ai', model: 'auto' },
      },
      { advice: 'Negotiate aid.', category: 'diplomacy', suggestedActions: ['Offer supplies.'] },
    ],
  ])('routes %s through the attributed gateway SDK model', async (path, input, output) => {
    const { binding, fetch, requests } = gatewayBinding([JSON.stringify(output)]);
    const response = await app.request(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      { FREE_AI: binding, NODE_ENV: 'production' } as never
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject(output);
    expect(fetch).toHaveBeenCalledOnce();
    expect(requests[0].url).toBe('https://fleet-gateway.internal/v1/chat/completions');
    expect(requests[0].headers.get('x-gateway-project-id')).toBe('open-historia');
    expect(requests[0].headers.get('authorization')).toBe('Bearer service-binding');
    const body = JSON.parse(await requests[0].clone().text());
    expect(body.model).toBe('auto');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.max_tokens).toBe(2048);
  });

  it('does not use Workers AI when production gateway binding is missing', async () => {
    const run = vi.fn();
    const response = await app.request(
      '/turn',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'Negotiate aid.',
          gameState: { turn: 1940 },
          config: { provider: 'free-ai', model: 'auto' },
        }),
      },
      { AI: { run }, NODE_ENV: 'production' } as never
    );
    expect(response.status).toBe(500);
    expect(run).not.toHaveBeenCalled();
  });
});
