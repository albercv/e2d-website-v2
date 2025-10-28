import { NextRequest, NextResponse } from "next/server"
import { aiAnswersService } from "@/lib/ai-answers-service"
import { mcpLogger } from "@/lib/mcp-logger"
import { rateLimiter, getRateLimitConfig } from "@/lib/rate-limiter"

/**
 * MCP Tool: agent.query
 * 
 * Expone el agente IA interno de E2D públicamente a través del protocolo MCP.
 * Permite a modelos externos (ChatGPT, Claude) consultar al agente E2D.
 * 
 * @route POST /api/mcp/tools/agent/query
 */

interface AgentQueryRequest {
  prompt: string
  locale?: string
  includeContext?: boolean
}

interface AgentQueryResponse {
  response: string
  source: string
  timestamp: string
  confidence?: number
  tokens_used?: number
  metadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Aplicar rate limiting
    const rateLimitConfig = getRateLimitConfig('MCP_AGENT')
    const identifier = rateLimiter.generateIdentifier(request)
    const rateLimitResult = rateLimiter.checkLimit(identifier, rateLimitConfig)

    if (!rateLimitResult.allowed) {
      // Log de rate limit excedido
      mcpLogger.logRateLimitExceeded(
        '/api/mcp/tools/agent/query',
        request.headers.get('user-agent') || undefined,
        rateLimiter.generateIdentifier(request, 'ip')
      )

      return NextResponse.json(
        { 
          error: rateLimitConfig.message,
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-MCP-Tool': 'agent.query',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '300'
          }
        }
      )
    }
    // Validar Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-MCP-Tool': 'agent.query'
          }
        }
      )
    }

    // Parsear body
    let body: AgentQueryRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-MCP-Tool': 'agent.query'
          }
        }
      )
    }

    // Validar parámetros
    const { prompt, locale = 'es', includeContext = true } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt parameter' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-MCP-Tool': 'agent.query'
          }
        }
      )
    }

    // Validar longitud del prompt
    if (prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt cannot be empty' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-MCP-Tool': 'agent.query'
          }
        }
      )
    }

    if (prompt.length > 800) {
      return NextResponse.json(
        { error: 'Prompt exceeds maximum length of 800 characters' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-MCP-Tool': 'agent.query'
          }
        }
      )
    }

    // Validar locale
    const supportedLocales = ['es', 'en']
    if (!supportedLocales.includes(locale)) {
      return NextResponse.json(
        { error: `Unsupported locale. Supported: ${supportedLocales.join(', ')}` },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-MCP-Tool': 'agent.query'
          }
        }
      )
    }

    // Procesar consulta con el agente IA interno
    const aiResponse = await aiAnswersService.processQuery({
      query: prompt,
      locale,
      limit: 1,
      includeUnpublished: false
    })

    const processingTime = Date.now() - startTime

    // Si no hay respuesta del agente, generar respuesta genérica
    if (!aiResponse) {
      const fallbackResponse: AgentQueryResponse = {
        response: locale === 'es' 
          ? "Lo siento, no pude encontrar información específica sobre tu consulta en nuestra base de conocimientos. Te recomiendo contactar directamente con nuestro equipo para obtener una respuesta personalizada."
          : "I'm sorry, I couldn't find specific information about your query in our knowledge base. I recommend contacting our team directly for a personalized response.",
        source: "E2D Agent",
        timestamp: new Date().toISOString(),
        confidence: 0,
        metadata: {
          agent: "E2D Assistant",
          version: "1.0.0",
          processing_time_ms: processingTime
        }
      }

      // Log de respuesta exitosa
      mcpLogger.logToolInvocation(
        'agent.query',
        '/api/mcp/tools/agent/query',
        'POST',
        true,
        processingTime,
        200,
        request.headers.get('user-agent') || undefined,
        prompt
      )

      return NextResponse.json(fallbackResponse, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-MCP-Tool': 'agent.query',
          'X-Processing-Time': `${processingTime}ms`,
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      })
    }

    // Construir respuesta estructurada
    const response: AgentQueryResponse = {
      response: aiResponse.answer,
      source: "E2D Agent",
      timestamp: new Date().toISOString(),
      confidence: aiResponse.confidence,
      metadata: {
        agent: "E2D Assistant",
        version: "1.0.0",
        processing_time_ms: processingTime
      }
    }

    // Incluir contexto adicional si se solicita
    if (includeContext && aiResponse.sourceTitle) {
      response.metadata = {
        ...response.metadata,
        source_article: aiResponse.sourceTitle,
        source_url: aiResponse.source,
        related_tags: aiResponse.relatedTags,
        content_type: aiResponse.metadata.contentType,
        author: aiResponse.metadata.author
      }
    }

    // Log de respuesta exitosa
    mcpLogger.logToolInvocation(
      'agent.query',
      '/api/mcp/tools/agent/query',
      'POST',
      true,
      processingTime,
      200,
      request.headers.get('user-agent') || undefined,
      prompt,
      undefined,
      { confidence: aiResponse.confidence }
    )

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-MCP-Tool': 'agent.query',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Confidence': aiResponse.confidence?.toString() || '0',
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    // Log de error
    mcpLogger.logError(
      '/api/mcp/tools/agent/query',
      'POST',
      (error as Error).message,
      500,
      request.headers.get('user-agent') || undefined,
      { error: (error as Error).stack }
    )

    console.error('Error in agent.query MCP tool:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-MCP-Tool': 'agent.query'
        }
      }
    )
  }
}

// Manejar preflight requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-MCP-Tool': 'agent.query'
    }
  })
}