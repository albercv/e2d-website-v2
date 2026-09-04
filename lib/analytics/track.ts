// Analytics event helper. Fans one call out to every tracker that is present
// on the page so call sites need no conditional logic and the app stays quiet
// when analytics is absent (consent denied, dev build, blocked script).
//
// Window.gtag type augmentation lives in google-analytics.tsx; the oaiq one
// lives in openai-pixel.tsx. Both are global-scope declarations.

// OpenAI only accepts its own event catalogue and rejects unknown fields
// inside `data`, so GA params are never forwarded. Every real contact
// conversion sends two events: the standard appointment_scheduled (the
// campaign's optimisation goal) plus a named custom event that carries the
// channel, which is the only way the dashboard can show it. Micro-
// interactions (cta_click, chat_open...) stay GA-only.
const OAIQ_GOAL_EVENT = "appointment_scheduled"
const OAIQ_CHANNEL_EVENTS: Readonly<Record<string, string>> = {
  generate_lead: "lead_form",
  whatsapp_click: "whatsapp_click",
  email_click: "email_click",
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
  const channel = OAIQ_CHANNEL_EVENTS[event]
  if (!channel || typeof window.oaiq !== "function") return

  // Distinct ids per event so OpenAI dedupes each against its server mirror
  // without collapsing the goal and the channel event into one.
  if (opts.eventId) {
    window.oaiq("measure", OAIQ_GOAL_EVENT, { type: "customer_action" }, { event_id: opts.eventId })
    window.oaiq("measure", "custom", { type: "custom" }, { custom_event_name: channel, event_id: `${opts.eventId}_${channel}` })
    return
  }
  window.oaiq("measure", OAIQ_GOAL_EVENT, { type: "customer_action" })
  window.oaiq("measure", "custom", { type: "custom" }, { custom_event_name: channel })
}

export function track(event: string, params?: Record<string, unknown>, opts: TrackOptions = {}): void {
  if (typeof window === "undefined") return
  sendToGtag(event, params ?? {})
  sendToOaiq(event, opts)
}
