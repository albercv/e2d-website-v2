/** @jest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))
jest.mock("@/lib/contact/whatsapp", () => ({ getWhatsAppHref: (text?: string) => `https://wa.me/1${text ? `?text=${encodeURIComponent(text)}` : ""}` }))

import { LeadForm } from "@/components/leads/lead-form"
import { track } from "@/lib/analytics/track"
import { openLeadChannelTab } from "@/lib/leads/lead-channel"

jest.mock("@/lib/leads/lead-channel", () => ({ openLeadChannelTab: jest.fn() }))

const trackMock = track as jest.Mock
const openLeadChannelTabMock = openLeadChannelTab as jest.Mock

function fakeHandle(): { deliver: jest.Mock; abort: jest.Mock } {
  return { deliver: jest.fn(), abort: jest.fn() }
}

function mockFetch(ok: boolean, leadId = "L1"): jest.Mock {
  const fn = jest.fn().mockResolvedValue({ ok, json: async () => ({ ok, leadId }) })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

function fillForm(): void {
  fireEvent.change(screen.getByPlaceholderText("name"), { target: { value: "Ana" } })
  fireEvent.change(screen.getByPlaceholderText("email"), { target: { value: "ana@example.com" } })
  fireEvent.click(screen.getByRole("checkbox"))
}

describe("LeadForm", () => {
  beforeEach(() => {
    trackMock.mockReset()
    openLeadChannelTabMock.mockReset()
    openLeadChannelTabMock.mockImplementation(() => fakeHandle())
  })

  it("renders a WhatsApp button and an email button instead of a single submit", () => {
    render(<LeadForm locale="es" formLocation="contact_modal" onSuccess={jest.fn()} />)
    expect(screen.getByRole("button", { name: "sendWhatsApp" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "sendEmail" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "submit" })).not.toBeInTheDocument()
  })

  it("hides the WhatsApp button when no number is configured", () => {
    jest.requireMock("@/lib/contact/whatsapp").getWhatsAppHref = () => null
    render(<LeadForm locale="es" formLocation="contact_modal" onSuccess={jest.fn()} />)
    expect(screen.queryByRole("button", { name: "sendWhatsApp" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "sendEmail" })).toBeInTheDocument()
    jest.requireMock("@/lib/contact/whatsapp").getWhatsAppHref =
      (text?: string) => `https://wa.me/1${text ? `?text=${encodeURIComponent(text)}` : ""}`
  })

  it("WhatsApp click: opens the tab before the POST, posts the lead, tracks the channel and delivers the message", async () => {
    const fetchMock = mockFetch(true)
    const handle = fakeHandle()
    openLeadChannelTabMock.mockImplementation(() => handle)
    const onSuccess = jest.fn()
    render(<LeadForm locale="es" formLocation="contact_modal" onSuccess={onSuccess} />)
    fillForm()
    fireEvent.click(screen.getByRole("button", { name: "sendWhatsApp" }))
    // The tab opens synchronously, before the POST resolves.
    expect(openLeadChannelTabMock).toHaveBeenCalledWith("whatsapp")
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())

    expect(fetchMock).toHaveBeenCalled()
    expect(trackMock).toHaveBeenCalledWith(
      "generate_lead",
      { form_location: "contact_modal", intent: "", locale: "es", channel: "whatsapp" },
      { eventId: "lead_L1" },
    )
    expect(handle.deliver).toHaveBeenCalledTimes(1)
    expect(handle.deliver.mock.calls[0][0]).toContain("wa.me")
    expect(handle.abort).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith({
      leadId: "L1", name: "Ana", email: "ana@example.com", phone: "", company: "", intent: "", message: "",
    })
  })

  it("email click: posts the lead, tracks channel=email and delivers a mailto href, without opening a tab", async () => {
    mockFetch(true, "L2")
    const handle = fakeHandle()
    openLeadChannelTabMock.mockImplementation(() => handle)
    const onSuccess = jest.fn()
    render(<LeadForm locale="es" formLocation="chat" sessionId="sid-1" onSuccess={onSuccess} />)
    fillForm()
    fireEvent.click(screen.getByRole("button", { name: "sendEmail" }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())

    expect(openLeadChannelTabMock).toHaveBeenCalledWith("email")
    expect(trackMock).toHaveBeenCalledWith(
      "generate_lead",
      { form_location: "chat", intent: "", locale: "es", channel: "email" },
      { eventId: "lead_L2" },
    )
    expect(handle.deliver).toHaveBeenCalledTimes(1)
    expect(handle.deliver.mock.calls[0][0]).toMatch(/^mailto:/)
  })

  it("passes the chat sessionId through when given", async () => {
    const fetchMock = mockFetch(true)
    render(<LeadForm locale="es" formLocation="chat" sessionId="sid-1" onSuccess={jest.fn()} />)
    fillForm()
    fireEvent.click(screen.getByRole("button", { name: "sendEmail" }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sessionId).toBe("sid-1")
  })

  it("on server failure: aborts the pre-opened WhatsApp tab, shows the fallback and tracks nothing", async () => {
    mockFetch(false)
    const handle = fakeHandle()
    openLeadChannelTabMock.mockImplementation(() => handle)
    render(<LeadForm locale="es" formLocation="chat" onSuccess={jest.fn()} />)
    fillForm()
    fireEvent.click(screen.getByRole("button", { name: "sendWhatsApp" }))
    await waitFor(() => expect(screen.getByText("errorTitle")).toBeInTheDocument())
    expect(handle.abort).toHaveBeenCalledTimes(1)
    expect(handle.deliver).not.toHaveBeenCalled()
    expect(trackMock).not.toHaveBeenCalled()
  })

  it("blocks submission without a valid email and never calls the server or opens a channel", async () => {
    const fetchMock = mockFetch(true)
    render(<LeadForm locale="es" formLocation="chat" onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "sendEmail" }))
    expect(await screen.findByText("requiredEmail")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(openLeadChannelTabMock).not.toHaveBeenCalled()
  })

  it("disables both buttons while submitting and shows 'sending' only on the clicked one", async () => {
    let resolveFetch!: (value: unknown) => void
    global.fetch = jest.fn().mockReturnValue(new Promise((resolve) => { resolveFetch = resolve })) as unknown as typeof fetch
    render(<LeadForm locale="es" formLocation="chat" onSuccess={jest.fn()} />)
    fillForm()
    fireEvent.click(screen.getByRole("button", { name: "sendWhatsApp" }))
    expect(await screen.findByRole("button", { name: "sending" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "sendEmail" })).toBeDisabled()
    resolveFetch({ ok: true, json: async () => ({ ok: true, leadId: "L3" }) })
  })
})
