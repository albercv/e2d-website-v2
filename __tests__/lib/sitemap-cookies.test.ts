/** @jest-environment node */
import { generateAISitemap } from "@/lib/sitemap-generator"

it("sitemap includes cookies pages for all locales", async () => {
  const urls = (await generateAISitemap()).map((e) => e.url)
  for (const locale of ["es", "en", "it"]) {
    expect(urls).toContain(`https://evolve2digital.com/${locale}/cookies`)
  }
})
