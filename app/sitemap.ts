export const runtime = 'nodejs'
// Force per-request evaluation. Without this, Next.js statically optimizes the
// sitemap at build time (x-nextjs-cache: HIT) and posts created later via the
// blog MCP never appear until the next rebuild. force-dynamic makes the route
// re-read posts from disk on every request, so new translations/posts show up
// immediately. The body is cheap (one disk listing), safe to run per request.
export const dynamic = 'force-dynamic'
import { generateAISitemap } from "@/lib/sitemap-generator"
import type { MetadataRoute } from "next"

// Async because the underlying generator now reads posts from disk at request
// time (no contentlayer build step). Next.js 14 supports async sitemap()
// natively.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return generateAISitemap()
}
