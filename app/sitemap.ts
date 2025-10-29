import { generateAISitemap } from "@/lib/sitemap-generator"
import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return generateAISitemap()
}
