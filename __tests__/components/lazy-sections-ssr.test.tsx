/** @jest-environment node */
import { readFileSync } from "fs"
import { join } from "path"

// Regression tripwire: only the 3D hero and the AI modal may opt out of SSR.
// The five content sections must server-render so crawlers without JS see them.
describe("lazy-components SSR policy", () => {
  const src = readFileSync(
    join(process.cwd(), "components/performance/lazy-components.tsx"),
    "utf8"
  )

  it("keeps ssr:false only for Hero3D and AIAgentModal", () => {
    const occurrences = src.match(/ssr:\s*false/g) ?? []
    expect(occurrences).toHaveLength(2)
  })

  it("does not disable SSR for any content section", () => {
    for (const section of ["projects-section", "about-section", "process-section", "faq-section", "adapt-section"]) {
      const block = src.split(section)[1]?.slice(0, 200) ?? ""
      expect(block).not.toMatch(/ssr:\s*false/)
    }
  })
})
