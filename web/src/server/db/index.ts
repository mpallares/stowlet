import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { requireEnv } from '../env';
import * as schema from './schema';

/**
 * The database handle the data layer takes. It is the driver-independent Drizzle type, so
 * production passes node-postgres and the tests pass an in-process PGlite.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let db: Db | null = null;

export function getDb(): Db {
  // Serverless functions each hold their own pool, so keep it small.
  db ??= drizzle(new Pool({ connectionString: requireEnv('DATABASE_URL'), max: 3 }), { schema });
  return db;
}
