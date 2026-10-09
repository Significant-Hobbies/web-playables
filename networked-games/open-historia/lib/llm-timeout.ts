// Shared deadline for all provider calls (Anthropic / Google / OpenAI / DeepSeek / local / free-ai).
// 55s sits under Cloudflare Workers' default 60s request ceiling so we get a structured 504
// rather than a generic platform timeout.
export const LLM_TIMEOUT_MS = 55_000;

export class LLMTimeoutError extends Error {
  constructor(provider: string) {
    super(`Provider ${provider} timed out after ${LLM_TIMEOUT_MS}ms`);
    this.name = 'LLMTimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, provider: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handle = setTimeout(() => reject(new LLMTimeoutError(provider)), LLM_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(handle);
        resolve(value);
      },
      (err) => {
        clearTimeout(handle);
        reject(err);
      }
    );
  });
}
