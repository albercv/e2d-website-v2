/**
 * GET /api/admin/chat/conversations
 *
 * Lists chat sessions with derived columns for the admin SPA. Same query
 * surface as the server-rendered list page. Protected by the
 * `admin_session` middleware via path prefix matching — no extra auth
 * check here.
 */

import { NextResponse, type NextRequest } from "next/server"
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/client"
import { chatLeads, chatMessages, chatSessions } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

const QuerySchema = z.object({
  locale: z.enum(["es", "en", "it"]).optional(),
  from: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  to: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  withLead: z.enum(["0", "1"]).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})

interface Filters {
  locale?: "es" | "en" | "it"
  from?: Date
  to?: Date
  withLead: boolean
  limit: number
  offset: number
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function buildWhere(filters: Filters): SQL | undefined {
  const clauses: SQL[] = []
  if (filters.locale) clauses.push(eq(chatSessions.locale, filters.locale))
  if (filters.from) clauses.push(gte(chatSessions.lastActivityAt, filters.from))
  if (filters.to) clauses.push(lte(chatSessions.lastActivityAt, filters.to))
  if (filters.withLead) {
    clauses.push(
      sql`EXISTS (SELECT 1 FROM ${chatLeads} WHERE ${chatLeads.sessionId} = ${chatSessions.id})`,
    )
  }
  return clauses.length > 0 ? and(...clauses) : undefined
}

async function countSessions(where: SQL | undefined): Promise<number> {
  const base = db.select({ n: sql<number>`count(*)::int` }).from(chatSessions)
  const rows = await (where ? base.where(where) : base)
  return Number(rows[0]?.n ?? 0)
}

async function listSessions(filters: Filters, where: SQL | undefined) {
  const messageCountSql =
    sql<number>`(SELECT count(*)::int FROM ${chatMessages} WHERE ${chatMessages.sessionId} = ${chatSessions.id})`
  const hasLeadSql =
    sql<boolean>`EXISTS (SELECT 1 FROM ${chatLeads} WHERE ${chatLeads.sessionId} = ${chatSessions.id})`

  const base = db
    .select({
      id: chatSessions.id,
      visitorId: chatSessions.visitorId,
      locale: chatSessions.locale,
      createdAt: chatSessions.createdAt,
      lastActivityAt: chatSessions.lastActivityAt,
      messageCount: messageCountSql,
      hasLead: hasLeadSql,
    })
    .from(chatSessions)

  return (where ? base.where(where) : base)
    .orderBy(desc(chatSessions.lastActivityAt))
    .limit(filters.limit)
    .offset(filters.offset)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = QuerySchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 })
  }

  const filters: Filters = {
    locale: parsed.data.locale,
    from: parseDate(parsed.data.from),
    to: parseDate(parsed.data.to),
    withLead: parsed.data.withLead === "1",
    limit: parsed.data.limit ?? PAGE_SIZE,
    offset: parsed.data.offset ?? 0,
  }

  try {
    const where = buildWhere(filters)
    const [items, total] = await Promise.all([
      listSessions(filters, where),
      countSessions(where),
    ])
    return NextResponse.json({ items, total })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[admin/chat/conversations] query failed:", message)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
