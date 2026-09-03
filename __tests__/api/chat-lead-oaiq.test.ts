/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

jest.mock("@/lib/leads/lead-service", () => ({
  captureLead: jest.fn(),
}))
jest.mock("@/lib/analytics/oaiq-server", () => ({
  sendOaiqConversion: jest.fn(),
}))

import { POST } from "@/app/api/chat/lead/route"
import { captureLead } from "@/lib/leads/lead-service"
import { sendOaiqConversion } from "@/lib/analytics/oaiq-server"

const captureLeadMock = captureLead as jest.Mock
const sendOaiqMock = sendOaiqConversion as jest.Mock

const SESSION_ID = "11111111-1111-4111-8111-111111111111"

function makeRequest(extra: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/chat/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      email: "lead@example.com",
      consent: true,
      locale: "es",
      ...extra,
    }),
  })
}

function leadOk(warnings: string[] = []) {
  captureLeadMock.mockResolvedValue({ leadId: "lead-1", apolloQueued: true, emailSent: true, warnings })
}

describe("POST /api/chat/lead — OpenAI Conversions API mirror", () => {
  beforeEach(() => {
    captureLeadMock.mockReset()
    sendOaiqMock.mockReset()
    sendOaiqMock.mockResolvedValue({ sent: true })
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
  })
  afterEach(() => jest.restoreAllMocks())

  it("mirrors a persisted lead with the shared lead_<sessionId> event id", async () => {
    leadOk()
    const res = await POST(makeRequest({ sourceUrl: "https://evolve2digital.com/es/blog/x" }))
    expect(res.status).toBe(200)
    expect(sendOaiqMock).toHaveBeenCalledTimes(1)
    expect(sendOaiqMock).toHaveBeenCalledWith({
      eventId: `lead_${SESSION_ID}`,
      type: "lead_created",
      sourceUrl: "https://evolve2digital.com/es/blog/x",
    })
  })

  it("falls back to the site base URL + locale when the client sends no sourceUrl", async () => {
    leadOk()
    const prev = process.env.NEXT_PUBLIC_BASE_URL
    process.env.NEXT_PUBLIC_BASE_URL = "https://evolve2digital.com"
    try {
      await POST(makeRequest({ locale: "en" }))
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
      else process.env.NEXT_PUBLIC_BASE_URL = prev
    }
    expect(sendOaiqMock.mock.calls[0][0].sourceUrl).toBe("https://evolve2digital.com/en")
  })

  it("rejects a malformed sourceUrl", async () => {
    leadOk()
    const res = await POST(makeRequest({ sourceUrl: "not a url" }))
    expect(res.status).toBe(400)
    expect(captureLeadMock).not.toHaveBeenCalled()
  })

  it("does not mirror when the lead was not persisted", async () => {
    captureLeadMock.mockRejectedValue(new Error("db down"))
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    const res = await POST(makeRequest())
    expect(res.status).toBe(503)
    expect(sendOaiqMock).not.toHaveBeenCalled()
  })

  it("surfaces a mirror failure as a warning without failing the request", async () => {
    leadOk(["apollo: queue full"])
    sendOaiqMock.mockResolvedValue({ sent: false, reason: "http_401" })
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.warnings).toEqual(["apollo: queue full", "oaiq: http_401"])
  })

  it("stays quiet when the mirror is simply not configured", async () => {
    leadOk()
    sendOaiqMock.mockResolvedValue({ sent: false, reason: "not_configured" })
    const res = await POST(makeRequest())
    const body = await res.json()
    expect(body.warnings).toEqual([])
  })

  it("never lets a throwing mirror break the 200", async () => {
    leadOk()
    sendOaiqMock.mockRejectedValue(new Error("boom"))
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.warnings).toEqual(["oaiq: network"])
  })
})
