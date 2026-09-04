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

import { captureLead, type CaptureLeadInput } from "@/lib/leads/lead-service"
import { sendOaiqConversion, type OaiqConversionEvent } from "@/lib/analytics/oaiq-server"
import { buildOaiqUser, type OaiqUser } from "@/lib/analytics/oaiq-user-data"

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
  // Page the form was submitted from — becomes source_url on the OpenAI
  // Conversions API mirror. Optional so older clients keep working.
  sourceUrl: z.string().url().max(2048).optional(),
  // Marketing-cookie consent as seen by the banner. The OpenAI mirror sends
  // hashed identifiers to an ad platform, so it is gated on this flag;
  // absent (older clients) means no consent.
  marketingConsent: z.boolean().optional(),
})
type LeadBody = z.infer<typeof BodySchema>

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
// Set by the OpenAI pixel SDK on our domain when the visitor lands from an ad.
const OPPREF_COOKIE = "__oppref"

function safeFallbackLocale(value: unknown): Locale {
  if (typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    return value as Locale
  }
  return "es"
}

// Explicit pick: the lead service must not receive the analytics-only
// fields (sourceUrl, marketingConsent) that ride along in the request body.
function toCaptureInput(i: LeadBody): CaptureLeadInput {
  return {
    sessionId: i.sessionId, name: i.name, email: i.email, phone: i.phone, company: i.company,
    intent: i.intent, message: i.message, consent: i.consent, locale: i.locale,
  }
}

function fallbackSourceUrl(locale: Locale): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://evolve2digital.com"
  return `${base}/${locale}`
}

// Server-side mirror of the browser generate_lead pair: appointment_scheduled
// (campaign goal) + custom lead_form (channel). Ids match the browser side so
// OpenAI dedupes each pair. Only real transport/HTTP failures become
// warnings; "not configured" is the normal state until the API key lands in
// .env and must not add noise.
async function mirrorOne(event: OaiqConversionEvent, warnings: string[]): Promise<void> {
  try {
    const result = await sendOaiqConversion(event)
    if (result.sent || result.reason === "not_configured") return
    warnings.push(`oaiq ${event.type}: ${result.reason}`)
  } catch {
    warnings.push(`oaiq ${event.type}: network`)
  }
}

interface MirrorContext {
  oppref?: string
  user: OaiqUser
}

function mirrorContextFromRequest(req: NextRequest, input: LeadBody): MirrorContext {
  const forwarded = req.headers.get("x-forwarded-for")
  const ipAddress = forwarded?.split(",")[0]?.trim() || undefined
  const userAgent = req.headers.get("user-agent") ?? undefined
  const oppref = req.cookies.get(OPPREF_COOKIE)?.value || undefined
  return { oppref, user: buildOaiqUser({ email: input.email, phone: input.phone, ipAddress, userAgent }) }
}

async function mirrorLeadToOaiq(input: LeadBody, ctx: MirrorContext, warnings: string[]): Promise<void> {
  const eventId = `lead_${input.sessionId}`
  const sourceUrl = input.sourceUrl ?? fallbackSourceUrl(input.locale)
  const shared = { sourceUrl, user: ctx.user, ...(ctx.oppref ? { oppref: ctx.oppref } : {}) }
  await mirrorOne({ eventId, type: "appointment_scheduled", ...shared }, warnings)
  await mirrorOne(
    { eventId: `${eventId}_lead_form`, type: "custom", customEventName: "lead_form", ...shared },
    warnings,
  )
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
    const result = await captureLead(toCaptureInput(input))
    const warnings = [...result.warnings]
    if (input.marketingConsent === true) {
      await mirrorLeadToOaiq(input, mirrorContextFromRequest(req, input), warnings)
    }
    return NextResponse.json(
      {
        ok: true,
        leadId: result.leadId,
        apolloQueued: result.apolloQueued,
        emailSent: result.emailSent,
        warnings,
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
