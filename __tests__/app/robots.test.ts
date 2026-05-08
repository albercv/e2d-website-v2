/**
 * @jest-environment node
 */
import robots from "../../app/robots"

describe("robots() metadata route", () => {
  const out = robots()
  const rules = Array.isArray(out.rules) ? out.rules : [out.rules]
  const byAgent = (agent: string) =>
    rules.find(r => {
      const ua = Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]
      return ua.includes(agent)
    })

  it("declares the canonical sitemap and host", () => {
    expect(out.sitemap).toBe("https://evolve2digital.com/sitemap.xml")
    expect(out.host).toBe("https://evolve2digital.com")
  })

  it("has an explicit Googlebot rule that allows the public site", () => {
    const r = byAgent("Googlebot")
    expect(r).toBeDefined()
    const allow = Array.isArray(r!.allow) ? r!.allow : [r!.allow]
    const disallow = Array.isArray(r!.disallow) ? r!.disallow : [r!.disallow ?? ""]
    expect(allow).toContain("/")
    expect(disallow).toEqual(expect.arrayContaining(["/api/", "/admin/"]))
    expect(disallow).not.toContain("/*.json$")
  })

  it("does not contain the ChatGPT-User contradiction (allow blog while disallow locale)", () => {
    const r = byAgent("ChatGPT-User")
    if (!r) return // it's allowed to drop the bot entirely
    const allow = Array.isArray(r.allow) ? r.allow : [r.allow]
    const disallow = Array.isArray(r.disallow) ? r.disallow : [r.disallow ?? ""]
    const conflicts = allow.filter(a =>
      disallow.some(d => a && d && a.startsWith(d))
    )
    expect(conflicts).toEqual([])
  })

  it("does not block JSON files generically", () => {
    const generic = byAgent("*")
    const disallow = Array.isArray(generic!.disallow)
      ? generic!.disallow
      : [generic!.disallow ?? ""]
    expect(disallow).not.toContain("/*.json$")
  })

  it("declares PerplexityBot and Applebot-Extended", () => {
    expect(byAgent("PerplexityBot")).toBeDefined()
    expect(byAgent("Applebot-Extended")).toBeDefined()
  })
})
