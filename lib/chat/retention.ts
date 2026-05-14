/**
 * GDPR retention for the AI chat agent.
 *
 * Deletes `chat_messages` rows whose `created_at` is older than the
 * configured retention window, then sweeps orphan `chat_sessions`
 * whose last activity is also past retention. `chat_leads`,
 * `apollo_sync_queue`, and `chat_usage` are explicitly preserved as
 * business records / analytics.
 */

import { sql } from "drizzle-orm"

import { db } from "@/lib/db/client"

const DEFAULT_RETENTION_DAYS = 90

export interface RetentionReport {
  scanned: number
  deletedMessages: number
  deletedSessions: number
}

interface PurgeOpts {
  retentionDays?: number
  dryRun?: boolean
}

function resolveRetentionDays(opt?: number): number {
  if (typeof opt === "number" && opt > 0) return Math.floor(opt)
  const raw = Number(process.env.CHAT_MESSAGE_RETENTION_DAYS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_RETENTION_DAYS
}

async function countMessagesPast(days: number): Promise<number> {
  const rows = await db.execute<{ n: string | number }>(sql`
    SELECT COUNT(*)::text AS n
    FROM chat_messages
    WHERE created_at < now() - (${days} || ' days')::interval
  `)
  const first = (rows as unknown as Array<{ n: string | number }>)[0]
  return Number(first?.n ?? 0)
}

async function countOrphanSessionsPast(days: number): Promise<number> {
  const rows = await db.execute<{ n: string | number }>(sql`
    SELECT COUNT(*)::text AS n
    FROM chat_sessions s
    WHERE s.created_at < now() - (${days} || ' days')::interval
      AND NOT EXISTS (
        SELECT 1 FROM chat_messages m WHERE m.session_id = s.id
      )
  `)
  const first = (rows as unknown as Array<{ n: string | number }>)[0]
  return Number(first?.n ?? 0)
}

async function dryRunReport(days: number): Promise<RetentionReport> {
  const deletedMessages = await countMessagesPast(days)
  // Orphan count after a hypothetical delete = sessions whose only
  // messages were already past retention plus sessions with zero
  // messages. We approximate with a post-delete style query.
  const deletedSessions = await countOrphanSessionsPast(days)
  return { scanned: deletedMessages + deletedSessions, deletedMessages, deletedSessions }
}

async function executePurge(days: number): Promise<RetentionReport> {
  // Drizzle's transaction helper wraps the raw SQL in a BEGIN/COMMIT.
  return db.transaction(async (tx) => {
    const msgResult = await tx.execute(sql`
      DELETE FROM chat_messages
      WHERE created_at < now() - (${days} || ' days')::interval
    `)
    const sessResult = await tx.execute(sql`
      DELETE FROM chat_sessions s
      WHERE s.created_at < now() - (${days} || ' days')::interval
        AND NOT EXISTS (
          SELECT 1 FROM chat_messages m WHERE m.session_id = s.id
        )
    `)
    // postgres-js exposes affected row count via `.count` on the result.
    const deletedMessages = readCount(msgResult)
    const deletedSessions = readCount(sessResult)
    return {
      scanned: deletedMessages + deletedSessions,
      deletedMessages,
      deletedSessions,
    }
  })
}

function readCount(result: unknown): number {
  // postgres-js result has `.count`; Drizzle types do not surface it
  // through `execute()`, so we read it defensively.
  const maybe = result as { count?: number } | null
  return typeof maybe?.count === "number" ? maybe.count : 0
}

export async function purgeOldData(opts?: PurgeOpts): Promise<RetentionReport> {
  const days = resolveRetentionDays(opts?.retentionDays)
  if (opts?.dryRun) return dryRunReport(days)
  return executePurge(days)
}
