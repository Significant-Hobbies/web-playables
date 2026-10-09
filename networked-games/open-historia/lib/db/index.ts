import { drizzle } from 'drizzle-orm/d1';

import * as schema from './schema';

export type DbEnv = {
  DB: Parameters<typeof drizzle>[0];
};

export function createDb(env: DbEnv) {
  return drizzle(env.DB, { schema });
}

export type AppDb = ReturnType<typeof createDb>;
