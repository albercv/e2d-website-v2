/**
 * POST /api/chat/lead — explicit lead capture from the chat panel form.
 *
 * 200 → lead persisted (apollo + email best-effort, surfaced as `warnings`).
 * 400 → zod validation failure or missing consent.
 * 503 → any internal failure; the visitor sees the localized fallback CTA.
 *
 * Never returns 500: anything not classified as bad_request is degraded to
 * a 503 with a localized message and contact channels so the user always
 * has a way out.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { captureLead } from "@/lib/leads/lead-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SUPPORTED_LOCALES = ["es", "en", "it"] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().toLowerCase(),
  phone: z.string().trim().max(60).optional(),
  company: z.string().trim().max(200).optional(),
  intent: z.string().trim().max(100).optional(),
  message: z.string().trim().max(2000).optional(),
  consent: z.literal(true),
  locale: z.enum(SUPPORTED_LOCALES),
})

const SERVER_MSG: Record<Locale, string> = {
  es: "No hemos podido procesar tu solicitud. Escríbenos por WhatsApp (+34 605 497 639) o email (hello@evolve2digital.com).",
  en: "We could not process your request. Reach us on WhatsApp (+34 605 497 639) or email (hello@evolve2digital.com).",
  it: "Non siamo riusciti a elaborare la richiesta. Scrivici su WhatsApp (+34 605 497 639) o email (hello@evolve2digital.com).",
}

const CONTACT = {
  whatsapp: "https://wa.me/34605497639",
  email: "hello@evolve2digital.com",
} as const

const SESSION_COOKIE = "e2d_chat_session"

function safeFallbackLocale(value: unknown): Locale {
  if (typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    return value as Locale
  }
  return "es"
}

function badRequest(): NextResponse {
  return NextResponse.json({ error: "bad_request" }, { status: 400 })
}

function serverError(locale: Locale): NextResponse {
  return NextResponse.json(
    { error: "server", message: SERVER_MSG[locale], contact: CONTACT },
    { status: 503 },
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return badRequest()
  }

  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) return badRequest()
  const input = parsed.data

  // Cookie cross-check is informational — the form already binds sessionId
  // from the panel. A stale or absent cookie should not block submission.
  const cookieSession = req.cookies.get(SESSION_COOKIE)?.value
  if (cookieSession && cookieSession !== input.sessionId) {
    console.warn(
      `[chat/lead] sessionId mismatch: body=${input.sessionId} cookie=${cookieSession}`,
    )
  }

  try {
    const result = await captureLead(input)
    return NextResponse.json(
      {
        ok: true,
        leadId: result.leadId,
        apolloQueued: result.apolloQueued,
        emailSent: result.emailSent,
        warnings: result.warnings,
      },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === "consent required") {
      return NextResponse.json({ error: "consent_required" }, { status: 400 })
    }
    console.error("[chat/lead] capture failed:", message)
    return serverError(safeFallbackLocale(input.locale))
  }
}
