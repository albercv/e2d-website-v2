/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

// The site navigation mounts LanguageSwitcher, which needs the App Router context.
jest.mock("next/navigation", () => ({
  usePathname: () => "/es/legal",
  useRouter: () => ({ push: jest.fn() }),
}))

import Page from "@/app/[locale]/legal/page"

const TITLES = {
  es: "Aviso Legal",
  en: "Legal Notice",
  it: "Avviso Legale",
} as const

describe.each(["es", "en", "it"] as const)("Legal notice page — locale %s", (locale) => {
  it("renders the localized h1", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByRole("heading", { level: 1, name: TITLES[locale] })).toBeInTheDocument()
  })

  it("renders at least one mailto link", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    const mailLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("mailto:"))
    expect(mailLinks.length).toBeGreaterThan(0)
  })

  it("renders the identity infoBox with the NIF", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByText(/51095475D/)).toBeInTheDocument()
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

describe("Legal notice page — translation notice", () => {
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

describe("Legal notice page — es content (unchanged)", () => {
  it("renders the Madrid jurisdiction clause", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText(/Juzgados y tribunales de la ciudad de Madrid/)).toBeInTheDocument()
  })
})
