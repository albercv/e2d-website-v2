import { allPosts } from "@/.contentlayer/generated"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  const posts = allPosts
    .filter((post) => post.locale === locale && post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)

  const siteUrl = "https://evolve2digital.com"
  const title = locale === "es" ? "E2D Blog - Automatización y Tecnología" : "E2D Blog - Automation and Technology"
  const description =
    locale === "es"
      ? "Artículos sobre automatización, chatbots, desarrollo web y tecnología para PYMEs"
      : "Articles about automation, chatbots, web development and technology for SMEs"

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <description>${description}</description>
    <link>${siteUrl}/${locale}/blog</link>
    <atom:link href="${siteUrl}/${locale}/rss.xml" rel="self" type="application/rss+xml" />
    <language>${locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description}]]></description>
      <link>${siteUrl}${post.url}</link>
      <guid isPermaLink="true">${siteUrl}${post.url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>hello@evolve2digital.com (${post.author})</author>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  })
}
