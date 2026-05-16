/**
 * Admin: editable system prompt — collection endpoint.
 *
 *   GET  /api/admin/prompts          → per-locale summary (active version,
 *                                       last update, total versions).
 *   POST /api/admin/prompts          → create a new draft version for a
 *                                       locale; activation is a separate step.
 *
 * Auth: inherited from the global `admin_session` middleware that guards
 * everything under `/api/admin`.
 */

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import {
  createVersion,
  invalidatePromptCache,
  summarizeByLocale,
  type LocaleSummary,
} from "@/lib/chat/prompt-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LOCALES = ["es", "en", "it"] as const

const PostSchema = z.object({
  locale: z.enum(LOCALES),
  body: z.string().trim().min(1).max(20_000),
  notes: z.string().trim().max(500).optional(),
})

interface ListResponse {
  items: LocaleSummary[]
}

export async function GET(): Promise<NextResponse> {
  try {
    const items = await summarizeByLocale()
    const body: ListResponse = { items }
    return NextResponse.json(body)
  } catch (err) {
    console.error("[admin/prompts] list failed:", (err as Error).message)
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const parsed = PostSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    )
  }
  try {
    const created = await createVersion(
      parsed.data.locale,
      parsed.data.body,
      parsed.data.notes,
    )
    // No active flip happened, but invalidate so the next read sees the
    // latest history without waiting for the TTL to expire.
    invalidatePromptCache(parsed.data.locale)
    return NextResponse.json({ version: created.version, id: created.id })
  } catch (err) {
    console.error("[admin/prompts] create failed:", (err as Error).message)
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 })
  }
}
