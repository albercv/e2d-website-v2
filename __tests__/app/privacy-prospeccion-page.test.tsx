/** @jest-environment jsdom */
import { render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"

// The site navigation mounts LanguageSwitcher, which needs the App Router context.
jest.mock("next/navigation", () => ({
  usePathname: () => "/es/privacy/prospeccion",
  useRouter: () => ({ push: jest.fn() }),
}))

import Page, { generateMetadata } from "@/app/[locale]/privacy/prospeccion/page"

const TITLES = {
  es: "Prospección comercial de empresas y profesionales",
  en: "Commercial prospecting of companies and professionals",
  it: "Prospezione commerciale di aziende e professionisti",
} as const

const EYEBROWS = {
  es: "Anexo a la política de privacidad",
  en: "Annex to the privacy policy",
  it: "Allegato all'informativa sulla privacy",
} as const

const BACK_LINK_TEXT = {
  es: /Política de privacidad/i,
  en: /Privacy policy/i,
  it: /Informativa sulla privacy/i,
} as const

const RECIPIENT_HEADERS = {
  es: [
    "Apify",
    "Google",
    "Anthropic, a través de su API (cuando se active esta fase)",
    "Anthropic, a través de la suscripción Claude (cuando se active esta fase)",
  ],
  en: [
    "Apify",
    "Google",
    "Anthropic, via its API (once this phase is activated)",
    "Anthropic, via the Claude subscription (once this phase is activated)",
  ],
  it: [
    "Apify",
    "Google",
    "Anthropic, tramite la sua API (quando questa fase sarà attivata)",
    "Anthropic, tramite l'abbonamento Claude (quando questa fase sarà attivata)",
  ],
} as const

describe.each(["es", "en", "it"] as const)("Prospecting annex page — locale %s", (locale) => {
  it("renders the h1, eyebrow and back link", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByRole("heading", { level: 1, name: TITLES[locale] })).toBeInTheDocument()
    expect(screen.getByText(EYEBROWS[locale])).toBeInTheDocument()
    const backLink = screen.getByRole("link", { name: BACK_LINK_TEXT[locale] })
    expect(backLink).toHaveAttribute("href", `/${locale}/privacy`)
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

  it("renders the controller's NIF", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    expect(screen.getByText(/51095475D/)).toBeInTheDocument()
  })

  it("renders both mailto links to hello@evolve2digital.com", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    const mailLinks = screen.getAllByRole("link", { name: "hello@evolve2digital.com" })
    expect(mailLinks).toHaveLength(2)
    for (const link of mailLinks) {
      expect(link).toHaveAttribute("href", "mailto:hello@evolve2digital.com")
    }
  })

  it("renders the AEPD link opening in a new tab", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    const aepdLink = screen.getByRole("link", { name: "www.aepd.es" })
    expect(aepdLink).toHaveAttribute("href", "https://www.aepd.es")
    expect(aepdLink).toHaveAttribute("target", "_blank")
    expect(aepdLink.getAttribute("rel")).toEqual(expect.stringContaining("noopener"))
  })

  it("renders the recipients table with 4 body rows", async () => {
    render(await Page({ params: Promise.resolve({ locale }) }))
    const table = screen.getByRole("table")
    const rowHeaders = within(table).getAllByRole("rowheader")
    expect(rowHeaders).toHaveLength(4)
    expect(rowHeaders.map((el) => el.textContent)).toEqual(RECIPIENT_HEADERS[locale])
  })

  it("exposes deep-link anchors for oposicion and derechos", async () => {
    const { container } = render(await Page({ params: Promise.resolve({ locale }) }))
    expect(container.querySelector("#oposicion")).not.toBeNull()
    expect(container.querySelector("#derechos")).not.toBeNull()
  })
})

describe("Prospecting annex page — translation notice", () => {
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

describe("Prospecting annex page — es content wording (unchanged)", () => {
  it("renders the contact section wording", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText(/les enviamos un único email/)).toBeInTheDocument()
  })
})

describe("Prospecting annex page — generateMetadata", () => {
  it.each(["es", "en", "it"] as const)("%s: canonical, hreflang and robots index true", async (locale) => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale }) })
    expect(meta.alternates?.canonical).toBe(`https://evolve2digital.com/${locale}/privacy/prospeccion`)
    expect(meta.robots).toMatchObject({ index: true, follow: true })
    const languages = meta.alternates?.languages as Record<string, string>
    expect(languages["es-ES"]).toBe("https://evolve2digital.com/es/privacy/prospeccion")
    expect(languages["en-US"]).toBe("https://evolve2digital.com/en/privacy/prospeccion")
    expect(languages["it-IT"]).toBe("https://evolve2digital.com/it/privacy/prospeccion")
    expect(languages["x-default"]).toBe("https://evolve2digital.com/es/privacy/prospeccion")
  })

  it("es title matches the existing Spanish metadata", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "es" }) })
    expect(meta.title).toBe("Anexo de privacidad: prospección comercial | E2D - Evolve2Digital")
  })
})
