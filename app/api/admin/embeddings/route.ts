/**
 * Admin RAG embeddings index API.
 *
 *   GET  /api/admin/embeddings  → paginated list of kb_documents with
 *                                  chunk counts, plus current rebuild job
 *                                  state.
 *   POST /api/admin/embeddings  → trigger a `npm run rag:index` child
 *                                  process tracked in-memory.
 *
 * Auth: inherited from the global `admin_session` middleware that guards
 * everything under `/api/admin`. No extra check here.
 */

import { NextResponse, type NextRequest } from "next/server"
import { sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/client"
import {
  getJobState,
  startRebuild,
  type JobState,
} from "@/lib/admin/embedding-jobs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SOURCES = ["blog", "service", "faq", "landing", "ai-answer"] as const
const LOCALES = ["es", "en", "it"] as const

const QuerySchema = z.object({
  source: z.enum(SOURCES).optional(),
  locale: z.enum(LOCALES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(10).max(100).optional(),
})

const PostSchema = z.object({
  full: z.boolean().optional(),
  locales: z.array(z.enum(LOCALES)).optional(),
  sources: z.array(z.enum(SOURCES)).optional(),
})

interface ListRow extends Record<string, unknown> {
  id: string
  source: string
  source_ref: string
  locale: string
  title: string | null
  url: string | null
  updated_at: Date | string | null
  chunk_count: number | string
}

interface ListItem {
  id: string
  source: string
  sourceRef: string
  locale: string
  title: string | null
  url: string | null
  updatedAt: string | null
  chunkCount: number
}

interface CountRow extends Record<string, unknown> {
  n: number | string
}

function mapItem(row: ListRow): ListItem {
  const updated =
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : row.updated_at ?? null
  return {
    id: row.id,
    source: row.source,
    sourceRef: row.source_ref,
    locale: row.locale,
    title: row.title,
    url: row.url,
    updatedAt: typeof updated === "string" ? updated : null,
    chunkCount: Number(row.chunk_count ?? 0),
  }
}

interface QueryFilters {
  source: (typeof SOURCES)[number] | undefined
  locale: (typeof LOCALES)[number] | undefined
  page: number
  pageSize: number
}

async function listDocuments(filters: QueryFilters): Promise<{ items: ListItem[]; total: number }> {
  const offset = (filters.page - 1) * filters.pageSize
  const result = await db.execute<ListRow>(sql`
    SELECT d.id,
           d.source,
           d.source_ref,
           d.locale,
           d.title,
           d.url,
           d.updated_at,
           COUNT(c.id) AS chunk_count
    FROM kb_documents d
    LEFT JOIN kb_chunks c ON c.document_id = d.id
    WHERE (${filters.source ?? null}::text IS NULL OR d.source = ${filters.source ?? null})
      AND (${filters.locale ?? null}::text IS NULL OR d.locale = ${filters.locale ?? null})
    GROUP BY d.id
    ORDER BY d.updated_at DESC NULLS LAST
    LIMIT ${filters.pageSize}
    OFFSET ${offset}
  `)
  const rows = result as unknown as ListRow[]

  const totalResult = await db.execute<CountRow>(sql`
    SELECT COUNT(*)::int AS n FROM kb_documents
    WHERE (${filters.source ?? null}::text IS NULL OR source = ${filters.source ?? null})
      AND (${filters.locale ?? null}::text IS NULL OR locale = ${filters.locale ?? null})
  `)
  const totalRows = totalResult as unknown as CountRow[]
  return {
    items: rows.map(mapItem),
    total: Number(totalRows[0]?.n ?? 0),
  }
}

interface ListResponse {
  items: ListItem[]
  total: number
  page: number
  pageSize: number
  jobState: JobState
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = QuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const filters: QueryFilters = {
    source: parsed.data.source,
    locale: parsed.data.locale,
    page: parsed.data.page ?? 1,
    pageSize: parsed.data.pageSize ?? 50,
  }
  try {
    const { items, total } = await listDocuments(filters)
    const body: ListResponse = {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      jobState: getJobState(),
    }
    return NextResponse.json(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[admin/embeddings] list failed:", message)
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const result = startRebuild(parsed.data)
  return NextResponse.json({ ...result, jobState: getJobState() })
}
