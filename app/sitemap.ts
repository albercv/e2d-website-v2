export const runtime = 'nodejs'
import { generateAISitemap } from "@/lib/sitemap-generator"
import type { MetadataRoute } from "next"

// Async because the underlying generator now reads posts from disk at request
// time (no contentlayer build step). Next.js 14 supports async sitemap()
// natively.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return generateAISitemap()
}
