// Normalize app defaults and saved legacy identifiers to the exact priced model ID.
const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const RETIRED_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const LEGACY_FAST_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export function resolveWorkersAiModel(requested?: string, configured?: string): string {
  const model = [requested, configured]
    .map((value) => value?.trim())
    .find((value) => value?.startsWith('@cf/'));
  // Keep old saves and operator defaults on the priced model identifier.
  return !model || model === RETIRED_MODEL || model === LEGACY_FAST_MODEL ? DEFAULT_MODEL : model;
}
