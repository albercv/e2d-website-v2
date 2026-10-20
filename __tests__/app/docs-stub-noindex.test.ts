/** @jest-environment node */
import { generateMetadata as generateSlugMetadata } from "@/app/[locale]/docs/[slug]/page"
import { generateMetadata as generateIndexMetadata } from "@/app/[locale]/docs/page"
import robots from "@/app/robots"
import { generateAISitemap } from "@/lib/sitemap-generator"

const LOCALES = ["es", "en", "it"]
const SLUGS = ["principles", "architecture", "components", "i18n", "seo", "gdpr", "performance", "deployment"]

// Internal technical docs stay publicly reachable but out of search results
// (decision 2026-10-20). Crawlers must be able to fetch them to read the
// noindex directive, so robots.txt must not block them.
describe("docs pages are noindexed but reachable", () => {
  it.each(LOCALES)("docs index is noindex for %s", async (locale) => {
    const meta = await generateIndexMetadata({ params: Promise.resolve({ locale }) })
    expect(meta.robots).toMatchObject({ index: false, follow: true })
  })

  it.each(LOCALES.flatMap((locale) => SLUGS.map((slug) => [locale, slug])))(
    "docs/%s in %s is noindex",
    async (locale, slug) => {
      const meta = await generateSlugMetadata({ params: Promise.resolve({ locale, slug }) })
      expect(meta.robots).toMatchObject({ index: false, follow: true })
    },
  )

  it("sitemap omits every docs URL", async () => {
    const entries = await generateAISitemap()
    const urls = entries.map((e) => e.url)
    expect(urls.filter((u) => /\/docs(\/|$)/.test(u))).toEqual([])
  })

  it("robots.txt does not block /<locale>/docs/ for any crawler group", () => {
    const out = robots()
    const rules = Array.isArray(out.rules) ? out.rules : [out.rules]
    for (const rule of rules) {
      const disallow = ([rule.disallow ?? []] as (string | string[])[]).flat()
      for (const locale of LOCALES) {
        const blocked = disallow.filter((entry) => `/${locale}/docs/`.startsWith(entry))
        expect(blocked).toEqual([])
      }
    }
  })
})
