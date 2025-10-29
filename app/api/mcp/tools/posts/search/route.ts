/**
 * MCP Tool: posts.search
 * 
 * Herramienta MCP para buscar artículos del blog que coincidan con una consulta textual.
 * Reutiliza la lógica del ai-answers-service pero devuelve múltiples resultados
 * estructurados para consumo por modelos de IA.
 * 
 * @route GET /api/mcp/tools/posts/search
 * @tool posts.search
 * @category content
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiAnswersService } from '@/lib/ai-answers-service'
import { allPosts } from '@/.contentlayer/generated'
import type { Post } from '@/.contentlayer/generated'
import { mcpLogger } from '@/lib/mcp-logger'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'

/**
 * Configuración de la herramienta
 */
const TOOL_CONFIG = {
  name: 'posts.search',
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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With',
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
  readingTime: any
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
 * Calcula puntuación de relevancia para un post
 */
function calculateRelevanceScore(query: string, post: Post): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1) // Changed from > 2 to > 1
  let score = 0
  
  // Puntuación por título (peso: 3)
  const titleMatches = queryWords.filter(word => 
    post.title.toLowerCase().includes(word)
  ).length
  score += (titleMatches / queryWords.length) * 3
  
  // Puntuación por descripción (peso: 2)
  if (post.description) {
    const descMatches = queryWords.filter(word => 
      post.description!.toLowerCase().includes(word)
    ).length
    score += (descMatches / queryWords.length) * 2
  }
  
  // Puntuación por tags (peso: 2)
  if (post.tags) {
    const tagMatches = queryWords.filter(word => 
      post.tags!.some(tag => tag.toLowerCase().includes(word))
    ).length
    score += (tagMatches / queryWords.length) * 2
  }
  
  // Puntuación por contenido (peso: 1)
  if (post.body?.raw) {
    const contentMatches = queryWords.filter(word => 
      post.body.raw.toLowerCase().includes(word)
    ).length
    score += (contentMatches / queryWords.length) * 1
  }
  
  return Math.min(score, 1) // Normalizar a 0-1
}

/**
 * Extrae fragmento relevante del contenido
 */
function extractContentSnippet(content: string, query: string, maxLength: number = 200): string {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Buscar la oración más relevante
  let bestSentence = sentences[0] || ''
  let maxMatches = 0
  
  for (const sentence of sentences) {
    const matches = queryWords.filter(word => 
      sentence.toLowerCase().includes(word)
    ).length
    
    if (matches > maxMatches) {
      maxMatches = matches
      bestSentence = sentence
    }
  }
  
  // Truncar si es necesario
  if (bestSentence.length > maxLength) {
    bestSentence = bestSentence.substring(0, maxLength - 3) + '...'
  }
  
  return bestSentence.trim()
}

/**
 * Busca posts relevantes
 */
function searchPosts(
  query: string, 
  locale: string = 'es', 
  limit: number = TOOL_CONFIG.defaultLimit,
  includeContent: boolean = true
): SearchResult[] {
  // Filtrar posts por locale y estado publicado
  const availablePosts = allPosts.filter(post => 
    post.locale === locale && 
    post.published !== false
  )
  
  if (availablePosts.length === 0) {
    return []
  }
  
  // Calcular relevancia y ordenar
  const scoredPosts = availablePosts
    .map(post => ({
      post,
      score: calculateRelevanceScore(query, post)
    }))
    .filter(item => item.score > 0.1) // Filtrar resultados muy irrelevantes
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  
  // Convertir a formato de respuesta
  return scoredPosts.map(({ post, score }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
    const postUrl = `${baseUrl}/${post.locale}/blog/${post.slug}`
    
    const result: SearchResult = {
      title: post.title,
      description: post.description || '',
      url: postUrl,
      publishedDate: post.date,
      lastUpdated: post.date, // Using same date as no lastUpdated field exists
      locale: post.locale,
      tags: post.tags || [],
      readingTime: post.readingTime,
      relevanceScore: Math.round(score * 100) / 100, // Redondear a 2 decimales
      author: post.author || 'Alberto Carrasco',
      metadata: {
        wordCount: post.wordCount || 0,
        contentType: 'blog_post',
        slug: post.slug
      }
    }
    
    // Incluir fragmento de contenido si se solicita
    if (includeContent && post.body?.raw) {
      result.contentSnippet = extractContentSnippet(post.body.raw, query)
    }
    
    return result
  })
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
  if (!['es', 'en'].includes(locale)) {
    return {
      valid: false,
      error: 'Locale must be either "es" or "en"'
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
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

/**
 * Maneja solicitudes GET
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  
  // Verificar rate limiting
  const rateLimitCheck = createRateLimitMiddleware('posts.search')(request)
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
    const results = searchPosts(query!, locale!, limit!, includeContent!)
    
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
    console.error('MCP posts.search Error:', error)
    
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
    const results = searchPosts(query!, locale!, limit!, includeContent!)
    
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
    console.error('MCP posts.search POST Error:', error)
    
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