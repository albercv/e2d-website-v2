// Analytics event helper. Fans one call out to every tracker that is present
// on the page so call sites need no conditional logic and the app stays quiet
// when analytics is absent (consent denied, dev build, blocked script).
//
// Window.gtag type augmentation lives in google-analytics.tsx; the oaiq one
// lives in openai-pixel.tsx. Both are global-scope declarations.

// OpenAI only accepts its own event catalogue and rejects unknown fields
// inside `data`, so GA params are never forwarded. The ChatGPT Ads campaign
// optimises towards appointment_scheduled, so every real contact conversion
// (form, WhatsApp, email) maps to that single standard event; GA4 keeps the
// per-channel split. Micro-interactions (cta_click, chat_open...) stay GA-only.
const OAIQ_EVENT = "appointment_scheduled"
const OAIQ_CONVERSION_EVENTS: ReadonlySet<string> = new Set([
  "generate_lead",
  "whatsapp_click",
  "email_click",
])

export interface TrackOptions {
  // Shared id so a browser event and its server-side mirror (Conversions
  // API) deduplicate on the OpenAI side. Never forwarded to GA.
  eventId?: string
}

function sendToGtag(event: string, params: Record<string, unknown>): void {
  if (typeof window.gtag !== "function") return
  window.gtag("event", event, params)
}

function sendToOaiq(event: string, opts: TrackOptions): void {
  if (!OAIQ_CONVERSION_EVENTS.has(event)) return
  if (typeof window.oaiq !== "function") return
  const data = { type: "customer_action" }
  if (opts.eventId) {
    window.oaiq("measure", OAIQ_EVENT, data, { event_id: opts.eventId })
    return
  }
  window.oaiq("measure", OAIQ_EVENT, data)
}

export function track(event: string, params?: Record<string, unknown>, opts: TrackOptions = {}): void {
  if (typeof window === "undefined") return
  sendToGtag(event, params ?? {})
  sendToOaiq(event, opts)
}
