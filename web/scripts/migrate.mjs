// Applies db/schema.sql. Run with `pnpm --filter @stowlet/web db:migrate`.
// Schema changes go over the direct connection when one is given (Neon's DATABASE_URL_UNPOOLED);
// the app itself uses the pooled DATABASE_URL.
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. See web/.env.example.');
  process.exit(1);
}
const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log('Schema applied.');
} finally {
  await client.end();
}
