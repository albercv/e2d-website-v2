/**
 * Admin: RAG embeddings index — documents list.
 *
 * Server component. Queries Drizzle directly to avoid an unnecessary
 * round-trip through our own API. Filter form is a plain GET <form>;
 * the only client interactivity is the rebuild button at the top.
 */

import Link from "next/link"
import { sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { getJobState, type JobState } from "@/lib/admin/embedding-jobs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RebuildPanel } from "./rebuild-panel"

export const dynamic = "force-dynamic"

const SOURCES = ["blog", "service", "faq", "landing", "ai-answer"] as const
const LOCALES = ["es", "en", "it"] as const
type Source = (typeof SOURCES)[number]
type Locale = (typeof LOCALES)[number]

interface SearchParams {
  source?: string
  locale?: string
  page?: string
}

interface Filters {
  source: Source | null
  locale: Locale | null
  page: number
  pageSize: number
}

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

interface CountRow extends Record<string, unknown> {
  n: number | string
}

function parseSource(value: string | undefined): Source | null {
  if (value && (SOURCES as readonly string[]).includes(value)) return value as Source
  return null
}

function parseLocale(value: string | undefined): Locale | null {
  if (value && (LOCALES as readonly string[]).includes(value)) return value as Locale
  return null
}

function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—"
  const iso = d instanceof Date ? d.toISOString() : d
  return iso.replace("T", " ").slice(0, 19)
}

interface SerializedJobState extends Omit<JobState, "startedAt" | "finishedAt"> {
  startedAt: string | null
  finishedAt: string | null
}

function serializeJobState(s: JobState): SerializedJobState {
  return {
    ...s,
    startedAt: s.startedAt ? s.startedAt.toISOString() : null,
    finishedAt: s.finishedAt ? s.finishedAt.toISOString() : null,
  }
}

async function queryDocuments(filters: Filters): Promise<{ rows: ListRow[]; total: number }> {
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
    WHERE (${filters.source}::text IS NULL OR d.source = ${filters.source})
      AND (${filters.locale}::text IS NULL OR d.locale = ${filters.locale})
    GROUP BY d.id
    ORDER BY d.updated_at DESC NULLS LAST
    LIMIT ${filters.pageSize}
    OFFSET ${offset}
  `)
  const totalResult = await db.execute<CountRow>(sql`
    SELECT COUNT(*)::int AS n FROM kb_documents
    WHERE (${filters.source}::text IS NULL OR source = ${filters.source})
      AND (${filters.locale}::text IS NULL OR locale = ${filters.locale})
  `)
  const rows = result as unknown as ListRow[]
  const totals = totalResult as unknown as CountRow[]
  return { rows, total: Number(totals[0]?.n ?? 0) }
}

function FilterForm({ filters }: { filters: Filters }): JSX.Element {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="source">Source</Label>
        <select
          id="source"
          name="source"
          defaultValue={filters.source ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="locale">Locale</Label>
        <select
          id="locale"
          name="locale"
          defaultValue={filters.locale ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All</option>
          {LOCALES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <input type="hidden" name="page" value="1" />
      <Button type="submit" size="sm">Apply</Button>
      <Link href="/admin/embeddings/search" className="text-sm underline ml-auto">
        Interactive search →
      </Link>
    </form>
  )
}

function buildPageHref(filters: Filters, page: number): string {
  const params = new URLSearchParams()
  if (filters.source) params.set("source", filters.source)
  if (filters.locale) params.set("locale", filters.locale)
  params.set("page", String(page))
  return `/admin/embeddings?${params.toString()}`
}

function Pagination({ filters, total }: { filters: Filters; total: number }): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
  const hasPrev = filters.page > 1
  const hasNext = filters.page < totalPages
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
      <span>
        Page {filters.page} / {totalPages} — {total} document(s)
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={buildPageHref(filters, filters.page - 1)} className="underline">
            ← Prev
          </Link>
        ) : (
          <span className="opacity-50">← Prev</span>
        )}
        {hasNext ? (
          <Link href={buildPageHref(filters, filters.page + 1)} className="underline">
            Next →
          </Link>
        ) : (
          <span className="opacity-50">Next →</span>
        )}
      </div>
    </div>
  )
}

function Row({ row }: { row: ListRow }): JSX.Element {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-3 py-2"><Badge variant="outline">{row.source}</Badge></td>
      <td className="px-3 py-2 font-mono text-xs">{row.source_ref}</td>
      <td className="px-3 py-2"><Badge variant="secondary">{row.locale}</Badge></td>
      <td className="px-3 py-2">
        <Link href={`/admin/embeddings/${row.id}`} className="underline">
          {row.title ?? "(no title)"}
        </Link>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{Number(row.chunk_count ?? 0)}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(row.updated_at)}</td>
    </tr>
  )
}

export default async function AdminEmbeddingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<JSX.Element> {
  const params = await searchParams
  const filters: Filters = {
    source: parseSource(params.source),
    locale: parseLocale(params.locale),
    page: parsePage(params.page),
    pageSize: 50,
  }
  const initialJob = serializeJobState(getJobState())
  const { rows, total } = await queryDocuments(filters)

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      <RebuildPanel initialState={initialJob} />
      <Card>
        <CardHeader>
          <CardTitle>RAG knowledge base</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterForm filters={filters} />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Ref</th>
                  <th className="px-3 py-2 font-medium">Locale</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium text-right">Chunks</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No documents match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <Row key={row.id} row={row} />)
                )}
              </tbody>
            </table>
          </div>
          <Pagination filters={filters} total={total} />
        </CardContent>
      </Card>
    </div>
  )
}
