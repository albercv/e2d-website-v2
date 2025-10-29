import { NextRequest, NextResponse } from "next/server"
import { mcpLogger } from "@/lib/mcp-logger"
import { rateLimiter, getRateLimitConfig } from "@/lib/rate-limiter"

/**
 * MCP Tool: agent.query
 * 
 * Expone el agente IA externo de E2D públicamente a través del protocolo MCP.
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

interface ExternalAgentResponse {
  response?: string
  answer?: string
  message?: string
  [key: string]: any
}

/**
 * Llama al agente externo de E2D
 */
async function callExternalAgent(prompt: string, locale: string = 'es'): Promise<ExternalAgentResponse | null> {
  try {
    const webhookUrl = process.env.E2D_AGENT_WEBHOOK_URL || 'https://api.evolve2digital.com/webhook/userMessage'
    
    // Configurar autenticación básica si está disponible
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'E2D-MCP-Client/1.0.0'
    }

    // Usar autenticación básica si están configuradas las credenciales
    const user = process.env.E2D_CHAT_USER
    const pass = process.env.E2D_CHAT_PASSWORD
    if (user && pass) {
      const token = Buffer.from(`${user}:${pass}`).toString('base64')
      headers['Authorization'] = `Basic ${token}`
    } else if (process.env.E2D_AGENT_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.E2D_AGENT_API_KEY}`
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messageType: "MCP-AGENT-QUERY",
        userMessage: prompt,
        message: prompt,
        locale: locale,
        source: 'mcp-agent-query',
        sessionId: `mcp-${Date.now()}`,
        metadata: {
          mcp_tool: 'agent.query',
          timestamp: new Date().toISOString()
        }
      }),
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.error(`External agent responded with status ${response.status}`)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error calling external agent:', error)
    return null
  }
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

    // Procesar consulta con el agente IA externo
    const externalResponse = await callExternalAgent(prompt, locale)

    const processingTime = Date.now() - startTime

    // Si no hay respuesta del agente externo, generar respuesta genérica
    if (!externalResponse) {
      const fallbackResponse: AgentQueryResponse = {
        response: locale === 'es' 
          ? "Lo siento, no pude conectar con nuestro agente en este momento. Por favor, intenta nuevamente más tarde o contacta directamente con nuestro equipo."
          : "I'm sorry, I couldn't connect to our agent at this time. Please try again later or contact our team directly.",
        source: "E2D Agent (Fallback)",
        timestamp: new Date().toISOString(),
        confidence: 0,
        metadata: {
          agent: "E2D Assistant",
          version: "1.0.0",
          processing_time_ms: processingTime,
          fallback: true
        }
      }

      // Log de respuesta de fallback
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

    // Extraer la respuesta del agente externo
    const agentResponse = externalResponse.response || 
                         externalResponse.answer || 
                         externalResponse.message || 
                         externalResponse.userMessage ||
                         externalResponse.text ||
                         'Respuesta no disponible'

    // Construir respuesta estructurada
    const response: AgentQueryResponse = {
      response: agentResponse,
      source: "E2D Agent",
      timestamp: new Date().toISOString(),
      confidence: 0.9, // Asumimos alta confianza del agente externo
      metadata: {
        agent: "E2D Assistant",
        version: "1.0.0",
        processing_time_ms: processingTime,
        external_agent: true
      }
    }

    // Incluir contexto adicional si se solicita
    if (includeContext) {
      response.metadata = {
        ...response.metadata,
        external_response: externalResponse,
        webhook_url: process.env.E2D_AGENT_WEBHOOK_URL || 'https://api.evolve2digital.com/webhook/userMessage'
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
      { confidence: 0.9, external_agent: true }
    )

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-MCP-Tool': 'agent.query',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Confidence': '0.9',
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