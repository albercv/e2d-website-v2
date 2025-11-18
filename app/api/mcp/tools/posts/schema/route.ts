import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { mcpLogger } from '@/lib/mcp-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'posts.schema'

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

const acceptedLocales = ['es', 'en', 'it']

function getPostSchema() {
  return {
    requiredFields: {
      title: { type: 'string', minLength: 3, description: 'Título del post' },
      description: { type: 'string', minLength: 10, description: 'Descripción breve del post' },
      date: { type: 'string', format: 'date', description: 'Fecha ISO: YYYY-MM-DD' },
      locale: { type: 'string', enum: acceptedLocales, description: 'Idioma del post' },
      slug: { type: 'string', description: 'Slug único para la URL' },
    },
    optionalFields: {
      cover: { type: 'string', description: 'Ruta de imagen de portada (opcional)' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas del post' },
      author: { type: 'string', default: 'Alberto Carrasco', description: 'Autor del post' },
      published: { type: 'boolean', default: true, description: 'Indica si el post está publicado' },
    },
    computedFields: {
      url: { type: 'string', description: 'URL pública del post (computada)' },
      readingTime: { type: 'object', description: 'Tiempo de lectura estimado (computado)' },
      wordCount: { type: 'number', description: 'Conteo de palabras del cuerpo (computado)' },
    },
    body: {
      content: { type: 'string', minLength: 50, description: 'Contenido en MDX del post (no forma parte del frontmatter)' },
    },
    fileLocation: 'content/posts/<slug>.mdx',
  }
}

function getFrontmatterExample() {
  return `---\n` +
    `title: Ejemplo de post MCP\n` +
    `description: Descripción breve del post de ejemplo\n` +
    `date: 2025-01-01\n` +
    `locale: es\n` +
    `slug: ejemplo-de-post-mcp\n` +
    `tags: ['mcp','ejemplo']\n` +
    `author: Alberto Carrasco\n` +
    `published: true\n` +
    `---\n\n` +
    `## Introducción\n` +
    `Contenido del post en MDX...\n`
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, { status: 200, headers: { 
    ...corsHeaders,
  } })
  mcpLogger.logToolInvocation(
    TOOL_NAME,
    '/api/mcp/tools/posts/schema',
    'OPTIONS',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined
  const rateResult = createRateLimitMiddleware('posts.search')(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/schema', 'GET', false, Date.now() - start, 429, ua)
    return NextResponse.json(
      { tool: TOOL_NAME, error: 'Rate limit exceeded', retryAfter: rateResult.retryAfter, timestamp: new Date().toISOString() },
      { status: 429, headers: { ...corsHeaders, ...mcpHeaders, ...getRateLimitHeaders(rateResult) } }
    )
  }

  const url = new URL(request.url)
  const format = (url.searchParams.get('format') || 'json').toLowerCase()

  const schema = getPostSchema()
  const result: any = {
    tool: TOOL_NAME,
    schema,
    acceptedLocales,
    examples: {
      frontmatter: getFrontmatterExample(),
    },
    timestamp: new Date().toISOString(),
    processingTime: Date.now() - start,
  }

  if (format === 'json') {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/schema', 'GET', true, Date.now() - start, 200, ua)
    return NextResponse.json(result, { status: 200, headers: { ...corsHeaders, ...mcpHeaders, 'Cache-Control': 'public, max-age=3600' } })
  }

  // Por ahora, solo devolvemos JSON. El parámetro 'format' se reserva para futuro.
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/schema', 'GET', true, Date.now() - start, 200, ua)
  return NextResponse.json(result, { status: 200, headers: { ...corsHeaders, ...mcpHeaders } })
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
    '/api/mcp/tools/posts/schema',
    'HEAD',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}