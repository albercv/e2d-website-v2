/** @jest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({
  useLocale: () => "es",
  useTranslations: () => (key: string) => key,
}))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))
jest.mock("@/lib/contact/whatsapp", () => ({ getWhatsAppHref: () => "https://wa.me/1" }))
// Radix Dialog portals + focus traps add nothing to these assertions.
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

import { ContactModal } from "@/components/contact/contact-modal"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock

describe("ContactModal", () => {
  beforeEach(() => {
    trackMock.mockReset()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, leadId: "L9" }) }) as unknown as typeof fetch
  })

  it("opens on the lead form and tracks contact_open", () => {
    render(<ContactModal open onOpenChange={jest.fn()} />)
    expect(screen.getByTestId("lead-form")).toBeInTheDocument()
    expect(trackMock).toHaveBeenCalledWith("contact_open", { locale: "es" })
  })

  it("keeps direct WhatsApp/email links as a secondary option with their tracking", () => {
    render(<ContactModal open onOpenChange={jest.fn()} />)
    fireEvent.click(screen.getByRole("link", { name: /whatsapp/i }))
    fireEvent.click(screen.getByRole("link", { name: /hello@evolve2digital\.com/ }))
    expect(trackMock).toHaveBeenCalledWith("whatsapp_click", { link_location: "contact_modal", locale: "es" })
    expect(trackMock).toHaveBeenCalledWith("email_click", { link_location: "contact_modal", locale: "es" })
  })

  it("switches to the channel chooser after the lead is captured", async () => {
    render(<ContactModal open onOpenChange={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText("email"), { target: { value: "ana@example.com" } })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.submit(screen.getByTestId("lead-form"))
    await waitFor(() => expect(screen.getByRole("link", { name: "continueWhatsApp" })).toBeInTheDocument())
    expect(screen.queryByTestId("lead-form")).not.toBeInTheDocument()
    expect(trackMock).toHaveBeenCalledWith(
      "generate_lead", { form_location: "contact_modal", intent: "", locale: "es" }, { eventId: "lead_L9" },
    )
  })

  it("renders nothing when closed", () => {
    const { container } = render(<ContactModal open={false} onOpenChange={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
