/**
 * @jest-environment node
 */

import { sendOaiqConversion, type OaiqConversionEvent } from "@/lib/analytics/oaiq-server"

const ENV_KEYS = ["OAIQ_CONVERSIONS_API_KEY", "NEXT_PUBLIC_OAIQ_PIXEL_ID"] as const

const baseEvent: OaiqConversionEvent = {
  eventId: "lead_11111111-1111-4111-8111-111111111111",
  type: "lead_created",
  sourceUrl: "https://evolve2digital.com/es",
}

describe("sendOaiqConversion", () => {
  const saved: Record<string, string | undefined> = {}
  let fetchMock: jest.Mock

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    process.env.OAIQ_CONVERSIONS_API_KEY = "test-key"
    process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID = "PIX"
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    jest.restoreAllMocks()
  })

  it("is a no-op without an API key", async () => {
    delete process.env.OAIQ_CONVERSIONS_API_KEY
    const result = await sendOaiqConversion(baseEvent)
    expect(result).toEqual({ sent: false, reason: "not_configured" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("is a no-op without a pixel id", async () => {
    delete process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID
    const result = await sendOaiqConversion(baseEvent)
    expect(result).toEqual({ sent: false, reason: "not_configured" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts the event to the Conversions API with bearer auth and pixel id", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    const result = await sendOaiqConversion({ ...baseEvent, timestampMs: 1_700_000_000_000 })
    expect(result).toEqual({ sent: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://bzr.openai.com/v1/events?pid=PIX")
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key")
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
    expect(JSON.parse(init.body as string)).toEqual({
      validate_only: false,
      events: [
        {
          id: baseEvent.eventId,
          type: "lead_created",
          timestamp_ms: 1_700_000_000_000,
          source_url: baseEvent.sourceUrl,
          action_source: "web",
          data: { type: "customer_action" },
        },
      ],
    })
  })

  it("sends custom events with custom_event_name at the event level and data.type custom", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    await sendOaiqConversion({ ...baseEvent, type: "custom", customEventName: "whatsapp_click" })
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.events[0]).toMatchObject({
      type: "custom",
      custom_event_name: "whatsapp_click",
      data: { type: "custom" },
    })
  })

  it("forwards oppref and user matching data when provided", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    await sendOaiqConversion({
      ...baseEvent,
      oppref: "opp_123",
      user: { emails_sha256: ["a".repeat(64)], ip_address: "81.45.1.1", user_agent: "UA/1" },
    })
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.events[0].oppref).toBe("opp_123")
    expect(body.events[0].user).toEqual({ emails_sha256: ["a".repeat(64)], ip_address: "81.45.1.1", user_agent: "UA/1" })
  })

  it("omits oppref and user keys entirely when absent", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    await sendOaiqConversion(baseEvent)
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.events[0]).not.toHaveProperty("oppref")
    expect(body.events[0]).not.toHaveProperty("user")
  })

  it("defaults timestamp_ms to now", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    const before = Date.now()
    await sendOaiqConversion(baseEvent)
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.events[0].timestamp_ms).toBeGreaterThanOrEqual(before)
    expect(body.events[0].timestamp_ms).toBeLessThanOrEqual(Date.now())
  })

  it("reports an HTTP failure without throwing", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 })
    const result = await sendOaiqConversion(baseEvent)
    expect(result).toEqual({ sent: false, reason: "http_401" })
  })

  it("reports a network failure without throwing", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))
    const result = await sendOaiqConversion(baseEvent)
    expect(result).toEqual({ sent: false, reason: "network" })
  })

  it("aborts via AbortSignal so a hung upstream cannot block the caller", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    await sendOaiqConversion(baseEvent)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("supports validate_only for dry-run checks", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    await sendOaiqConversion(baseEvent, { validateOnly: true })
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.validate_only).toBe(true)
  })
})
