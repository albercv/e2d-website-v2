#!/usr/bin/env tsx
/**
 * CLI wrapper around `lib/leads/apollo-sync.ts:drainApolloQueue`.
 *
 * Usage:
 *   tsx scripts/sync-leads-to-apollo.ts
 *
 * Wired into package.json as `npm run apollo:sync`. Designed for crontab —
 * exits 0 on success, 1 on unhandled failure. Prints a JSON report to
 * stdout so cron job output is machine-grepable.
 */

import "./_env"

import { drainApolloQueue } from "@/lib/leads/apollo-sync"
import { closeDb } from "@/lib/db/client"

async function main(): Promise<number> {
  const report = await drainApolloQueue()
  console.log(JSON.stringify(report, null, 2))
  return 0
}

main()
  .then(async (code) => {
    await closeDb()
    process.exit(code)
  })
  .catch(async (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[apollo-sync] failed: ${message}`)
    try {
      await closeDb()
    } catch {
      // ignore close errors during failure path
    }
    process.exit(1)
  })
