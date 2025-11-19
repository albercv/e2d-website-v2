import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { allPosts } from '@/.contentlayer/generated'
import type { Post } from '@/.contentlayer/generated'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { mcpLogger } from '@/lib/mcp-logger'
import { requireOAuthScopes } from '@/lib/mcp-oauth'
import { respondAsMcpOrJson, respondErrorAsMcpOrJson, addMcpHeaders } from '@/lib/mcp-format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'posts.delete'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

const mcpHeaders = {
  'X-MCP-Tool': TOOL_NAME,
  'X-MCP-Version': '1.0',
  'X-Content-Type': 'mcp-tool-response',
}

function validateLocale(locale: string): boolean {
  return ['es', 'en', 'it'].includes(locale)
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, { status: 200, headers: { 
    ...corsHeaders,
  } })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/posts/delete',
    'OPTIONS',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}

export async function HEAD(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, { status: 200, headers: { 
    ...corsHeaders,
    ...mcpHeaders,
    'X-Processing-Time': `${Date.now() - startTime}ms`,
  } })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/posts/delete',
    'HEAD',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined

  // Auth requerida (OAuth2 JWT + scope posts:delete)
  const { error: authError } = requireOAuthScopes(request, ['posts:delete'])
  if (authError) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/delete', 'POST', false, Date.now() - start, authError.status || 401, ua)
    return authError
  }

  // Rate limit
  const rateResult = createRateLimitMiddleware('posts.delete')(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/delete', 'POST', false, Date.now() - start, 429, ua)
    return respondErrorAsMcpOrJson(request, 'Rate limit exceeded', 429, 'rate_limit_exceeded', { retryAfter: rateResult.retryAfter }, TOOL_NAME, getRateLimitHeaders(rateResult))
  }

  // Soporte para slug/locale desde query o body
  let slug: string | undefined
  let locale: string | undefined

  const { searchParams } = new URL(request.url)
  slug = searchParams.get('slug') || undefined
  locale = searchParams.get('locale') || undefined

  if (!slug || !locale) {
    try {
      const body = await request.json()
      slug = slug || (body?.slug as string | undefined)
      locale = locale || (body?.locale as string | undefined)
    } catch {
      // ignore
    }
  }

  if (!slug || typeof slug !== 'string') {
    return respondErrorAsMcpOrJson(request, 'slug is required', 400, 'invalid_params', { field: 'slug' }, TOOL_NAME)
  }
  if (!locale || typeof locale !== 'string' || !validateLocale(locale)) {
    return respondErrorAsMcpOrJson(request, 'locale is required and must be one of es,en,it', 400, 'unsupported_locale', { supported: ['es','en','it'] }, TOOL_NAME)
  }

  const target = allPosts.find((p: Post) => p.slug.toLowerCase() === slug!.toLowerCase())
  if (!target) {
    return respondErrorAsMcpOrJson(request, 'Post not found', 404, 'not_found', { slug, locale }, TOOL_NAME)
  }
  if (target.locale !== locale) {
    return respondErrorAsMcpOrJson(request, 'Locale mismatch for slug', 409, 'conflict', { expectedLocale: target.locale, providedLocale: locale }, TOOL_NAME)
  }

  try {
    const filePath = path.resolve(process.cwd(), 'content', target._raw.sourceFilePath)
    await fs.unlink(filePath)
  } catch (err: any) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/delete', 'POST', false, Date.now() - start, 500, ua)
    return respondErrorAsMcpOrJson(request, 'Failed to delete file', 500, 'internal_error', { details: err?.message || String(err) }, TOOL_NAME)
  }

  const elapsed = Date.now() - start
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/delete', 'POST', true, elapsed, 200, ua)
  const payloadOut = {
    tool: TOOL_NAME,
    deleted: true,
    slug,
    locale,
    path: path.resolve(process.cwd(), 'content', target._raw.sourceFilePath),
    timestamp: new Date().toISOString(),
    processingTime: elapsed,
  }

  // Trigger optional rebuild (admin endpoint) asynchronously
  if (process.env.AUTO_REBUILD_AFTER_MCP_CHANGE === 'true' && process.env.ADMIN_REBUILD_URL) {
    try {
      const rebuildUrl = process.env.ADMIN_REBUILD_URL!
      const apiKey = process.env.E2D_MCP_API_KEY || ''
      fetch(rebuildUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ noRestart: false }),
      }).catch(() => {})
    } catch {}
  }

  return respondAsMcpOrJson(request, payloadOut, 200, TOOL_NAME, { 'X-Content-Type': 'mcp-tool-response' })
}

export const PUT = POST
export const DELETE = POST
export const PATCH = POST