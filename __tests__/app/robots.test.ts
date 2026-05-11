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

  it("does not block MCP/OAuth discovery for ClaudeBot, GPTBot, ChatGPT-User", () => {
    // Estos crawlers son los que respaldan los conectores MCP de Claude.ai
    // y ChatGPT. Bloquearles `/api/mcp`, `/sse` o los `.well-known/oauth-*`
    // rompe el re-discovery del manifest tras un reinicio del conector.
    const protectedPaths = [
      "/api/mcp",
      "/sse",
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-protected-resource",
    ]
    for (const ua of ["ClaudeBot", "GPTBot", "ChatGPT-User"]) {
      const r = byAgent(ua)
      expect(r).toBeDefined()
      const disallow = Array.isArray(r!.disallow) ? r!.disallow : [r!.disallow ?? ""]
      // Una entrada de disallow bloquea un path protegido si éste empieza por ella.
      for (const p of protectedPaths) {
        const blocking = disallow.filter(d => d && p.startsWith(d))
        expect({ ua, p, blocking }).toEqual({ ua, p, blocking: [] })
      }
    }
  })

  it("allows MCP/OAuth discovery paths for ClaudeBot, GPTBot and ChatGPT-User", () => {
    const expected = [
      "/api/mcp",
      "/sse",
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-protected-resource",
    ]
    for (const ua of ["ClaudeBot", "GPTBot", "ChatGPT-User"]) {
      const r = byAgent(ua)
      expect(r).toBeDefined()
      const allow = Array.isArray(r!.allow) ? r!.allow : [r!.allow]
      for (const p of expected) {
        expect(allow).toContain(p)
      }
    }
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

  it("includes /it/docs/ in allow for Bingbot and Google-Extended", () => {
    // /es/docs/ and /en/docs/ were present; /it/docs/ was missing — GSC showed
    // IT docs pages as crawl-starved (Discovered not indexed).
    for (const ua of ["Bingbot", "Google-Extended"]) {
      const r = byAgent(ua)
      expect(r).toBeDefined()
      const allow = Array.isArray(r!.allow) ? r!.allow : [r!.allow]
      expect(allow).toContain("/it/docs/")
    }
  })

  it("includes legal and privacy paths for all locales in Bingbot allow list", () => {
    const r = byAgent("Bingbot")
    expect(r).toBeDefined()
    const allow = Array.isArray(r!.allow) ? r!.allow : [r!.allow]
    for (const locale of ["es", "en", "it"]) {
      expect(allow).toContain(`/${locale}/legal/`)
      expect(allow).toContain(`/${locale}/privacy/`)
    }
  })
})
