// Applies the migrations in web/drizzle/. Run with `pnpm --filter @stowlet/web db:migrate`.
// Schema changes go over the direct connection when one is given (Neon's DATABASE_URL_UNPOOLED);
// the app itself uses the pooled DATABASE_URL.
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. See web/.env.example.');
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
  });
  console.log('Migrations applied.');
} finally {
  await client.end();
}
