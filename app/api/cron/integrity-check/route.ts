import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  // Verificar autorización (Vercel Cron secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
