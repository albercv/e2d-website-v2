/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"

jest.mock("next/navigation", () => ({ usePathname: () => "/es" }))
jest.mock("@/components/contact/contact-modal", () => ({ ContactModal: () => null }))
jest.mock("@/components/layout/language-switcher", () => ({ LanguageSwitcher: () => <div data-testid="lang" /> }))

import { Navigation } from "@/components/layout/navigation"

describe("Navigation mobile menu", () => {
  it("toggles the mobile links with an accessible button", () => {
    render(<Navigation />)
    const toggle = screen.getByRole("button", { name: "Menu" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    // Desktop links are always in the DOM (hidden by CSS); the mobile copy appears on open.
    expect(screen.getAllByText("services")).toHaveLength(1)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getAllByText("services")).toHaveLength(2)

    fireEvent.click(screen.getAllByText("services")[1])
    expect(screen.getAllByText("services")).toHaveLength(1)
  })
})
