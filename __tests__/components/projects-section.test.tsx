/** @jest-environment jsdom */
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderToString } from "react-dom/server"
import { ProjectsSection } from "@/components/sections/projects-section"
import { PORTFOLIO_URL_BY_LOCALE } from "@/lib/seo/entities"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"

// jest.setup.js stubs next-intl so every key renders as itself. Here the real
// message files are read through a switchable locale, so each language is
// rendered with its own copy and a missing key fails loudly instead of
// silently rendering the key name.
let mockLocale = "es"
jest.mock("next-intl", () => {
  const React = jest.requireActual("react")
  const MESSAGES: Record<string, unknown> = {
    es: jest.requireActual("@/messages/es.json"),
    en: jest.requireActual("@/messages/en.json"),
    it: jest.requireActual("@/messages/it.json"),
  }
  const lookup = (path: string): unknown =>
    path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], MESSAGES[mockLocale])

  // Minimal stand-in for next-intl's rich text: "<tag>chunk</tag>" -> tags[tag](chunk).
  const rich = (message: string, tags: Record<string, (chunk: unknown) => unknown>) =>
    message.split(/(<\w+>.*?<\/\w+>)/g).map((part, i) => {
      const match = part.match(/^<(\w+)>(.*)<\/\1>$/)
      const node = match ? tags[match[1]](match[2]) : part
      return React.createElement(React.Fragment, { key: i }, node)
    })

  return {
    useLocale: () => mockLocale,
    NextIntlClientProvider: ({ children }: { children: unknown }) => children,
    useTranslations: (namespace: string) => {
      const read = (key: string) => {
        const value = lookup(`${namespace}.${key}`)
        if (value === undefined) throw new Error(`Missing message ${mockLocale}:${namespace}.${key}`)
        return value
      }
      const t = (key: string) => read(key)
      t.raw = (key: string) => read(key)
      t.rich = (key: string, tags: Record<string, (chunk: unknown) => unknown>) => rich(read(key) as string, tags)
      return t
    },
  }
})

const LOCALES = ["es", "en", "it"] as const
type Locale = (typeof LOCALES)[number]
const MESSAGES = { es: esMessages, en: enMessages, it: itMessages }

const CLIENT_SITES = [
  { key: "abyfoods", url: "https://abyfoods.fi", domain: "abyfoods.fi" },
  { key: "augustcollection", url: "https://augustore.es", domain: "augustore.es" },
  { key: "ferdyCoach", url: "https://ferdycoachdesamor.com", domain: "ferdycoachdesamor.com" },
] as const

const FERDY_CASE_PATH: Record<Locale, string> = {
  es: "/es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy",
  en: "/en/blog/from-fielding-curious-visitors-to-closing-clients-ferdys-website",
  it: "/it/blog/da-rispondere-ai-curiosi-a-chiudere-clienti-il-sito-di-ferdy",
}

function renderSection(locale: Locale) {
  mockLocale = locale
  return render(<ProjectsSection />)
}

type CardKey = "abyfoods" | "augustcollection" | "ferdyCoach" | "chatbotWhatsapp"

function getCard(locale: Locale, key: CardKey): HTMLElement {
  const card = screen.getByText(MESSAGES[locale].projects[key].title).closest<HTMLElement>('[data-slot="card"]')
  if (!card) throw new Error(`No card found for ${key}`)
  return card
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

describe.each(LOCALES)("ProjectsSection links (%s)", (locale) => {
  const copy = MESSAGES[locale].projects

  it.each(CLIENT_SITES)("links $key to $url, opening safely in a new tab with the domain as visible text", ({ key, url, domain }) => {
    renderSection(locale)
    const link = within(getCard(locale, key)).getByRole("link", { name: new RegExp(`^${escapeRegExp(domain)}`) })

    expect(link).toHaveAttribute("href", url)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    // Visible text is the domain; the localized hint is screen-reader only.
    expect(link.firstChild?.textContent).toBe(domain)
    expect(link.querySelector(".sr-only")).toHaveTextContent(copy.visitSite)
  })

  it("links the Ferdy card to its case post in the current locale, in the same tab", () => {
    renderSection(locale)
    const link = within(getCard(locale, "ferdyCoach")).getByRole("link", { name: copy.readCase })

    expect(link).toHaveAttribute("href", FERDY_CASE_PATH[locale])
    expect(link).not.toHaveAttribute("target")
  })

  it("gives the other cards no case link and the WhatsApp dashboard no link at all", () => {
    renderSection(locale)
    expect(within(getCard(locale, "abyfoods")).getAllByRole("link")).toHaveLength(1)
    expect(within(getCard(locale, "augustcollection")).getAllByRole("link")).toHaveLength(1)
    expect(within(getCard(locale, "ferdyCoach")).getAllByRole("link")).toHaveLength(2)
    expect(within(getCard(locale, "chatbotWhatsapp")).queryAllByRole("link")).toHaveLength(0)
  })

  it("links the portfolio below the grid with text that names e2dProjects", () => {
    renderSection(locale)
    const link = screen.getByRole("link", { name: "e2dProjects" })

    expect(link).toHaveAttribute("href", PORTFOLIO_URL_BY_LOCALE[locale])
    expect(link).toHaveAttribute("target", "_blank")
    expect(link.getAttribute("rel")).toContain("noopener")
    expect(link.closest('[data-slot="card"]')).toBeNull()

    const sentence = link.closest("p")
    expect(sentence).not.toBeNull()
    expect(sentence?.textContent?.startsWith(copy.portfolioCta.split("<")[0])).toBe(true)
    // The grid comes first in the document, the portfolio sentence after it.
    const lastCard = getCard(locale, "chatbotWhatsapp")
    expect(lastCard.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("makes every link keyboard focusable, in reading order, with a visible focus style", async () => {
    const user = userEvent.setup()
    renderSection(locale)
    const links = screen.getAllByRole("link")

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://abyfoods.fi",
      "https://augustore.es",
      "https://ferdycoachdesamor.com",
      FERDY_CASE_PATH[locale],
      PORTFOLIO_URL_BY_LOCALE[locale],
    ])
    for (const link of links) {
      expect(link).not.toHaveAttribute("tabindex", "-1")
      expect(link.className).toMatch(/focus-visible:ring/)
      await user.tab()
      expect(link).toHaveFocus()
    }
  })

  it("server-renders every link, so they work without JavaScript", () => {
    mockLocale = locale
    // ElectricBorder's useLayoutEffect makes React dev warn on every string
    // render; that is noise here, anything else must still reach the console.
    const consoleError = console.error
    const errorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (!String(args[0]).includes("useLayoutEffect does nothing on the server")) consoleError(...args)
    })
    const html = renderToString(<ProjectsSection />)
    errorSpy.mockRestore()

    for (const { url } of CLIENT_SITES) expect(html).toContain(`href="${url}"`)
    expect(html).toContain(`href="${FERDY_CASE_PATH[locale]}"`)
    expect(html).toContain(`href="${PORTFOLIO_URL_BY_LOCALE[locale]}"`)
  })
})

describe("projects messages", () => {
  it.each(LOCALES)("%s defines the new link strings and keeps URLs out of the messages", (locale) => {
    const copy = MESSAGES[locale].projects
    expect(copy.visitSite.trim()).not.toBe("")
    expect(copy.readCase.trim()).not.toBe("")
    expect(copy.portfolioCta).toMatch(/<link>e2dProjects<\/link>/)
    expect(JSON.stringify(copy)).not.toMatch(/https?:\/\//)
  })

  it("tells Italian visitors that the portfolio is in English", () => {
    expect(MESSAGES.it.projects.portfolioCta).toMatch(/inglese/i)
  })
})
