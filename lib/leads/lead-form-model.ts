// Framework-free model of the lead form shared by the chat panel and the
// contact modal: state shape, validation, payload building and the POST.
// Keeping it out of React makes every rule unit-testable without rendering.

export type LeadLocale = "es" | "en" | "it"

// Same intent vocabulary the lead-extractor uses, so the queue surfaces a
// single canonical set of values.
export const INTENT_OPTIONS = ["voicebot", "chatbot", "automation", "web", "crm", "budget", "other"] as const
export type IntentOption = (typeof INTENT_OPTIONS)[number]

export interface LeadFormState {
  name: string; email: string; phone: string; company: string
  intent: IntentOption | ""; message: string; consent: boolean
}

export type LeadFormError = "email" | "consent"

export interface LeadPayloadContext {
  locale: LeadLocale
  // Chat session the lead belongs to; omitted from the contact modal.
  sessionId?: string
}

export type PostLeadResult = { ok: true; leadId: string } | { ok: false }

// Where the form was rendered; drives GA's form_location and follow-up copy.
export type LeadFormLocation = "chat" | "contact_modal"

// What the success view needs to prefill the WhatsApp/email follow-up.
export interface SubmittedLead {
  leadId: string
  name: string
  company: string
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emptyLeadFormState(prefillIntent?: string): LeadFormState {
  const intent = (INTENT_OPTIONS as readonly string[]).includes(prefillIntent ?? "")
    ? (prefillIntent as IntentOption) : ""
  return { name: "", email: "", phone: "", company: "", intent, message: "", consent: false }
}

export function validateLeadForm(state: LeadFormState): LeadFormError | null {
  const email = state.email.trim()
  if (email.length === 0 || !EMAIL_RE.test(email)) return "email"
  if (state.consent !== true) return "consent"
  return null
}

// Mirrors the banner's marketing flag so the server only forwards this lead
// to ad platforms when the visitor opted in. Absent/malformed = no consent.
export function hasMarketingConsent(): boolean {
  if (typeof localStorage === "undefined") return false
  try {
    const parsed = JSON.parse(localStorage.getItem("cookie-consent") ?? "null") as { marketing?: boolean } | null
    return parsed?.marketing === true
  } catch {
    return false
  }
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildLeadPayload(s: LeadFormState, ctx: LeadPayloadContext): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    email: s.email.trim().toLowerCase(), consent: true, locale: ctx.locale,
    // Lets the server-side conversion mirror report the real landing page.
    sourceUrl: window.location.href,
    marketingConsent: hasMarketingConsent(),
  }
  if (ctx.sessionId) payload.sessionId = ctx.sessionId
  const optionals = { name: s.name, phone: s.phone, company: s.company, message: s.message }
  for (const [key, value] of Object.entries(optionals)) {
    const text = optionalText(value)
    if (text) payload[key] = text
  }
  if (s.intent) payload.intent = s.intent
  return payload
}

export async function postLead(payload: Record<string, unknown>): Promise<PostLeadResult> {
  try {
    const res = await fetch("/api/chat/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return { ok: false }
    const body = (await res.json()) as { leadId?: string }
    return typeof body.leadId === "string" ? { ok: true, leadId: body.leadId } : { ok: false }
  } catch (err) {
    console.error("[lead-form] network error:", (err as Error).message)
    return { ok: false }
  }
}
