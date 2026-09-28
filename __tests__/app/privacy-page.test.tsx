/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import Page from "@/app/[locale]/privacy/page"

// en/it content is not translated yet (see lib/legal/content/privacy/index.ts) —
// only the Spanish rendering is asserted here. Broader locale coverage lands
// with the translations.
describe("Privacy page — es", () => {
  it("renders the h1 and last-updated date", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidad" })).toBeInTheDocument()
    expect(screen.getByText(/28 de septiembre de 2026/)).toBeInTheDocument()
  })

  it("links to the Spanish prospecting annex", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const link = screen.getByRole("link", { name: "Ver el anexo de prospección comercial." })
    expect(link).toHaveAttribute("href", "/es/privacy/prospeccion")
  })

  it("renders at least one mailto link", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const mailLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("mailto:"))
    expect(mailLinks.length).toBeGreaterThan(0)
  })

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
