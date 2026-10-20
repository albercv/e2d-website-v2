/**
 * @jest-environment node
 */
import robotsParser from "robots-parser"
import { resolveRobots } from "next/dist/build/webpack/loaders/metadata/resolve-route-data"
import robots from "../../app/robots"

// Evaluamos el robots.txt tal y como lo sirve Next (mismo serializador que usa
// el build), no el objeto intermedio: así se detectan también errores de orden
// o de formato en la salida final.
const SITE = "https://evolve2digital.com"
const parsed = robotsParser(`${SITE}/robots.txt`, resolveRobots(robots()))

const AGENTS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "Google-Extended",
  "ClaudeBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Applebot-Extended",
  "SomeUnknownBot",
]

const PUBLIC_ASSETS = [
  `${SITE}/_next/static/chunks/app/page-0123abcd.js`,
  `${SITE}/_next/static/css/0123abcd.css`,
  `${SITE}/_next/image?url=%2Fe2d_logo.webp&w=256&q=75`,
  `${SITE}/es`,
]

const PRIVATE_PATHS = [
  `${SITE}/_next/data/build-id/es.json`,
  `${SITE}/admin/`,
  `${SITE}/api/admin/rebuild`,
  `${SITE}/private/x`,
]

const CHAT_API_AGENTS = ["Googlebot", "Bingbot", "SomeUnknownBot"]

const toArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

const rulesOf = () => {
  const { rules } = robots()
  return Array.isArray(rules) ? rules : [rules]
}

describe("robots.txt as served (effective rules)", () => {
  it("every group that disallows /_next/ also allows /_next/static/ and /_next/image", () => {
    const groupsMissingAssets = rulesOf()
      .filter(rule => toArray(rule.disallow).includes("/_next/"))
      .filter(rule => {
        const allow = toArray(rule.allow)
        return !allow.includes("/_next/static/") || !allow.includes("/_next/image")
      })
      .map(rule => toArray(rule.userAgent).join(","))
    expect(groupsMissingAssets).toEqual([])
  })

  it.each(AGENTS)("allows public Next.js assets for %s", ua => {
    for (const url of PUBLIC_ASSETS) {
      expect({ ua, url, allowed: parsed.isAllowed(url, ua) }).toEqual({
        ua,
        url,
        allowed: true,
      })
    }
  })

  it.each(AGENTS)("keeps private paths blocked for %s", ua => {
    for (const url of PRIVATE_PATHS) {
      expect({ ua, url, allowed: parsed.isAllowed(url, ua) }).toEqual({
        ua,
        url,
        allowed: false,
      })
    }
  })

  it.each(CHAT_API_AGENTS)("keeps /api/chat/ blocked for %s", ua => {
    const url = `${SITE}/api/chat/x`
    expect({ ua, url, allowed: parsed.isAllowed(url, ua) }).toEqual({
      ua,
      url,
      allowed: false,
    })
  })

  it("keeps MCP discovery and training preferences unchanged", () => {
    const mcpPaths = [`${SITE}/api/mcp`, `${SITE}/.well-known/oauth-authorization-server`]
    for (const ua of ["GPTBot", "ClaudeBot", "ChatGPT-User"]) {
      for (const url of mcpPaths) {
        expect({ ua, url, allowed: parsed.isAllowed(url, ua) }).toEqual({
          ua,
          url,
          allowed: true,
        })
      }
    }
    for (const ua of ["GPTBot", "Google-Extended"]) {
      const url = `${SITE}/es/blog/`
      expect({ ua, url, allowed: parsed.isAllowed(url, ua) }).toEqual({
        ua,
        url,
        allowed: true,
      })
    }
  })
})
