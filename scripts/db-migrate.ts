#!/usr/bin/env tsx
/**
 * One-shot migration runner. Opens a single dedicated Postgres connection,
 * applies any pending SQL migrations from lib/db/migrations, then exits.
 * Run via `npm run db:migrate` (which invokes tsx).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    // eslint-disable-next-line no-console
    console.log("Migrations applied successfully.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", err);
  process.exit(1);
});
