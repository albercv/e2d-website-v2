/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({
  useLocale: () => "es",
  useTranslations: () => (key: string) => (key === "contact" ? "hello@evolve2digital.com" : key),
}))
jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}))
jest.mock("@/lib/contact/whatsapp", () => ({ getWhatsAppHref: () => "https://wa.me/34605497639" }))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))

import { Footer } from "@/components/layout/footer"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock

describe("Footer contact links — conversion tracking", () => {
  beforeEach(() => trackMock.mockReset())

  it("tracks whatsapp_click with link_location footer", () => {
    render(<Footer />)
    fireEvent.click(screen.getByRole("link", { name: /whatsapp/i }))
    expect(trackMock).toHaveBeenCalledWith("whatsapp_click", { link_location: "footer", locale: "es" })
  })

  it("tracks email_click with link_location footer", () => {
    render(<Footer />)
    fireEvent.click(screen.getByRole("link", { name: /hello@evolve2digital\.com/ }))
    expect(trackMock).toHaveBeenCalledWith("email_click", { link_location: "footer", locale: "es" })
  })
})
