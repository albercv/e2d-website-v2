/**
 * RAG retriever — embeds a user query and runs a cosine top-K search over
 * `kb_chunks` filtered by locale. Returns the joined document metadata so the
 * prompt builder can cite each source.
 *
 * Degrades gracefully: empty query or missing OPENAI_API_KEY returns `[]`
 * (the caller falls back to the contact CTA). Embedding or DB failures
 * propagate to the route handler, which translates them to a 503.
 */

import { sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { embedQuery } from "@/lib/rag/embeddings"
import type { Locale, RetrievedChunk } from "@/lib/chat/types"

const DEFAULT_TOP_K = 5

interface RetrieveOpts {
  topK?: number
  signal?: AbortSignal
}

// pgvector's text format is `[v0,v1,...]`. The `postgres` driver does NOT
// auto-cast number[] to vector, so we serialize and explicitly ::vector in SQL.
function vectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`
}

function readTopK(opt: number | undefined): number {
  if (typeof opt === "number" && Number.isFinite(opt) && opt > 0) return opt
  const raw = process.env.RAG_TOP_K
  if (!raw) return DEFAULT_TOP_K
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOP_K
}

// `Record<string, unknown>` intersection satisfies Drizzle's `execute<T>`
// constraint while preserving named-column typing for downstream mapping.
type RawRow = Record<string, unknown> & {
  id: string
  document_id: string
  content: string
  token_count: number | null
  source: string
  source_ref: string
  title: string | null
  url: string | null
  similarity: number | string
}

function mapRow(row: RawRow): RetrievedChunk {
  // Postgres NUMERIC returns as string; coerce defensively.
  const similarity = typeof row.similarity === "number"
    ? row.similarity
    : Number(row.similarity)
  return {
    id: row.id,
    documentId: row.document_id,
    source: row.source,
    sourceRef: row.source_ref,
    title: row.title ?? "",
    url: row.url ?? "",
    content: row.content,
    similarity,
  }
}

async function searchChunks(
  query: string,
  locale: Locale,
  opts: RetrieveOpts,
): Promise<RetrievedChunk[]> {
  const topK = readTopK(opts.topK)
  const embedding = await embedQuery(query, opts.signal)
  const vecLit = vectorLiteral(embedding)

  // Raw SQL via Drizzle's `sql` template — parameters are escaped automatically.
  const result = await db.execute<RawRow>(sql`
    SELECT c.id,
           c.document_id,
           c.content,
           c.token_count,
           d.source,
           d.source_ref,
           d.title,
           d.url,
           1 - (c.embedding <=> ${vecLit}::vector) AS similarity
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    WHERE d.locale = ${locale}
    ORDER BY c.embedding <=> ${vecLit}::vector
    LIMIT ${topK}
  `)

  // db.execute returns the raw rows array for postgres-js Drizzle.
  const rows = result as unknown as RawRow[]
  return rows.map(mapRow).filter((c) => c.similarity >= 0)
}

export async function retrieveContext(
  query: string,
  locale: Locale,
  opts: RetrieveOpts = {},
): Promise<RetrievedChunk[]> {
  const trimmed = query.trim()
  if (trimmed.length === 0) {
    console.warn("[retriever] empty query — skipping retrieval")
    return []
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[retriever] OPENAI_API_KEY missing — returning empty context")
    return []
  }

  try {
    return await searchChunks(trimmed, locale, opts)
  } catch (err) {
    // A client abort must still stop the route; anything else (embeddings
    // 401/429, provider timeout, DB down) degrades to "no context": the
    // model can answer without the knowledge base, a 503 helps nobody.
    if (opts.signal?.aborted) throw err
    const message = err instanceof Error ? err.message : String(err)
    console.error("[retriever] retrieval failed — answering without context:", message)
    return []
  }
}
