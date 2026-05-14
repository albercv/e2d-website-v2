/**
 * Streaming chat handler.
 *
 * POST  /api/chat → SSE `data: <fragment>\n\n` ... `data: [DONE]\n\n`.
 *                   400 bad input · 429 rate-limit · 503 any internal failure
 *                   (the handler never returns 500 to the client).
 * GET   /api/chat → `{ messages: [] }` — used by smoke checks.
 *
 * Per-request: resolve session → persist user msg → extract lead → retrieve
 * top-K context → stream DeepSeek → persist assistant msg with usage + chunks.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { apolloSyncQueue, chatLeads, chatMessages } from "@/lib/db/schema"
import { streamCompletion } from "@/lib/chat/deepseek"
import { extractLead } from "@/lib/chat/lead-extractor"
import { buildMessages } from "@/lib/chat/prompt"
import { checkRate } from "@/lib/chat/rate-limiter"
import { retrieveContext } from "@/lib/chat/retriever"
import { resolveSession, type SessionContext } from "@/lib/chat/session"
import type { ChatMessage as ChatTurn, Locale, RetrievedChunk } from "@/lib/chat/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_HISTORY_TURNS = 10

const SUPPORTED_LOCALES = ["es", "en", "it"] as const

const BodySchema = z.object({
  chatInput: z.string().trim().min(1).max(2000),
  metadata: z
    .object({
      locale: z.enum(SUPPORTED_LOCALES).optional(),
      visitorId: z.string().uuid().optional(),
    })
    .optional(),
})

const SERVER_MSG: Record<Locale, string> = {
  es: "El asistente está temporalmente fuera de servicio. Escríbenos por WhatsApp (+34 605 497 639) o email (hello@evolve2digital.com).",
  en: "The assistant is temporarily unavailable. Reach us on WhatsApp (+34 605 497 639) or email (hello@evolve2digital.com).",
  it: "L'assistente è temporaneamente non disponibile. Scrivici su WhatsApp (+34 605 497 639) o email (hello@evolve2digital.com).",
}
const RATE_LIMIT_MSG: Record<Locale, string> = {
  es: "Has alcanzado el límite por hora. Vuelve a intentarlo más tarde o escríbenos por WhatsApp.",
  en: "You have reached the hourly limit. Try again later or message us on WhatsApp.",
  it: "Hai raggiunto il limite orario. Riprova più tardi o scrivici su WhatsApp.",
}
const CONTACT = { whatsapp: "https://wa.me/34605497639", email: "hello@evolve2digital.com" } as const

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null
  const tags = header.split(",").map((tag) => tag.trim().split(";")[0] ?? "")
  for (const tag of tags) {
    const primary = tag.split("-")[0]?.toLowerCase()
    if (isLocale(primary)) return primary
  }
  return null
}

function resolveLocale(body: z.infer<typeof BodySchema>, request: NextRequest): Locale {
  return (
    body.metadata?.locale ??
    parseAcceptLanguage(request.headers.get("accept-language")) ??
    "es"
  )
}

function readMaxHistoryTurns(): number {
  const raw = process.env.CHAT_MAX_HISTORY_TURNS
  if (!raw) return DEFAULT_HISTORY_TURNS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HISTORY_TURNS
}

async function loadHistory(sessionId: string): Promise<ChatTurn[]> {
  const rows = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(readMaxHistoryTurns() * 2)
  // Drop the just-inserted user message (always the most recent).
  return rows
    .slice(0, -1)
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }))
}

async function persistUserMessage(sessionId: string, content: string): Promise<void> {
  await db.insert(chatMessages).values({ sessionId, role: "user", content })
}

async function persistAssistantMessage(
  sessionId: string,
  content: string,
  tokenCount: number,
  retrievedChunkIds: string[],
): Promise<void> {
  await db.insert(chatMessages).values({
    sessionId,
    role: "assistant",
    content,
    tokenCount: tokenCount > 0 ? tokenCount : null,
    retrievedChunkIds: retrievedChunkIds.length > 0 ? retrievedChunkIds : null,
  })
}

async function queueLead(
  sessionId: string,
  lead: ReturnType<typeof extractLead>,
): Promise<void> {
  // Only persist when we have an actionable contact channel.
  if (!lead || (!lead.email && !lead.phone)) return
  try {
    const inserted = await db
      .insert(chatLeads)
      .values({
        sessionId,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        company: lead.company ?? null,
        intent: lead.intent ?? null,
        consent: false,
      })
      .returning({ id: chatLeads.id })
    const leadId = inserted[0]?.id
    if (!leadId) return
    await db.insert(apolloSyncQueue).values({ leadId, status: "pending" })
  } catch (err) {
    // Lead capture is best-effort — never block the conversation.
    console.error("[chat] lead persist failed:", (err as Error).message)
  }
}

function sseEncode(text: string): Uint8Array {
  return new TextEncoder().encode(`data: ${text}\n\n`)
}

function buildStreamHeaders(setCookie: string | null): Headers {
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  })
  if (setCookie) headers.append("Set-Cookie", setCookie)
  return headers
}

interface StreamPlan {
  session: SessionContext
  messages: ChatTurn[]
  chunks: RetrievedChunk[]
  signal: AbortSignal
}

async function safePersistAssistant(
  sessionId: string,
  text: string,
  tokens: number,
  chunkIds: string[],
): Promise<void> {
  try {
    await persistAssistantMessage(sessionId, text, tokens, chunkIds)
  } catch (err) {
    console.error("[chat] assistant persist failed:", (err as Error).message)
  }
}

function buildSseStream(plan: StreamPlan): ReadableStream<Uint8Array> {
  const { session, messages, chunks, signal } = plan
  const chunkIds = chunks.map((c) => c.id)

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let accumulated = ""
      let totalTokens = 0
      try {
        const iter = streamCompletion(messages, { signal })
        // Manual iteration so we can capture the generator's return value.
        for (;;) {
          const next = await iter.next()
          if (next.done) {
            totalTokens = next.value?.totalTokens ?? 0
            break
          }
          accumulated += next.value
          controller.enqueue(sseEncode(next.value))
        }
        await safePersistAssistant(session.sessionId, accumulated, totalTokens, chunkIds)
        controller.enqueue(sseEncode("[DONE]"))
        controller.close()
      } catch (err) {
        console.error("[chat] stream error:", (err as Error).message)
        if (accumulated.length > 0) {
          await safePersistAssistant(session.sessionId, accumulated, totalTokens, chunkIds)
        }
        try {
          controller.enqueue(sseEncode("[ERROR]"))
        } catch {
          // Controller may already be closed — nothing actionable.
        }
        controller.close()
      }
    },
  })
}

interface PreparedRequest {
  chatInput: string
  locale: Locale
}

async function prepareRequest(request: NextRequest): Promise<
  { ok: true; data: PreparedRequest } | { ok: false; status: 400 }
> {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return { ok: false, status: 400 }
  }
  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) return { ok: false, status: 400 }
  const locale = resolveLocale(parsed.data, request)
  return { ok: true, data: { chatInput: parsed.data.chatInput, locale } }
}

function rateLimitResponse(
  locale: Locale,
  retryAfterSec: number | undefined,
  setCookie: string | null,
): NextResponse {
  const headers = new Headers({ "Retry-After": String(retryAfterSec ?? 60) })
  if (setCookie) headers.append("Set-Cookie", setCookie)
  return NextResponse.json(
    { error: "rate_limit", retryAfterSec, message: RATE_LIMIT_MSG[locale] },
    { status: 429, headers },
  )
}

function serverErrorResponse(request: NextRequest): NextResponse {
  const locale = parseAcceptLanguage(request.headers.get("accept-language")) ?? "es"
  return NextResponse.json(
    { error: "server", message: SERVER_MSG[locale], contact: CONTACT },
    { status: 503 },
  )
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const prep = await prepareRequest(request)
    if (!prep.ok) return NextResponse.json({ error: "bad_request" }, { status: 400 })
    const { chatInput, locale } = prep.data

    const session = await resolveSession(request, locale, { locale })
    const rate = checkRate(session.visitorId)
    if (!rate.allowed) {
      return rateLimitResponse(locale, rate.retryAfterSec, session.setCookieHeader)
    }

    await persistUserMessage(session.sessionId, chatInput)
    // Lead extraction + Apollo queue — awaited but tolerates failures internally.
    await queueLead(session.sessionId, extractLead(chatInput))

    const [chunks, history] = await Promise.all([
      retrieveContext(chatInput, locale, { signal: request.signal }),
      loadHistory(session.sessionId),
    ])
    const messages = buildMessages({
      locale,
      systemContext: chunks,
      history,
      userInput: chatInput,
    })
    const body = buildSseStream({ session, messages, chunks, signal: request.signal })
    return new Response(body, {
      status: 200,
      headers: buildStreamHeaders(session.setCookieHeader),
    })
  } catch (err) {
    console.error("[chat] route error:", (err as Error).message)
    return serverErrorResponse(request)
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ messages: [] }, { status: 200 })
}
