/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"

let currentLocale = "es"
jest.mock("next-intl", () => ({
  useLocale: () => currentLocale,
  useTranslations: () => (key: string) => key,
}))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))

import { Footer } from "@/components/layout/footer"
import { AboutSection } from "@/components/sections/about-section"

const SPANISH_ONLY_HREFS = [
  "/es/alberto-carrasco",
  "/es/desarrollo-software-madrid",
  "/es/automatizacion-procesos-ia",
]
const profileLinks = () =>
  screen.queryAllByRole("link").filter((a) => a.getAttribute("href") === "/es/alberto-carrasco")
const spanishOnlyLinks = () =>
  screen.queryAllByRole("link").filter((a) => SPANISH_ONLY_HREFS.includes(a.getAttribute("href") ?? ""))

describe("footer links to the Spanish-only pages", () => {
  it("shows them in the navigation column for the Spanish site", () => {
    currentLocale = "es"
    render(<Footer />)
    expect(profileLinks()).toHaveLength(1)
    expect(profileLinks()[0]).toHaveTextContent("Alberto Carrasco")
    expect(spanishOnlyLinks().map((a) => a.getAttribute("href"))).toEqual(SPANISH_ONLY_HREFS)
  })

  it.each(["en", "it"])("hides them on the %s site, where they would be untranslated", (locale) => {
    currentLocale = locale
    render(<Footer />)
    expect(spanishOnlyLinks()).toHaveLength(0)
  })
})

describe("about section links to the profile page", () => {
  it("links the Spanish profile without a language note", () => {
    currentLocale = "es"
    render(<AboutSection />)
    const link = screen.getByRole("link", { name: "profileLink" })
    expect(link).toHaveAttribute("href", "/es/alberto-carrasco")
    expect(link).toHaveAttribute("hrefLang", "es")
  })

  it.each(["en", "it"])("keeps pointing at the Spanish page from %s and marks its language", (locale) => {
    currentLocale = locale
    render(<AboutSection />)
    const link = screen.getByRole("link", { name: "profileLink" })
    expect(link).toHaveAttribute("href", "/es/alberto-carrasco")
    expect(link).toHaveAttribute("hrefLang", "es")
  })
})
