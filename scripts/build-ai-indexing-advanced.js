#!/usr/bin/env node

/**
 * Advanced AI Indexing Script (post BUG-4 cleanup)
 *
 * Únicamente regenera la documentación MCP (`docs/mcp-*.md`) — esos ficheros
 * son derivados del código del handler MCP, no del contenido del blog, así que
 * solo cambian con un deploy humano.
 *
 * Sitemap y RSS ya NO se generan aquí: vivían como ficheros estáticos en
 * `public/` (sitemap.xml, rss-{es,en,it}.xml) y sombreaban las rutas dinámicas
 * de Next, obligando a `posts_rebuild` cada vez que aparecía un post nuevo.
 * Ahora ambos se sirven al vuelo desde:
 *   - `app/sitemap.ts` -> /sitemap.xml
 *   - `app/feed/[locale]/route.ts` -> /feed/{es,en,it}
 * Los lectores son `lib/sitemap-generator.ts` y la propia route, que leen los
 * posts en runtime con `listPostsFromDisk()`.
 */

const fs = require('fs')
const path = require('path')

const config = {
  outputDir: './public',
}

/**
 * Regenera documentación MCP a partir del código (single source of truth).
 */
async function regenerateMCPDocs() {
  console.log('Regenerando documentación MCP...')
  const { main: generateMCPDocs } = require('./generate-mcp-docs.js')
  const result = await generateMCPDocs()
  console.log(`Documentación MCP regenerada: ${result.endpoints} endpoints, ${result.files.length} archivos`)
  return result
}

async function main() {
  console.log('Iniciando regeneración de docs MCP...')

  const startTime = Date.now()

  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true })
  }

  const mcpResult = await regenerateMCPDocs()

  const duration = Date.now() - startTime

  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    success: true,
    files: {
      mcp: mcpResult,
    },
  }

  if (process.argv.includes('--report')) {
    const reportPath = path.join(config.outputDir, 'build-report-advanced.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`Reporte guardado: ${reportPath}`)
  }

  console.log(`Completado en ${duration}ms`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error durante la regeneración:', error.message)
    process.exit(1)
  })
}

module.exports = {
  main,
  regenerateMCPDocs,
}
