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
import type { SubmittedLead } from "@/lib/leads/lead-form-model"

const trackMock = track as jest.Mock
const lead: SubmittedLead = {
  leadId: "L1", name: "Ana", email: "ana@example.com", phone: "600111222",
  company: "ACME", intent: "chatbot", message: "hola",
}

describe("LeadSuccess", () => {
  beforeEach(() => trackMock.mockReset())

  it("lets the visitor send the whole form by WhatsApp or email", () => {
    render(<LeadSuccess lead={lead} locale="es" formLocation="contact_modal" onClose={jest.fn()} />)
    const wa = screen.getByRole("link", { name: "sendWhatsApp" })
    const waText = decodeURIComponent(wa.getAttribute("href")!.split("text=")[1])
    expect(waText).toContain("followUpIntro")
    for (const field of ["name: Ana", "company: ACME", "email: ana@example.com", "phone: 600111222", "labelIntent: intentOptions.chatbot", "labelMessage: hola"]) {
      expect(waText).toContain(field)
    }
    const mail = screen.getByRole("link", { name: "sendEmail" })
    const href = decodeURIComponent(mail.getAttribute("href")!)
    expect(href).toMatch(/^mailto:hello@evolve2digital\.com\?subject=followUpSubject&body=/)
    expect(href).toContain("phone: 600111222")
  })

  it("omits empty optional fields from the message", () => {
    render(<LeadSuccess lead={{ ...lead, phone: "", company: "", intent: "", message: "" }} locale="es" formLocation="chat" onClose={jest.fn()} />)
    const waText = decodeURIComponent(screen.getByRole("link", { name: "sendWhatsApp" }).getAttribute("href")!.split("text=")[1])
    expect(waText).toContain("name: Ana")
    expect(waText).not.toMatch(/phone|company|labelIntent|labelMessage/)
  })

  it("tracks the chosen channel as a follow-up, not as a new conversion", () => {
    render(<LeadSuccess lead={lead} locale="es" formLocation="chat" onClose={jest.fn()} />)
    fireEvent.click(screen.getByRole("link", { name: "sendWhatsApp" }))
    fireEvent.click(screen.getByRole("link", { name: "sendEmail" }))
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
