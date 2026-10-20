/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"

import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"

const MESSAGES = { es: esMessages, en: enMessages, it: itMessages } as const
let currentLocale: keyof typeof MESSAGES = "es"

// next-intl is mocked globally with echo keys; here the real catalogues are
// used so the test proves the namespace exists and is localized.
jest.mock("next-intl", () => ({
  useLocale: () => currentLocale,
  useTranslations: (namespace: string) => (key: string) =>
    (MESSAGES[currentLocale] as unknown as Record<string, Record<string, string>>)[namespace][key],
}))

import NotFound from "@/app/[locale]/not-found"

const EXPECTED = {
  es: { title: "Página no encontrada", home: "Volver al inicio", href: "/es" },
  en: { title: "Page not found", home: "Back to home", href: "/en" },
  it: { title: "Pagina non trovata", home: "Torna alla home", href: "/it" },
} as const

describe("localized 404 inside the [locale] layout", () => {
  it.each(["es", "en", "it"] as const)("renders the %s texts and a link to the locale home", (locale) => {
    currentLocale = locale
    render(<NotFound />)
    expect(screen.getByRole("heading", { level: 1, name: EXPECTED[locale].title })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: EXPECTED[locale].home })).toHaveAttribute("href", EXPECTED[locale].href)
  })

  it("does not render a document of its own (the locale layout already does)", () => {
    currentLocale = "en"
    const html = renderToStaticMarkup(<NotFound />)
    expect(html).not.toContain("<html")
    expect(html).not.toContain("<body")
  })

  it("appends the notFound namespace after chat in every catalogue", () => {
    for (const messages of Object.values(MESSAGES)) {
      const keys = Object.keys(messages)
      expect(keys[keys.length - 1]).toBe("notFound")
      expect(keys[keys.length - 2]).toBe("chat")
      expect(Object.keys(messages.notFound).sort()).toEqual(["code", "description", "home", "title"])
    }
  })
})
