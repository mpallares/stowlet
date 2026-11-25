import { defineConfig } from 'drizzle-kit';

/** `pnpm db:generate` compares src/server/db/schema.ts with the migrations in ./drizzle. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
});
