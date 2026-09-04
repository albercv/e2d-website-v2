// Server-side mirror of the OpenAI measurement pixel (Conversions API).
// Best-effort by design: the caller has already persisted the conversion, so
// every failure here is reported as a value, never thrown. The API key is
// server-only — never expose it through NEXT_PUBLIC_.

import type { OaiqUser } from "@/lib/analytics/oaiq-user-data"

const EVENTS_ENDPOINT = "https://bzr.openai.com/v1/events"
const TIMEOUT_MS = 3000

// Standard OpenAI events whose data payload is `customer_action`. Other
// standard types (order_created, subscription_created...) need different
// payloads — add them here when a real conversion needs them.
export type OaiqStandardEvent = "lead_created" | "appointment_scheduled" | "registration_completed"

export interface OaiqConversionEvent {
  // Must match the browser-side event_id so OpenAI dedupes the pair.
  eventId: string
  type: OaiqStandardEvent | "custom"
  // Required when type is "custom"; ignored otherwise.
  customEventName?: string
  sourceUrl: string
  timestampMs?: number
  // OpenAI click id (the pixel stores it in the __oppref cookie). Lets the
  // server event attribute to the ad click even if the pixel was blocked.
  oppref?: string
  user?: OaiqUser
}

export interface OaiqSendOptions {
  validateOnly?: boolean
}

export type OaiqSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "network" | `http_${number}` }

function buildPayload(event: OaiqConversionEvent, opts: OaiqSendOptions): string {
  const isCustom = event.type === "custom"
  return JSON.stringify({
    validate_only: opts.validateOnly === true,
    events: [
      {
        id: event.eventId,
        type: event.type,
        ...(isCustom ? { custom_event_name: event.customEventName } : {}),
        timestamp_ms: event.timestampMs ?? Date.now(),
        source_url: event.sourceUrl,
        action_source: "web",
        ...(event.oppref ? { oppref: event.oppref } : {}),
        ...(event.user ? { user: event.user } : {}),
        data: { type: isCustom ? "custom" : "customer_action" },
      },
    ],
  })
}

export async function sendOaiqConversion(
  event: OaiqConversionEvent,
  opts: OaiqSendOptions = {},
): Promise<OaiqSendResult> {
  const apiKey = process.env.OAIQ_CONVERSIONS_API_KEY
  const pixelId = process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID
  if (!apiKey || !pixelId) return { sent: false, reason: "not_configured" }

  const url = `${EVENTS_ENDPOINT}?pid=${encodeURIComponent(pixelId)}`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: buildPayload(event, opts),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return { sent: false, reason: `http_${res.status}` }
    return { sent: true }
  } catch {
    // Timeout (AbortError) and DNS/connection errors collapse into "network":
    // the caller only needs to know the mirror did not land.
    return { sent: false, reason: "network" }
  }
}
