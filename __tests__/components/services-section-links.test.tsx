/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"

let currentLocale = "es"
jest.mock("next-intl", () => ({
  useLocale: () => currentLocale,
  useTranslations: () => (key: string) => key,
}))

import { ServicesSection } from "@/components/sections/services-section"

const linkFor = (title: string) =>
  screen.getByText(title).closest("[data-slot='card']")?.querySelector("a")

describe("ServicesSection links to the Spanish-only service pages", () => {
  beforeEach(() => {
    currentLocale = "es"
  })

  it.each([
    ["web.title", "/es/desarrollo-software-madrid"],
    ["erp.title", "/es/desarrollo-software-madrid"],
    ["crm.title", "/es/desarrollo-software-madrid"],
    ["automation.title", "/es/automatizacion-procesos-ia"],
  ])("adds a more-information link on the %s card", (title, href) => {
    render(<ServicesSection />)
    const link = linkFor(title)
    expect(link).toHaveAttribute("href", href)
    expect(link).toHaveTextContent("Más información")
  })

  it.each(["en", "it"])("adds no links on the %s site, where the pages do not exist", (locale) => {
    currentLocale = locale
    render(<ServicesSection />)
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })
})
