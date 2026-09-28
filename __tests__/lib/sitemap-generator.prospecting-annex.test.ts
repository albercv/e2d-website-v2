/**
 * @jest-environment node
 *
 * The prospecting privacy annex (/[locale]/privacy/prospeccion) now exists in
 * es/en/it (lib/legal/content/prospecting-annex/*), so — unlike before — it
 * is a normal locale-looped legal page: one URL per locale, full es/en/it
 * alternates, same priority/changeFrequency as the other legal pages.
 */
import { generateAISitemap } from "@/lib/sitemap-generator"

describe("sitemap: prospecting privacy annex", () => {
  it("includes the es/en/it /privacy/prospeccion URLs, one each", async () => {
    const urls = (await generateAISitemap()).map((e) => e.url)
    for (const locale of ["es", "en", "it"]) {
      const matches = urls.filter((u) => u === `https://evolve2digital.com/${locale}/privacy/prospeccion`)
      expect(matches).toHaveLength(1)
    }
  })

  it("alternates list all three locales plus x-default", async () => {
    const entries = await generateAISitemap()
    const entry = entries.find((e) => e.url === "https://evolve2digital.com/es/privacy/prospeccion")
    expect(entry).toBeDefined()
    const langs = entry?.alternates?.languages as Record<string, string>
    expect(langs).toBeDefined()
    expect(langs["es-ES"]).toBe("https://evolve2digital.com/es/privacy/prospeccion")
    expect(langs["en-US"]).toBe("https://evolve2digital.com/en/privacy/prospeccion")
    expect(langs["it-IT"]).toBe("https://evolve2digital.com/it/privacy/prospeccion")
    expect(langs["x-default"]).toBe("https://evolve2digital.com/es/privacy/prospeccion")
  })

  it("has legal-page priority/changeFrequency and low-importance AI metadata", async () => {
    const entries = await generateAISitemap()
    const entry = entries.find((e) => e.url === "https://evolve2digital.com/es/privacy/prospeccion")
    expect(entry).toBeDefined()
    expect(entry!.changeFrequency).toBe("yearly")
    expect(entry!.priority).toBe(0.3)
  })
})
