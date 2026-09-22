/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { ServicesSection } from "@/components/sections/services-section"

describe("ServicesSection", () => {
  it("renders the four services", () => {
    render(<ServicesSection />)
    for (const key of ["web", "erp", "crm", "automation"]) {
      expect(screen.getByText(`${key}.title`)).toBeInTheDocument()
    }
  })

  it("shows the service tooltip on focus through the Radix tooltip", async () => {
    render(<ServicesSection />)
    const trigger = screen.getByText("erp.title").closest("[data-slot='tooltip-trigger']")
    expect(trigger).not.toBeNull()
    fireEvent.focus(trigger as Element)
    // Radix renders the content plus a visually hidden copy for screen readers.
    const copies = await screen.findAllByText("erp.tooltip")
    expect(copies.length).toBeGreaterThanOrEqual(1)
  })

  it("colours the tooltip arrow to match the teal bubble, not the theme default", async () => {
    render(<ServicesSection />)
    const trigger = screen.getByText("erp.title").closest("[data-slot='tooltip-trigger']")
    expect(trigger).not.toBeNull()
    fireEvent.focus(trigger as Element)
    await screen.findAllByText("erp.tooltip")
    // TooltipContent portals to document.body, outside the render container.
    expect(document.querySelector(".fill-\\[\\#05b4ba\\]")).toBeInTheDocument()
  })
})
