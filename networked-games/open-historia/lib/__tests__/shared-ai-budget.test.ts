import { describe, expect, it } from 'vitest';
import { reserveWorkersAiCall, SharedAiBudgetError } from '../../src/worker/shared-ai-budget';

describe('Workers AI budget reservations', () => {
  it('prices the exact fast model and estimates UTF-8 serialized input bytes', async () => {
    let reservedNeurons = 0;
    const env = {
      NEURON_BUDGET: {
        idFromName: (name: string) => name,
        get: () => ({
          fetch: async (_url: string, init: RequestInit) => {
            reservedNeurons = (JSON.parse(String(init.body)) as { neurons: number }).neurons;
            return Response.json({
              allowed: true,
              used: reservedNeurons,
              remaining: 9_500 - reservedNeurons,
              retryAfter: 0,
              dayKey: new Date().toISOString().slice(0, 10),
            });
          },
        }),
      },
    } as never;
    const input = { text: 'café ⚓' };
    const serializedBytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
    const inputTokens = Math.ceil(serializedBytes * 1.2);
    const expectedNeurons = Math.ceil((inputTokens * 4_119 + 2_048 * 34_868) / 1_000_000);

    await reserveWorkersAiCall(env, '@cf/meta/llama-3.1-8b-instruct-fp8-fast', input, 2_048);

    expect(serializedBytes).toBeGreaterThan(JSON.stringify(input).length);
    expect(reservedNeurons).toBe(expectedNeurons);
  });

  it.each([
    null,
    [],
    'allowed',
    0,
  ])('rejects malformed budget payload %j with a typed denial', async (payload) => {
    const env = {
      NEURON_BUDGET: {
        idFromName: (name: string) => name,
        get: () => ({ fetch: async () => Response.json(payload) }),
      },
    } as never;

    await expect(
      reserveWorkersAiCall(env, '@cf/meta/llama-3.1-8b-instruct-fp8-fast', { text: 'x' }, 512)
    ).rejects.toBeInstanceOf(SharedAiBudgetError);
  });
});
