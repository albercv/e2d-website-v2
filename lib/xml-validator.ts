/**
 * XML Validation System for AI Indexing
 * Validates sitemap.xml and RSS feeds for compliance and accessibility
 * 
 * Features:
 * - XML syntax validation
 * - Schema compliance checking
 * - Accessibility verification
 * - External tool integration
 * - Performance analysis
 */

import fs from "fs"
import https from "https"
import { URL } from "url"

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  stats: ValidationStats
  recommendations: string[]
}

export interface ValidationError {
  type: "syntax" | "schema" | "accessibility" | "performance"
  message: string
  line?: number
  column?: number
  severity: "critical" | "high" | "medium" | "low"
}

export interface ValidationWarning {
  type: "optimization" | "best-practice" | "accessibility" | "seo" | "performance"
  message: string
  suggestion: string
}

export interface ValidationStats {
  fileSize: number
  elementCount: number
  urlCount?: number
  itemCount?: number
  validationTime: number
  lastValidated: string
}

export interface ValidationConfig {
  enableExternalValidation: boolean
  enablePerformanceCheck: boolean
  enableAccessibilityCheck: boolean
  maxFileSize: number // in bytes
  maxUrls: number
  timeoutMs: number
}

export class XMLValidator {
  private config: ValidationConfig

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      enableExternalValidation: false, // Disabled by default to avoid external dependencies
      enablePerformanceCheck: true,
      enableAccessibilityCheck: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxUrls: 50000,
      timeoutMs: 30000,
      ...config,
    }
  }

  /**
   * Validate sitemap.xml file
   */
  public async validateSitemap(filePath: string): Promise<ValidationResult> {
    const startTime = Date.now()
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        fileSize: 0,
        elementCount: 0,
        urlCount: 0,
        validationTime: 0,
        lastValidated: new Date().toISOString(),
      },
      recommendations: [],
    }

    try {
      // Check file existence
      if (!fs.existsSync(filePath)) {
        result.errors.push({
          type: "syntax",
          message: `Sitemap file not found: ${filePath}`,
          severity: "critical",
        })
        result.isValid = false
        return result
      }

      // Read and analyze file
      const content = fs.readFileSync(filePath, 'utf-8')
      const stats = fs.statSync(filePath)
      
      result.stats.fileSize = stats.size
      result.stats.validationTime = Date.now() - startTime

      // Basic XML validation
      await this.validateXMLSyntax(content, result, "sitemap")

      // Sitemap-specific validation
      await this.validateSitemapStructure(content, result)

      // Performance checks
      if (this.config.enablePerformanceCheck) {
        await this.validateSitemapPerformance(content, result)
      }

      // Accessibility checks
      if (this.config.enableAccessibilityCheck) {
        await this.validateSitemapAccessibility(content, result)
      }

      // Generate recommendations
      this.generateSitemapRecommendations(result)

    } catch (error) {
      result.errors.push({
        type: "syntax",
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: "critical",
      })
      result.isValid = false
    }

    result.stats.validationTime = Date.now() - startTime
    result.isValid = result.errors.filter(e => e.severity === "critical" || e.severity === "high").length === 0

    return result
  }

  /**
   * Validate RSS feed file
   */
  public async validateRSSFeed(filePath: string): Promise<ValidationResult> {
    const startTime = Date.now()
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        fileSize: 0,
        elementCount: 0,
        itemCount: 0,
        validationTime: 0,
        lastValidated: new Date().toISOString(),
      },
      recommendations: [],
    }

    try {
      // Check file existence
      if (!fs.existsSync(filePath)) {
        result.errors.push({
          type: "syntax",
          message: `RSS feed file not found: ${filePath}`,
          severity: "critical",
        })
        result.isValid = false
        return result
      }

      // Read and analyze file
      const content = fs.readFileSync(filePath, 'utf-8')
      const stats = fs.statSync(filePath)
      
      result.stats.fileSize = stats.size

      // Basic XML validation
      await this.validateXMLSyntax(content, result, "RSS")

      // RSS-specific validation
      await this.validateRSSStructure(content, result)

      // Performance checks
      if (this.config.enablePerformanceCheck) {
        await this.validateRSSPerformance(content, result)
      }

      // Generate recommendations
      this.generateRSSRecommendations(result)

    } catch (error) {
      result.errors.push({
        type: "syntax",
        message: `RSS validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: "critical",
      })
      result.isValid = false
    }

    result.stats.validationTime = Date.now() - startTime
    result.isValid = result.errors.filter(e => e.severity === "critical" || e.severity === "high").length === 0

    return result
  }

  /**
   * Validate basic XML syntax
   */
  private async validateXMLSyntax(content: string, result: ValidationResult, type: string): Promise<void> {
    // Check XML declaration
    if (!content.trim().startsWith('<?xml')) {
      result.errors.push({
        type: "syntax",
        message: "Missing XML declaration",
        line: 1,
        severity: "high",
      })
    }

    // Check encoding
    if (!content.includes('encoding="UTF-8"') && !content.includes("encoding='UTF-8'")) {
      result.warnings.push({
        type: "best-practice",
        message: "XML encoding not explicitly set to UTF-8",
        suggestion: "Add encoding=\"UTF-8\" to XML declaration",
      })
    }

    // Basic well-formedness check
    const openTags = (content.match(/<[^\/!?][^>]*[^\/]>/g) || []).length
    const closeTags = (content.match(/<\/[^>]+>/g) || []).length
    const selfClosingTags = (content.match(/<[^>]+\/>/g) || []).length
    
    result.stats.elementCount = openTags + selfClosingTags

    if (openTags !== closeTags) {
      result.errors.push({
        type: "syntax",
        message: `Mismatched XML tags: ${openTags} opening tags, ${closeTags} closing tags`,
        severity: "critical",
      })
    }

    // Check for CDATA sections
    const cdataCount = (content.match(/<!\[CDATA\[[\s\S]*?\]\]>/g) || []).length
    if (cdataCount > 0) {
      result.warnings.push({
        type: "best-practice",
        message: `Found ${cdataCount} CDATA sections`,
        suggestion: "Ensure CDATA is properly closed and necessary",
      })
    }

    // Check file size
    if (result.stats.fileSize > this.config.maxFileSize) {
      result.errors.push({
        type: "performance",
        message: `File size (${result.stats.fileSize} bytes) exceeds maximum (${this.config.maxFileSize} bytes)`,
        severity: "high",
      })
    }
  }

  /**
   * Validate sitemap structure
   */
  private async validateSitemapStructure(content: string, result: ValidationResult): Promise<void> {
    // Check root element
    if (!content.includes('<urlset')) {
      result.errors.push({
        type: "schema",
        message: "Missing <urlset> root element",
        severity: "critical",
      })
      return
    }

    // Check namespace
    if (!content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
      result.errors.push({
        type: "schema",
        message: "Missing or incorrect sitemap namespace",
        severity: "high",
      })
    }

    // Count URLs
    const urlMatches = content.match(/<url>/g) || []
    result.stats.urlCount = urlMatches.length

    if (result.stats.urlCount === 0) {
      result.warnings.push({
        type: "optimization",
        message: "Sitemap contains no URLs",
        suggestion: "Add URLs to make the sitemap useful for crawlers",
      })
    }

    if (result.stats.urlCount > this.config.maxUrls) {
      result.errors.push({
        type: "schema",
        message: `Too many URLs (${result.stats.urlCount}), maximum is ${this.config.maxUrls}`,
        severity: "high",
      })
    }

    // Check required elements
    const locMatches = content.match(/<loc>/g) || []
    if (locMatches.length !== result.stats.urlCount) {
      result.errors.push({
        type: "schema",
        message: "Not all <url> elements have <loc> elements",
        severity: "high",
      })
    }

    // Check URL format
    const urlRegex = /<loc>(.*?)<\/loc>/g
    let match
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1]
      try {
        new URL(url)
      } catch {
        result.errors.push({
          type: "schema",
          message: `Invalid URL format: ${url}`,
          severity: "medium",
        })
      }
    }
  }

  /**
   * Validate RSS structure
   */
  private async validateRSSStructure(content: string, result: ValidationResult): Promise<void> {
    // Check root element
    if (!content.includes('<rss')) {
      result.errors.push({
        type: "schema",
        message: "Missing <rss> root element",
        severity: "critical",
      })
      return
    }

    // Check version
    if (!content.includes('version="2.0"')) {
      result.warnings.push({
        type: "best-practice",
        message: "RSS version not specified or not 2.0",
        suggestion: "Use RSS 2.0 for better compatibility",
      })
    }

    // Check channel
    if (!content.includes('<channel>')) {
      result.errors.push({
        type: "schema",
        message: "Missing <channel> element",
        severity: "critical",
      })
      return
    }

    // Check required channel elements
    const requiredElements = ['title', 'description', 'link']
    requiredElements.forEach(element => {
      if (!content.includes(`<${element}>`)) {
        result.errors.push({
          type: "schema",
          message: `Missing required channel element: <${element}>`,
          severity: "high",
        })
      }
    })

    // Count items
    const itemMatches = content.match(/<item>/g) || []
    result.stats.itemCount = itemMatches.length

    if (result.stats.itemCount === 0) {
      result.warnings.push({
        type: "optimization",
        message: "RSS feed contains no items",
        suggestion: "Add items to make the feed useful",
      })
    }

    // Check item structure
    const itemTitleMatches = content.match(/<item>[\s\S]*?<title>/g) || []
    if (itemTitleMatches.length !== result.stats.itemCount) {
      result.warnings.push({
        type: "best-practice",
        message: "Not all items have titles",
        suggestion: "Add titles to all RSS items for better readability",
      })
    }
  }

  /**
   * Validate sitemap performance
   */
  private async validateSitemapPerformance(content: string, result: ValidationResult): Promise<void> {
    // Check compression potential
    const compressionRatio = this.estimateCompressionRatio(content)
    if (compressionRatio > 0.7) {
      result.recommendations.push("Consider enabling gzip compression for better performance")
    }

    // Check lastmod dates
    const lastmodMatches = content.match(/<lastmod>(.*?)<\/lastmod>/g) || []
    if (lastmodMatches.length === 0) {
      result.warnings.push({
        type: "optimization",
        message: "No lastmod dates found",
        suggestion: "Add lastmod dates to help crawlers understand content freshness",
      })
    }

    // Check priority values
    const priorityMatches = content.match(/<priority>(.*?)<\/priority>/g) || []
    if (priorityMatches.length === 0) {
      result.warnings.push({
        type: "optimization",
        message: "No priority values found",
        suggestion: "Add priority values to guide crawler attention",
      })
    }
  }

  /**
   * Validate sitemap accessibility
   */
  private async validateSitemapAccessibility(content: string, result: ValidationResult): Promise<void> {
    // Check for alternate language links
    if (content.includes('hreflang')) {
      result.recommendations.push("Good: Found hreflang attributes for international SEO")
    } else {
      result.warnings.push({
        type: "seo",
        message: "No hreflang attributes found",
        suggestion: "Consider adding hreflang for international content",
      })
    }

    // Check changefreq values
    const changefreqMatches = content.match(/<changefreq>(.*?)<\/changefreq>/g) || []
    if (changefreqMatches.length > 0) {
      const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
      changefreqMatches.forEach(match => {
        const freq = match.replace(/<\/?changefreq>/g, '')
        if (!validFreqs.includes(freq)) {
          result.errors.push({
            type: "schema",
            message: `Invalid changefreq value: ${freq}`,
            severity: "medium",
          })
        }
      })
    }
  }

  /**
   * Validate RSS performance
   */
  private async validateRSSPerformance(content: string, result: ValidationResult): Promise<void> {
    // Check item count
    if (result.stats.itemCount && result.stats.itemCount > 100) {
      result.warnings.push({
        type: "performance",
        message: `Large number of items (${result.stats.itemCount})`,
        suggestion: "Consider limiting RSS items to 20-50 for better performance",
      })
    }

    // Check for images
    const imageMatches = content.match(/<enclosure|<image>/g) || []
    if (imageMatches.length > 0) {
      result.recommendations.push("Good: Found images/enclosures for richer content")
    }

    // Check TTL
    if (!content.includes('<ttl>')) {
      result.warnings.push({
        type: "optimization",
        message: "No TTL (Time To Live) specified",
        suggestion: "Add <ttl> to indicate how often the feed should be refreshed",
      })
    }
  }

  /**
   * Generate sitemap recommendations
   */
  private generateSitemapRecommendations(result: ValidationResult): void {
    if (result.stats.urlCount && result.stats.urlCount < 10) {
      result.recommendations.push("Consider adding more URLs to improve site coverage")
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      result.recommendations.push("Excellent! Your sitemap follows all best practices")
    }

    result.recommendations.push("Submit your sitemap to Google Search Console for indexing")
    result.recommendations.push("Monitor sitemap performance in webmaster tools")
  }

  /**
   * Generate RSS recommendations
   */
  private generateRSSRecommendations(result: ValidationResult): void {
    if (result.stats.itemCount && result.stats.itemCount > 0) {
      result.recommendations.push("Good: RSS feed contains items for syndication")
    }

    if (result.errors.length === 0) {
      result.recommendations.push("RSS feed is valid and ready for syndication")
    }

    result.recommendations.push("Test your RSS feed in feed readers")
    result.recommendations.push("Consider adding your RSS feed to feed directories")
  }

  /**
   * Estimate compression ratio
   */
  private estimateCompressionRatio(content: string): number {
    // Simple estimation based on repetitive patterns
    const uniqueChars = new Set(content).size
    const totalChars = content.length
    return 1 - (uniqueChars / totalChars)
  }

  /**
   * Validate URL accessibility (external check)
   */
  public async validateURLAccessibility(url: string): Promise<boolean> {
    if (!this.config.enableExternalValidation) {
      return true // Skip external validation if disabled
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), this.config.timeoutMs)
      
      https.get(url, (res) => {
        clearTimeout(timeout)
        resolve(res.statusCode === 200)
      }).on('error', () => {
        clearTimeout(timeout)
        resolve(false)
      })
    })
  }
}

// Default instance for easy usage
export const defaultXMLValidator = new XMLValidator()

// Export utility functions
export async function validateSitemapFile(filePath: string): Promise<ValidationResult> {
  return await defaultXMLValidator.validateSitemap(filePath)
}

export async function validateRSSFile(filePath: string): Promise<ValidationResult> {
  return await defaultXMLValidator.validateRSSFeed(filePath)
}