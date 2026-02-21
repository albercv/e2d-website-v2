import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { mcpLogger } from '@/lib/mcp-logger'
import { requireOAuthScopes } from '@/lib/mcp-oauth'
import { getPost as getBlogPost, type BlogLocale, type BlogPostResult } from '@/lib/blog/posts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'posts.get'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
}

const mcpHeaders = {
  'X-MCP-Tool': TOOL_NAME,
  'X-MCP-Version': '1.0',
  'X-Content-Type': 'mcp-tool-response',
}

function findPost({ title, slug, locale }: { title?: string; slug?: string; locale: string }): BlogPostResult | null {
  const id = slug || title
  if (!id) return null
  return getBlogPost({ id, includeContent: false, locale: locale as BlogLocale })
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, {
    status: 200,
    headers: { ...corsHeaders },
  })
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/get', 'OPTIONS', true, Date.now() - startTime, 200, userAgent)
  return res
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined

  // Auth requerida (OAuth2 JWT + scope posts:read)
  const { error: authError } = requireOAuthScopes(request, ['posts:read'])
  if (authError) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/get', 'GET', false, Date.now() - start, authError.status || 401, ua)
    return authError
  }

  // Reutilizamos el rate limiter de consultas públicas (similar a posts.search)
  const rateResult = createRateLimitMiddleware('posts.search')(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/get', 'GET', false, Date.now() - start, 429, ua)
    return NextResponse.json(
      { tool: TOOL_NAME, error: 'Rate limit exceeded', retryAfter: rateResult.retryAfter, timestamp: new Date().toISOString() },
      { status: 429, headers: { ...corsHeaders, ...mcpHeaders, ...getRateLimitHeaders(rateResult) } }
    )
  }

  const url = new URL(request.url)
  const title = url.searchParams.get('title') || undefined
  const slug = url.searchParams.get('slug') || undefined
  const locale = url.searchParams.get('locale') || 'es'
  const includeContent = (url.searchParams.get('includeContent') || 'false').toLowerCase() === 'true'

  if (!title && !slug) {
    return NextResponse.json(
      { error: 'title or slug is required', message: 'Provide at least one parameter: title or slug' },
      { status: 400, headers: { ...corsHeaders, ...mcpHeaders } }
    )
  }

  if (!['es', 'en', 'it'].includes(locale)) {
    return NextResponse.json(
      { error: 'Unsupported locale', supported: ['es', 'en', 'it'] },
      { status: 400, headers: { ...corsHeaders, ...mcpHeaders } }
    )
  }

  const post = findPost({ title, slug, locale })
  const elapsed = Date.now() - start

  if (!post) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/get', 'GET', false, elapsed, 404, ua)
    return NextResponse.json(
      { tool: TOOL_NAME, found: false, message: 'Post not found', timestamp: new Date().toISOString(), metadata: { locale } },
      { status: 404, headers: { ...corsHeaders, ...mcpHeaders } }
    )
  }

  const result: {
    tool: string
    found: boolean
    post: {
      title: string
      description: string
      url: string
      date: string
      locale: string
      tags: string[]
      author: string
      slug: string
      wordCount: number
      readingTime: BlogPostResult['readingTime']
      body?: string
    }
    timestamp: string
    processingTime: number
    metadata: { includeContent: boolean }
  } = {
    tool: TOOL_NAME,
    found: true,
    post: {
      title: post.title,
      description: post.excerpt || '',
      url: post.url,
      date: post.date,
      locale: post.locale,
      tags: post.tags || [],
      author: post.author || 'Alberto Carrasco',
      slug: post.slug,
      wordCount: post.wordCount || 0,
      readingTime: post.readingTime,
    },
    timestamp: new Date().toISOString(),
    processingTime: elapsed,
    metadata: { includeContent }
  }

  if (includeContent) {
    const fullPost = getBlogPost({ id: slug || title || "", includeContent: true, locale: locale as BlogLocale })
    if (fullPost?.content) {
      result.post.body = fullPost.content
    }
  }

  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/get', 'GET', true, elapsed, 200, ua)
  return NextResponse.json(result, { status: 200, headers: { ...corsHeaders, ...mcpHeaders, 'Cache-Control': 'public, max-age=60' } })
}

export async function HEAD(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, {
    status: 200,
    headers: { ...corsHeaders, ...mcpHeaders, 'X-Processing-Time': `${Date.now() - startTime}ms` },
  })
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/get', 'HEAD', true, Date.now() - startTime, 200, userAgent)
  return res
}
