/** @jest-environment jsdom */
import { render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"

// The site navigation mounts LanguageSwitcher, which needs the App Router context.
jest.mock("next/navigation", () => ({
  usePathname: () => "/es/cookies",
  useRouter: () => ({ push: jest.fn() }),
}))

import Page from "@/app/[locale]/cookies/page"

const TITLES = {
  es: "Política de Cookies",
  en: "Cookies Policy",
  it: "Informativa sui Cookie",
} as const

describe.each(["es", "en", "it"] as const)("Cookies page — locale %s", (locale) => {
  it("renders the localized h1", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByRole("heading", { level: 1, name: TITLES[locale] })).toBeInTheDocument()
  })

  it("renders at least one mailto link", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    const mailLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("mailto:"))
    expect(mailLinks.length).toBeGreaterThan(0)
  })

  it("renders the three cookie-type cards", async () => {
    const { container } = render(await Page({ params: Promise.resolve({ locale }) }))
    // Cards render as <h3> headings inside the "types of cookies" section; the footer has its own <h3>s.
    const cookieTypes = container.querySelector("#cookie-types") as HTMLElement
    expect(within(cookieTypes).getAllByRole("heading", { level: 3 })).toHaveLength(3)
  })

  it("renders the site navigation with the language switcher", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByRole("navigation")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Switch language" })).toBeInTheDocument()
  })

  it("renders the site footer", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })
})

describe("Cookies page — translation notice", () => {
  it("es has no translation notice", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.queryByText(/translation provided|traduzione fornita/i)).not.toBeInTheDocument()
  })

  it("en shows the translation notice", async () => {
    render(await Page({ params: Promise.resolve({ locale: "en" }) }))
    expect(screen.getByText(/translation provided for convenience/i)).toBeInTheDocument()
  })

  it("it shows the translation notice", async () => {
    render(await Page({ params: Promise.resolve({ locale: "it" }) }))
    expect(screen.getByText(/traduzione fornita per comodità/i)).toBeInTheDocument()
  })
})

describe("Cookies page — es content (unchanged)", () => {
  it("renders the browser management list", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText("Chrome:")).toBeInTheDocument()
    expect(screen.getByText(/Configuración → Privacidad y seguridad → Cookies/)).toBeInTheDocument()
  })
})
