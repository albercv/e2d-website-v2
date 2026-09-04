/** @jest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))
jest.mock("@/lib/contact/whatsapp", () => ({ getWhatsAppHref: (text?: string) => `https://wa.me/1${text ? `?text=${encodeURIComponent(text)}` : ""}` }))

import { LeadCaptureForm } from "@/components/chat/lead-capture-form"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock
const SESSION_ID = "22222222-2222-4222-8222-222222222222"

async function submitValidLead(): Promise<void> {
  fireEvent.change(screen.getByPlaceholderText("email"), { target: { value: "lead@example.com" } })
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByRole("button", { name: "sendWhatsApp" }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
}

describe("LeadCaptureForm — OpenAI pixel wiring", () => {
  beforeEach(() => {
    trackMock.mockReset()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, leadId: "L1" }) }) as unknown as typeof fetch
  })

  it("fires generate_lead keyed by the leadId the server returned, with the chat session in the body", async () => {
    render(<LeadCaptureForm open onClose={() => undefined} sessionId={SESSION_ID} locale="es" />)
    await submitValidLead()
    await waitFor(() => expect(trackMock).toHaveBeenCalled())
    const [event, params, opts] = trackMock.mock.calls[0]
    expect(event).toBe("generate_lead")
    expect(params).toMatchObject({ form_location: "chat", channel: "whatsapp" })
    expect(opts).toEqual({ eventId: "lead_L1" })
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.sessionId).toBe(SESSION_ID)
  })

  it("shows the plain confirmation after success", async () => {
    render(<LeadCaptureForm open onClose={() => undefined} sessionId={SESSION_ID} locale="es" />)
    await submitValidLead()
    expect(await screen.findByText("successTitle")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "sendWhatsApp" })).not.toBeInTheDocument()
  })

  it("sends marketingConsent=true when the visitor accepted marketing cookies", async () => {
    localStorage.setItem("cookie-consent", JSON.stringify({ necessary: true, analytics: true, marketing: true }))
    render(<LeadCaptureForm open onClose={() => undefined} sessionId={SESSION_ID} locale="es" />)
    await submitValidLead()
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.marketingConsent).toBe(true)
  })

  it("sends marketingConsent=false when marketing cookies were declined or never answered", async () => {
    localStorage.removeItem("cookie-consent")
    render(<LeadCaptureForm open onClose={() => undefined} sessionId={SESSION_ID} locale="es" />)
    await submitValidLead()
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.marketingConsent).toBe(false)
  })

  it("sends the current page URL so the server mirror carries source_url", async () => {
    render(<LeadCaptureForm open onClose={() => undefined} sessionId={SESSION_ID} locale="es" />)
    await submitValidLead()
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.sourceUrl).toBe(window.location.href)
  })
})
