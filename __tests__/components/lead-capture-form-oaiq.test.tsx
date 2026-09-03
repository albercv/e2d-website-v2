/** @jest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))
jest.mock("@/lib/contact/whatsapp", () => ({ getWhatsAppHref: () => "https://wa.me/1" }))

import { LeadCaptureForm } from "@/components/chat/lead-capture-form"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock
const SESSION_ID = "22222222-2222-4222-8222-222222222222"

async function submitValidLead(): Promise<void> {
  fireEvent.change(screen.getByPlaceholderText("email"), { target: { value: "lead@example.com" } })
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.submit(screen.getByRole("dialog").querySelector("form") as HTMLFormElement)
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
}

describe("LeadCaptureForm — OpenAI pixel wiring", () => {
  beforeEach(() => {
    trackMock.mockReset()
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  })

  it("fires generate_lead with the shared lead_<sessionId> event id", async () => {
    render(<LeadCaptureForm open onClose={() => undefined} sessionId={SESSION_ID} locale="es" />)
    await submitValidLead()
    await waitFor(() => expect(trackMock).toHaveBeenCalled())
    const [event, , opts] = trackMock.mock.calls[0]
    expect(event).toBe("generate_lead")
    expect(opts).toEqual({ eventId: `lead_${SESSION_ID}` })
  })

  it("sends the current page URL so the server mirror carries source_url", async () => {
    render(<LeadCaptureForm open onClose={() => undefined} sessionId={SESSION_ID} locale="es" />)
    await submitValidLead()
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.sourceUrl).toBe(window.location.href)
  })
})
