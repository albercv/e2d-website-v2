/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import PrivacyClientPage from "@/app/[locale]/privacy/privacy-client"

// next-intl is mocked globally in jest.setup.js: useTranslations() always
// returns `(key) => key`, ignoring both the namespace and any `messages`
// passed to NextIntlClientProvider. So rendering only proves the component
// wires up the `sections.prospecting.*` keys (and their literal key text is
// what ends up in the DOM) — it can't prove the *content* of each locale's
// translation. The JSON-content assertions below cover that separately.
describe("PrivacyClientPage — prospecting annex link", () => {
  it("renders a link to the annex under the prospecting section", () => {
    render(<PrivacyClientPage />)
    const section = document.getElementById("prospeccion")
    expect(section).not.toBeNull()
    const link = screen.getByRole("link", { name: "sections.prospecting.link" })
    expect(link).toHaveAttribute("href", "/es/privacy/prospeccion")
  })

  it("renders the prospecting title heading key", () => {
    render(<PrivacyClientPage />)
    expect(screen.getByText("sections.prospecting.title")).toBeInTheDocument()
  })
})

describe("messages/*.json — privacy.sections.prospecting content", () => {
  it("es has the Spanish annex copy", () => {
    const p = esMessages.privacy.sections.prospecting
    expect(p.title).toBe("Prospección comercial")
    expect(p.description).toMatch(/prospección comercial de empresas y profesionales/)
    expect(p.link).toBe("Ver el anexo de prospección comercial.")
  })

  it("en has translated copy pointing at the Spanish-only annex", () => {
    const p = enMessages.privacy.sections.prospecting
    expect(p.title).toBe("Commercial prospecting")
    expect(p.description).toMatch(/commercial prospecting of companies and professionals/)
    expect(p.link).toBe("Read the prospecting annex.")
  })

  it("it has translated copy pointing at the Spanish-only annex", () => {
    const p = itMessages.privacy.sections.prospecting
    expect(p.title).toBe("Prospezione commerciale")
    expect(p.description).toMatch(/prospezione commerciale di aziende e professionisti/)
    expect(p.link).toBe("Leggi l'allegato sulla prospezione.")
  })
})
