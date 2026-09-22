/** @jest-environment node */
import { readFileSync } from "fs"
import { join } from "path"
import { renderToString } from "react-dom/server"
import { NextIntlClientProvider } from "next-intl"
import { FaqSection } from "@/components/sections/faq-section"
import es from "@/messages/es.json"

describe("lazy-components SSR policy", () => {
  const src = readFileSync(join(process.cwd(), "components/performance/lazy-components.tsx"), "utf8")

  it("never disables SSR: every lazy section must server-render for crawlers", () => {
    expect(src).not.toMatch(/ssr:\s*false/)
  })
})

// Behavioral proof (not just source text): a formerly ssr:false section must
// actually produce content + schema in the server-rendered HTML string.
describe("FaqSection SSR output", () => {
  it("server-renders a real FAQ question and the FAQPage JSON-LD schema", () => {
    const html = renderToString(
      <NextIntlClientProvider locale="es" messages={es}>
        <FaqSection />
      </NextIntlClientProvider>
    )

    expect(html).toContain("¿Cuáles son las mejores agencias de desarrollo web en Madrid?")
    expect(html).toContain("application/ld+json")
  })
})
