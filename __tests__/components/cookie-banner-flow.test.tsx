/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { CookieBanner } from "@/components/gdpr/cookie-banner"

// next-intl is mocked globally: every t(key) renders the key.
describe("CookieBanner flow (CSS animations, no framer-motion)", () => {
  beforeEach(() => localStorage.clear())

  it("shows the banner on first visit and hides it after accepting all", () => {
    render(<CookieBanner />)
    expect(screen.getByText("title")).toBeInTheDocument()
    fireEvent.click(screen.getByText("acceptAll"))
    expect(screen.queryByText("title")).toBeNull()
    expect(JSON.parse(localStorage.getItem("cookie-consent") ?? "{}")).toMatchObject({ analytics: true, marketing: true })
  })

  it("opens the settings dialog and closes it on save", () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByText("customize"))
    expect(screen.getByText("settings.title")).toBeInTheDocument()
    fireEvent.click(screen.getByText("settings.save"))
    expect(screen.queryByText("settings.title")).toBeNull()
    expect(localStorage.getItem("cookie-consent")).not.toBeNull()
  })

  it("does not render framer-motion wrappers", () => {
    const { container } = render(<CookieBanner />)
    expect(container.querySelector("[style*='opacity']")).toBeNull()
  })
})
