/**
 * Advanced RSS Feed Generator for AI Crawlers
 * Optimized for GPTBot, Google-Extended, ClaudeBot, ChatGPT-User, and Bingbot
 * 
 * Features:
 * - Multi-language RSS feeds
 * - AI-optimized metadata
 * - Content categorization
 * - Semantic enrichment
 * - Automatic content discovery
 */

import { allPosts } from '../.contentlayer/generated/index.mjs';
import fs from "fs"
import path from "path"

export interface RSSItem {
  title: string
  description: string
  link: string
  guid: string
  pubDate: string
  author: string
  category?: string[]
  enclosure?: {
    url: string
    type: string
    length: number
  }
  aiMetadata?: {
    contentType: "article" | "guide" | "tutorial" | "news"
    readingTime: number
    wordCount: number
    difficulty: "beginner" | "intermediate" | "advanced"
    topics: string[]
    lastUpdated: string
  }
}

export interface RSSChannel {
  title: string
  description: string
  link: string
  language: string
  lastBuildDate: string
  managingEditor: string
  webMaster: string
  category: string[]
  generator: string
  docs: string
  ttl: number
  image?: {
    url: string
    title: string
    link: string
    width: number
    height: number
  }
}

export interface RSSConfig {
  baseUrl: string
  supportedLocales: string[]
  maxItems: number
  includeFullContent: boolean
  aiOptimization: boolean
  includeImages: boolean
  cacheTTL: number
}

export class RSSGenerator {
  private config: RSSConfig

  constructor(config: Partial<RSSConfig> = {}) {
    this.config = {
      baseUrl: "https://evolve2digital.com",
      supportedLocales: ["es", "en"],
      maxItems: 20,
      includeFullContent: false,
      aiOptimization: true,
      includeImages: true,
      cacheTTL: 3600, // 1 hour
      ...config,
    }
  }

  /**
   * Generate RSS feed for a specific locale
   */
  public generateRSSFeed(locale: string): string {
    const channel = this.generateChannelInfo(locale)
    const items = this.generateRSSItems(locale)

    return this.buildRSSXML(channel, items)
  }

  /**
   * Generate channel information
   */
  private generateChannelInfo(locale: string): RSSChannel {
    const isSpanish = locale === "es"
    
    return {
      title: isSpanish 
        ? "E2D Blog - Automatización y Tecnología" 
        : "E2D Blog - Automation and Technology",
      description: isSpanish
        ? "Artículos sobre automatización, chatbots, desarrollo web y tecnología para PYMEs españolas. Guías prácticas, casos de uso y tendencias en IA."
        : "Articles about automation, chatbots, web development and technology for Spanish SMEs. Practical guides, use cases and AI trends.",
      link: `${this.config.baseUrl}/${locale}/blog`,
      language: locale === "es" ? "es-ES" : "en-US",
      lastBuildDate: new Date().toUTCString(),
      managingEditor: "hello@evolve2digital.com (Alberto Carrasco)",
      webMaster: "hello@evolve2digital.com (Alberto Carrasco)",
      category: isSpanish 
        ? ["Automatización", "Tecnología", "IA", "Desarrollo Web", "PYMEs", "Chatbots", "WhatsApp", "n8n"]
        : ["Automation", "Technology", "AI", "Web Development", "SME", "Chatbots", "WhatsApp", "n8n"],
      generator: "E2D RSS Generator v2.0 - AI Optimized",
      docs: "https://www.rssboard.org/rss-specification",
      ttl: this.config.cacheTTL / 60, // Convert to minutes
      image: {
        url: `${this.config.baseUrl}/e2d_logo.webp`,
        title: "E2D - Evolve2Digital",
        link: `${this.config.baseUrl}/${locale}`,
        width: 144,
        height: 144,
      },
    }
  }

  /**
   * Generate RSS items from blog posts
   */
  private generateRSSItems(locale: string): RSSItem[] {
    const posts = allPosts
      .filter(post => post.locale === locale && post.published)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, this.config.maxItems)

    return posts.map(post => {
      const categories = [
        ...(post.tags || []),
        locale === "es" ? "Automatización" : "Automation",
        locale === "es" ? "Tecnología" : "Technology",
      ]

      const item: RSSItem = {
        title: post.title,
        description: post.description,
        link: `${this.config.baseUrl}${post.url}`,
        guid: `${this.config.baseUrl}${post.url}`,
        pubDate: new Date(post.date).toUTCString(),
        author: `hello@evolve2digital.com (${post.author})`,
        category: categories,
      }

      // Add AI metadata if optimization is enabled
      if (this.config.aiOptimization) {
        item.aiMetadata = {
          contentType: this.categorizeContent(post.title, post.description, post.tags),
          readingTime: post.readingTime?.minutes || 5,
          wordCount: post.wordCount || 0,
          difficulty: this.assessDifficulty(post.title, post.description, post.tags),
          topics: this.extractTopics(post.title, post.description, post.tags),
          lastUpdated: new Date(post.date).toISOString(),
        }
      }

      // Add cover image as enclosure if available
      if (this.config.includeImages && post.cover) {
        item.enclosure = {
          url: post.cover.startsWith('http') ? post.cover : `${this.config.baseUrl}${post.cover}`,
          type: "image/webp",
          length: 0, // We don't have file size info
        }
      }

      return item
    })
  }

  /**
   * Categorize content type based on title and description
   */
  private categorizeContent(title: string, description: string, tags?: string[]): "article" | "guide" | "tutorial" | "news" {
    const content = `${title} ${description} ${tags?.join(' ') || ''}`.toLowerCase()
    
    if (content.includes('tutorial') || content.includes('paso a paso') || content.includes('step by step')) {
      return "tutorial"
    }
    if (content.includes('guía') || content.includes('guide') || content.includes('cómo') || content.includes('how to')) {
      return "guide"
    }
    if (content.includes('noticia') || content.includes('news') || content.includes('actualidad')) {
      return "news"
    }
    
    return "article"
  }

  /**
   * Assess content difficulty
   */
  private assessDifficulty(title: string, description: string, tags?: string[]): "beginner" | "intermediate" | "advanced" {
    const content = `${title} ${description} ${tags?.join(' ') || ''}`.toLowerCase()
    
    const advancedKeywords = ['api', 'webhook', 'integration', 'advanced', 'avanzado', 'complejo', 'enterprise']
    const beginnerKeywords = ['introducción', 'introduction', 'básico', 'basic', 'principiante', 'beginner', 'empezar']
    
    if (advancedKeywords.some(keyword => content.includes(keyword))) {
      return "advanced"
    }
    if (beginnerKeywords.some(keyword => content.includes(keyword))) {
      return "beginner"
    }
    
    return "intermediate"
  }

  /**
   * Extract semantic topics from content
   */
  private extractTopics(title: string, description: string, tags?: string[]): string[] {
    const topics = new Set<string>()
    
    // Add tags as topics
    if (tags) {
      tags.forEach(tag => topics.add(tag))
    }
    
    // Extract topics from title and description
    const content = `${title} ${description}`.toLowerCase()
    const topicKeywords = {
      'automation': ['automatización', 'automation', 'automate'],
      'ai': ['ia', 'ai', 'artificial intelligence', 'inteligencia artificial'],
      'chatbot': ['chatbot', 'bot', 'whatsapp'],
      'web-development': ['desarrollo web', 'web development', 'react', 'next.js'],
      'sme': ['pyme', 'sme', 'small business', 'pequeña empresa'],
      'crm': ['crm', 'customer relationship'],
      'erp': ['erp', 'enterprise resource'],
      'n8n': ['n8n', 'workflow'],
      'voice': ['voz', 'voice', 'voicebot'],
      'integration': ['integración', 'integration', 'api'],
    }
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        topics.add(topic)
      }
    })
    
    return Array.from(topics)
  }

  /**
   * Build complete RSS XML
   */
  private buildRSSXML(channel: RSSChannel, items: RSSItem[]): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`
    
    const rssOpen = `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">`
    
    const channelXML = `  <channel>
    <title><![CDATA[${channel.title}]]></title>
    <description><![CDATA[${channel.description}]]></description>
    <link>${channel.link}</link>
    <atom:link href="${channel.link.replace('/blog', '/rss.xml')}" rel="self" type="application/rss+xml" />
    <language>${channel.language}</language>
    <lastBuildDate>${channel.lastBuildDate}</lastBuildDate>
    <managingEditor>${channel.managingEditor}</managingEditor>
    <webMaster>${channel.webMaster}</webMaster>
    <generator>${channel.generator}</generator>
    <docs>${channel.docs}</docs>
    <ttl>${channel.ttl}</ttl>
    ${channel.category.map(cat => `<category><![CDATA[${cat}]]></category>`).join('\n    ')}
    ${channel.image ? `<image>
      <url>${channel.image.url}</url>
      <title><![CDATA[${channel.image.title}]]></title>
      <link>${channel.image.link}</link>
      <width>${channel.image.width}</width>
      <height>${channel.image.height}</height>
    </image>` : ''}`

    const itemsXML = items.map(item => {
      let itemXML = `    <item>
      <title><![CDATA[${item.title}]]></title>
      <description><![CDATA[${item.description}]]></description>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <author>${item.author}</author>`

      // Add categories
      if (item.category) {
        itemXML += '\n' + item.category.map(cat => `      <category><![CDATA[${cat}]]></category>`).join('\n')
      }

      // Add enclosure (image)
      if (item.enclosure) {
        itemXML += `\n      <enclosure url="${item.enclosure.url}" type="${item.enclosure.type}" length="${item.enclosure.length}" />`
      }

      // Add AI metadata as custom elements
      if (item.aiMetadata && this.config.aiOptimization) {
        itemXML += `\n      <dc:type>${item.aiMetadata.contentType}</dc:type>`
        itemXML += `\n      <dc:readingTime>${item.aiMetadata.readingTime}</dc:readingTime>`
        itemXML += `\n      <dc:wordCount>${item.aiMetadata.wordCount}</dc:wordCount>`
        itemXML += `\n      <dc:difficulty>${item.aiMetadata.difficulty}</dc:difficulty>`
        itemXML += `\n      <dc:topics>${item.aiMetadata.topics.join(',')}</dc:topics>`
        itemXML += `\n      <dc:lastUpdated>${item.aiMetadata.lastUpdated}</dc:lastUpdated>`
      }

      itemXML += '\n    </item>'
      return itemXML
    }).join('\n')

    const channelClose = `  </channel>`
    const rssClose = `</rss>`

    return [
      xmlHeader,
      rssOpen,
      channelXML,
      itemsXML,
      channelClose,
      rssClose
    ].join('\n')
  }

  /**
   * Save RSS feed to file
   */
  public async saveRSSFeed(locale: string, filePath?: string): Promise<void> {
    const rssContent = this.generateRSSFeed(locale)
    const defaultPath = `./public/rss-${locale}.xml`
    const targetPath = filePath || defaultPath
    
    // Ensure directory exists
    const dir = path.dirname(targetPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(targetPath, rssContent, 'utf-8')
    console.log(`✅ RSS feed (${locale}) saved to: ${targetPath}`)
  }

  /**
   * Save all RSS feeds
   */
  public async saveAllRSSFeeds(): Promise<void> {
    for (const locale of this.config.supportedLocales) {
      await this.saveRSSFeed(locale)
    }
  }

  /**
   * Get RSS feed statistics
   */
  public getRSSStats(locale: string) {
    const posts = allPosts
      .filter(post => post.locale === locale && post.published)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const recentPosts = posts.slice(0, this.config.maxItems)
    
    return {
      locale,
      totalPosts: posts.length,
      feedItems: recentPosts.length,
      lastUpdated: posts.length > 0 ? new Date(posts[0].date) : new Date(),
      categories: [...new Set(recentPosts.flatMap(post => post.tags || []))],
      averageReadingTime: recentPosts.reduce((acc, post) => acc + (post.readingTime?.minutes || 5), 0) / recentPosts.length,
      totalWordCount: recentPosts.reduce((acc, post) => acc + (post.wordCount || 0), 0),
      contentTypes: this.analyzeContentTypes(recentPosts),
    }
  }

  /**
   * Analyze content types distribution
   */
  private analyzeContentTypes(posts: any[]) {
    const types = { article: 0, guide: 0, tutorial: 0, news: 0 }
    
    posts.forEach(post => {
      const type = this.categorizeContent(post.title, post.description, post.tags)
      types[type]++
    })
    
    return types
  }
}

// Default instance for easy usage
export const defaultRSSGenerator = new RSSGenerator()

// Export utility functions
export function generateRSSForLocale(locale: string): string {
  return defaultRSSGenerator.generateRSSFeed(locale)
}

export function getRSSStats(locale: string) {
  return defaultRSSGenerator.getRSSStats(locale)
}