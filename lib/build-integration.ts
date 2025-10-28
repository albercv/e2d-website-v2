/**
 * Build Integration System for AI Indexing
 * Automatically updates sitemap.xml and RSS feeds during build process
 * 
 * Features:
 * - Pre-build and post-build hooks
 * - Automatic file generation
 * - Validation and verification
 * - Error handling and recovery
 * - Build performance monitoring
 */

import { generateAISitemap, getSitemapStats, defaultSitemapGenerator } from "./sitemap-generator.js"
import { defaultRSSGenerator } from "./rss-generator.js"
import fs from "fs"
import path from "path"

export interface BuildConfig {
  outputDir: string
  supportedLocales: string[]
  enableSitemap: boolean
  enableRSS: boolean
  enableValidation: boolean
  enableStats: boolean
  baseUrl: string
}

export interface BuildResult {
  success: boolean
  timestamp: string
  duration: number
  files: {
    sitemap?: {
      generated: boolean
      path: string
      size: number
      urls: number
    }
    rss?: {
      [locale: string]: {
        generated: boolean
        path: string
        size: number
        items: number
      }
    }
  }
  errors: string[]
  warnings: string[]
  stats?: {
    sitemap?: any
    rss?: { [locale: string]: any }
  }
}

export class BuildIntegration {
  private config: BuildConfig
  private startTime: number = 0

  constructor(config: Partial<BuildConfig> = {}) {
    this.config = {
      outputDir: "./public",
      supportedLocales: ["es", "en"],
      enableSitemap: true,
      enableRSS: true,
      enableValidation: true,
      enableStats: true,
      baseUrl: "https://evolve2digital.com",
      ...config,
    }
  }

  /**
   * Execute complete build integration process
   */
  public async executeBuildIntegration(): Promise<BuildResult> {
    this.startTime = Date.now()
    
    const result: BuildResult = {
      success: false,
      timestamp: new Date().toISOString(),
      duration: 0,
      files: {},
      errors: [],
      warnings: [],
    }

    try {
      console.log("🚀 Starting AI indexing build integration...")

      // Ensure output directory exists
      this.ensureOutputDirectory()

      // Generate sitemap if enabled
      if (this.config.enableSitemap) {
        await this.generateSitemap(result)
      }

      // Generate RSS feeds if enabled
      if (this.config.enableRSS) {
        await this.generateRSSFeeds(result)
      }

      // Validate generated files if enabled
      if (this.config.enableValidation) {
        await this.validateGeneratedFiles(result)
      }

      // Generate statistics if enabled
      if (this.config.enableStats) {
        await this.generateStats(result)
      }

      result.success = result.errors.length === 0
      result.duration = Date.now() - this.startTime

      console.log(`✅ Build integration completed in ${result.duration}ms`)
      
      if (result.errors.length > 0) {
        console.error("❌ Build integration completed with errors:", result.errors)
      }
      
      if (result.warnings.length > 0) {
        console.warn("⚠️ Build integration completed with warnings:", result.warnings)
      }

      return result

    } catch (error) {
      result.success = false
      result.duration = Date.now() - this.startTime
      result.errors.push(`Build integration failed: ${error instanceof Error ? error.message : String(error)}`)
      
      console.error("❌ Build integration failed:", error)
      return result
    }
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true })
      console.log(`📁 Created output directory: ${this.config.outputDir}`)
    }
  }

  /**
   * Generate sitemap
   */
  private async generateSitemap(result: BuildResult): Promise<void> {
    try {
      console.log("🗺️ Generating AI-optimized sitemap...")
      
      const sitemap = generateAISitemap()
      const sitemapPath = path.join(this.config.outputDir, "sitemap.xml")
      
      await defaultSitemapGenerator.saveXMLSitemap(sitemapPath)
      
      const stats = fs.statSync(sitemapPath)
      
      result.files.sitemap = {
        generated: true,
        path: sitemapPath,
        size: stats.size,
        urls: sitemap.length,
      }
      
      console.log(`✅ Sitemap generated: ${sitemap.length} URLs, ${stats.size} bytes`)
      
    } catch (error) {
      result.errors.push(`Sitemap generation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate RSS feeds for all locales
   */
  private async generateRSSFeeds(result: BuildResult): Promise<void> {
    result.files.rss = {}
    
    for (const locale of this.config.supportedLocales) {
      try {
        console.log(`📡 Generating RSS feed for locale: ${locale}`)
        
        const rssPath = path.join(this.config.outputDir, `rss-${locale}.xml`)
        await defaultRSSGenerator.saveRSSFeed(locale, rssPath)
        
        const stats = fs.statSync(rssPath)
        const rssStats = defaultRSSGenerator.getRSSStats(locale)
        
        result.files.rss[locale] = {
          generated: true,
          path: rssPath,
          size: stats.size,
          items: rssStats.feedItems,
        }
        
        console.log(`✅ RSS feed (${locale}) generated: ${rssStats.feedItems} items, ${stats.size} bytes`)
        
      } catch (error) {
        result.errors.push(`RSS generation failed for ${locale}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  /**
   * Validate generated files
   */
  private async validateGeneratedFiles(result: BuildResult): Promise<void> {
    console.log("🔍 Validating generated files...")
    
    // Validate sitemap
    if (result.files.sitemap?.generated) {
      try {
        await this.validateXMLFile(result.files.sitemap.path, "sitemap")
        console.log("✅ Sitemap validation passed")
      } catch (error) {
        result.warnings.push(`Sitemap validation warning: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    
    // Validate RSS feeds
    if (result.files.rss) {
      for (const [locale, rssInfo] of Object.entries(result.files.rss)) {
        if (rssInfo.generated) {
          try {
            await this.validateXMLFile(rssInfo.path, "RSS")
            console.log(`✅ RSS feed (${locale}) validation passed`)
          } catch (error) {
            result.warnings.push(`RSS validation warning for ${locale}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
      }
    }
  }

  /**
   * Validate XML file structure
   */
  private async validateXMLFile(filePath: string, type: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`${type} file not found: ${filePath}`)
    }
    
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Basic XML validation
    if (!content.includes('<?xml version="1.0"')) {
      throw new Error(`${type} file missing XML declaration`)
    }
    
    // Check for basic structure
    if (type === "sitemap" && !content.includes('<urlset')) {
      throw new Error("Sitemap missing <urlset> element")
    }
    
    if (type === "RSS" && !content.includes('<rss')) {
      throw new Error("RSS feed missing <rss> element")
    }
    
    // Check for well-formed XML (basic check)
    const openTags = (content.match(/<[^\/][^>]*>/g) || []).length
    const closeTags = (content.match(/<\/[^>]*>/g) || []).length
    const selfClosingTags = (content.match(/<[^>]*\/>/g) || []).length
    
    if (openTags !== closeTags + selfClosingTags) {
      throw new Error(`${type} file appears to have malformed XML (tag mismatch)`)
    }
  }

  /**
   * Generate statistics
   */
  private async generateStats(result: BuildResult): Promise<void> {
    try {
      console.log("📊 Generating build statistics...")
      
      result.stats = {}
      
      // Sitemap stats
      if (this.config.enableSitemap) {
        result.stats.sitemap = getSitemapStats()
      }
      
      // RSS stats
      if (this.config.enableRSS) {
        result.stats.rss = {}
        for (const locale of this.config.supportedLocales) {
          result.stats.rss[locale] = defaultRSSGenerator.getRSSStats(locale)
        }
      }
      
      console.log("✅ Statistics generated")
      
    } catch (error) {
      result.warnings.push(`Statistics generation warning: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Save build report
   */
  public async saveBuildReport(result: BuildResult, reportPath?: string): Promise<void> {
    const defaultPath = path.join(this.config.outputDir, "build-report.json")
    const targetPath = reportPath || defaultPath
    
    const report = {
      ...result,
      config: this.config,
      generatedAt: new Date().toISOString(),
    }
    
    fs.writeFileSync(targetPath, JSON.stringify(report, null, 2), 'utf-8')
    console.log(`📄 Build report saved: ${targetPath}`)
  }

  /**
   * Get build summary
   */
  public getBuildSummary(result: BuildResult): string {
    const summary = [
      `🚀 AI Indexing Build Integration Summary`,
      `⏱️ Duration: ${result.duration}ms`,
      `📅 Timestamp: ${result.timestamp}`,
      `✅ Success: ${result.success ? 'Yes' : 'No'}`,
      ``,
    ]
    
    if (result.files.sitemap) {
      summary.push(`🗺️ Sitemap: ${result.files.sitemap.urls} URLs (${result.files.sitemap.size} bytes)`)
    }
    
    if (result.files.rss) {
      Object.entries(result.files.rss).forEach(([locale, info]) => {
        summary.push(`📡 RSS (${locale}): ${info.items} items (${info.size} bytes)`)
      })
    }
    
    if (result.errors.length > 0) {
      summary.push(``, `❌ Errors (${result.errors.length}):`)
      result.errors.forEach(error => summary.push(`  - ${error}`))
    }
    
    if (result.warnings.length > 0) {
      summary.push(``, `⚠️ Warnings (${result.warnings.length}):`)
      result.warnings.forEach(warning => summary.push(`  - ${warning}`))
    }
    
    return summary.join('\n')
  }
}

// Default instance for easy usage
export const defaultBuildIntegration = new BuildIntegration()

// Export utility functions
export async function runBuildIntegration(config?: Partial<BuildConfig>): Promise<BuildResult> {
  const integration = config ? new BuildIntegration(config) : defaultBuildIntegration
  return await integration.executeBuildIntegration()
}

export async function generateBuildReport(result: BuildResult, reportPath?: string): Promise<void> {
  await defaultBuildIntegration.saveBuildReport(result, reportPath)
}