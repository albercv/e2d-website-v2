#!/usr/bin/env tsx
/**
 * Daily retention job for AI chat data. Deletes chat_messages and
 * orphan chat_sessions older than CHAT_MESSAGE_RETENTION_DAYS (default
 * 90). chat_leads and apollo_sync_queue are kept as business records;
 * chat_usage is kept as analytics. Designed for crontab.
 */

import "./_env"

import { purgeOldData } from "@/lib/chat/retention"
import { closeDb } from "@/lib/db/client"

async function main(): Promise<number> {
  const dry = process.argv.includes("--dry-run")
  const report = await purgeOldData({ dryRun: dry })
  console.log(JSON.stringify(report, null, 2))
  return 0
}

main()
  .then(async (code) => {
    await closeDb()
    process.exit(code)
  })
  .catch(async (err: unknown) => {
    console.error(
      `[chat-retention] failed: ${err instanceof Error ? err.message : String(err)}`,
    )
    try {
      await closeDb()
    } catch {
      // Connection may already be down; nothing actionable.
    }
    process.exit(1)
  })
