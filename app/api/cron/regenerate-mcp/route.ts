import { NextRequest, NextResponse } from 'next/server'
import { main as generateMCPDocs } from '@/scripts/generate-mcp-docs'

export async function GET(request: NextRequest) {
  // Verificar autorización (Vercel Cron secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
