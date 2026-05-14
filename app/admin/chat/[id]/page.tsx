/**
 * Admin: single chat conversation viewer.
 *
 * Server component. Renders the full message thread, captured lead (if any),
 * and the most recent Apollo sync queue row. Assistant messages list the
 * count of retrieved RAG chunks and the document titles those chunks came
 * from. All read-only — no mutations or client state.
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { asc, desc, eq, inArray } from "drizzle-orm"
import ReactMarkdown from "react-markdown"

import { db } from "@/lib/db/client"
import {
  apolloSyncQueue,
  chatLeads,
  chatMessages,
  chatSessions,
  kbChunks,
  kbDocuments,
} from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

interface MessageView {
  id: string
  role: string
  content: string
  createdAt: Date | null
  tokenCount: number | null
  retrievedChunkIds: string[]
  retrievedTitles: string[]
}

interface LeadView {
  email: string | null
  phone: string | null
  company: string | null
  intent: string | null
  consent: boolean | null
  createdAt: Date | null
}

interface QueueView {
  status: string | null
  attempts: number | null
  lastError: string | null
  syncedAt: Date | null
  createdAt: Date | null
}

function formatDate(d: Date | null): string {
  if (!d) return "—"
  return d.toISOString().replace("T", " ").slice(0, 19)
}

async function loadSession(id: string) {
  const rows = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1)
  return rows[0] ?? null
}

async function loadMessages(sessionId: string): Promise<MessageView[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))

  const allChunkIds = Array.from(
    new Set(rows.flatMap((r) => r.retrievedChunkIds ?? [])),
  )
  const titleMap = await loadChunkTitles(allChunkIds)

  return rows.map((r) => {
    const ids = r.retrievedChunkIds ?? []
    return {
      id: r.id,
      role: r.role,
      content: r.content,
      createdAt: r.createdAt,
      tokenCount: r.tokenCount,
      retrievedChunkIds: ids,
      retrievedTitles: ids
        .map((cid) => titleMap.get(cid))
        .filter((t): t is string => Boolean(t)),
    }
  })
}

async function loadChunkTitles(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (ids.length === 0) return map
  const rows = await db
    .select({ id: kbChunks.id, title: kbDocuments.title, url: kbDocuments.url })
    .from(kbChunks)
    .leftJoin(kbDocuments, eq(kbChunks.documentId, kbDocuments.id))
    .where(inArray(kbChunks.id, ids))
  for (const r of rows) {
    const label = r.title ?? r.url ?? r.id
    map.set(r.id, label)
  }
  return map
}

async function loadLead(sessionId: string): Promise<LeadView | null> {
  const rows = await db
    .select()
    .from(chatLeads)
    .where(eq(chatLeads.sessionId, sessionId))
    .orderBy(desc(chatLeads.createdAt))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    email: r.email,
    phone: r.phone,
    company: r.company,
    intent: r.intent,
    consent: r.consent,
    createdAt: r.createdAt,
  }
}

async function loadLatestQueue(sessionId: string): Promise<QueueView | null> {
  const rows = await db
    .select({
      status: apolloSyncQueue.status,
      attempts: apolloSyncQueue.attempts,
      lastError: apolloSyncQueue.lastError,
      syncedAt: apolloSyncQueue.syncedAt,
      createdAt: apolloSyncQueue.createdAt,
    })
    .from(apolloSyncQueue)
    .innerJoin(chatLeads, eq(apolloSyncQueue.leadId, chatLeads.id))
    .where(eq(chatLeads.sessionId, sessionId))
    .orderBy(desc(apolloSyncQueue.createdAt))
    .limit(1)
  return rows[0] ?? null
}

function MessageBubble({ msg }: { msg: MessageView }): JSX.Element {
  const isUser = msg.role === "user"
  const align = isUser ? "items-end" : "items-start"
  const bubble = isUser
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-foreground"
  return (
    <div className={`flex flex-col ${align} gap-1`}>
      <div className={`max-w-3xl rounded-lg px-4 py-2 ${bubble} text-sm`}>
        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{msg.role}</span>
        <span>·</span>
        <span>{formatDate(msg.createdAt)}</span>
        {msg.tokenCount != null && <span>· {msg.tokenCount} tok</span>}
        {msg.retrievedChunkIds.length > 0 && (
          <details className="cursor-pointer">
            <summary>RAG: {msg.retrievedChunkIds.length} chunks</summary>
            <ul className="mt-1 ml-3 list-disc">
              {msg.retrievedTitles.map((title, i) => (
                <li key={i}>{title}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}

function LeadPanel({ lead, queue }: { lead: LeadView | null; queue: QueueView | null }): JSX.Element {
  if (!lead) {
    return (
      <Card>
        <CardHeader><CardTitle>Lead</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No lead captured.</CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader><CardTitle>Lead</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-2">
        <div><strong>Email:</strong> {lead.email ?? "—"}</div>
        <div><strong>Phone:</strong> {lead.phone ?? "—"}</div>
        <div><strong>Company:</strong> {lead.company ?? "—"}</div>
        <div><strong>Intent:</strong> {lead.intent ?? "—"}</div>
        <div><strong>Consent:</strong> {lead.consent ? "yes" : "no"}</div>
        <div><strong>Captured:</strong> {formatDate(lead.createdAt)}</div>
        <hr className="my-2" />
        <div><strong>Apollo status:</strong> <Badge variant="outline">{queue?.status ?? "—"}</Badge></div>
        <div><strong>Attempts:</strong> {queue?.attempts ?? 0}</div>
        {queue?.lastError && (
          <div className="text-destructive break-words"><strong>Last error:</strong> {queue.lastError}</div>
        )}
        <div><strong>Synced at:</strong> {formatDate(queue?.syncedAt ?? null)}</div>
      </CardContent>
    </Card>
  )
}

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<JSX.Element> {
  const { id } = await params
  const session = await loadSession(id)
  if (!session) notFound()

  const [messages, lead, queue] = await Promise.all([
    loadMessages(session.id),
    loadLead(session.id),
    loadLatestQueue(session.id),
  ])

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div>
        <Link href="/admin/chat" className="text-sm underline">← Back to conversations</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><strong>Session:</strong> <span className="font-mono">{session.id}</span></div>
            <div><strong>Visitor:</strong> <span className="font-mono">{session.visitorId ?? "—"}</span></div>
            <div><strong>Locale:</strong> <Badge variant="outline">{session.locale}</Badge></div>
            <div><strong>Messages:</strong> {messages.length}</div>
            <div><strong>Created:</strong> {formatDate(session.createdAt)}</div>
            <div><strong>Last activity:</strong> {formatDate(session.lastActivityAt)}</div>
          </div>
        </CardContent>
      </Card>

      <LeadPanel lead={lead} queue={queue} />

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages.</p>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}
