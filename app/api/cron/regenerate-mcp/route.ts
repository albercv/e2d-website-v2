import { NextRequest, NextResponse } from 'next/server'
import { main as generateMCPDocs } from '@/scripts/generate-mcp-docs'
import { isCronAuthorized } from '@/lib/server/cron-auth'

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
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
