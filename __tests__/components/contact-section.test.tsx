/** @jest-environment jsdom */

import { readFileSync } from "fs"
import { join } from "path"
import { renderToString } from "react-dom/server"
import { render, screen, fireEvent, within } from "@testing-library/react"
import "@testing-library/jest-dom"

import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"

const MESSAGES = { es: esMessages, en: enMessages, it: itMessages } as const
const ES = esMessages.contactSection
type Locale = keyof typeof MESSAGES

let mockLocale: Locale = "es"

// jest.setup.js stubs next-intl with a key-echo; this one resolves the real
// message files so the tests prove the copy that ships, in every locale.
function mockTranslate(namespace: string, key: string, values?: Record<string, string>): string {
  const path = [...namespace.split("."), key]
  const node = path.reduce<unknown>(
    (acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined),
    MESSAGES[mockLocale],
  )
  if (typeof node !== "string") return key
  return Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, value), node)
}

jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) =>
    mockTranslate(namespace, key, values),
}))
jest.mock("@/lib/analytics/track", () => ({ track: jest.fn() }))
// Radix Dialog portals + focus traps add nothing to these assertions.
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

import { ContactSection } from "@/components/sections/contact-section"
import { CONTACT_ANCHOR } from "@/lib/seo/entities"
import { track } from "@/lib/analytics/track"

const trackMock = track as jest.Mock
const ORIGINAL_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
const root = (file: string) => readFileSync(join(process.cwd(), file), "utf8")

describe("ContactSection", () => {
  beforeEach(() => {
    mockLocale = "es"
    trackMock.mockReset()
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "34600000000"
  })

  afterAll(() => {
    if (ORIGINAL_WHATSAPP === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = ORIGINAL_WHATSAPP
  })

  it("is the element the JSON-LD ContactAction anchors to, labelled by its own heading", () => {
    const { container } = render(<ContactSection />)
    const section = container.querySelector(`section#${CONTACT_ANCHOR}`)
    expect(section).not.toBeNull()
    expect(section).toHaveAttribute("aria-labelledby", "contact-title")

    const heading = screen.getByRole("heading", { level: 2, name: ES.title })
    expect(heading).toHaveAttribute("id", "contact-title")
    expect(section).toContainElement(heading)
    expect(screen.getByRole("region", { name: ES.title })).toBe(section)
  })

  it("links the plain email address with mailto and tracks it", () => {
    render(<ContactSection />)
    const link = screen.getByRole("link", { name: /hello@evolve2digital\.com/ })
    expect(link).toHaveAttribute("href", "mailto:hello@evolve2digital.com")

    fireEvent.click(link)
    expect(trackMock).toHaveBeenCalledWith("email_click", { link_location: "contact_section", locale: "es" })
  })

  it("shows the WhatsApp link when a number is configured and tracks it", () => {
    render(<ContactSection />)
    const link = screen.getByRole("link", { name: ES.whatsappLabel })
    expect(link).toHaveAttribute("href", "https://wa.me/34600000000")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))

    fireEvent.click(link)
    expect(trackMock).toHaveBeenCalledWith("whatsapp_click", { link_location: "contact_section", locale: "es" })
  })

  it.each([
    ["unset", undefined],
    ["empty", "   "],
  ])("hides the WhatsApp link when the number is %s", (_label, value) => {
    if (value === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = value

    render(<ContactSection />)
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /hello@evolve2digital\.com/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: ES.openForm })).toBeInTheDocument()
  })

  it("keeps the lead form closed until the button is pressed, then opens it", () => {
    render(<ContactSection />)
    expect(screen.queryByTestId("lead-form")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: ES.openForm }))

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByTestId("lead-form")).toBeInTheDocument()
    expect(trackMock).toHaveBeenCalledWith("cta_click", { cta_id: "contact_section", locale: "es" })
  })

  it.each(["es", "en", "it"] as const)("renders the %s copy from the message files", (locale) => {
    mockLocale = locale
    const copy = MESSAGES[locale].contactSection
    render(<ContactSection />)

    expect(screen.getByRole("heading", { level: 2, name: copy.title })).toBeInTheDocument()
    expect(screen.getByText(copy.subtitle)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: copy.openForm })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: copy.emailLabel.replace("{email}", "hello@evolve2digital.com") })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: copy.whatsappLabel })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("link", { name: copy.whatsappLabel }))
    expect(trackMock).toHaveBeenCalledWith("whatsapp_click", { link_location: "contact_section", locale })
  })

  it("is in the server-rendered HTML so crawlers and the #contact anchor find it without JS", () => {
    const html = renderToString(<ContactSection />)
    expect(html).toContain(`id="${CONTACT_ANCHOR}"`)
    expect(html).toContain(ES.title)
    expect(html).toContain("mailto:hello@evolve2digital.com")
  })
})

describe("contactSection messages", () => {
  it("defines the same non-empty keys in es, en and it", () => {
    const keys = Object.keys(ES).sort()
    expect(keys).toEqual(["emailLabel", "openForm", "subtitle", "title", "whatsappLabel"])
    for (const locale of ["es", "en", "it"] as const) {
      const copy = MESSAGES[locale].contactSection
      expect(Object.keys(copy).sort()).toEqual(keys)
      Object.values(copy).forEach((text) => expect(text.trim()).not.toBe(""))
      expect(copy.emailLabel).toContain("{email}")
    }
  })

  it("promises no response time", () => {
    const text = Object.values(ES).join(" ")
    expect(text).not.toMatch(/\d\s?(horas?|h\b|minutos?|días?)|24\/7|inmediat|enseguida|al instante|cuanto antes/i)
  })
})

describe("home page wiring", () => {
  it("renders ContactSection at the end of <main>, after the Adapt section, without lazy loading", () => {
    const page = root("app/[locale]/page.tsx")
    expect(page).toMatch(/import \{ ContactSection \} from "@\/components\/sections\/contact-section"/)
    expect(page).not.toMatch(/ContactSectionLazy/)

    const adapt = page.indexOf("<AdaptSectionLazy />")
    const contact = page.indexOf("<ContactSection />")
    const mainEnd = page.indexOf("</main>")
    expect(adapt).toBeGreaterThan(-1)
    expect(contact).toBeGreaterThan(adapt)
    expect(mainEnd).toBeGreaterThan(contact)
  })
})

describe("pages linking to the contact section", () => {
  const FILES = [
    "app/es/servicios/agente-ia-chatbot/page.tsx",
    "app/es/servicios/agente-ia-integraciones/page.tsx",
    "app/es/servicios/dashboard-agente-ia/page.tsx",
    "app/es/servicios/consultoria-proyecto-pequeno/page.tsx",
    "app/es/servicios/consultoria-proyecto-mediano/page.tsx",
    "app/es/servicios/consultoria-proyecto-grande/page.tsx",
    "app/es/legal/devoluciones/page.tsx",
  ]

  it.each(FILES)("%s targets #contact, the id that exists, not #contacto", (file) => {
    const source = root(file)
    expect(source).not.toContain("#contacto")
    expect(source).toContain(`/es#${CONTACT_ANCHOR}`)
  })
})
