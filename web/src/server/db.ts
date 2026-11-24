import { Pool } from 'pg';
import { requireEnv } from './env';

/** The one query shape the data layer needs. Implemented by pg in production, PGlite in tests. */
export interface Db {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
}

let pool: Pool | null = null;

export function getDb(): Db {
  // Serverless functions each hold their own pool, so keep it small.
  pool ??= new Pool({ connectionString: requireEnv('DATABASE_URL'), max: 3 });
  const active = pool;
  return {
    async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
      const result = await active.query(text, params);
      return result.rows as T[];
    },
  };
}
