/**
 * MCP Tool: posts_search
 * 
 * Herramienta MCP para buscar artículos del blog que coincidan con una consulta textual.
 * Reutiliza la lógica del ai-answers-service pero devuelve múltiples resultados
 * estructurados para consumo por modelos de IA.
 * 
 * @route GET /api/mcp/tools/posts/search
 * @tool posts_search
 * @category content
 */

import { NextRequest, NextResponse } from 'next/server'
import type { RuntimePost as Post } from '@/lib/blog/posts-runtime'
import { mcpLogger } from '@/lib/mcp-logger'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { requireOAuthScopes } from '@/lib/mcp-oauth'
import { searchPosts as searchBlogPosts, type BlogLocale } from '@/lib/blog/posts'

/**
 * Configuración de la herramienta
 */
const TOOL_CONFIG = {
  name: 'posts_search',
  version: '1.0.0',
  maxResults: 10,
  defaultLimit: 5,
  maxQueryLength: 500,
  cacheMaxAge: 300, // 5 minutos
}

/**
 * Headers CORS para acceso de IA
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
}

/**
 * Headers específicos para MCP
 */
const mcpHeaders = {
  'X-MCP-Tool': TOOL_CONFIG.name,
  'X-MCP-Version': '1.0',
  'X-Content-Type': 'mcp-tool-response',
  'Cache-Control': `public, max-age=${TOOL_CONFIG.cacheMaxAge}, s-maxage=${TOOL_CONFIG.cacheMaxAge}`,
}

/**
 * Estructura de resultado de búsqueda
 */
interface SearchResult {
  title: string
  description: string
  url: string
  publishedDate: string
  lastUpdated: string
  locale: string
  tags: string[]
  readingTime: Post['readingTime']
  relevanceScore: number
  contentSnippet?: string
  author: string
  metadata: {
    wordCount: number
    contentType: string
    slug: string
  }
}

/**
 * Estructura de respuesta de la herramienta
 */
interface ToolResponse {
  tool: string
  query: string
  results: SearchResult[]
  totalResults: number
  processingTime: number
  timestamp: string
  metadata: {
    locale: string
    limit: number
    includeContent: boolean
    version: string
  }
}

/**
 * Busca posts relevantes
 */
async function searchPosts(
  query: string,
  locale: string = 'es',
  limit: number = TOOL_CONFIG.defaultLimit,
  includeContent: boolean = true
): Promise<SearchResult[]> {
  const results = await searchBlogPosts({
    query,
    locale: locale as BlogLocale,
    limit,
    includeSnippet: includeContent,
  })

  return results.map((item) => ({
    title: item.title,
    description: item.excerpt || '',
    url: item.url,
    publishedDate: item.date,
    lastUpdated: item.date,
    locale: item.locale,
    tags: item.tags,
    readingTime: item.readingTime as Post['readingTime'],
    relevanceScore: item.relevanceScore,
    ...(includeContent && item.contentSnippet ? { contentSnippet: item.contentSnippet } : {}),
    author: item.author,
    metadata: {
      wordCount: item.wordCount,
      contentType: 'blog_post',
      slug: item.slug,
    },
  }))
}

/**
 * Valida parámetros de entrada
 */
function validateParams(searchParams: URLSearchParams) {
  const query = searchParams.get('query')
  const locale = searchParams.get('locale') || 'es'
  const limitParam = searchParams.get('limit')
  const includeContentParam = searchParams.get('includeContent')
  
  // Validar query
  if (!query || query.trim().length < 2) {
    return {
      valid: false,
      error: 'Query parameter is required and must be at least 2 characters long'
    }
  }
  
  if (query.length > TOOL_CONFIG.maxQueryLength) {
    return {
      valid: false,
      error: `Query parameter must not exceed ${TOOL_CONFIG.maxQueryLength} characters`
    }
  }
  
  // Validar locale
  if (!['es', 'en', 'it'].includes(locale)) {
    return {
      valid: false,
      error: 'Locale must be either "es", "en", or "it"'
    }
  }
  
  // Validar limit
  let limit = TOOL_CONFIG.defaultLimit
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10)
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > TOOL_CONFIG.maxResults) {
      return {
        valid: false,
        error: `Limit must be a number between 1 and ${TOOL_CONFIG.maxResults}`
      }
    }
    limit = parsedLimit
  }
  
  // Validar includeContent
  const includeContent = includeContentParam !== 'false' // Por defecto true
  
  return {
    valid: true,
    query: query.trim(),
    locale,
    limit,
    includeContent
  }
}

/**
 * Maneja solicitudes OPTIONS para CORS
 */
export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
    },
  })
  mcpLogger.logToolInvocation(
    TOOL_CONFIG.name,
    '/api/mcp/tools/posts/search',
    'OPTIONS',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}

/**
 * HEAD: devuelve solo cabeceras MCP/CORS y registra acceso
 */
export async function HEAD(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      ...mcpHeaders,
      'X-Processing-Time': `${Date.now() - startTime}ms`
    }
  })
  mcpLogger.logToolInvocation(
    TOOL_CONFIG.name,
    '/api/mcp/tools/posts/search',
    'HEAD',
    true,
    Date.now() - startTime,
    200,
    userAgent
  )
  return res
}

/**
 * Maneja solicitudes GET
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  
  // Verificar rate limiting
  const rateLimitCheck = createRateLimitMiddleware('posts_search')(request)
  if (!rateLimitCheck.allowed) {
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/posts/search',
      'GET',
      false,
      Date.now() - startTime,
      429,
      userAgent,
      undefined,
      'Rate limit exceeded'
    )
    
    return NextResponse.json(
      {
        tool: TOOL_CONFIG.name,
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${rateLimitCheck.retryAfter} seconds.`,
        retryAfter: rateLimitCheck.retryAfter,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 429,
        headers: {
          ...corsHeaders,
          ...mcpHeaders,
          ...getRateLimitHeaders(rateLimitCheck),
        }
      }
    )
  }
  
  // Autorización OAuth: requiere posts:read
  const { error: authError } = requireOAuthScopes(request, ['posts:read'])
  if (authError) {
  // Log de error de autorización
  mcpLogger.logToolInvocation(
    TOOL_CONFIG.name,
    '/api/mcp/tools/posts/search',
    'GET',
    false,
    Date.now() - startTime,
    authError.status || 401,
    userAgent,
    undefined,
    'Authorization failed (missing scope posts:read)'
  )
  return authError
  }
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Validar parámetros
    const validation = validateParams(searchParams)
    if (!validation.valid) {
      mcpLogger.logToolInvocation(
        TOOL_CONFIG.name,
        '/api/mcp/tools/posts/search',
        'GET',
        false,
        Date.now() - startTime,
        400,
        userAgent,
        searchParams.get('query') || undefined,
        validation.error
      )
      
      return NextResponse.json(
        {
          tool: TOOL_CONFIG.name,
          error: 'Invalid parameters',
          message: validation.error,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            ...mcpHeaders,
            ...getRateLimitHeaders(rateLimitCheck),
          }
        }
      )
    }
    
    const { query, locale, limit, includeContent } = validation
    
    // Realizar búsqueda
    const results = await searchPosts(query!, locale!, limit!, includeContent!)
    
    // Preparar respuesta
    const response: ToolResponse = {
      tool: TOOL_CONFIG.name,
      query: query!,
      results,
      totalResults: results.length,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        locale: locale!,
        limit: limit!,
        includeContent: includeContent!,
        version: TOOL_CONFIG.version
      }
    }
    
    // Log exitoso
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/posts/search',
      'GET',
      true,
      Date.now() - startTime,
      200,
      userAgent,
      query,
      undefined,
      {
        resultsCount: results.length,
        locale: locale!,
        limit: limit!
      }
    )
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...mcpHeaders,
        ...getRateLimitHeaders(rateLimitCheck),
        'Content-Type': 'application/json; charset=utf-8',
      }
    })
    
  } catch (error) {
    console.error('MCP posts_search Error:', error)
    
    // Log error
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/posts/search',
      'GET',
      false,
      Date.now() - startTime,
      500,
      userAgent,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    )
    
    return NextResponse.json(
      {
        tool: TOOL_CONFIG.name,
        error: 'Internal server error',
        message: 'An error occurred while searching posts',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          ...mcpHeaders,
          ...getRateLimitHeaders(rateLimitCheck),
        }
      }
    )
  }
}

/**
 * Maneja solicitudes POST
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  
  try {
    const body = await request.json()
    
    // Autorización OAuth: requiere posts:read
    const { error: authErrorPost } = requireOAuthScopes(request, ['posts:read'])
    if (authErrorPost) {
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/posts/search',
      'POST',
      false,
      Date.now() - startTime,
      authErrorPost.status || 401,
      userAgent,
      body?.query || undefined,
      'Authorization failed (missing scope posts:read)'
    )
    return authErrorPost
    }
    
    // Validar parámetros del body
    const searchParams = new URLSearchParams()
    if (body.query) searchParams.set('query', body.query)
    if (body.locale) searchParams.set('locale', body.locale)
    if (body.limit) searchParams.set('limit', body.limit.toString())
    if (body.includeContent !== undefined) searchParams.set('includeContent', body.includeContent.toString())
    
    const validation = validateParams(searchParams)
    if (!validation.valid) {
      mcpLogger.logToolInvocation(
        TOOL_CONFIG.name,
        '/api/mcp/tools/posts/search',
        'POST',
        false,
        Date.now() - startTime,
        400,
        userAgent,
        body.query || undefined,
        validation.error
      )
      
      return NextResponse.json(
        {
          tool: TOOL_CONFIG.name,
          error: 'Invalid parameters',
          message: validation.error,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            ...mcpHeaders,
          }
        }
      )
    }
    
    const { query, locale, limit, includeContent } = validation
    
    // Realizar búsqueda
    const results = await searchPosts(query!, locale!, limit!, includeContent!)
    
    // Preparar respuesta
    const response: ToolResponse = {
      tool: TOOL_CONFIG.name,
      query: query!,
      results,
      totalResults: results.length,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        locale: locale!,
        limit: limit!,
        includeContent: includeContent!,
        version: TOOL_CONFIG.version
      }
    }
    
    // Log exitoso
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/posts/search',
      'POST',
      true,
      Date.now() - startTime,
      200,
      userAgent,
      query,
      undefined,
      {
        resultsCount: results.length,
        locale: locale!,
        limit: limit!
      }
    )
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...mcpHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      }
    })
    
  } catch (error) {
    console.error('MCP posts_search POST Error:', error)
    
    // Log error
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/posts/search',
      'POST',
      false,
      Date.now() - startTime,
      500,
      userAgent,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    )
    
    return NextResponse.json(
      {
        tool: TOOL_CONFIG.name,
        error: 'Internal server error',
        message: 'An error occurred while searching posts',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          ...mcpHeaders,
        }
      }
    )
  }
}

export { POST as PUT, POST as DELETE, POST as PATCH }
