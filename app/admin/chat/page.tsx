/**
 * Admin: chat conversations list.
 *
 * Server component. Queries Drizzle directly for speed (no fetch hop)
 * and is automatically protected by the `admin_session` middleware.
 * Filters are submitted via a plain GET form so no client component is
 * required.
 */

import Link from "next/link"
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { chatLeads, chatMessages, chatSessions } from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50
const LOCALES = ["", "es", "en", "it"] as const
type LocaleFilter = (typeof LOCALES)[number]

interface ListRow {
  id: string
  visitorId: string | null
  locale: string
  messageCount: number
  hasLead: boolean
  createdAt: Date | null
  lastActivityAt: Date | null
}

interface SearchParams {
  locale?: string
  from?: string
  to?: string
  withLead?: string
}

function parseLocale(value: string | undefined): LocaleFilter {
  if (value && (LOCALES as readonly string[]).includes(value)) return value as LocaleFilter
  return ""
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function truncateId(id: string | null, head = 8): string {
  if (!id) return "—"
  return id.length <= head ? id : `${id.slice(0, head)}…`
}

function formatDate(d: Date | null): string {
  if (!d) return "—"
  return d.toISOString().replace("T", " ").slice(0, 19)
}

interface Filters {
  locale: LocaleFilter
  from: Date | null
  to: Date | null
  withLead: boolean
}

function buildWhere(filters: Filters): SQL | undefined {
  const clauses: SQL[] = []
  if (filters.locale) clauses.push(eq(chatSessions.locale, filters.locale))
  if (filters.from) clauses.push(gte(chatSessions.lastActivityAt, filters.from))
  if (filters.to) clauses.push(lte(chatSessions.lastActivityAt, filters.to))
  return clauses.length > 0 ? and(...clauses) : undefined
}

async function queryRows(filters: Filters): Promise<ListRow[]> {
  const messageCountSql =
    sql<number>`(SELECT count(*)::int FROM ${chatMessages} WHERE ${chatMessages.sessionId} = ${chatSessions.id})`
  const hasLeadSql =
    sql<boolean>`EXISTS (SELECT 1 FROM ${chatLeads} WHERE ${chatLeads.sessionId} = ${chatSessions.id})`

  const base = db
    .select({
      id: chatSessions.id,
      visitorId: chatSessions.visitorId,
      locale: chatSessions.locale,
      createdAt: chatSessions.createdAt,
      lastActivityAt: chatSessions.lastActivityAt,
      messageCount: messageCountSql,
      hasLead: hasLeadSql,
    })
    .from(chatSessions)

  const baseWhere = buildWhere(filters)
  const withLeadClause: SQL | undefined = filters.withLead
    ? sql`EXISTS (SELECT 1 FROM ${chatLeads} WHERE ${chatLeads.sessionId} = ${chatSessions.id})`
    : undefined
  const where: SQL | undefined =
    baseWhere && withLeadClause
      ? and(baseWhere, withLeadClause)
      : baseWhere ?? withLeadClause

  const rows = await (where ? base.where(where) : base)
    .orderBy(desc(chatSessions.lastActivityAt))
    .limit(PAGE_SIZE)

  return rows.map((r) => ({
    id: r.id,
    visitorId: r.visitorId,
    locale: r.locale,
    messageCount: Number(r.messageCount ?? 0),
    hasLead: Boolean(r.hasLead),
    createdAt: r.createdAt,
    lastActivityAt: r.lastActivityAt,
  }))
}

function FilterForm({ filters }: { filters: Filters }): JSX.Element {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="locale">Locale</Label>
        <select
          id="locale"
          name="locale"
          defaultValue={filters.locale}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All</option>
          <option value="es">es</option>
          <option value="en">en</option>
          <option value="it">it</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="from">From</Label>
        <Input id="from" name="from" type="date" defaultValue={filters.from?.toISOString().slice(0, 10) ?? ""} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="to">To</Label>
        <Input id="to" name="to" type="date" defaultValue={filters.to?.toISOString().slice(0, 10) ?? ""} />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="withLead"
          name="withLead"
          type="checkbox"
          value="1"
          defaultChecked={filters.withLead}
          className="h-4 w-4"
        />
        <Label htmlFor="withLead">Only with lead</Label>
      </div>
      <Button type="submit" size="sm">Apply</Button>
    </form>
  )
}

function Row({ row }: { row: ListRow }): JSX.Element {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-3 py-2 font-mono text-xs">
        <Link href={`/admin/chat/${row.id}`} className="underline">
          {truncateId(row.id)}
        </Link>
      </td>
      <td className="px-3 py-2 font-mono text-xs">{truncateId(row.visitorId)}</td>
      <td className="px-3 py-2"><Badge variant="outline">{row.locale}</Badge></td>
      <td className="px-3 py-2 text-right tabular-nums">{row.messageCount}</td>
      <td className="px-3 py-2">{row.hasLead ? <Badge>lead</Badge> : <span className="text-muted-foreground">—</span>}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(row.createdAt)}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(row.lastActivityAt)}</td>
    </tr>
  )
}

export default async function AdminChatListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<JSX.Element> {
  const params = await searchParams
  const filters: Filters = {
    locale: parseLocale(params.locale),
    from: parseDate(params.from),
    to: parseDate(params.to),
    withLead: params.withLead === "1",
  }

  const rows = await queryRows(filters)

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Chat conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterForm filters={filters} />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Session</th>
                  <th className="px-3 py-2 font-medium">Visitor</th>
                  <th className="px-3 py-2 font-medium">Locale</th>
                  <th className="px-3 py-2 font-medium text-right">Msgs</th>
                  <th className="px-3 py-2 font-medium">Lead</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      No conversations match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <Row key={row.id} row={row} />)
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing latest {PAGE_SIZE} rows ordered by last activity.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
