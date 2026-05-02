#!/usr/bin/env node

/**
 * Build AI Indexing Script (Simplified)
 * 
 * Versión simplificada que genera sitemap.xml y RSS feeds
 * sin dependencias complejas de TypeScript.
 */

const fs = require('fs')
const path = require('path')

// Configuración básica
const config = {
  baseUrl: 'https://evolve2digital.com',
  outputDir: './public',
  locales: ['es', 'en'],
  defaultLocale: 'es'
}

// Función para generar sitemap básico
function generateBasicSitemap() {
  console.log('🗺️  Generando sitemap básico...')
  
  const urls = [
    { loc: `${config.baseUrl}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${config.baseUrl}/blog`, priority: '0.8', changefreq: 'daily' },
    { loc: `${config.baseUrl}/docs`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${config.baseUrl}/legal`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${config.baseUrl}/privacy`, priority: '0.3', changefreq: 'monthly' }
  ]
  
  // Agregar URLs en inglés
  urls.push(
    { loc: `${config.baseUrl}/en`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${config.baseUrl}/en/blog`, priority: '0.8', changefreq: 'daily' },
    { loc: `${config.baseUrl}/en/docs`, priority: '0.7', changefreq: 'weekly' }
  )
  
  const now = new Date().toISOString()
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:ai="http://ai-crawlers.org/schemas/sitemap/1.0">
`
  
  urls.forEach(url => {
    sitemap += `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    <ai:metadata>
      <ai:contentType>webpage</ai:contentType>
      <ai:importance>high</ai:importance>
      <ai:crawlPriority>${url.priority}</ai:crawlPriority>
    </ai:metadata>
  </url>
`
  })
  
  sitemap += '</urlset>'
  
  const sitemapPath = path.join(config.outputDir, 'sitemap.xml')
  fs.writeFileSync(sitemapPath, sitemap, 'utf-8')
  
  console.log(`✅ Sitemap generado: ${sitemapPath}`)
  return { path: sitemapPath, urls: urls.length }
}

// Función para generar RSS básico
function generateBasicRSS(locale) {
  console.log(`📡 Generando RSS para ${locale}...`)
  
  const title = locale === 'es' ? 'E2D - Blog' : 'E2D - Blog'
  const description = locale === 'es' 
    ? 'Últimas noticias y artículos sobre desarrollo web y tecnología'
    : 'Latest news and articles about web development and technology'
  
  const now = new Date().toUTCString()
  
  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:ai="http://ai-crawlers.org/schemas/rss/1.0">
  <channel>
    <title>${title}</title>
    <description>${description}</description>
    <link>${config.baseUrl}/${locale === 'es' ? '' : locale + '/'}blog</link>
    <language>${locale}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>E2D AI Indexing System</generator>
    
    <item>
      <title>Ejemplo de Post</title>
      <description>Este es un post de ejemplo para el RSS feed</description>
      <link>${config.baseUrl}/${locale === 'es' ? '' : locale + '/'}blog/ejemplo</link>
      <pubDate>${now}</pubDate>
      <ai:metadata>
        <ai:contentType>blog-post</ai:contentType>
        <ai:readingTime>5 minutos</ai:readingTime>
        <ai:semanticTags>ejemplo,blog,tecnología</ai:semanticTags>
      </ai:metadata>
    </item>
  </channel>
</rss>`
  
  const rssPath = path.join(config.outputDir, `rss-${locale}.xml`)
  fs.writeFileSync(rssPath, rss, 'utf-8')
  
  console.log(`✅ RSS generado: ${rssPath}`)
  return { path: rssPath, items: 1 }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando generación de indexación IA...')
  
  const startTime = Date.now()
  
  try {
    // Asegurar que existe el directorio de salida
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true })
    }
    
    // Generar sitemap
    const sitemapResult = generateBasicSitemap()
    
    // Generar RSS para cada idioma
    const rssResults = {}
    for (const locale of config.locales) {
      rssResults[locale] = generateBasicRSS(locale)
    }
    
    const duration = Date.now() - startTime
    
    // Generar reporte
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      success: true,
      files: {
        sitemap: sitemapResult,
        rss: rssResults
      }
    }
    
    // Guardar reporte si se solicita
    if (process.argv.includes('--report')) {
      const reportPath = path.join(config.outputDir, 'build-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(`📊 Reporte guardado: ${reportPath}`)
    }
    
    console.log('✨ Generación completada exitosamente!')
    console.log(`⏱️  Tiempo total: ${duration}ms`)
    
    if (process.argv.includes('--verbose')) {
      console.log('\n📋 Resumen:')
      console.log(`   Sitemap: ${sitemapResult.urls} URLs`)
      Object.entries(rssResults).forEach(([locale, result]) => {
        console.log(`   RSS ${locale}: ${result.items} items`)
      })
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

module.exports = { main, generateBasicSitemap, generateBasicRSS }