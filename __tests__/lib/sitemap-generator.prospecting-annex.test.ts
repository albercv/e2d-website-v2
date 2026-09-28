/**
 * @jest-environment node
 *
 * The prospecting privacy annex (/es/privacy/prospeccion) is Spanish-only —
 * no EN/IT translation exists. Unlike the other legal pages, which are
 * looped per-locale with full es/en/it alternates, this entry must appear
 * exactly once and must not advertise /en or /it alternate URLs that 404.
 */
import { generateAISitemap } from "@/lib/sitemap-generator"

describe("sitemap: prospecting privacy annex", () => {
  it("includes the /es/privacy/prospeccion URL exactly once", async () => {
    const urls = (await generateAISitemap()).map((e) => e.url)
    const matches = urls.filter((u) => u === "https://evolve2digital.com/es/privacy/prospeccion")
    expect(matches).toHaveLength(1)
  })

  it("does not emit /en or /it prospeccion URLs", async () => {
    const urls = (await generateAISitemap()).map((e) => e.url)
    expect(urls).not.toContain("https://evolve2digital.com/en/privacy/prospeccion")
    expect(urls).not.toContain("https://evolve2digital.com/it/privacy/prospeccion")
  })

  it("alternates only list the es URL (plus x-default), no /en or /it", async () => {
    const entries = await generateAISitemap()
    const entry = entries.find((e) => e.url === "https://evolve2digital.com/es/privacy/prospeccion")
    expect(entry).toBeDefined()
    const langs = entry?.alternates?.languages as Record<string, string>
    expect(langs).toBeDefined()
    expect(langs["es-ES"]).toBe("https://evolve2digital.com/es/privacy/prospeccion")
    expect(langs["x-default"]).toBe("https://evolve2digital.com/es/privacy/prospeccion")
    expect(langs["en-US"]).toBeUndefined()
    expect(langs["it-IT"]).toBeUndefined()
    expect(Object.values(langs)).not.toContain("https://evolve2digital.com/en/privacy/prospeccion")
    expect(Object.values(langs)).not.toContain("https://evolve2digital.com/it/privacy/prospeccion")
  })

  it("has legal-page priority/changeFrequency and low-importance AI metadata", async () => {
    const entries = await generateAISitemap()
    const entry = entries.find((e) => e.url === "https://evolve2digital.com/es/privacy/prospeccion")
    expect(entry).toBeDefined()
    expect(entry!.changeFrequency).toBe("yearly")
    expect(entry!.priority).toBe(0.3)
  })
})
