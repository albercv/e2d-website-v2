// Server-side mirror of the OpenAI measurement pixel (Conversions API).
// Best-effort by design: the caller has already persisted the conversion, so
// every failure here is reported as a value, never thrown. The API key is
// server-only — never expose it through NEXT_PUBLIC_.

const EVENTS_ENDPOINT = "https://bzr.openai.com/v1/events"
const TIMEOUT_MS = 3000

export interface OaiqConversionEvent {
  // Must match the browser-side event_id so OpenAI dedupes the pair.
  eventId: string
  type: string
  sourceUrl: string
  timestampMs?: number
}

export interface OaiqSendOptions {
  validateOnly?: boolean
}

export type OaiqSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "network" | `http_${number}` }

function buildPayload(event: OaiqConversionEvent, opts: OaiqSendOptions): string {
  return JSON.stringify({
    validate_only: opts.validateOnly === true,
    events: [
      {
        id: event.eventId,
        type: event.type,
        timestamp_ms: event.timestampMs ?? Date.now(),
        source_url: event.sourceUrl,
        action_source: "web",
        data: { type: "customer_action" },
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
