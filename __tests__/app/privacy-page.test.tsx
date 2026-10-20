/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import Page from "@/app/[locale]/privacy/page"

const TITLES = {
  es: "Política de Privacidad",
  en: "Privacy Policy",
  it: "Informativa sulla Privacy",
} as const

describe.each(["es", "en", "it"] as const)("Privacy page — locale %s", (locale) => {
  it("renders the localized h1", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByRole("heading", { level: 1, name: TITLES[locale] })).toBeInTheDocument()
  })

  it("links to the locale's prospecting annex", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    const links = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.endsWith("/privacy/prospeccion"))
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", `/${locale}/privacy/prospeccion`)
    // No @tailwindcss/typography in this project: `prose` does not style links,
    // so inline links must carry their own underline to be recognisable.
    expect(links[0]).toHaveClass("underline")
  })

  it("renders at least one mailto link", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    const mailLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("mailto:"))
    expect(mailLinks.length).toBeGreaterThan(0)
  })
})

describe("Privacy page — translation notice", () => {
  it("es has no translation notice", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.queryByText(/traducción proporcionada|translation provided|traduzione fornita/i)).not.toBeInTheDocument()
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

describe("Privacy page — es content (unchanged from the pre-refactor Spanish page)", () => {
  it("renders the controller block", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText("Responsable del tratamiento:")).toBeInTheDocument()
    expect(screen.getAllByText(/605497639/).length).toBeGreaterThan(0)
  })

  it("renders the AI chat section verbatim", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText(/DeepSeek \(LLM\)/)).toBeInTheDocument()
  })
})
