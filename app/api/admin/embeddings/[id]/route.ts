/**
 * Admin RAG embeddings — single document detail and delete.
 *
 *   GET    /api/admin/embeddings/{id} → document metadata + ordered chunks
 *                                       WITHOUT the 1536-d embedding column
 *                                       (multi-MB payloads otherwise).
 *   DELETE /api/admin/embeddings/{id} → drop chunks + document in one tx.
 *
 * Auth: inherited from the admin_session middleware.
 */

import { NextResponse, type NextRequest } from "next/server"
import { asc, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/client"
import { kbChunks, kbDocuments } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const IdSchema = z.string().uuid()

interface DocumentView {
  id: string
  source: string
  sourceRef: string
  locale: string
  title: string | null
  url: string | null
  contentHash: string
  updatedAt: string | null
}

interface ChunkView {
  id: string
  chunkIndex: number
  content: string
  tokenCount: number | null
}

function serializeDoc(row: typeof kbDocuments.$inferSelect): DocumentView {
  return {
    id: row.id,
    source: row.source,
    sourceRef: row.sourceRef,
    locale: row.locale,
    title: row.title,
    url: row.url,
    contentHash: row.contentHash,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  }
}

async function loadDocument(id: string): Promise<typeof kbDocuments.$inferSelect | null> {
  const rows = await db.select().from(kbDocuments).where(eq(kbDocuments.id, id)).limit(1)
  return rows[0] ?? null
}

async function loadChunks(documentId: string): Promise<ChunkView[]> {
  const rows = await db
    .select({
      id: kbChunks.id,
      chunkIndex: kbChunks.chunkIndex,
      content: kbChunks.content,
      tokenCount: kbChunks.tokenCount,
    })
    .from(kbChunks)
    .where(eq(kbChunks.documentId, documentId))
    .orderBy(asc(kbChunks.chunkIndex))
  return rows.map((r) => ({
    id: r.id,
    chunkIndex: r.chunkIndex,
    content: r.content,
    tokenCount: r.tokenCount,
  }))
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params
  const parsed = IdSchema.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  try {
    const doc = await loadDocument(parsed.data)
    if (!doc) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    const chunks = await loadChunks(parsed.data)
    return NextResponse.json({ document: serializeDoc(doc), chunks })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[admin/embeddings/:id] load failed:", message)
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params
  const parsed = IdSchema.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  try {
    const doc = await loadDocument(parsed.data)
    if (!doc) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    // Single transaction: chunks first (FK cascade would also work, but
    // explicit deletion lets us return the chunkCount and keeps intent clear).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunkCount = await db.transaction(async (tx: any) => {
      const deletedChunks = await tx
        .delete(kbChunks)
        .where(eq(kbChunks.documentId, parsed.data))
        .returning({ id: kbChunks.id })
      await tx.delete(kbDocuments).where(eq(kbDocuments.id, parsed.data))
      return deletedChunks.length
    })
    return NextResponse.json({ deleted: true, chunkCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[admin/embeddings/:id] delete failed:", message)
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 })
  }
}
