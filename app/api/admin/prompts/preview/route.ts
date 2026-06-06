/**
 * Admin: render a system prompt against sample chunks without persisting.
 *
 *   POST /api/admin/prompts/preview
 *     body: { locale, body, sampleQuery?, sampleChunks? }
 *     → { rendered: string }
 *
 * Used by the editor's preview pane so editors can see the exact prompt
 * the chat agent would receive before they save / activate. Reads neither
 * DB rows nor the in-memory cache — the supplied body is rendered as-is
 * with the locale-specific tail (## Contexto / ## Context / ## Contesto).
 */

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { renderPromptForBody } from "@/lib/chat/prompt"
import type { RetrievedChunk } from "@/lib/chat/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LOCALES = ["es", "en", "it"] as const

const SampleChunkSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  content: z.string().min(1),
})

const PreviewSchema = z.object({
  locale: z.enum(LOCALES),
  body: z.string().min(1).max(20_000),
  sampleQuery: z.string().max(2_000).optional(),
  sampleChunks: z.array(SampleChunkSchema).max(10).optional(),
})

function toRetrieved(
  raw: z.infer<typeof SampleChunkSchema>[] | undefined,
): RetrievedChunk[] {
  if (!raw) return []
  return raw.map((c, i) => ({
    id: `preview-${i}`,
    documentId: `preview-doc-${i}`,
    source: "preview",
    sourceRef: `preview-${i}`,
    title: c.title,
    url: c.url,
    content: c.content,
    similarity: 1,
  }))
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const parsed = PreviewSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const rendered = renderPromptForBody({
    locale: parsed.data.locale,
    body: parsed.data.body,
    chunks: toRetrieved(parsed.data.sampleChunks),
  })
  return NextResponse.json({ rendered })
}
