/**
 * Apollo sync queue drainer.
 *
 * Reads pending rows from `apollo_sync_queue`, joins their `chat_leads`,
 * pushes each lead to Apollo via the REST client, and writes the result
 * back to the queue. Individual failures never abort the whole batch:
 * each row carries its own `attempts` counter and `last_error` text, and
 * transitions to `status='failed'` once `attempts >= maxAttempts`.
 *
 * Designed to be called from a CLI script under cron, so it logs one
 * line per row instead of streaming a structured event report.
 */

import { and, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { apolloSyncQueue, chatLeads } from "@/lib/db/schema"
import { createOrUpdateContact } from "@/lib/leads/apollo-client"

export interface SyncReport {
  scanned: number
  synced: number
  failed: number
  skipped: number
}

interface DrainOptions {
  maxAttempts?: number
  batchSize?: number
  signal?: AbortSignal
}

interface QueueJoinedRow {
  queueId: string
  attempts: number
  leadId: string | null
  name: string | null
  email: string | null
  phone: string | null
  company: string | null
  intent: string | null
}

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_BATCH_SIZE = 25
const ERROR_MAX_CHARS = 1024

async function fetchBatch(
  batchSize: number,
  maxAttempts: number,
): Promise<QueueJoinedRow[]> {
  const rows = await db
    .select({
      queueId: apolloSyncQueue.id,
      attempts: apolloSyncQueue.attempts,
      leadId: chatLeads.id,
      name: chatLeads.name,
      email: chatLeads.email,
      phone: chatLeads.phone,
      company: chatLeads.company,
      intent: chatLeads.intent,
    })
    .from(apolloSyncQueue)
    .leftJoin(chatLeads, eq(apolloSyncQueue.leadId, chatLeads.id))
    .where(
      and(
        eq(apolloSyncQueue.status, "pending"),
        sql`${apolloSyncQueue.attempts} < ${maxAttempts}`,
      ),
    )
    .limit(batchSize)

  return rows.map((r) => ({
    queueId: r.queueId,
    attempts: r.attempts ?? 0,
    leadId: r.leadId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    intent: r.intent,
  }))
}

async function markSynced(queueId: string, note?: string): Promise<void> {
  await db
    .update(apolloSyncQueue)
    .set({
      status: "synced",
      syncedAt: sql`now()`,
      ...(note ? { lastError: note } : {}),
    })
    .where(eq(apolloSyncQueue.id, queueId))
}

async function recordFailure(
  queueId: string,
  attemptsAfter: number,
  maxAttempts: number,
  message: string,
): Promise<void> {
  const trimmed = message.slice(0, ERROR_MAX_CHARS)
  const terminal = attemptsAfter >= maxAttempts
  await db
    .update(apolloSyncQueue)
    .set({
      attempts: attemptsAfter,
      lastError: trimmed,
      status: terminal ? "failed" : "pending",
    })
    .where(eq(apolloSyncQueue.id, queueId))
}

function logRow(queueId: string, outcome: string): void {
  // eslint-disable-next-line no-console -- CLI log line for cron output
  console.log(`[apollo-sync] ${queueId} ${outcome}`)
}

async function sweepExhausted(maxAttempts: number): Promise<void> {
  await db
    .update(apolloSyncQueue)
    .set({ status: "failed" })
    .where(
      and(
        eq(apolloSyncQueue.status, "pending"),
        sql`${apolloSyncQueue.attempts} >= ${maxAttempts}`,
      ),
    )
}

async function processRow(
  row: QueueJoinedRow,
  maxAttempts: number,
  signal?: AbortSignal,
): Promise<"synced" | "failed" | "skipped"> {
  if (!row.leadId) {
    await markSynced(row.queueId, "lead deleted before sync")
    logRow(row.queueId, "skipped (lead missing)")
    return "skipped"
  }

  try {
    await createOrUpdateContact(
      {
        email: row.email ?? undefined,
        name: row.name ?? undefined,
        phone: row.phone ?? undefined,
        company: row.company ?? undefined,
        notes: row.intent ?? undefined,
      },
      signal,
    )
    await markSynced(row.queueId)
    logRow(row.queueId, "synced")
    return "synced"
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const attemptsAfter = row.attempts + 1
    await recordFailure(row.queueId, attemptsAfter, maxAttempts, message)
    const terminal = attemptsAfter >= maxAttempts
    logRow(
      row.queueId,
      terminal ? `failed (terminal): ${message}` : `failed (retry): ${message}`,
    )
    return "failed"
  }
}

export async function drainApolloQueue(
  opts: DrainOptions = {},
): Promise<SyncReport> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE
  const report: SyncReport = { scanned: 0, synced: 0, failed: 0, skipped: 0 }

  // Move rows past the attempt ceiling out of `pending` first so we don't
  // re-fetch them in the next iteration.
  await sweepExhausted(maxAttempts)

  for (;;) {
    if (opts.signal?.aborted) break
    const batch = await fetchBatch(batchSize, maxAttempts)
    if (batch.length === 0) break

    for (const row of batch) {
      if (opts.signal?.aborted) break
      report.scanned += 1
      const outcome = await processRow(row, maxAttempts, opts.signal)
      if (outcome === "synced") report.synced += 1
      else if (outcome === "skipped") report.skipped += 1
      else report.failed += 1
    }

    if (batch.length < batchSize) break
  }

  await sweepExhausted(maxAttempts)
  return report
}
