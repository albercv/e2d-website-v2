#!/usr/bin/env tsx
/**
 * Plain-SQL migration runner. Tracks applied files in `_migrations`.
 * Runs every `*.sql` under lib/db/migrations in lexical order, once.
 * Designed for hand-written DDL (CREATE EXTENSION vector, etc.) that
 * drizzle-kit doesn't natively emit.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import postgres from "postgres";

try {
  loadEnvFile(".env");
} catch {
  // .env optional; fall back to ambient process.env
}

const MIGRATIONS_DIR = "./lib/db/migrations";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const sql = postgres(connectionString, { max: 1, prepare: false });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const applied = await sql<{ filename: string }[]>`
      SELECT filename FROM _migrations
    `;
    const appliedSet = new Set(applied.map((r) => r.filename));

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) continue;
      const body = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
      });
      console.log(`✓ applied ${file}`);
      count++;
    }

    console.log(
      count === 0 ? "No pending migrations." : `Applied ${count} migration(s).`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
