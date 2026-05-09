import type { MetadataRoute } from "next"

const BASE_URL = "https://evolve2digital.com"

const COMMON_DISALLOW = [
  "/api/",
  "/admin/",
  "/_next/",
  "/private/",
]

// Variante para conectores MCP (ClaudeBot, GPTBot, ChatGPT-User): no usamos el
// blanket `/api/` porque eso bloquearía `/api/mcp` (transporte MCP) y rompería
// el re-discovery tras un reinicio del conector. En su lugar listamos
// explícitamente los subpaths que sí queremos cerrar a estos crawlers.
const MCP_BOT_DISALLOW = [
  "/api/admin",
  "/api/cron",
  "/api/chat/",
  "/admin/",
  "/_next/",
  "/private/",
]

const PUBLIC_ALLOW = [
  "/",
  "/es/",
  "/en/",
  "/it/",
  "/es/blog/",
  "/en/blog/",
  "/it/blog/",
  "/es/docs/",
  "/en/docs/",
  "/sitemap.xml",
  "/rss.xml",
  "/llms.txt",
  "/llms-full.txt",
]

// Endpoints que los conectores MCP/OAuth necesitan poder descubrir aunque
// `/api/` esté en COMMON_DISALLOW. Sin estos allow explícitos, ChatGPT/Claude
// crawlers que respetan robots no podrán re-resolver el manifest tras un
// reinicio del conector.
const MCP_DISCOVERY_ALLOW = [
  "/api/mcp",
  "/sse",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...COMMON_DISALLOW, "/admin/login", "/admin/edit/*", "/admin/new"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [...COMMON_DISALLOW],
      },
      {
        userAgent: "Bingbot",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "GPTBot",
        allow: [...PUBLIC_ALLOW, ...MCP_DISCOVERY_ALLOW],
        disallow: MCP_BOT_DISALLOW,
      },
      {
        userAgent: "Google-Extended",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "ClaudeBot",
        allow: [...PUBLIC_ALLOW, ...MCP_DISCOVERY_ALLOW],
        disallow: MCP_BOT_DISALLOW,
      },
      {
        userAgent: "ChatGPT-User",
        allow: [...PUBLIC_ALLOW, ...MCP_DISCOVERY_ALLOW],
        disallow: MCP_BOT_DISALLOW,
      },
      {
        userAgent: "PerplexityBot",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
