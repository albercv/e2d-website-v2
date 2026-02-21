import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { allPosts } from '@/.contentlayer/generated'
import type { Post } from '@/.contentlayer/generated'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { mcpLogger } from '@/lib/mcp-logger'
import { requireOAuthScopes } from '@/lib/mcp-oauth'
import { respondAsMcpOrJson, respondErrorAsMcpOrJson } from '@/lib/mcp-format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'posts.create'

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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function validateLocale(locale: string): boolean {
  return ['es', 'en', 'it'].includes(locale)
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, { 
    status: 200,
    headers: {
      ...corsHeaders,
    }
  })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/posts/create',
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

  // Auth requerida (OAuth2 JWT + scope posts:write)
  const { error: authError } = requireOAuthScopes(request, ['posts:write'])
  if (authError) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/create', 'POST', false, Date.now() - start, authError.status || 401, ua)
    return authError
  }

  // Rate limit (usa config por defecto bajo nombre posts.create)
  const rateResult = createRateLimitMiddleware('posts.create')(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/create', 'POST', false, Date.now() - start, 429, ua)
    return respondErrorAsMcpOrJson(request, 'Rate limit exceeded', 429, 'rate_limit_exceeded', { retryAfter: rateResult.retryAfter }, TOOL_NAME, getRateLimitHeaders(rateResult))
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    // return NextResponse.json(
    //   { error: 'Invalid JSON body' },
    //   { status: 400, headers: { ...corsHeaders, ...mcpHeaders } }
    // )
    return respondErrorAsMcpOrJson(request, 'Invalid JSON body', 400, 'invalid_json', undefined, TOOL_NAME)
  }

  const payloadObj = (typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {})
  const title = typeof payloadObj.title === 'string' ? payloadObj.title : undefined
  const description = typeof payloadObj.description === 'string' ? payloadObj.description : undefined
  const locale = typeof payloadObj.locale === 'string' ? payloadObj.locale : 'es'
  const content = typeof payloadObj.content === 'string' ? payloadObj.content : undefined
  const tags = Array.isArray(payloadObj.tags) ? payloadObj.tags.filter(t => typeof t === 'string') as string[] : []
  const date = typeof payloadObj.date === 'string' ? payloadObj.date : new Date().toISOString().slice(0, 10)
  const published = payloadObj.published !== false
  const author = typeof payloadObj.author === 'string' ? payloadObj.author : 'Alberto Carrasco'

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return respondErrorAsMcpOrJson(request, 'title is required and must be at least 3 characters', 400, 'invalid_params', { field: 'title' }, TOOL_NAME)
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return respondErrorAsMcpOrJson(request, 'description is required and must be at least 10 characters', 400, 'invalid_params', { field: 'description' }, TOOL_NAME)
  }

  if (!validateLocale(locale)) {
    return respondErrorAsMcpOrJson(request, 'Unsupported locale', 400, 'unsupported_locale', { supported: ['es','en','it'] }, TOOL_NAME)
  }

  if (!content || typeof content !== 'string' || content.trim().length < 50) {
    return respondErrorAsMcpOrJson(request, 'content is required and must be at least 50 characters', 400, 'invalid_params', { field: 'content' }, TOOL_NAME)
  }

  const slug = slugify(title)

  // Evita colisión con posts existentes en el mismo locale
  const conflict = allPosts.find((p: Post) => p.locale === locale && p.slug.toLowerCase() === slug)
  if (conflict) {
    return respondErrorAsMcpOrJson(request, 'Post already exists', 409, 'conflict', { slug, locale }, TOOL_NAME)
  }

  // Genera frontmatter y contenido MDX
  const frontmatterLines: string[] = [
    '---',
    `title: ${title.replace(/:\n/g, ' ').trim()}`,
    `description: ${description.replace(/:\n/g, ' ').trim()}`,
    `date: ${date}`,
    `locale: ${locale}`,
    `slug: ${slug}`,
    tags.length ? `tags: [${tags.map(t => `'${t}'`).join(', ')}]` : 'tags: []',
    `author: ${author}`,
    `published: ${published ? 'true' : 'false'}`,
    '---',
  ]

  const mdx = frontmatterLines.join('\n') + '\n\n' + content.trim() + '\n'

  const postsDir = path.resolve(process.cwd(), 'content', 'posts')
  const filePath = path.resolve(postsDir, `${slug}.mdx`)

  try {
    await fs.mkdir(postsDir, { recursive: true })
    await fs.writeFile(filePath, mdx, { encoding: 'utf-8' })
  } catch (err) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/create', 'POST', false, Date.now() - start, 500, ua)
    const details = err instanceof Error ? err.message : String(err)
    return respondErrorAsMcpOrJson(request, 'Failed to write file', 500, 'internal_error', { details }, TOOL_NAME)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
  const elapsed = Date.now() - start

  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/create', 'POST', true, elapsed, 201, ua)
  const payloadOut = {
    tool: TOOL_NAME,
    created: true,
    slug,
    locale,
    url: `${baseUrl}/${locale}/blog/${slug}`,
    path: filePath,
    timestamp: new Date().toISOString(),
    processingTime: elapsed,
  }

  // Trigger optional rebuild (admin endpoint) asynchronously
  if (process.env.AUTO_REBUILD_AFTER_MCP_CHANGE === 'true' && process.env.ADMIN_REBUILD_URL) {
    try {
      const rebuildUrl = process.env.ADMIN_REBUILD_URL!
      const apiKey = process.env.E2D_MCP_API_KEY || ''
      // Fire-and-forget; don't await to avoid delaying the response
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

  return respondAsMcpOrJson(request, payloadOut, 201, TOOL_NAME, { 'X-Content-Type': 'mcp-tool-response' })
}

export async function HEAD(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, { 
    status: 200,
    headers: {
      ...corsHeaders,
      ...mcpHeaders,
      'X-Processing-Time': `${Date.now() - startTime}ms`,
    }
  })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/posts/create',
    'HEAD',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}
