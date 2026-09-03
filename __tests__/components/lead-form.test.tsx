/** @jest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))
jest.mock("@/lib/contact/whatsapp", () => ({ getWhatsAppHref: () => "https://wa.me/1" }))

import { LeadForm } from "@/components/leads/lead-form"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock

function mockFetch(ok: boolean, leadId = "L1"): jest.Mock {
  const fn = jest.fn().mockResolvedValue({ ok, json: async () => ({ ok, leadId }) })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

function fillAndSubmit(): void {
  fireEvent.change(screen.getByPlaceholderText("name"), { target: { value: "Ana" } })
  fireEvent.change(screen.getByPlaceholderText("email"), { target: { value: "ana@example.com" } })
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.submit(screen.getByTestId("lead-form"))
}

describe("LeadForm", () => {
  beforeEach(() => trackMock.mockReset())

  it("posts the lead, tracks generate_lead keyed by leadId and reports success upward", async () => {
    const fetchMock = mockFetch(true)
    const onSuccess = jest.fn()
    render(<LeadForm locale="es" formLocation="contact_modal" onSuccess={onSuccess} />)
    fillAndSubmit()
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).not.toHaveProperty("sessionId")
    expect(onSuccess).toHaveBeenCalledWith({ leadId: "L1", name: "Ana", company: "", message: "" })
    expect(trackMock).toHaveBeenCalledWith(
      "generate_lead",
      { form_location: "contact_modal", intent: "", locale: "es" },
      { eventId: "lead_L1" },
    )
  })

  it("passes the chat sessionId through when given", async () => {
    const fetchMock = mockFetch(true)
    render(<LeadForm locale="es" formLocation="chat" sessionId="sid-1" onSuccess={jest.fn()} />)
    fillAndSubmit()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sessionId).toBe("sid-1")
  })

  it("shows the direct-contact fallback on server failure and tracks nothing", async () => {
    mockFetch(false)
    render(<LeadForm locale="es" formLocation="chat" onSuccess={jest.fn()} />)
    fillAndSubmit()
    await waitFor(() => expect(screen.getByText("errorTitle")).toBeInTheDocument())
    expect(trackMock).not.toHaveBeenCalled()
  })

  it("blocks submission without a valid email and never calls the server", async () => {
    const fetchMock = mockFetch(true)
    render(<LeadForm locale="es" formLocation="chat" onSuccess={jest.fn()} />)
    fireEvent.submit(screen.getByTestId("lead-form"))
    expect(await screen.findByText("requiredEmail")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
