/**
 * Dynamic RSS feed for the blog.
 *
 * Replaces the build-time public/rss-{es,en,it}.xml files. Reads posts from
 * disk via `listPostsFromDisk()` so any new/edited post under content/posts/
 * appears in the feed at the next request — no rebuild required.
 *
 * Channel/item shape mirrors lib/rss-generator.ts (which still exists for
 * any ad-hoc consumers) but the source of truth is now the runtime reader.
 */

import { listPostsFromDisk, type RuntimePost } from "@/lib/blog/posts-runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_URL = "https://evolve2digital.com"
const MAX_ITEMS = 20
const SUPPORTED_LOCALES = ["es", "en", "it"] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

function channelTitle(locale: SupportedLocale): string {
  if (locale === "es") return "E2D Blog - Automatización y Tecnología"
  if (locale === "it") return "Blog E2D - Automazione e Tecnologia"
  return "E2D Blog - Automation and Technology"
}

function channelDescription(locale: SupportedLocale): string {
  if (locale === "es") {
    return "Artículos sobre automatización, chatbots, desarrollo web y tecnología para PYMEs españolas. Guías prácticas, casos de uso y tendencias en IA."
  }
  if (locale === "it") {
    return "Articoli su automazione, chatbot, sviluppo web e tecnologia per le PMI italiane. Guide pratiche, casi d'uso e tendenze IA."
  }
  return "Articles about automation, chatbots, web development and technology for Spanish SMEs. Practical guides, use cases and AI trends."
}

function channelLanguage(locale: SupportedLocale): string {
  if (locale === "es") return "es-ES"
  if (locale === "it") return "it-IT"
  return "en-US"
}

function channelCategories(locale: SupportedLocale): string[] {
  if (locale === "es") {
    return ["Automatización", "Tecnología", "IA", "Desarrollo Web", "PYMEs", "Chatbots", "WhatsApp", "n8n"]
  }
  if (locale === "it") {
    return ["Automazione", "Tecnologia", "IA", "Sviluppo Web", "PMI", "Chatbot", "WhatsApp", "n8n"]
  }
  return ["Automation", "Technology", "AI", "Web Development", "SME", "Chatbots", "WhatsApp", "n8n"]
}

function selectPosts(all: RuntimePost[], locale: SupportedLocale): RuntimePost[] {
  return all
    .filter((p) => p.locale === locale && p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_ITEMS)
}

function renderItem(post: RuntimePost, locale: SupportedLocale): string {
  const link = `${BASE_URL}${post.url}`
  const author = `hello@evolve2digital.com (${post.author || "Alberto Carrasco"})`
  const description = post.description || ""
  const localeCategory = locale === "es"
    ? ["Automatización", "Tecnología"]
    : locale === "it"
      ? ["Automazione", "Tecnologia"]
      : ["Automation", "Technology"]
  const categories = [...(post.tags || []), ...localeCategory]
  const categoriesXml = categories
    .map((cat) => `      <category><![CDATA[${cat}]]></category>`)
    .join("\n")

  return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${description}]]></description>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>${author}</author>
${categoriesXml}
    </item>`
}

function buildXml(locale: SupportedLocale, posts: RuntimePost[]): string {
  const channelLink = `${BASE_URL}/${locale}/blog`
  const atomLink = `${BASE_URL}/feed/${locale}`
  const lastBuildDate = new Date().toUTCString()
  const categoriesXml = channelCategories(locale)
    .map((cat) => `    <category><![CDATA[${cat}]]></category>`)
    .join("\n")
  const itemsXml = posts.map((p) => renderItem(p, locale)).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title><![CDATA[${channelTitle(locale)}]]></title>
    <description><![CDATA[${channelDescription(locale)}]]></description>
    <link>${channelLink}</link>
    <atom:link href="${atomLink}" rel="self" type="application/rss+xml" />
    <language>${channelLanguage(locale)}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <managingEditor>hello@evolve2digital.com (Alberto Carrasco)</managingEditor>
    <webMaster>hello@evolve2digital.com (Alberto Carrasco)</webMaster>
    <generator>E2D RSS Generator (runtime)</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
${categoriesXml}
${itemsXml}
  </channel>
</rss>`
}

export async function GET(
  _req: Request,
  context: { params: { locale: string } },
): Promise<Response> {
  const { locale } = context.params
  if (!isSupportedLocale(locale)) {
    return new Response("Not Found", { status: 404 })
  }

  const all = await listPostsFromDisk()
  const posts = selectPosts(all, locale)
  const xml = buildXml(locale, posts)

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  })
}
