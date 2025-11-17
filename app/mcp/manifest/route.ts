import { NextRequest, NextResponse } from 'next/server'
import { mcpLogger } from '@/lib/mcp-logger'
import { applyCORS, applyMCPHeaders } from '@/lib/mcp-headers'

/**
 * Public MCP Manifest endpoint
 * Proxies to the existing /api/mcp/manifest to avoid logic duplication.
 * Supports GET, POST, and OPTIONS.
 */

async function proxyManifest(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const method = request.method
  const userAgent = request.headers.get('user-agent') || undefined

  const upstreamUrl = new URL('/api/mcp/manifest', request.url)
  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': request.headers.get('content-type') || 'application/json',
      'User-Agent': userAgent || 'MCP-Client',
      'X-Requested-With': request.headers.get('x-requested-with') || 'XMLHttpRequest',
    },
    cache: 'no-store',
  }

  if (method === 'POST') {
    // Forward body for POST requests
    const body = await request.text()
    ;(init as RequestInit).body = body
  }

  const upstreamRes = await fetch(upstreamUrl, init)
  const processingTime = Date.now() - startTime

  // Log proxy request
  mcpLogger.logManifestRequest(
    '/mcp/manifest',
    method,
    upstreamRes.ok,
    processingTime,
    upstreamRes.status,
    userAgent
  )

  // Always return standard CORS + MCP headers, regardless of upstream headers
  const headers: Record<string, string> = {
    ...applyCORS(['GET', 'POST', 'OPTIONS']),
    ...applyMCPHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
    'X-Processing-Time': `${processingTime}ms`,
  }

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  })
}

export async function GET(request: NextRequest) {
  return proxyManifest(request)
}

export async function POST(request: NextRequest) {
  return proxyManifest(request)
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const headers: Record<string, string> = { ...applyCORS(['GET', 'POST', 'OPTIONS']) }
  mcpLogger.logManifestRequest('/mcp/manifest', 'OPTIONS', true, Date.now() - startTime, 200, userAgent)
  return new NextResponse(null, {
    status: 200,
    headers,
  })
}