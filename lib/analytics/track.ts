// Analytics event helper. Fans one call out to every tracker that is present
// on the page so call sites need no conditional logic and the app stays quiet
// when analytics is absent (consent denied, dev build, blocked script).
//
// Window.gtag type augmentation lives in google-analytics.tsx; the oaiq one
// lives in openai-pixel.tsx. Both are global-scope declarations.

// Only real conversions go to the OpenAI pixel — its purpose is ad
// attribution, so micro-interactions (cta_click, chat_open...) stay GA-only.
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

function sendToOaiq(event: string, params: Record<string, unknown>, opts: TrackOptions): void {
  if (!OAIQ_CONVERSION_EVENTS.has(event)) return
  if (typeof window.oaiq !== "function") return
  const data = { type: "customer_action", ...params }
  if (opts.eventId) {
    window.oaiq("measure", event, data, { event_id: opts.eventId })
    return
  }
  window.oaiq("measure", event, data)
}

export function track(event: string, params?: Record<string, unknown>, opts: TrackOptions = {}): void {
  if (typeof window === "undefined") return
  const safeParams = params ?? {}
  sendToGtag(event, safeParams)
  sendToOaiq(event, safeParams, opts)
}
