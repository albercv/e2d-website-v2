/**
 * Admin RAG embeddings — interactive retrieval tester.
 *
 *   POST /api/admin/embeddings/search { query, locale, topK? }
 *     → top-K cosine matches with similarity scores, joined with document
 *       metadata. Same engine the production chat agent uses.
 *
 * Auth: inherited from the admin_session middleware.
 */

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { retrieveContext } from "@/lib/chat/retriever"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BodySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  locale: z.enum(["es", "en", "it"]),
  topK: z.number().int().min(1).max(20).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { query, locale, topK } = parsed.data
  try {
    const results = await retrieveContext(query, locale, { topK: topK ?? 5 })
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[admin/embeddings/search] failed:", message)
    return NextResponse.json({ error: "retrieval_failed" }, { status: 503 })
  }
}
