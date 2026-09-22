/** @jest-environment node */
import { renderToString } from "react-dom/server"

// The fluid background is WebGL-only; it must never run during SSR tests.
jest.mock("@/components/sections/LiquidEther", () => ({ __esModule: true, default: () => null }))

import { HeroSection } from "@/components/sections/hero-section"

describe("HeroSection server HTML", () => {
  const html = renderToString(<HeroSection />)

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
})
