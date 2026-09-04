/**
 * Lead capture orchestrator.
 *
 * Single entry point for the explicit lead forms (chat panel and contact
 * modal). Persists the
 * lead with `consent=true`, queues it for Apollo upsert, then sends Alberto
 * a consultation email with the recent conversation transcript attached for
 * context. Only the consent failure throws — everything else degrades into
 * a warning so the visitor never sees an opaque server crash.
 */

import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { apolloSyncQueue, chatLeads, chatMessages } from "@/lib/db/schema"
import { buildConsultationEmail } from "@/lib/email/consultation-email"
import { sendEmail } from "@/lib/email/resend-client"

const TRANSCRIPT_TURNS = 20
const DEFAULT_ADMIN_EMAIL = "hello@evolve2digital.com"

export interface CaptureLeadInput {
  // Chat session the lead came from; absent for the contact modal.
  sessionId?: string
  name?: string
  email: string
  phone?: string
  company?: string
  intent?: string
  message?: string
  consent: boolean
  locale: "es" | "en" | "it"
}

export interface CaptureLeadResult {
  leadId: string
  apolloQueued: boolean
  emailSent: boolean
  warnings: string[]
}

interface LoadedTurn {
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

async function insertLead(input: CaptureLeadInput): Promise<string> {
  const inserted = await db
    .insert(chatLeads)
    .values({
      sessionId: input.sessionId ?? null,
      name: input.name ?? null,
      email: input.email,
      phone: input.phone ?? null,
      company: input.company ?? null,
      intent: input.intent ?? null,
      message: input.message ?? null,
      consent: true,
    })
    .returning({ id: chatLeads.id })
  const row = inserted[0]
  if (!row) {
    throw new Error("chat_leads INSERT returned no rows")
  }
  return row.id
}

async function enqueueApollo(leadId: string): Promise<void> {
  await db.insert(apolloSyncQueue).values({ leadId, status: "pending" })
}

async function loadTranscript(sessionId: string): Promise<LoadedTurn[]> {
  const rows = await db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(TRANSCRIPT_TURNS * 2)

  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .slice(-TRANSCRIPT_TURNS)
    .map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: r.createdAt ?? new Date(),
    }))
}

function readAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
}

async function tryEnqueueApollo(
  leadId: string,
  warnings: string[],
): Promise<boolean> {
  try {
    await enqueueApollo(leadId)
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warnings.push(`apollo_queue_failed: ${message}`)
    return false
  }
}

async function trySendEmail(
  input: CaptureLeadInput,
  warnings: string[],
): Promise<boolean> {
  try {
    const transcript = input.sessionId ? await loadTranscript(input.sessionId) : []
    const email = buildConsultationEmail({
      lead: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        intent: input.intent,
        message: input.message,
      },
      conversation: transcript,
      locale: input.locale,
      sessionId: input.sessionId,
    })
    await sendEmail({
      to: readAdminEmail(),
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: input.email,
    })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warnings.push(`email_send_failed: ${message}`)
    return false
  }
}

export async function captureLead(
  input: CaptureLeadInput,
): Promise<CaptureLeadResult> {
  if (input.consent !== true) {
    throw new Error("consent required")
  }

  const leadId = await insertLead(input)
  const warnings: string[] = []
  const apolloQueued = await tryEnqueueApollo(leadId, warnings)
  const emailSent = await trySendEmail(input, warnings)

  return { leadId, apolloQueued, emailSent, warnings }
}
