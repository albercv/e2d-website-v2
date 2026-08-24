/** @jest-environment node */
import { generateMetadata } from "@/app/[locale]/docs/[slug]/page"
import { generateAISitemap } from "@/lib/sitemap-generator"

const STUBS = ["components", "i18n", "seo", "gdpr", "performance", "deployment"]

describe("docs stubs are noindexed", () => {
  it.each(STUBS)("%s returns robots noindex", async (slug) => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "es", slug }) })
    expect(meta.robots).toMatchObject({ index: false, follow: true })
  })

  it("principles and architecture stay indexable", async () => {
    for (const slug of ["principles", "architecture"]) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale: "es", slug }) })
      expect(meta.robots).toMatchObject({ index: true })
    }
  })

  it("sitemap omits stub docs URLs", async () => {
    const entries = await generateAISitemap()
    const urls = entries.map((e) => e.url)
    for (const slug of STUBS) {
      expect(urls).not.toContain(`https://evolve2digital.com/es/docs/${slug}`)
    }
    expect(urls).toContain("https://evolve2digital.com/es/docs/principles")
  })
})
