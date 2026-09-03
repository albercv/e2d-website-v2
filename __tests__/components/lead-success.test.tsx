/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${Object.values(vars).join("|")}` : key,
}))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))
jest.mock("@/lib/contact/whatsapp", () => ({
  getWhatsAppHref: (text?: string) => `https://wa.me/1${text ? `?text=${encodeURIComponent(text)}` : ""}`,
}))

import { LeadSuccess } from "@/components/leads/lead-success"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock
const lead = { leadId: "L1", name: "Ana", company: "ACME", message: "hola" }

describe("LeadSuccess", () => {
  beforeEach(() => trackMock.mockReset())

  it("offers WhatsApp and email follow-ups prefilled with the lead's details", () => {
    render(<LeadSuccess lead={lead} locale="es" formLocation="contact_modal" onClose={jest.fn()} />)
    const wa = screen.getByRole("link", { name: "continueWhatsApp" })
    const waText = decodeURIComponent(wa.getAttribute("href")!.split("text=")[1])
    expect(waText).toContain("Ana")
    expect(waText).toContain("ACME")
    const mail = screen.getByRole("link", { name: "continueEmail" })
    expect(mail.getAttribute("href")).toMatch(/^mailto:hello@evolve2digital\.com\?subject=.+&body=.+/)
  })

  it("tracks the chosen channel as a follow-up, not as a new conversion", () => {
    render(<LeadSuccess lead={lead} locale="es" formLocation="chat" onClose={jest.fn()} />)
    fireEvent.click(screen.getByRole("link", { name: "continueWhatsApp" }))
    fireEvent.click(screen.getByRole("link", { name: "continueEmail" }))
    expect(trackMock.mock.calls).toEqual([
      ["lead_channel_continue", { channel: "whatsapp", form_location: "chat", locale: "es" }],
      ["lead_channel_continue", { channel: "email", form_location: "chat", locale: "es" }],
    ])
  })

  it("closes via the close button", () => {
    const onClose = jest.fn()
    render(<LeadSuccess lead={lead} locale="es" formLocation="chat" onClose={onClose} />)
    fireEvent.click(screen.getByRole("button", { name: "close" }))
    expect(onClose).toHaveBeenCalled()
  })
})
