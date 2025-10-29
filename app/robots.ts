import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://evolve2digital.com"

  return {
    rules: [
      // Configuración general para todos los crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
          "/*.json$",
          "/api/admin/*",
          "/admin/login",
          "/admin/edit/*",
          "/admin/new",
        ],
      },
      // GPTBot - Acceso estratégico permitido
      {
        userAgent: "GPTBot",
        allow: [
          "/",
          "/es/",
          "/en/",
          "/es/blog/",
          "/en/blog/",
          "/es/docs/",
          "/en/docs/",
          "/sitemap.xml",
          "/rss.xml",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
          "/api/admin/*",
          "/api/chat/*",
          "/*.json$",
        ],
      },
      // Google Extended (Gemini) - Acceso completo a contenido público
      {
        userAgent: "Google-Extended",
        allow: [
          "/",
          "/es/",
          "/en/",
          "/es/blog/",
          "/en/blog/",
          "/es/docs/",
          "/en/docs/",
          "/sitemap.xml",
          "/rss.xml",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
          "/api/admin/*",
          "/api/chat/*",
        ],
      },
      // ClaudeBot - Acceso permitido a contenido público
      {
        userAgent: "ClaudeBot",
        allow: [
          "/",
          "/es/",
          "/en/",
          "/es/blog/",
          "/en/blog/",
          "/es/docs/",
          "/en/docs/",
          "/sitemap.xml",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
          "/api/admin/*",
          "/api/chat/*",
        ],
      },
      // ChatGPT-User - Acceso limitado (solo lectura de contenido)
      {
        userAgent: "ChatGPT-User",
        allow: [
          "/es/blog/",
          "/en/blog/",
          "/es/docs/",
          "/en/docs/",
          "/sitemap.xml",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
          "/api/admin/*",
          "/api/chat/*",
          "/es/",
          "/en/",
        ],
      },
      // Bingbot - Acceso estándar
      {
        userAgent: "Bingbot",
        allow: [
          "/",
          "/es/",
          "/en/",
          "/es/blog/",
          "/en/blog/",
          "/sitemap.xml",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
          "/api/admin/*",
          "/api/chat/*",
          "/es/docs/",
          "/en/docs/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
