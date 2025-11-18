/**
 * MCP Wrapper Tool: search
 * 
 * Endpoint MCP estándar para búsqueda (POST) que formatea la salida en content[]
 * y mantiene compatibilidad dual (MCP y JSON clásico) usando lib/mcp-format.
 * Reutiliza la lógica de posts.search (filtrado y scoring) sobre Contentlayer.
 * 
 * @route POST /api/mcp/tools/search
 * @tool search
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

const TOOL_NAME = 'search'

// Headers específicos para MCP
const mcpHeaders = {
  'X-MCP-Tool': TOOL_NAME,
  'X-MCP-Version': '1.0',
  'X-Content-Type': 'mcp-tool-response',
}

// Configuración
const CONFIG = {
  defaultLimit: 5,
  maxLimit: 10,
  maxQueryLength: 500,
}

interface SearchInput {
  query: string
  locale?: 'es' | 'en' | 'it'
  limit?: number
  includeContent?: boolean
}

interface SearchResult {
  title: string
  description: string
  url: string
  locale: string
  slug: string
  relevanceScore: number
  contentSnippet?: string
  author?: string
}

function calculateRelevanceScore(query: string, post: Post): number {
  const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1)
  let score = 0
  const titleMatches = qWords.filter(w => post.title.toLowerCase().includes(w)).length
  score += (titleMatches / qWords.length) * 3
  if (post.description) {
    const descMatches = qWords.filter(w => post.description!.toLowerCase().includes(w)).length
    score += (descMatches / qWords.length) * 2
  }
  if (post.tags) {
    const tagMatches = qWords.filter(w => post.tags!.some(t => t.toLowerCase().includes(w))).length
    score += (tagMatches / qWords.length) * 2
  }
  if ((post as any).body?.raw) {
    const contentMatches = qWords.filter(w => (post as any).body.raw.toLowerCase().includes(w)).length
    score += (contentMatches / qWords.length) * 1
  }
  return Math.min(score, 1)
}

function extractSnippet(content: string, query: string, maxLength = 200): string | undefined {
  const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  let best = sentences[0] || ''
  let maxMatches = 0
  for (const s of sentences) {
    const matches = qWords.filter(w => s.toLowerCase().includes(w)).length
    if (matches > maxMatches) {
      maxMatches = matches
      best = s
    }
  }
  if (!best) return undefined
  if (best.length > maxLength) return best.substring(0, maxLength - 3) + '...'
  return best.trim()
}

function searchPosts(query: string, locale: 'es'|'en'|'it', limit: number, includeContent: boolean): SearchResult[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
  const posts = allPosts.filter(p => p.locale === locale && p.published !== false)
  const scored = posts
    .map(p => ({ p, score: calculateRelevanceScore(query, p as Post) }))
    .filter(it => it.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(({ p, score }) => {
    const result: SearchResult = {
      title: p.title,
      description: p.description || '',
      url: `${baseUrl}/${p.locale}/blog/${p.slug}`,
      locale: p.locale,
      slug: p.slug,
      relevanceScore: Math.round(score * 100) / 100,
      author: p.author || 'Alberto Carrasco',
    }
    if (includeContent && (p as any).body?.raw) {
      result.contentSnippet = extractSnippet((p as any).body.raw, query)
    }
    return result
  })
}

function validateInput(body: Partial<SearchInput>): { ok: boolean; error?: string; data?: Required<SearchInput> } {
  const query = (body.query || '').trim()
  const locale = (body.locale || 'es') as 'es'|'en'|'it'
  let limit = body.limit ?? CONFIG.defaultLimit
  const includeContent = body.includeContent ?? true

  if (!query || query.length < 2) return { ok: false, error: 'query must be at least 2 characters' }
  if (query.length > CONFIG.maxQueryLength) return { ok: false, error: `query must be <= ${CONFIG.maxQueryLength} characters` }
  if (!['es','en','it'].includes(locale)) return { ok: false, error: 'unsupported locale' }
  limit = Math.max(1, Math.min(CONFIG.maxLimit, limit))

  return { ok: true, data: { query, locale, limit, includeContent } }
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
    }
  })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/search',
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

  // Rate limit (usando config por defecto si no hay específica)
  const rateResult = createRateLimitMiddleware(TOOL_NAME)(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/search', 'POST', false, Date.now() - start, 429, ua)
    return respondErrorAsMcpOrJson(request, 'Rate limit exceeded', 429, 'rate_limit_exceeded', { retryAfter: rateResult.retryAfter }, TOOL_NAME, getRateLimitHeaders(rateResult))
  }

  try {
    const body = await request.json().catch(() => ({}))
    const validation = validateInput(body)
    if (!validation.ok) {
      mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/search', 'POST', false, Date.now() - start, 400, ua, body?.query, validation.error)
      return respondErrorAsMcpOrJson(request, 'Invalid parameters', 400, 'invalid_params', { message: validation.error }, TOOL_NAME)
    }

    const { query, locale, limit, includeContent } = validation.data!
    const results = searchPosts(query, locale, limit, includeContent)

    const payload = {
      tool: TOOL_NAME,
      query,
      results,
      totalResults: results.length,
      processingTime: Date.now() - start,
      timestamp: new Date().toISOString(),
      metadata: { locale, limit, includeContent }
    }

    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/search', 'POST', true, Date.now() - start, 200, ua, query, undefined, { resultsCount: results.length })
    return respondAsMcpOrJson(request, payload, 200, TOOL_NAME, { ...getRateLimitHeaders(rateResult), 'Cache-Control': 'public, max-age=60' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/search', 'POST', false, Date.now() - start, 500, ua, undefined, msg)
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
    '/api/mcp/tools/search',
    'HEAD',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}