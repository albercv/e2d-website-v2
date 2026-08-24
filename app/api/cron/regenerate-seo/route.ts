import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { getProjectRoot } from '@/lib/server/project-root'
import { isCronAuthorized } from '@/lib/server/cron-auth'

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting scheduled SEO regeneration...')

    // cwd explícito: en el standalone process.cwd() es .next/standalone y ahí
    // no existe scripts/, así que `npm run` fallaba con MODULE_NOT_FOUND.
    execSync('npm run seo:regenerate', {
      stdio: 'inherit',
      cwd: getProjectRoot(),
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
