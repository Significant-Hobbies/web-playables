import { createAppHealthClient, type AppHealthClientOptions } from '@saas-maker/app-health';
import { honoMiddleware } from '@saas-maker/app-health/hono';
import type { MiddlewareHandler } from 'hono';

import type { WorkerEnv } from '../../lib/worker-env';

type TelemetryBindings = Pick<WorkerEnv, 'APP_HEALTH_INGEST_KEY' | 'APP_HEALTH_ENVIRONMENT'>;
type TelemetryEnv = { Bindings: TelemetryBindings };

type MiddlewareTestOptions = {
  fetch?: AppHealthClientOptions['fetch'];
};

export function createAppHealthMiddleware(
  testOptions: MiddlewareTestOptions = {}
): MiddlewareHandler<TelemetryEnv> {
  return honoMiddleware<TelemetryEnv>({
    client: (context) => {
      const env = context.env as TelemetryBindings | undefined;
      if (!env) return null;
      const key = env.APP_HEALTH_INGEST_KEY?.trim();
      if (!key) return null;

      return createAppHealthClient({
        key,
        environment: env.APP_HEALTH_ENVIRONMENT?.trim() || 'production',
        endpoint: 'https://ingest.sassmaker.com/v1/ingest',
        runtime: 'worker',
        disableTimer: true,
        ...(testOptions.fetch ? { fetch: testOptions.fetch } : {}),
      });
    },
  });
}
