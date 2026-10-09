import type { WorkerEnv } from '../../lib/worker-env';

const DAILY_CAP = 9_500;

export class SharedAiBudgetError extends Error {
  constructor() {
    super('Shared AI budget is unavailable or exhausted.');
    this.name = 'SharedAiBudgetError';
  }
}

function deny(): never {
  throw new SharedAiBudgetError();
}

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  // Exact priced model IDs from Cloudflare's current Workers AI pricing table.
  '@cf/meta/llama-3.1-8b-instruct-fp8': { input: 13_778, output: 26_128 },
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast': { input: 4_119, output: 34_868 },
};

export async function reserveWorkersAiCall(
  env: WorkerEnv,
  model: string,
  input: unknown,
  outputTokens: number
): Promise<void> {
  const rates = MODEL_RATES[model];
  if (!rates || !Number.isSafeInteger(outputTokens) || outputTokens <= 0 || outputTokens > 8_192)
    return deny();
  const serializedBytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
  const estimatedInputTokens = Math.ceil(serializedBytes * 1.2);
  const neurons = Math.ceil(
    (estimatedInputTokens * rates.input + outputTokens * rates.output) / 1_000_000
  );
  if (!Number.isSafeInteger(neurons) || neurons <= 0 || neurons > DAILY_CAP) return deny();
  const namespace = env.NEURON_BUDGET;
  if (!namespace) return deny();

  let response: Response;
  try {
    const stub = namespace.get(namespace.idFromName('global-budget'));
    response = await stub.fetch('https://internal.local/try-debit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neurons }),
    });
  } catch {
    return deny();
  }
  if (response.status !== 200) return deny();
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    return deny();
  }
  if (result === null || typeof result !== 'object' || Array.isArray(result)) return deny();
  const receipt = result as Record<string, unknown>;
  if (
    receipt.allowed !== true ||
    receipt.dayKey !== new Date().toISOString().slice(0, 10) ||
    receipt.retryAfter !== 0 ||
    !Number.isSafeInteger(receipt.used) ||
    (receipt.used as number) < neurons ||
    !Number.isSafeInteger(receipt.remaining) ||
    (receipt.remaining as number) < 0 ||
    (receipt.used as number) + (receipt.remaining as number) !== DAILY_CAP
  )
    return deny();
}
