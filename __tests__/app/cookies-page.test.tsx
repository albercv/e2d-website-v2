/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import Page from "@/app/[locale]/cookies/page"

// en/it content is not translated yet (see lib/legal/content/cookies/index.ts) —
// only the Spanish rendering is asserted here. Broader locale coverage lands
// with the translations.
describe("Cookies page — es", () => {
  it("renders the h1 and last-updated date", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByRole("heading", { level: 1, name: "Política de Cookies" })).toBeInTheDocument()
    expect(screen.getByText(/26 de septiembre de 2025/)).toBeInTheDocument()
  })

  it("renders at least one mailto link", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const mailLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("mailto:"))
    expect(mailLinks.length).toBeGreaterThan(0)
  })

  it("renders the three cookie-type cards", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const headings = screen.getAllByRole("heading", { level: 3 })
    expect(headings).toHaveLength(3)
  })

  it("renders the browser management list", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText("Chrome:")).toBeInTheDocument()
    expect(screen.getByText(/Configuración → Privacidad y seguridad → Cookies/)).toBeInTheDocument()
  })
})
