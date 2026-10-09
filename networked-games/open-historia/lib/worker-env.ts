import type { DbEnv } from './db';

export type WorkerEnv = {
  DB: DbEnv['DB'];
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_BASE_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI?: Ai;
  FREE_AI?: Fetcher;
  NEURON_BUDGET?: DurableObjectNamespace;
  LOCAL_AI_URL?: string;
  CLI_BRIDGE_URL?: string;
  NODE_ENV?: string;
  APP_HEALTH_INGEST_KEY?: string;
  APP_HEALTH_ENVIRONMENT?: string;
  ASSETS: Fetcher;
};
