/**
 * Chat session resolver.
 *
 * Reads the `e2d_chat_session` httpOnly cookie (if present) to look up an
 * existing `chat_sessions` row, or mints a new one. Visitor identity falls
 * back through: `e2d_user_uuid` cookie (Apollo tracker) → `metadata.visitorId`
 * from the request body → freshly generated UUID. The cookie is opaque and
 * httpOnly so client JS cannot impersonate another session.
 */

import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { eq, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { chatSessions } from "@/lib/db/schema"
import type { Locale } from "@/lib/chat/types"

const SESSION_COOKIE = "e2d_chat_session"
const VISITOR_COOKIE = "e2d_user_uuid"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SessionContext {
  sessionId: string
  visitorId: string
  locale: Locale
  // Non-null only when a brand-new cookie must be sent to the client.
  setCookieHeader: string | null
}

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

function readVisitorId(
  req: NextRequest,
  metadata: Record<string, unknown>,
): string {
  const fromCookie = req.cookies.get(VISITOR_COOKIE)?.value
  if (isValidUuid(fromCookie)) return fromCookie
  const fromBody = metadata.visitorId
  if (isValidUuid(fromBody)) return fromBody
  return randomUUID()
}

function buildSessionCookie(sessionId: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ""
  const secureFlag = base.startsWith("https") ? "; Secure" : ""
  return (
    `${SESSION_COOKIE}=${sessionId}` +
    `; Path=/; Max-Age=${SESSION_TTL_SECONDS}` +
    `; HttpOnly; SameSite=Lax${secureFlag}`
  )
}

async function touchExistingSession(sessionId: string): Promise<boolean> {
  // Drizzle UPDATE with RETURNING — exists iff a row was matched.
  const updated = await db
    .update(chatSessions)
    .set({ lastActivityAt: sql`now()` })
    .where(eq(chatSessions.id, sessionId))
    .returning({ id: chatSessions.id })
  return updated.length > 0
}

async function createSession(
  visitorId: string,
  locale: Locale,
  metadata: Record<string, unknown>,
): Promise<string> {
  const inserted = await db
    .insert(chatSessions)
    .values({ visitorId, locale, metadata })
    .returning({ id: chatSessions.id })
  const row = inserted[0]
  if (!row) {
    // Defensive — RETURNING must yield exactly one row for a successful INSERT.
    throw new Error("chat_sessions INSERT returned no rows")
  }
  return row.id
}

export async function resolveSession(
  req: NextRequest,
  locale: Locale,
  metadata: Record<string, unknown>,
): Promise<SessionContext> {
  const visitorId = readVisitorId(req, metadata)
  const cookieValue = req.cookies.get(SESSION_COOKIE)?.value

  if (isValidUuid(cookieValue)) {
    const refreshed = await touchExistingSession(cookieValue)
    if (refreshed) {
      return { sessionId: cookieValue, visitorId, locale, setCookieHeader: null }
    }
    // Cookie pointed to a row that no longer exists — fall through to create.
  }

  const newId = await createSession(visitorId, locale, metadata)
  return {
    sessionId: newId,
    visitorId,
    locale,
    setCookieHeader: buildSessionCookie(newId),
  }
}
