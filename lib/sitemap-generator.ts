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
        ? this.generateAlternateLanguages("/", locale)
        : undefined

      pages.push({
        url,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 1.0,
        alternateLanguages: alternateUrls,
        aiMetadata: {
          contentType: "homepage",
          importance: "critical",
          crawlPriority: 10,
          lastContentUpdate: new Date(),
          semanticTags: ["automation", "web-development", "ai", "sme", "spain"],
        },
      })

      // Blog index pages
      pages.push({
        url: `${this.config.baseUrl}/${locale}/blog`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
        alternateLanguages: this.generateAlternateLanguages("/blog", locale),
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
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
        alternateLanguages: this.generateAlternateLanguages("/docs", locale),
        aiMetadata: {
          contentType: "documentation",
          importance: "high",
          crawlPriority: 8,
          lastContentUpdate: new Date(),
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
    return posts
      .filter(post => post.published)
      .map(post => {
        const alternateUrls = this.config.includeAlternateLanguages
          ? this.generateAlternateLanguages(`/blog/${post.slug}`, post.locale)
          : undefined

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
    const docSlugs = [
      "principles",
      "architecture",
      "security",
      "performance",
      "deployment",
      "gdpr",
    ]

    const pages: SitemapEntry[] = []

    this.config.supportedLocales.forEach(locale => {
      docSlugs.forEach(slug => {
        pages.push({
          url: `${this.config.baseUrl}/${locale}/docs/${slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
          alternateLanguages: this.generateAlternateLanguages(`/docs/${slug}`, locale),
          aiMetadata: {
            contentType: "documentation",
            importance: "medium",
            crawlPriority: 6,
            lastContentUpdate: new Date(),
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
          lastModified: new Date(),
          changeFrequency: "yearly",
          priority: 0.3,
          alternateLanguages: this.generateAlternateLanguages(`/${page}`, locale),
          aiMetadata: {
            contentType: "legal",
            importance: "low",
            crawlPriority: 3,
            lastContentUpdate: new Date(),
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
  private generateAlternateLanguages(path: string, currentLocale: string): { [key: string]: string } {
    const alternates: { [key: string]: string } = {}

    this.config.supportedLocales.forEach(locale => {
      if (locale !== currentLocale) {
        alternates[locale] = `${this.config.baseUrl}/${locale}${path}`
      }
    })

    return alternates
  }

  /**
   * Get the latest blog post date from a runtime post snapshot.
   */
  private getLatestPostDate(posts: RuntimePost[]): Date {
    const publishedPosts = posts.filter(post => post.published)
    if (publishedPosts.length === 0) return new Date()

    const latestPost = publishedPosts.reduce((latest, current) => {
      return new Date(current.date) > new Date(latest.date) ? current : latest
    })

    return new Date(latestPost.date)
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
