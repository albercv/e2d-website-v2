/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { ServicesSection } from "@/components/sections/services-section"

describe("ServicesSection", () => {
  it("renders the four services", () => {
    render(<ServicesSection />)
    for (const key of ["web", "erp", "crm", "automation"]) {
      expect(screen.getByText(`${key}.title`)).toBeInTheDocument()
    }
  })
})
