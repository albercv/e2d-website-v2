import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SESSION_COOKIE = "e2d_chat_session"

/**
 * Returns the current chat session id (read from the httpOnly cookie set by
 * /api/chat). Used by client components that need the session id but cannot
 * read the httpOnly cookie themselves (e.g. the lead capture form).
 *
 * Returns `{ sessionId: null }` when no session exists yet — caller should
 * gate dependent UI accordingly.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null
  return NextResponse.json({ sessionId }, { status: 200 })
}
