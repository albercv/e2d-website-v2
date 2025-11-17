import { NextRequest, NextResponse } from 'next/server'
import { allPosts } from '@/.contentlayer/generated'
import type { Post } from '@/.contentlayer/generated'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { mcpLogger } from '@/lib/mcp-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'posts.get'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

const mcpHeaders = {
  'X-MCP-Tool': TOOL_NAME,
  'X-MCP-Version': '1.0',
  'X-Content-Type': 'mcp-tool-response',
}

function findPost({ title, slug, locale }: { title?: string; slug?: string; locale: string }): Post | null {
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

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, {
    status: 200,
    headers: { ...corsHeaders, ...mcpHeaders, 'X-Processing-Time': `${Date.now() - startTime}ms` },
  })
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/get', 'OPTIONS', true, Date.now() - startTime, 200, userAgent)
  return res
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined

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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
  const result: any = {
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
    processingTime: elapsed,
    metadata: { includeContent }
  }

  if (includeContent && post.body?.raw) {
    result.post.body = post.body.raw
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