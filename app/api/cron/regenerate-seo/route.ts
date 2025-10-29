import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET(request: NextRequest) {
  // Verificar autorización (Vercel Cron secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
