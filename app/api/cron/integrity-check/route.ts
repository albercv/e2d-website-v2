import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import { fromProjectRoot, getProjectRoot } from '@/lib/server/project-root'
import { isCronAuthorized } from '@/lib/server/cron-auth'

// Sitemap y RSS ya no son ficheros en public/ (app/sitemap.ts y
// app/feed/[locale]); comprobarlos aquí marcaba el sistema como "unhealthy"
// en cada ejecución y relanzaba la regeneración inútilmente.
const REQUIRED_FILES = {
  mcpUsage: 'docs/mcp-usage.md',
  mcpExamples: 'docs/mcp-examples.md',
  mcpChangelog: 'docs/mcp-changelog.md',
} as const

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting scheduled integrity check...')

    const checks = Object.fromEntries(
      Object.entries(REQUIRED_FILES).map(([key, rel]) => [key, fs.existsSync(fromProjectRoot(rel))])
    ) as Record<keyof typeof REQUIRED_FILES, boolean>

    const allHealthy = Object.values(checks).every(Boolean)

    if (!allHealthy) {
      console.warn('Integrity check failed, some files are missing')
      execSync('npm run seo:regenerate', { stdio: 'inherit', cwd: getProjectRoot() })
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
