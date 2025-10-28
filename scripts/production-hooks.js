#!/usr/bin/env node

/**
 * Production Hooks for Auto-Regeneration
 * 
 * Script que configura hooks de producción para regeneración automática
 * de archivos SEO y documentación MCP sin necesidad de rebuild completo.
 * 
 * Soporta:
 * - Webhooks de GitHub/GitLab
 * - Triggers de Vercel/Netlify
 * - Cron jobs
 * - File system events en producción
 */

const fs = require('fs')
const path = require('path')

/**
 * Configuración de hooks de producción
 */
const PRODUCTION_CONFIG = {
  // Configuración de webhooks
  webhooks: {
    github: {
      enabled: true,
      secret: process.env.GITHUB_WEBHOOK_SECRET,
      events: ['push', 'pull_request'],
      branches: ['main', 'production']
    },
    gitlab: {
      enabled: false,
      secret: process.env.GITLAB_WEBHOOK_SECRET,
      events: ['push', 'merge_request']
    }
  },
  
  // Configuración de deployment platforms
  platforms: {
    vercel: {
      enabled: true,
      buildCommand: 'npm run build:ai-indexing:advanced',
      ignoreCommand: 'node scripts/should-skip-build.js'
    },
    netlify: {
      enabled: false,
      buildCommand: 'npm run build && npm run build:ai-indexing:advanced',
      publishDir: 'out'
    }
  },
  
  // Configuración de cron jobs
  cron: {
    enabled: true,
    schedules: {
      // Regenerar SEO cada hora
      seo: '0 * * * *',
      // Regenerar documentación MCP cada 6 horas
      mcp: '0 */6 * * *',
      // Verificar integridad cada día a las 2 AM
      integrity: '0 2 * * *'
    }
  },
  
  // Configuración de file watching en producción
  fileWatcher: {
    enabled: false, // Deshabilitado por defecto en producción
    debounceMs: 5000, // Mayor debounce en producción
    maxRetries: 3
  }
}

/**
 * Genera configuración de Vercel
 */
function generateVercelConfig() {
  const config = {
    "version": 2,
    "builds": [
      {
        "src": "package.json",
        "use": "@vercel/next"
      }
    ],
    "functions": {
      "app/api/**/*.ts": {
        "maxDuration": 30
      }
    },
    "crons": [],
    "env": {
      "NEXT_PUBLIC_BASE_URL": "@next_public_base_url",
      "MCP_ADMIN_USER": "@mcp_admin_user",
      "MCP_ADMIN_PASSWORD": "@mcp_admin_password"
    },
    "ignoreCommand": "node scripts/should-skip-build.js"
  }
  
  // Agregar cron jobs si están habilitados
  if (PRODUCTION_CONFIG.cron.enabled) {
    config.crons = [
      {
        "path": "/api/cron/regenerate-seo",
        "schedule": PRODUCTION_CONFIG.cron.schedules.seo
      },
      {
        "path": "/api/cron/regenerate-mcp",
        "schedule": PRODUCTION_CONFIG.cron.schedules.mcp
      },
      {
        "path": "/api/cron/integrity-check",
        "schedule": PRODUCTION_CONFIG.cron.schedules.integrity
      }
    ]
  }
  
  return config
}

/**
 * Genera configuración de Netlify
 */
function generateNetlifyConfig() {
  const config = {
    "build": {
      "command": PRODUCTION_CONFIG.platforms.netlify.buildCommand,
      "publish": PRODUCTION_CONFIG.platforms.netlify.publishDir,
      "ignore": "node scripts/should-skip-build.js"
    },
    "functions": {
      "directory": "netlify/functions"
    },
    "plugins": [
      {
        "package": "@netlify/plugin-nextjs"
      }
    ],
    "redirects": [
      {
        "from": "/api/cron/*",
        "to": "/.netlify/functions/:splat",
        "status": 200
      }
    ]
  }
  
  return config
}

/**
 * Genera script para determinar si se debe saltar el build
 */
function generateSkipBuildScript() {
  return `#!/usr/bin/env node

/**
 * Should Skip Build Script
 * 
 * Determina si se debe saltar el build completo basándose en los cambios.
 * Solo regenera archivos SEO/MCP si solo hay cambios en content/ o docs/.
 */

const { execSync } = require('child_process')

async function shouldSkipBuild() {
  try {
    // Obtener archivos cambiados desde el último commit
    const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { 
      encoding: 'utf8' 
    }).trim().split('\\n').filter(Boolean)
    
    console.log('Changed files:', changedFiles)
    
    // Categorizar cambios
    const contentChanges = changedFiles.filter(file => 
      file.startsWith('content/') || 
      file.startsWith('docs/') ||
      file.startsWith('app/api/mcp/')
    )
    
    const codeChanges = changedFiles.filter(file => 
      !file.startsWith('content/') && 
      !file.startsWith('docs/') &&
      !file.startsWith('app/api/mcp/') &&
      !file.startsWith('public/') &&
      file !== 'package.json' &&
      file !== 'package-lock.json'
    )
    
    console.log('Content changes:', contentChanges.length)
    console.log('Code changes:', codeChanges.length)
    
    // Si solo hay cambios de contenido, regenerar SEO y saltar build
    if (contentChanges.length > 0 && codeChanges.length === 0) {
      console.log('Only content changes detected, regenerating SEO...')
      
      try {
        execSync('npm run seo:regenerate', { stdio: 'inherit' })
        console.log('SEO regeneration completed, skipping full build')
        process.exit(0) // Skip build
      } catch (error) {
        console.error('SEO regeneration failed, proceeding with full build')
        process.exit(1) // Proceed with build
      }
    }
    
    // Si hay cambios de código, proceder con build completo
    console.log('Code changes detected, proceeding with full build')
    process.exit(1) // Proceed with build
    
  } catch (error) {
    console.error('Error checking changes:', error.message)
    console.log('Proceeding with full build as fallback')
    process.exit(1) // Proceed with build on error
  }
}

shouldSkipBuild()
`
}

/**
 * Genera endpoints de cron para Vercel
 */
function generateCronEndpoints() {
  const endpoints = []
  
  // Endpoint para regenerar SEO
  endpoints.push({
    path: 'app/api/cron/regenerate-seo/route.ts',
    content: `import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET(request: NextRequest) {
  // Verificar autorización (Vercel Cron secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== \`Bearer \${cronSecret}\`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    console.log('Starting scheduled SEO regeneration...')
    
    // Ejecutar regeneración de SEO
    execSync('npm run seo:regenerate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    return NextResponse.json({
      success: true,
      message: 'SEO files regenerated successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Cron SEO regeneration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
`
  })
  
  // Endpoint para regenerar documentación MCP
  endpoints.push({
    path: 'app/api/cron/regenerate-mcp/route.ts',
    content: `import { NextRequest, NextResponse } from 'next/server'
import { main as generateMCPDocs } from '@/scripts/generate-mcp-docs'

export async function GET(request: NextRequest) {
  // Verificar autorización (Vercel Cron secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== \`Bearer \${cronSecret}\`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    console.log('Starting scheduled MCP documentation regeneration...')
    
    const result = await generateMCPDocs()
    
    return NextResponse.json({
      success: true,
      message: 'MCP documentation regenerated successfully',
      endpoints: result.endpoints,
      files: result.files.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Cron MCP regeneration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
`
  })
  
  // Endpoint para verificación de integridad
  endpoints.push({
    path: 'app/api/cron/integrity-check/route.ts',
    content: `import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  // Verificar autorización (Vercel Cron secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== \`Bearer \${cronSecret}\`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    console.log('Starting scheduled integrity check...')
    
    const checks = {
      sitemap: fs.existsSync(path.join(process.cwd(), 'public/sitemap.xml')),
      rssEs: fs.existsSync(path.join(process.cwd(), 'public/rss-es.xml')),
      rssEn: fs.existsSync(path.join(process.cwd(), 'public/rss-en.xml')),
      mcpUsage: fs.existsSync(path.join(process.cwd(), 'docs/mcp-usage.md')),
      mcpExamples: fs.existsSync(path.join(process.cwd(), 'docs/mcp-examples.md')),
      mcpChangelog: fs.existsSync(path.join(process.cwd(), 'docs/mcp-changelog.md'))
    }
    
    const allHealthy = Object.values(checks).every(Boolean)
    
    if (!allHealthy) {
      console.warn('Integrity check failed, some files are missing')
      // Intentar regenerar archivos faltantes
      const { execSync } = require('child_process')
      execSync('npm run seo:regenerate', { stdio: 'inherit' })
    }
    
    return NextResponse.json({
      success: true,
      healthy: allHealthy,
      checks,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Integrity check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
`
  })
  
  return endpoints
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Configurando hooks de producción...')
    
    const projectRoot = process.cwd()
    
    // Generar configuración de Vercel
    if (PRODUCTION_CONFIG.platforms.vercel.enabled) {
      console.log('📝 Generando configuración de Vercel...')
      const vercelConfig = generateVercelConfig()
      fs.writeFileSync(
        path.join(projectRoot, 'vercel.json'),
        JSON.stringify(vercelConfig, null, 2),
        'utf8'
      )
      console.log('✅ vercel.json generado')
    }
    
    // Generar configuración de Netlify
    if (PRODUCTION_CONFIG.platforms.netlify.enabled) {
      console.log('📝 Generando configuración de Netlify...')
      const netlifyConfig = generateNetlifyConfig()
      fs.writeFileSync(
        path.join(projectRoot, 'netlify.toml'),
        JSON.stringify(netlifyConfig, null, 2),
        'utf8'
      )
      console.log('✅ netlify.toml generado')
    }
    
    // Generar script should-skip-build
    console.log('📝 Generando script should-skip-build...')
    const skipBuildScript = generateSkipBuildScript()
    const scriptsDir = path.join(projectRoot, 'scripts')
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true })
    }
    fs.writeFileSync(
      path.join(scriptsDir, 'should-skip-build.js'),
      skipBuildScript,
      'utf8'
    )
    // Hacer ejecutable
    fs.chmodSync(path.join(scriptsDir, 'should-skip-build.js'), '755')
    console.log('✅ should-skip-build.js generado')
    
    // Generar endpoints de cron
    if (PRODUCTION_CONFIG.cron.enabled) {
      console.log('📝 Generando endpoints de cron...')
      const cronEndpoints = generateCronEndpoints()
      
      for (const endpoint of cronEndpoints) {
        const fullPath = path.join(projectRoot, endpoint.path)
        const dir = path.dirname(fullPath)
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(fullPath, endpoint.content, 'utf8')
        console.log(`✅ ${endpoint.path} generado`)
      }
    }
    
    console.log('🎉 Hooks de producción configurados exitosamente!')
    
    // Mostrar resumen
    console.log('\n📋 Resumen de configuración:')
    console.log(`   Vercel: ${PRODUCTION_CONFIG.platforms.vercel.enabled ? '✅' : '❌'}`)
    console.log(`   Netlify: ${PRODUCTION_CONFIG.platforms.netlify.enabled ? '✅' : '❌'}`)
    console.log(`   Cron Jobs: ${PRODUCTION_CONFIG.cron.enabled ? '✅' : '❌'}`)
    console.log(`   File Watcher: ${PRODUCTION_CONFIG.fileWatcher.enabled ? '✅' : '❌'}`)
    
    if (PRODUCTION_CONFIG.cron.enabled) {
      console.log('\n⏰ Cron Jobs configurados:')
      console.log(`   SEO: ${PRODUCTION_CONFIG.cron.schedules.seo}`)
      console.log(`   MCP: ${PRODUCTION_CONFIG.cron.schedules.mcp}`)
      console.log(`   Integrity: ${PRODUCTION_CONFIG.cron.schedules.integrity}`)
    }
    
    console.log('\n🔧 Variables de entorno requeridas:')
    console.log('   CRON_SECRET=<secret-for-cron-endpoints>')
    console.log('   GITHUB_WEBHOOK_SECRET=<optional-github-webhook-secret>')
    console.log('   MCP_ADMIN_USER=<mcp-admin-username>')
    console.log('   MCP_ADMIN_PASSWORD=<mcp-admin-password>')
    
    return {
      success: true,
      vercel: PRODUCTION_CONFIG.platforms.vercel.enabled,
      netlify: PRODUCTION_CONFIG.platforms.netlify.enabled,
      cron: PRODUCTION_CONFIG.cron.enabled,
      fileWatcher: PRODUCTION_CONFIG.fileWatcher.enabled
    }
    
  } catch (error) {
    console.error('❌ Error configurando hooks de producción:', error)
    throw error
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { main, PRODUCTION_CONFIG }