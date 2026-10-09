import type { WorkerEnv } from '../../lib/worker-env';

const STRING_KEYS: (keyof WorkerEnv)[] = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_BASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AI_API_KEY',
  'AI_BASE_URL',
  'AI_MODEL',
  'LOCAL_AI_URL',
  'CLI_BRIDGE_URL',
  'NODE_ENV',
];

export function bindWorkerEnv(env: WorkerEnv) {
  for (const key of STRING_KEYS) {
    const value = env[key];
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  }
}
