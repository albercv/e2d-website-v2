import type { MetadataRoute } from "next"

const BASE_URL = "https://evolve2digital.com"

const COMMON_DISALLOW = [
  "/api/",
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
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "Google-Extended",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "ClaudeBot",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
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
