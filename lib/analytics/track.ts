// Analytics event helper. Fans one call out to every tracker that is present
// on the page so call sites need no conditional logic and the app stays quiet
// when analytics is absent (consent denied, dev build, blocked script).
//
// Window.gtag type augmentation lives in google-analytics.tsx; the oaiq one
// lives in openai-pixel.tsx. Both are global-scope declarations.

// OpenAI only accepts its own event catalogue (lead_created, order_created,
// custom...) and rejects unknown fields inside `data`, so internal GA names
// are mapped here and GA params are never forwarded. Only real conversions
// reach the pixel — its purpose is ad attribution, so micro-interactions
// (cta_click, chat_open...) stay GA-only.
type OaiqMapping =
  | { kind: "standard"; name: "lead_created" }
  | { kind: "custom" }

const OAIQ_EVENTS: Readonly<Record<string, OaiqMapping>> = {
  generate_lead: { kind: "standard", name: "lead_created" },
  whatsapp_click: { kind: "custom" },
  email_click: { kind: "custom" },
}

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
  const mapping = OAIQ_EVENTS[event]
  if (!mapping || typeof window.oaiq !== "function") return

  const options: Record<string, string> = {}
  if (mapping.kind === "custom") options.custom_event_name = event
  if (opts.eventId) options.event_id = opts.eventId

  const name = mapping.kind === "custom" ? "custom" : mapping.name
  const data = { type: mapping.kind === "custom" ? "custom" : "customer_action" }
  if (Object.keys(options).length === 0) {
    window.oaiq("measure", name, data)
    return
  }
  window.oaiq("measure", name, data, options)
}

export function track(event: string, params?: Record<string, unknown>, opts: TrackOptions = {}): void {
  if (typeof window === "undefined") return
  sendToGtag(event, params ?? {})
  sendToOaiq(event, opts)
}
