#!/usr/bin/env node

/**
 * Build AI Indexing Script
 * 
 * Automatiza la generación de sitemap.xml y RSS feeds optimizados para crawlers de IA.
 * Integra con el sistema de build de Next.js para mantener archivos actualizados.
 * 
 * Uso:
 *   node scripts/build-ai-indexing.js [opciones]
 */

// Registrar ts-node para poder importar archivos TypeScript
require('ts-node/register')
const { runBuildIntegration, generateBuildReport } = require('../lib/build-integration')
const fs = require('fs')
const path = require('path')

// Configuration
const config = {
  outputDir: "./public",
  supportedLocales: ["es", "en", "it"],
  enableSitemap: true,
  enableRSS: true,
  enableValidation: true,
  enableStats: true,
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://evolve2digital.com",
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  quiet: args.includes('--quiet') || args.includes('-q'),
  skipValidation: args.includes('--skip-validation'),
  skipStats: args.includes('--skip-stats'),
  outputReport: args.includes('--report'),
}

async function main() {
  try {
    if (!options.quiet) {
      console.log('🤖 AI Indexing Build Script')
      console.log('============================')
      console.log(`Base URL: ${config.baseUrl}`)
      console.log(`Locales: ${config.supportedLocales.join(', ')}`)
      console.log(`Output: ${config.outputDir}`)
      console.log('')
    }

    // Update config based on options
    if (options.skipValidation) {
      config.enableValidation = false
    }
    if (options.skipStats) {
      config.enableStats = false
    }

    // Run build integration
    const result = await runBuildIntegration(config)

    // Generate build report if requested
    if (options.outputReport) {
      const reportPath = path.join(config.outputDir, 'ai-indexing-report.json')
      await generateBuildReport(result, reportPath)
      
      if (!options.quiet) {
        console.log(`📄 Build report saved: ${reportPath}`)
      }
    }

    // Output results
    if (!options.quiet) {
      console.log('')
      console.log('📊 Build Results:')
      console.log('=================')
      
      if (result.files.sitemap) {
        console.log(`🗺️ Sitemap: ${result.files.sitemap.urls} URLs (${formatBytes(result.files.sitemap.size)})`)
      }
      
      if (result.files.rss) {
        Object.entries(result.files.rss).forEach(([locale, info]) => {
          console.log(`📡 RSS (${locale}): ${info.items} items (${formatBytes(info.size)})`)
        })
      }
      
      console.log(`⏱️ Duration: ${result.duration}ms`)
      console.log(`✅ Success: ${result.success ? 'Yes' : 'No'}`)
      
      if (result.errors.length > 0) {
        console.log('')
        console.log('❌ Errors:')
        result.errors.forEach(error => console.log(`  - ${error}`))
      }
      
      if (result.warnings.length > 0) {
        console.log('')
        console.log('⚠️ Warnings:')
        result.warnings.forEach(warning => console.log(`  - ${warning}`))
      }
    }

    // Verbose output
    if (options.verbose && result.stats) {
      console.log('')
      console.log('📈 Detailed Statistics:')
      console.log('======================')
      
      if (result.stats.sitemap) {
        console.log('Sitemap Stats:', JSON.stringify(result.stats.sitemap, null, 2))
      }
      
      if (result.stats.rss) {
        console.log('RSS Stats:', JSON.stringify(result.stats.rss, null, 2))
      }
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1)

  } catch (error) {
    console.error('❌ Build script failed:', error.message)
    
    if (options.verbose) {
      console.error(error.stack)
    }
    
    process.exit(1)
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Handle process signals
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Build script interrupted')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Build script terminated')
  process.exit(1)
})

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🤖 AI Indexing Build Script

Usage: node scripts/build-ai-indexing.js [options]

Options:
  -v, --verbose         Show detailed output and statistics
  -q, --quiet          Suppress non-essential output
  --skip-validation    Skip XML validation step
  --skip-stats         Skip statistics generation
  --report             Generate detailed build report
  -h, --help           Show this help message

Environment Variables:
  NEXT_PUBLIC_SITE_URL  Base URL for the site (default: https://evolve2digital.com)

Examples:
  node scripts/build-ai-indexing.js
  node scripts/build-ai-indexing.js --verbose --report
  node scripts/build-ai-indexing.js --quiet --skip-validation
`)
  process.exit(0)
}

// Run the script
main()