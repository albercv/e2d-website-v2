/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))

import { LeadSuccess } from "@/components/leads/lead-success"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock

describe("LeadSuccess", () => {
  beforeEach(() => trackMock.mockReset())

  it("shows the confirmation title and body, with no channel links", () => {
    render(<LeadSuccess onClose={jest.fn()} />)
    expect(screen.getByText("successTitle")).toBeInTheDocument()
    expect(screen.getByText("successFollowUp")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "sendWhatsApp" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "sendEmail" })).not.toBeInTheDocument()
  })

  it("tracks nothing — the conversion already happened in LeadForm", () => {
    render(<LeadSuccess onClose={jest.fn()} />)
    expect(trackMock).not.toHaveBeenCalled()
  })

  it("closes via the close button", () => {
    const onClose = jest.fn()
    render(<LeadSuccess onClose={onClose} />)
    fireEvent.click(screen.getByRole("button", { name: "close" }))
    expect(onClose).toHaveBeenCalled()
  })
})
