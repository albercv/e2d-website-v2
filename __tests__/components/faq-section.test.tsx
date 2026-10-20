/** @jest-environment jsdom */
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { FaqSection } from "@/components/sections/faq-section"
import { FAQ_DATA } from "@/lib/faq/faq-data"

// next-intl is ESM-only and jest.setup.js stubs it with a fixed "es" locale.
// Re-stub it here with a switchable locale so each language is really rendered.
let mockLocale = "es"
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const LOCALES = ["es", "en", "it"] as const
type Locale = (typeof LOCALES)[number]

interface SchemaQuestion {
  name: string
  acceptedAnswer: { text: string }
}

const ES_QUESTIONS = [
  "¿Quién desarrolla mi proyecto?",
  "¿Puedes integrar mis herramientas actuales?",
  "¿Cómo se calcula el presupuesto?",
  "¿Qué código y documentación se entregan?",
  "¿Qué mantenimiento necesita la solución?",
  "¿Dónde puedo ver ejemplos?",
]

function renderFaq(locale: Locale) {
  mockLocale = locale
  return render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <FaqSection />
    </NextIntlClientProvider>
  )
}

function getRegion(button: HTMLElement): HTMLElement {
  const region = document.getElementById(button.getAttribute("aria-controls") ?? "")
  if (!region) throw new Error("aria-controls does not point at an element")
  return region
}

// Collapsed = zero-height grid row + visibility:hidden, which is what removes
// the answer from the tab order and the accessibility tree in a real browser.
function isCollapsed(region: HTMLElement): boolean {
  return region.style.gridTemplateRows === "0fr" && region.style.visibility === "hidden"
}

function isExpanded(region: HTMLElement): boolean {
  return region.style.gridTemplateRows === "1fr" && region.style.visibility === "visible"
}

describe.each(LOCALES)("FaqSection (%s)", (locale) => {
  const items = FAQ_DATA[locale].items

  it("renders one button per question with aria-expanded=false and aria-controls pointing at its answer", () => {
    renderFaq(locale)
    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(items.length)

    buttons.forEach((button, i) => {
      expect(button).toHaveAttribute("type", "button")
      expect(button).toHaveAttribute("aria-expanded", "false")
      expect(button.closest("h3")).not.toBeNull()
      expect(within(button).getByText(items[i].question)).toBeInTheDocument()

      const region = getRegion(button)
      expect(region).toHaveAttribute("role", "region")
      expect(region).toHaveAttribute("aria-labelledby", button.id)
      expect(region).toHaveTextContent(items[i].answer)
    })
  })

  it("keeps every answer in the DOM while closed, but hidden from users and assistive tech", () => {
    renderFaq(locale)
    items.forEach((item) => {
      expect(screen.getByText(item.answer)).toBeInTheDocument()
    })
    screen.getAllByRole("button").forEach((button) => {
      expect(isCollapsed(getRegion(button))).toBe(true)
    })
    expect(screen.queryAllByRole("region")).toHaveLength(0)
  })

  it("opens one answer at a time on click", async () => {
    const user = userEvent.setup()
    renderFaq(locale)
    const [first, second] = screen.getAllByRole("button")

    await user.click(first)
    expect(first).toHaveAttribute("aria-expanded", "true")
    expect(isExpanded(getRegion(first))).toBe(true)
    expect(screen.getByRole("region", { name: items[0].question })).toHaveTextContent(items[0].answer)

    await user.click(second)
    expect(first).toHaveAttribute("aria-expanded", "false")
    expect(isCollapsed(getRegion(first))).toBe(true)
    expect(second).toHaveAttribute("aria-expanded", "true")
    expect(isExpanded(getRegion(second))).toBe(true)
    expect(screen.getAllByRole("region")).toHaveLength(1)

    await user.click(second)
    expect(second).toHaveAttribute("aria-expanded", "false")
    expect(isCollapsed(getRegion(second))).toBe(true)
  })

  it("is reachable with Tab and toggles with Enter and Space", async () => {
    const user = userEvent.setup()
    renderFaq(locale)
    const [first, second] = screen.getAllByRole("button")

    await user.tab()
    expect(first).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(first).toHaveAttribute("aria-expanded", "true")
    await user.keyboard("{Enter}")
    expect(first).toHaveAttribute("aria-expanded", "false")

    await user.tab()
    expect(second).toHaveFocus()
    await user.keyboard(" ")
    expect(second).toHaveAttribute("aria-expanded", "true")
  })

  it("publishes a FAQPage JSON-LD that equals the visible content", () => {
    const { container } = renderFaq(locale)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const schema = JSON.parse(script?.textContent ?? "{}")

    expect(schema["@type"]).toBe("FAQPage")
    expect(schema["@id"]).toBe(`https://evolve2digital.com/${locale}#faq`)
    expect(schema.mainEntity).toHaveLength(items.length)

    const buttons = screen.getAllByRole("button")
    schema.mainEntity.forEach((entity: SchemaQuestion, i: number) => {
      expect(entity.name).toBe(items[i].question)
      expect(entity.acceptedAnswer.text).toBe(items[i].answer)
      // The structured data must not drift from what a visitor can read.
      expect(buttons[i]).toHaveTextContent(entity.name)
      expect(getRegion(buttons[i]).textContent).toBe(entity.acceptedAnswer.text)
    })
  })
})

describe("FAQ_DATA content", () => {
  it("has exactly the six agreed questions in Spanish", () => {
    expect(FAQ_DATA.es.items.map((item) => item.question)).toEqual(ES_QUESTIONS)
  })

  it.each(LOCALES)("%s has the same number of items as Spanish, all non-empty", (locale) => {
    const { items } = FAQ_DATA[locale]
    expect(items).toHaveLength(ES_QUESTIONS.length)
    items.forEach((item) => {
      expect(item.question.trim()).not.toBe("")
      expect(item.answer.trim()).not.toBe("")
    })
  })

  it("has no external rankings or third-party prices", () => {
    const text = LOCALES.flatMap((locale) =>
      FAQ_DATA[locale].items.flatMap((item) => [item.question, item.answer])
    ).join("\n")
    expect(text).not.toMatch(/Góbalo|Sortlist|Q2BSTUDIO|CodersLab|8\.000|45 y 85|€8,000/)
    // No amounts at all: prices live on the service pages, not in the FAQ.
    expect(text).not.toMatch(/\d\s?(€|euros?|EUR)|€\s?\d/i)
  })

  it("has no absolute claims", () => {
    const text = LOCALES.flatMap((locale) => FAQ_DATA[locale].items.map((item) => item.answer)).join("\n")
    expect(text).not.toMatch(/única que escala|cien por cien|only one that scales|one hundred percent|cento per cento|unica che scala/i)
  })

  it.each([
    ["es", "https://e2dprojects.com/es/"],
    ["en", "https://e2dprojects.com/en/"],
    ["it", "https://e2dprojects.com/en/"],
  ] as const)("%s examples answer points at the portfolio and the Ferdy case", (locale, portfolioUrl) => {
    const answer = FAQ_DATA[locale].items[5].answer
    expect(answer).toContain(portfolioUrl)
    expect(answer).toContain("Ferdy")
  })
})
