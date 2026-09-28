/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import Page from "@/app/[locale]/legal/page"

// en/it content is not translated yet (see lib/legal/content/legal-notice/index.ts) —
// only the Spanish rendering is asserted here. Broader locale coverage lands
// with the translations.
describe("Legal notice page — es", () => {
  it("renders the h1 and last-updated date", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByRole("heading", { level: 1, name: "Aviso Legal" })).toBeInTheDocument()
    expect(screen.getByText(/26 de septiembre de 2025/)).toBeInTheDocument()
  })

  it("renders at least one mailto link", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const mailLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("mailto:"))
    expect(mailLinks.length).toBeGreaterThan(0)
  })

  it("renders the identity infoBox with the NIF", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText(/51095475D/)).toBeInTheDocument()
  })

  it("renders the Madrid jurisdiction clause", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText(/Juzgados y tribunales de la ciudad de Madrid/)).toBeInTheDocument()
  })
})
