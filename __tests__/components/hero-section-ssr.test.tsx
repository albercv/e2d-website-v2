/** @jest-environment node */
import { renderToString } from "react-dom/server"

// react-dom 18.3 (jest) predates fetchPriority; the app router renders with
// Next's React canary, which supports it. Silence only that one warning.
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // React's printWarning passes the template with literal "%s" placeholders
    // as args[0] and the interpolated values ("fetchPriority", ...) as later
    // args, so the check has to scan every arg, not just the first.
    if (args.some((arg) => typeof arg === "string" && arg.includes("fetchPriority"))) return
    originalConsoleError(...args)
  }
})
afterAll(() => {
  console.error = originalConsoleError
})

import { HeroSection } from "@/components/sections/hero-section"

describe("HeroSection server HTML", () => {
  let html: string
  beforeAll(() => {
    html = renderToString(<HeroSection />)
  })

  it("contains the H1 with the hero title", () => {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
    expect(h1).not.toBeNull()
    // next-intl is mocked globally: t("title") renders the key.
    expect(h1![1]).toContain("title")
  })

  it("does not hide the copy behind an inline opacity:0 (LCP render delay)", () => {
    const beforeH1 = html.slice(0, html.indexOf("<h1"))
    expect(beforeH1).not.toMatch(/style="[^"]*opacity:\s*0[;"]/)
  })

  it("marks the copy wrapper for the snapshot capture script", () => {
    expect(html).toContain("data-hero-content")
  })

  it("ships the snapshot picture and no canvas in the server HTML", () => {
    expect(html).toContain("data-hero-snapshot")
    expect(html).toContain('src="/hero/liquid-ether-landscape.webp"')
    expect(html).not.toContain("<canvas")
  })
})
