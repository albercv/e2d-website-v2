/**
 * GET /api/admin/chat/conversations/[id]
 *
 * Returns the full payload for a single conversation: session row,
 * ordered messages, latest captured lead, and most recent Apollo queue
 * row joined via the lead. Protected by the `admin_session` middleware
 * via path prefix.
 */

import { NextResponse, type NextRequest } from "next/server"
import { asc, desc, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/client"
import {
  apolloSyncQueue,
  chatLeads,
  chatMessages,
  chatSessions,
} from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ParamsSchema = z.object({ id: z.string().uuid() })

async function loadSession(id: string) {
  const rows = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1)
  return rows[0] ?? null
}

async function loadMessages(sessionId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
}

async function loadLead(sessionId: string) {
  const rows = await db
    .select()
    .from(chatLeads)
    .where(eq(chatLeads.sessionId, sessionId))
    .orderBy(desc(chatLeads.createdAt))
    .limit(1)
  return rows[0] ?? null
}

async function loadQueue(sessionId: string) {
  const rows = await db
    .select({
      id: apolloSyncQueue.id,
      status: apolloSyncQueue.status,
      attempts: apolloSyncQueue.attempts,
      lastError: apolloSyncQueue.lastError,
      syncedAt: apolloSyncQueue.syncedAt,
      createdAt: apolloSyncQueue.createdAt,
    })
    .from(apolloSyncQueue)
    .innerJoin(chatLeads, eq(apolloSyncQueue.leadId, chatLeads.id))
    .where(eq(chatLeads.sessionId, sessionId))
    .orderBy(desc(apolloSyncQueue.createdAt))
    .limit(1)
  return rows[0] ?? null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const resolved = await params
  const parsed = ParamsSchema.safeParse(resolved)
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  try {
    const session = await loadSession(parsed.data.id)
    if (!session) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    const [messages, lead, queue] = await Promise.all([
      loadMessages(session.id),
      loadLead(session.id),
      loadQueue(session.id),
    ])
    return NextResponse.json({ session, messages, lead, queue })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[admin/chat/conversations/:id] query failed:", message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
