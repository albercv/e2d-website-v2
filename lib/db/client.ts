/**
 * Shared Postgres + Drizzle client for the AI chat agent backend.
 *
 * Single process-wide connection pool. `prepare: false` is intentional:
 * Next.js standalone bundles re-evaluate this module on cold start, and
 * prepared statements can outlive their underlying socket in that flow.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail fast at module load — runtime queries without a DSN are unrecoverable.
  throw new Error(
    "DATABASE_URL is not set. The AI agent backend cannot start without it.",
  );
}

const client = postgres(connectionString, {
  max: 5,
  prepare: false,
});

export const db = drizzle(client, { schema });

export { schema };

/**
 * Close the connection pool. Use in one-shot CLI scripts so the Node event
 * loop can drain and the process exits cleanly. Next.js route handlers
 * should NOT call this — the pool is reused across requests.
 */
export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}
