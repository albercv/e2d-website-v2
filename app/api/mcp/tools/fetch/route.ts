/**
 * MCP Wrapper Tool: fetch
 * 
 * Endpoint MCP estándar para recuperación (POST) que formatea la salida en content[]
 * y mantiene compatibilidad dual (MCP y JSON clásico) usando lib/mcp-format.
 * Reutiliza la lógica de posts.get y admite entrada por slug+locale o url.
 * 
 * @route POST /api/mcp/tools/fetch
 * @tool fetch
 * @category mcp
 */

import { NextRequest, NextResponse } from 'next/server'
import { allPosts } from '@/.contentlayer/generated'
import type { Post } from '@/.contentlayer/generated'
import { mcpLogger } from '@/lib/mcp-logger'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { respondAsMcpOrJson, respondErrorAsMcpOrJson, addMcpHeaders } from '@/lib/mcp-format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'fetch'

// Headers específicos para MCP
const mcpHeaders = {
  'X-MCP-Tool': TOOL_NAME,
  'X-MCP-Version': '1.0',
  'X-Content-Type': 'mcp-tool-response',
}

interface FetchInput {
  url?: string
  slug?: string
  locale?: 'es' | 'en' | 'it'
  includeContent?: boolean
}

function parseSlugLocaleFromUrl(url: string): { slug?: string; locale?: 'es'|'en'|'it' } {
  try {
    const u = new URL(url)
    // Esperado: /{locale}/blog/{slug}
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 3 && ['es','en','it'].includes(parts[0]) && parts[1] === 'blog') {
      return { locale: parts[0] as 'es'|'en'|'it', slug: parts[2] }
    }
  } catch (_) {}
  return {}
}

function findPost({ title, slug, locale }: { title?: string; slug?: string; locale: 'es'|'en'|'it' }): Post | null {
  const posts = allPosts.filter(p => p.locale === locale && p.published !== false)
  if (slug) {
    const match = posts.find(p => p.slug.toLowerCase() === slug!.toLowerCase())
    if (match) return match
  }
  if (title) {
    const match = posts.find(p => p.title.trim().toLowerCase() === title!.trim().toLowerCase())
    if (match) return match
  }
  return null
}

function validateInput(body: Partial<FetchInput>): { ok: boolean; error?: string; data?: Required<FetchInput> } {
  let slug = (body.slug || '').trim()
  let locale = (body.locale || 'es') as 'es'|'en'|'it'
  const includeContent = body.includeContent ?? false
  const url = (body.url || '').trim()

  if (url) {
    const parsed = parseSlugLocaleFromUrl(url)
    if (parsed.slug) slug = parsed.slug!
    if (parsed.locale) locale = parsed.locale!
  }

  if (!slug) return { ok: false, error: 'slug or url is required' }
  if (!['es','en','it'].includes(locale)) return { ok: false, error: 'unsupported locale' }

  return { ok: true, data: { url, slug, locale, includeContent } }
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
      ...mcpHeaders,
      'X-Processing-Time': `${Date.now() - startTime}ms`,
    }
  })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/fetch',
    'OPTIONS',
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

  const rateResult = createRateLimitMiddleware(TOOL_NAME)(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/fetch', 'POST', false, Date.now() - start, 429, ua)
    return respondErrorAsMcpOrJson(request, 'Rate limit exceeded', 429, 'rate_limit_exceeded', { retryAfter: rateResult.retryAfter }, TOOL_NAME, getRateLimitHeaders(rateResult))
  }

  try {
    const body = await request.json().catch(() => ({}))
    const validation = validateInput(body)
    if (!validation.ok) {
      mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/fetch', 'POST', false, Date.now() - start, 400, ua, body?.slug || body?.url, validation.error)
      return respondErrorAsMcpOrJson(request, 'Invalid parameters', 400, 'invalid_params', { message: validation.error }, TOOL_NAME)
    }

    const { slug, locale, includeContent } = validation.data!
    const post = findPost({ slug, locale })

    if (!post) {
      mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/fetch', 'POST', false, Date.now() - start, 404, ua, slug, 'Post not found')
      return respondErrorAsMcpOrJson(request, 'Post not found', 404, 'not_found', { slug, locale }, TOOL_NAME)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
    const payload: any = {
      tool: TOOL_NAME,
      found: true,
      post: {
        title: post.title,
        description: post.description || '',
        url: `${baseUrl}/${post.locale}/blog/${post.slug}`,
        date: post.date,
        locale: post.locale,
        tags: post.tags || [],
        author: post.author || 'Alberto Carrasco',
        slug: post.slug,
        wordCount: post.wordCount || 0,
        readingTime: post.readingTime,
      },
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - start,
      metadata: { includeContent }
    }

    if (includeContent && (post as any).body?.raw) {
      payload.post.body = (post as any).body.raw
    }

    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/fetch', 'POST', true, Date.now() - start, 200, ua, slug)
    return respondAsMcpOrJson(request, payload, 200, TOOL_NAME, { ...getRateLimitHeaders(rateResult), 'Cache-Control': 'public, max-age=60' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/fetch', 'POST', false, Date.now() - start, 500, ua, undefined, msg)
    return respondErrorAsMcpOrJson(request, 'Internal server error', 500, 'internal_error', { message: msg }, TOOL_NAME)
  }
}

export { POST as PUT, POST as DELETE, POST as PATCH }

export async function HEAD(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
      ...mcpHeaders,
      'X-Processing-Time': `${Date.now() - startTime}ms`,
    }
  })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/fetch',
    'HEAD',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}