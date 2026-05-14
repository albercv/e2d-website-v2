/**
 * Admin: RAG embeddings — single document inspector.
 *
 * Server component. Loads the document and its chunks (excluding the
 * 1536-d embedding column — that would balloon the SSR payload to MBs
 * per page) and renders each chunk inside a <details> for lazy expansion.
 * Deletion goes through a tiny client island so the page itself remains
 * server-rendered.
 */

import Link from "next/link"
import { notFound } from "next/navigation"
import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { kbChunks, kbDocuments } from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DeleteDocumentButton } from "./delete-button"

export const dynamic = "force-dynamic"

interface ChunkRow {
  id: string
  chunkIndex: number
  content: string
  tokenCount: number | null
}

function formatDate(d: Date | null): string {
  if (!d) return "—"
  return d.toISOString().replace("T", " ").slice(0, 19)
}

async function loadDocument(id: string) {
  const rows = await db.select().from(kbDocuments).where(eq(kbDocuments.id, id)).limit(1)
  return rows[0] ?? null
}

async function loadChunks(documentId: string): Promise<ChunkRow[]> {
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

function sumTokens(chunks: ChunkRow[]): number {
  let total = 0
  for (const c of chunks) total += c.tokenCount ?? 0
  return total
}

function ChunkItem({ chunk }: { chunk: ChunkRow }): JSX.Element {
  return (
    <details className="group rounded-md border bg-background">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm flex items-center justify-between gap-3">
        <span className="font-mono text-xs">#{chunk.chunkIndex}</span>
        <span className="text-xs text-muted-foreground">
          {chunk.tokenCount ?? "?"} tokens · {chunk.content.length} chars
        </span>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {chunk.content.slice(0, 120).replace(/\s+/g, " ")}
        </span>
      </summary>
      <pre className="whitespace-pre-wrap break-words border-t px-3 py-3 text-xs leading-relaxed">
        {chunk.content}
      </pre>
    </details>
  )
}

export default async function AdminEmbeddingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<JSX.Element> {
  const { id } = await params
  const doc = await loadDocument(id)
  if (!doc) notFound()

  const chunks = await loadChunks(id)
  const totalTokens = sumTokens(chunks)

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/embeddings">
          <Button variant="outline" size="sm">← Volver</Button>
        </Link>
        <DeleteDocumentButton documentId={doc.id} title={doc.title ?? doc.sourceRef} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{doc.title ?? "(no title)"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{doc.source}</Badge>
            <Badge variant="secondary">{doc.locale}</Badge>
            <Badge variant="outline" className="font-mono">{doc.sourceRef}</Badge>
          </div>
          {doc.url ? (
            <div className="text-xs">
              URL:{" "}
              <a href={doc.url} className="underline" target="_blank" rel="noreferrer">
                {doc.url}
              </a>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Updated: {formatDate(doc.updatedAt)}</span>
            <span>Hash: <code>{doc.contentHash.slice(0, 12)}…</code></span>
            <span>Chunks: {chunks.length}</span>
            <span>Tokens: {totalTokens}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chunks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {chunks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This document has no chunks. Trigger a rebuild from the list page.
            </p>
          ) : (
            chunks.map((c) => <ChunkItem key={c.id} chunk={c} />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}
