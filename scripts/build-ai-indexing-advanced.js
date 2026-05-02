#!/usr/bin/env node

/**
 * Advanced AI Indexing Script
 * 
 * Utiliza los generadores TypeScript avanzados para incluir automáticamente
 * todos los posts del blog en sitemap y RSS feeds con metadatos optimizados para IA.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuración
const config = {
  baseUrl: 'https://evolve2digital.com',
  outputDir: './public',
  locales: ['es', 'en', 'it'],
  defaultLocale: 'es',
  contentDir: './content',
  mcpDocsDir: './docs'
}

/**
 * Ejecuta el generador de sitemap avanzado usando TypeScript
 */
async function generateAdvancedSitemap() {
  console.log('🗺️  Generando sitemap avanzado con posts del blog...')
  
  try {
    // Compilar y ejecutar el generador TypeScript
    const command = `npx tsx -e "
      import { defaultSitemapGenerator } from './lib/sitemap-generator.ts';
      import fs from 'fs';
      
      try {
        const sitemap = defaultSitemapGenerator.generateXMLSitemap();
        fs.writeFileSync('./public/sitemap.xml', sitemap);
        
        const stats = defaultSitemapGenerator.getSitemapStats();
        console.log(JSON.stringify({
          success: true,
          urls: stats.totalUrls,
          path: 'public/sitemap.xml'
        }));
      } catch (error) {
        console.error(JSON.stringify({
          success: false,
          error: error.message
        }));
        process.exit(1);
      }
    "`
    
    const result = execSync(command, { encoding: 'utf-8', cwd: process.cwd() })
    const parsed = JSON.parse(result.trim())
    
    if (parsed.success) {
      console.log(`✅ Sitemap generado: ${parsed.path} (${parsed.urls} URLs)`)
      return { path: parsed.path, urls: parsed.urls }
    } else {
      throw new Error(parsed.error)
    }
  } catch (error) {
    console.error('❌ Error generando sitemap:', error.message)
    throw error
  }
}

/**
 * Ejecuta el generador de RSS avanzado usando TypeScript
 */
async function generateAdvancedRSS(locale) {
  console.log(`📡 Generando RSS avanzado para ${locale}...`)
  
  try {
    const command = `npx tsx -e "
      import { defaultRSSGenerator } from './lib/rss-generator.ts';
      import fs from 'fs';
      
      try {
        const rss = defaultRSSGenerator.generateRSSFeed('${locale}');
        const filename = 'rss-${locale}.xml';
        fs.writeFileSync('./public/' + filename, rss);
        
        // Contar items en el RSS
        const itemCount = (rss.match(/<item>/g) || []).length;
        
        console.log(JSON.stringify({
          success: true,
          items: itemCount,
          path: 'public/' + filename
        }));
      } catch (error) {
        console.error(JSON.stringify({
          success: false,
          error: error.message
        }));
        process.exit(1);
      }
    "`
    
    const result = execSync(command, { encoding: 'utf-8', cwd: process.cwd() })
    const parsed = JSON.parse(result.trim())
    
    if (parsed.success) {
      console.log(`✅ RSS generado: ${parsed.path} (${parsed.items} items)`)
      return { path: parsed.path, items: parsed.items }
    } else {
      throw new Error(parsed.error)
    }
  } catch (error) {
    console.error(`❌ Error generando RSS para ${locale}:`, error.message)
    throw error
  }
}

/**
 * Regenera documentación MCP
 */
async function regenerateMCPDocs() {
  try {
    console.log('📚 Regenerando documentación MCP...')
    
    const { main: generateMCPDocs } = require('./generate-mcp-docs.js')
    const result = await generateMCPDocs()
    
    console.log(`✅ Documentación MCP regenerada: ${result.endpoints} endpoints, ${result.files.length} archivos`)
    return result
  } catch (error) {
    console.error('❌ Error regenerando documentación MCP:', error)
    throw error
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando generación avanzada de indexación IA...')
  
  const startTime = Date.now()
  
  try {
    // Asegurar que existe el directorio de salida
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true })
    }
    
    // Generar sitemap avanzado
    const sitemapResult = await generateAdvancedSitemap()
    
    // Generar RSS avanzado para cada idioma
    const rssResults = {}
    for (const locale of config.locales) {
      rssResults[locale] = await generateAdvancedRSS(locale)
    }
    
    // Regenerar documentación MCP
    const mcpResult = await regenerateMCPDocs()
    
    const duration = Date.now() - startTime
    
    // Generar reporte
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      success: true,
      files: {
        sitemap: sitemapResult,
        rss: rssResults,
        mcp: mcpResult
      }
    }
    
    // Guardar reporte si se solicita
    if (process.argv.includes('--report')) {
      const reportPath = path.join(config.outputDir, 'build-report-advanced.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(`📊 Reporte guardado: ${reportPath}`)
    }
    
    console.log('✨ Generación avanzada completada exitosamente!')
    console.log(`⏱️  Tiempo total: ${duration}ms`)
    
    if (process.argv.includes('--verbose')) {
      console.log('\n📋 Resumen:')
      console.log(`   Sitemap: ${sitemapResult.urls} URLs`)
      Object.entries(rssResults).forEach(([locale, result]) => {
        console.log(`   RSS ${locale}: ${result.items} items`)
      })
      console.log(`   MCP Docs: ${mcpResult.success ? 'Actualizada' : 'Error'}`)
    }
    
  } catch (error) {
    console.error('❌ Error durante la generación:', error.message)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
}

module.exports = { 
  main, 
  generateAdvancedSitemap, 
  generateAdvancedRSS, 
  regenerateMCPDocs 
}