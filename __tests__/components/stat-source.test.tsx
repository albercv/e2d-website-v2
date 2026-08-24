/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { MDXComponents } from "@/components/blog/mdx-components"

const Stat = MDXComponents.Stat as React.ComponentType<{ value: string; label: string; source?: string }>

describe("Stat", () => {
  it("renders the source attribution as cite", () => {
    render(<Stat value="+40%" label="productividad" source="McKinsey, 2025" />)
    const cite = screen.getByText("McKinsey, 2025")
    expect(cite.tagName).toBe("CITE")
  })

  it("omits cite when no source", () => {
    const { container } = render(<Stat value="3x" label="ROI" />)
    expect(container.querySelector("cite")).toBeNull()
  })
})
