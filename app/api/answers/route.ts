/**
 * AI Answers API Endpoint
 * 
 * Endpoint público para consultas de IA que permite obtener respuestas
 * estructuradas basadas en el contenido del blog.
 * 
 * @route GET /api/answers
 * @public true
 * @ratelimit 100 requests per minute per IP
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiAnswersService, type SearchParams } from '@/lib/ai-answers-service'

/**
 * Configuración del endpoint
 */
const ENDPOINT_CONFIG = {
  maxQueryLength: 500,
  defaultLocale: 'es',
  maxLimit: 5,
  cacheMaxAge: 300, // 5 minutos
  allowedOrigins: ['*'], // Permitir todos los orígenes para IA
}

/**
 * Headers CORS optimizados para acceso de IA
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 horas
}

/**
 * Headers de cache público
 */
const cacheHeaders = {
  'Cache-Control': `public, max-age=${ENDPOINT_CONFIG.cacheMaxAge}, s-maxage=${ENDPOINT_CONFIG.cacheMaxAge}`,
  'Vary': 'Accept-Encoding',
}

/**
 * Headers específicos para IA
 */
const aiHeaders = {
  'X-Robots-Tag': 'noindex, nofollow', // No indexar el endpoint
  'X-AI-Accessible': 'true', // Indicar que es accesible para IA
  'X-Content-Type': 'structured-data', // Tipo de contenido estructurado
}

/**
 * Maneja solicitudes OPTIONS para CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
    },
  })
}

/**
 * Maneja consultas GET
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Extraer parámetros de consulta
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const locale = searchParams.get('locale') || searchParams.get('lang') || ENDPOINT_CONFIG.defaultLocale
    const limitParam = searchParams.get('limit')
    const includeUnpublished = searchParams.get('include_unpublished') === 'true'

    // Validar parámetros
    const validation = validateParams({ query, locale, limit: limitParam })
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: validation.message,
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            ...aiHeaders,
          }
        }
      )
    }

    // Preparar parámetros de búsqueda
    const searchParameters: SearchParams = {
      query: validation.query!,
      locale: validation.locale!,
      limit: validation.limit!,
      includeUnpublished,
    }

    // Procesar consulta
    const result = await aiAnswersService.processQuery(searchParameters)

    // Manejar caso sin resultados
    if (!result) {
      return NextResponse.json(
        {
          query: searchParameters.query,
          answer: null,
          message: 'No relevant content found for this query',
          suggestions: await generateSuggestions(searchParameters.locale || 'es'),
          code: 'NO_RESULTS',
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
        {
          status: 404,
          headers: {
            ...corsHeaders,
            ...cacheHeaders,
            ...aiHeaders,
          }
        }
      )
    }

    // Agregar metadatos de respuesta
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      apiVersion: '1.0.0',
      endpoint: '/api/answers',
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...cacheHeaders,
        ...aiHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      }
    })

  } catch (error) {
    console.error('AI Answers API Error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while processing your query',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          ...aiHeaders,
        }
      }
    )
  }
}

/**
 * Valida parámetros de entrada
 */
function validateParams(params: { query: string | null, locale: string, limit: string | null }) {
  const { query, locale, limit } = params

  // Validar consulta
  if (!query || query.trim().length === 0) {
    return {
      valid: false,
      message: 'Query parameter "q" or "query" is required'
    }
  }

  if (query.length > ENDPOINT_CONFIG.maxQueryLength) {
    return {
      valid: false,
      message: `Query too long. Maximum length is ${ENDPOINT_CONFIG.maxQueryLength} characters`
    }
  }

  // Validar idioma
  if (!['es', 'en', 'it'].includes(locale)) {
    return {
      valid: false,
      message: 'Locale must be "es", "en" or "it"'
    }
  }

  // Validar límite
  let parsedLimit = 1
  if (limit) {
    parsedLimit = parseInt(limit, 10)
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > ENDPOINT_CONFIG.maxLimit) {
      return {
        valid: false,
        message: `Limit must be a number between 1 and ${ENDPOINT_CONFIG.maxLimit}`
      }
    }
  }

  return {
    valid: true,
    query: query.trim(),
    locale,
    limit: parsedLimit,
  }
}

/**
 * Genera sugerencias cuando no hay resultados
 */
async function generateSuggestions(locale: string): Promise<string[]> {
  const stats = aiAnswersService.getServiceStats()
  
  let suggestions: string[]
  switch (locale) {
    case 'es':
      suggestions = [
        'Intenta usar términos más generales',
        'Busca por temas como: automatización, chatbots, desarrollo web',
        'Revisa los tags disponibles para ideas',
      ]
      break
    case 'it':
      suggestions = [
        'Prova a usare termini più generali',
        'Cerca argomenti come: automazione, chatbot, sviluppo web',
        'Controlla i tag disponibili per suggerimenti',
      ]
      break
    default:
      suggestions = [
        'Try using more general terms',
        'Search for topics like: automation, chatbots, web development',
        'Check available tags for ideas',
      ]
  }

  // Agregar tags populares como sugerencias
  if (stats.availableTags.length > 0) {
    const popularTags = stats.availableTags.slice(0, 5)
    const tagSuggestion = locale === 'es'
      ? `Tags disponibles: ${popularTags.join(', ')}`
      : locale === 'it'
        ? `Tag disponibili: ${popularTags.join(', ')}`
        : `Available tags: ${popularTags.join(', ')}`
    suggestions.push(tagSuggestion)
  }

  return suggestions
}

/**
 * Maneja métodos no permitidos
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only supports GET requests',
      code: 'METHOD_NOT_ALLOWED',
    },
    {
      status: 405,
      headers: {
        ...corsHeaders,
        'Allow': 'GET, OPTIONS',
      }
    }
  )
}

export { POST as PUT, POST as DELETE, POST as PATCH }