import { describe, expect, it } from 'vitest';
import { resolveWorkersAiModel } from '../workers-ai-model';

describe('Workers AI model compatibility', () => {
  it('uses the exact priced default and repairs retired or legacy fast identifiers', () => {
    const retired = '@cf/meta/llama-3.1-8b-instruct';
    const legacyFast = `${retired}-fast`;
    const pricedFast = `${retired}-fp8-fast`;
    expect(resolveWorkersAiModel(retired)).toBe(pricedFast);
    expect(resolveWorkersAiModel('auto', ` ${retired} `)).toBe(pricedFast);
    expect(resolveWorkersAiModel(legacyFast)).toBe(pricedFast);
    expect(resolveWorkersAiModel('auto', ` ${legacyFast} `)).toBe(pricedFast);
    expect(resolveWorkersAiModel()).toBe(pricedFast);
  });
  it('preserves explicit model selection and request precedence', () => {
    expect(resolveWorkersAiModel(' @cf/custom/request ', '@cf/custom/operator')).toBe(
      '@cf/custom/request'
    );
  });
  it('ignores non-Workers model names when using the Workers binding', () => {
    expect(resolveWorkersAiModel('auto', '@cf/custom/operator')).toBe('@cf/custom/operator');
    expect(resolveWorkersAiModel('gpt-example', 'gemini-example')).toBe(
      '@cf/meta/llama-3.1-8b-instruct-fp8-fast'
    );
  });
});
