import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { mcpLogger } from '@/lib/mcp-logger'
import { requireOAuthScopes } from '@/lib/mcp-oauth'
import { respondAsMcpOrJson, respondErrorAsMcpOrJson } from '@/lib/mcp-format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'posts_rebuild'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, { status: 200, headers: { ...corsHeaders } })
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'OPTIONS', true, Date.now() - start, 200, ua)
  return res
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined

  const { error: authError } = requireOAuthScopes(request, ['posts:write'])
  if (authError) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, authError.status || 401, ua)
    return authError
  }

  const rateResult = createRateLimitMiddleware(TOOL_NAME)(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 429, ua)
    return respondErrorAsMcpOrJson(
      request,
      'Rate limit exceeded',
      429,
      'rate_limit_exceeded',
      { retryAfter: rateResult.retryAfter },
      TOOL_NAME,
      getRateLimitHeaders(rateResult)
    )
  }

  const apiKey = process.env.E2D_MCP_API_KEY
  if (!apiKey) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 500, ua)
    return respondErrorAsMcpOrJson(request, 'Missing E2D_MCP_API_KEY on server', 500, 'server_misconfigured', undefined, TOOL_NAME)
  }

  const adminRebuildUrl = process.env.ADMIN_REBUILD_URL
  if (!adminRebuildUrl) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 500, ua)
    return respondErrorAsMcpOrJson(request, 'Missing ADMIN_REBUILD_URL on server', 500, 'server_misconfigured', undefined, TOOL_NAME)
  }

  const startedAt = new Date().toISOString()

  let upstream: Response
  try {
    upstream = await fetch(adminRebuildUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ noRestart: false }),
    })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 502, ua)
    return respondErrorAsMcpOrJson(request, 'Failed to reach admin rebuild endpoint', 502, 'upstream_unreachable', { details }, TOOL_NAME)
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '')
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 502, ua)
    return respondErrorAsMcpOrJson(request, 'Admin rebuild endpoint returned error', 502, 'upstream_error', { upstreamStatus: upstream.status, details: text.slice(0, 200) }, TOOL_NAME)
  }

  const elapsed = Date.now() - start
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', true, elapsed, 200, ua)

  return respondAsMcpOrJson(
    request,
    {
      tool: TOOL_NAME,
      rebuilding: true,
      started_at: startedAt,
      processingTime: elapsed,
    },
    200,
    TOOL_NAME,
    { 'X-Content-Type': 'mcp-tool-response' }
  )
}
