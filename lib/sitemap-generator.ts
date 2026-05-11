/**
 * Advanced Sitemap Generator for AI Crawlers
 * Optimized for GPTBot, Google-Extended, ClaudeBot, ChatGPT-User, and Bingbot
 *
 * Features:
 * - Dynamic route discovery
 * - AI-optimized metadata
 * - Multi-language support
 * - Content freshness tracking
 * - Semantic categorization
 *
 * Migrated from contentlayer (build-time `allPosts`) to the runtime reader
 * `listPostsFromDisk()`. The sitemap is now produced async at request time, so
 * any new/edited post under `content/posts/` is reflected without a rebuild.
 */

import { listPostsFromDisk, type RuntimePost } from "./blog/posts-runtime"
import type { MetadataRoute } from "next"

export interface SitemapEntry {
  url: string
  lastModified: Date
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority: number
  alternateLanguages?: { [key: string]: string }
  aiMetadata?: {
    contentType: "homepage" | "blog" | "documentation" | "service" | "legal"
    importance: "critical" | "high" | "medium" | "low"
    crawlPriority: number
    lastContentUpdate?: Date
    wordCount?: number
    semanticTags?: string[]
  }
}

export interface SitemapConfig {
  baseUrl: string
  supportedLocales: string[]
  excludePatterns: string[]
  includeAlternateLanguages: boolean
  aiOptimization: boolean
}

export class SitemapGenerator {
  private config: SitemapConfig
  private lastGenerated: Date

  constructor(config: Partial<SitemapConfig> = {}) {
    this.config = {
      baseUrl: "https://evolve2digital.com",
      supportedLocales: ["es", "en", "it"],
      excludePatterns: ["/api/", "/admin/", "/_next/", "/private/", "*.json"],
      includeAlternateLanguages: true,
      aiOptimization: true,
      ...config,
    }
    this.lastGenerated = new Date()
  }

  /**
   * Generate complete sitemap with AI optimization.
   *
   * Async because the post inventory is read at request time from disk via
   * `listPostsFromDisk()` (no contentlayer build step).
   */
  public async generateSitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await listPostsFromDisk()

    const entries: SitemapEntry[] = []

    // Add static pages — depend on the post list to compute the freshest blog
    // index `lastContentUpdate`, so pass the snapshot through.
    entries.push(...this.generateStaticPages(posts))

    // Add blog posts
    entries.push(...this.generateBlogPosts(posts))

    // Add documentation pages
    entries.push(...this.generateDocumentationPages())

    // Add legal pages
    entries.push(...this.generateLegalPages())

    // Sort by priority and last modified
    const sortedEntries = entries.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return b.lastModified.getTime() - a.lastModified.getTime()
    })

    // Convert to Next.js sitemap format
    return sortedEntries.map(entry => ({
      url: entry.url,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: entry.alternateLanguages
        ? { languages: entry.alternateLanguages }
        : undefined,
    }))
  }

  /**
   * Generate static homepage and main sections
   */
  private generateStaticPages(posts: RuntimePost[]): SitemapEntry[] {
    const pages: SitemapEntry[] = []

    // Homepage for each locale
    this.config.supportedLocales.forEach(locale => {
      const url = `${this.config.baseUrl}/${locale}`
      const alternateUrls = this.config.includeAlternateLanguages
        ? this.generateAlternateLanguages("")
        : undefined

      pages.push({
        url,
        lastModified: this.getLatestPostDate(posts),
        changeFrequency: "weekly",
        priority: 1.0,
        alternateLanguages: alternateUrls,
        aiMetadata: {
          contentType: "homepage",
          importance: "critical",
          crawlPriority: 10,
          lastContentUpdate: this.getLatestPostDate(posts),
          semanticTags: ["automation", "web-development", "ai", "sme", "spain"],
        },
      })

      // Blog index pages
      pages.push({
        url: `${this.config.baseUrl}/${locale}/blog`,
        lastModified: this.getLatestPostDate(posts),
        changeFrequency: "daily",
        priority: 0.9,
        alternateLanguages: this.generateAlternateLanguages("/blog"),
        aiMetadata: {
          contentType: "blog",
          importance: "high",
          crawlPriority: 9,
          lastContentUpdate: this.getLatestPostDate(posts),
          semanticTags: ["blog", "articles", "automation", "technology"],
        },
      })

      // Documentation index pages
      pages.push({
        url: `${this.config.baseUrl}/${locale}/docs`,
        lastModified: this.getStableDate(),
        changeFrequency: "weekly",
        priority: 0.8,
        alternateLanguages: this.generateAlternateLanguages("/docs"),
        aiMetadata: {
          contentType: "documentation",
          importance: "high",
          crawlPriority: 8,
          lastContentUpdate: this.getStableDate(),
          semanticTags: ["documentation", "guides", "technical", "implementation"],
        },
      })
    })

    return pages
  }

  /**
   * Generate blog post entries with AI metadata.
   *
   * Operates on the runtime post snapshot (no contentlayer). The shape from
   * `listPostsFromDisk()` exposes slug, locale, date, published, url,
   * wordCount and tags — every field this method needs.
   */
  private generateBlogPosts(posts: RuntimePost[]): SitemapEntry[] {
    const published = posts.filter(post => post.published)

    // Build sibling map once: translationKey → all published posts with that key
    const siblingMap = new Map<string, RuntimePost[]>()
    for (const post of published) {
      const group = siblingMap.get(post.translationKey) ?? []
      group.push(post)
      siblingMap.set(post.translationKey, group)
    }

    return published.map(post => {
      let alternateUrls: Record<string, string> | undefined

      if (this.config.includeAlternateLanguages) {
        const siblings = siblingMap.get(post.translationKey) ?? [post]
        const langs: Record<string, string> = {}

        for (const sibling of siblings) {
          langs[sibling.locale] = `${this.config.baseUrl}${sibling.url}`
        }

        // x-default: ES sibling preferred; fall back to first locale alphabetically
        const esSibling = siblings.find(s => s.locale === "es")
        const sorted = [...siblings].sort((a, b) => a.locale.localeCompare(b.locale))
        langs["x-default"] = esSibling
          ? `${this.config.baseUrl}${esSibling.url}`
          : `${this.config.baseUrl}${sorted[0].url}`

        alternateUrls = langs
      }

      return {
        url: `${this.config.baseUrl}${post.url}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternateLanguages: alternateUrls,
        aiMetadata: {
          contentType: "blog" as const,
          importance: "medium" as const,
          crawlPriority: 7,
          lastContentUpdate: new Date(post.date),
          wordCount: post.wordCount,
          semanticTags: [
            ...(post.tags || []),
            "automation",
            "technology",
            post.locale === "es" ? "español" : "english",
          ],
        },
      }
    })
  }

  /**
   * Generate documentation pages
   */
  private generateDocumentationPages(): SitemapEntry[] {
    // Must match validSlugs in app/[locale]/docs/[slug]/page.tsx exactly.
    // "security" was never a valid slug — remove it. Add components, i18n, seo.
    const docSlugs = [
      "principles",
      "architecture",
      "components",
      "i18n",
      "seo",
      "gdpr",
      "performance",
      "deployment",
    ]

    const pages: SitemapEntry[] = []

    this.config.supportedLocales.forEach(locale => {
      docSlugs.forEach(slug => {
        pages.push({
          url: `${this.config.baseUrl}/${locale}/docs/${slug}`,
          lastModified: this.getStableDate(),
          changeFrequency: "monthly",
          priority: 0.6,
          alternateLanguages: this.generateAlternateLanguages(`/docs/${slug}`),
          aiMetadata: {
            contentType: "documentation",
            importance: "medium",
            crawlPriority: 6,
            lastContentUpdate: this.getStableDate(),
            semanticTags: ["documentation", slug, "technical", "guide"],
          },
        })
      })
    })

    return pages
  }

  /**
   * Generate legal pages
   */
  private generateLegalPages(): SitemapEntry[] {
    const legalPages = ["legal", "privacy"]
    const pages: SitemapEntry[] = []

    this.config.supportedLocales.forEach(locale => {
      legalPages.forEach(page => {
        pages.push({
          url: `${this.config.baseUrl}/${locale}/${page}`,
          lastModified: this.getStableDate(),
          changeFrequency: "yearly",
          priority: 0.3,
          alternateLanguages: this.generateAlternateLanguages(`/${page}`),
          aiMetadata: {
            contentType: "legal",
            importance: "low",
            crawlPriority: 3,
            lastContentUpdate: this.getStableDate(),
            semanticTags: ["legal", page, "gdpr", "compliance"],
          },
        })
      })
    })

    return pages
  }

  /**
   * Generate alternate language URLs
   */
  private generateAlternateLanguages(path: string): { [key: string]: string } {
    const alternates: { [key: string]: string } = {}

    this.config.supportedLocales.forEach(locale => {
      alternates[locale] = `${this.config.baseUrl}/${locale}${path}`
    })

    // x-default points to Spanish, the primary locale for E2D.
    alternates["x-default"] = `${this.config.baseUrl}/es${path}`

    return alternates
  }

  /**
   * Get the latest blog post date from a runtime post snapshot.
   */
  private getLatestPostDate(posts: RuntimePost[]): Date {
    const publishedPosts = posts.filter(post => post.published)
    if (publishedPosts.length === 0) return this.getStableDate()

    const latestPost = publishedPosts.reduce((latest, current) => {
      return new Date(current.date) > new Date(latest.date) ? current : latest
    })

    return new Date(latestPost.date)
  }

  // Returns a stable build-time date so sitemap lastModified doesn't change on
  // every request. Reads BUILD_TIME env var (set at build time in next.config.mjs)
  // or falls back to a fixed date that pre-dates the first deploy.
  private getStableDate(): Date {
    const buildTime = process.env.BUILD_TIME
    if (buildTime) {
      const d = new Date(buildTime)
      if (!isNaN(d.getTime())) return d
    }
    return new Date("2026-05-01")
  }

  /**
   * Generate XML sitemap for external validation.
   *
   * Async because it consumes the runtime sitemap. Kept for consumers that
   * still want the raw XML string (e.g. ad-hoc cron). Production sitemap is
   * served by the dynamic Next.js route in `app/sitemap.ts`.
   */
  public async generateXMLSitemap(): Promise<string> {
    const entries = await this.generateSitemap()

    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`

    const xmlEntries = entries.map(entry => {
      const lastModified = entry.lastModified instanceof Date
        ? entry.lastModified.toISOString().split('T')[0]
        : new Date(entry.lastModified || new Date()).toISOString().split('T')[0]

      return `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority || 0.5}</priority>
  </url>`
    }).join('\n')

    const xmlFooter = `</urlset>`

    return `${xmlHeader}\n${xmlEntries}\n${xmlFooter}`
  }

  /**
   * Get sitemap statistics for monitoring.
   */
  public async getSitemapStats() {
    const entries = await this.generateSitemap()

    const stats = {
      totalUrls: entries.length,
      lastGenerated: this.lastGenerated,
      urlsByPriority: {
        critical: entries.filter(e => (e.priority || 0) >= 0.9).length,
        high: entries.filter(e => (e.priority || 0) >= 0.7 && (e.priority || 0) < 0.9).length,
        medium: entries.filter(e => (e.priority || 0) >= 0.5 && (e.priority || 0) < 0.7).length,
        low: entries.filter(e => (e.priority || 0) < 0.5).length,
      },
      urlsByChangeFreq: {
        daily: entries.filter(e => e.changeFrequency === "daily").length,
        weekly: entries.filter(e => e.changeFrequency === "weekly").length,
        monthly: entries.filter(e => e.changeFrequency === "monthly").length,
        yearly: entries.filter(e => e.changeFrequency === "yearly").length,
      },
      locales: this.config.supportedLocales,
      baseUrl: this.config.baseUrl,
    }

    return stats
  }
}

// Default instance for easy usage
export const defaultSitemapGenerator = new SitemapGenerator()

// Export utility functions
export function generateAISitemap(): Promise<MetadataRoute.Sitemap> {
  return defaultSitemapGenerator.generateSitemap()
}

export function getSitemapStats() {
  return defaultSitemapGenerator.getSitemapStats()
}
