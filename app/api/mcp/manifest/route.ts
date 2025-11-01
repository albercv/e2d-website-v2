/**
 * MCP (Model Context Protocol) Manifest Endpoint
 * 
 * Endpoint que expone el contrato MCP oficial del sitio, describiendo
 * todas las herramientas disponibles para modelos de IA como ChatGPT y Claude.
 * 
 * @route GET /api/mcp/manifest
 * @public true
 * @standard MCP 1.0
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Configuración del manifest MCP
 */
const MCP_CONFIG = {
  version: '1.0.0',
  name: 'Evolve2Digital MCP Server',
  description: 'Herramientas MCP para consultar contenido y servicios de Evolve2Digital',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com',
  contact: {
    name: 'Alberto Carrasco',
    email: 'alberto@evolve2digital.com',
    website: 'https://evolve2digital.com'
  }
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
  'X-MCP-Version': '1.0',
  'X-MCP-Server': 'evolve2digital',
  'X-Content-Type': 'mcp-manifest',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache por 1 hora
}

/**
 * Definición de herramientas MCP disponibles
 */
const MCP_TOOLS = {
  'agent.query': {
    name: 'agent.query',
    description: 'Consulta al agente IA interno de E2D (Johanna) para obtener respuestas especializadas sobre servicios, tecnología y automatización',
    category: 'ai-assistant',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Consulta o pregunta para el agente IA de E2D',
          minLength: 5,
          maxLength: 800,
          examples: [
            '¿Cómo puede E2D ayudar con la automatización de WhatsApp?',
            'Explica los beneficios de los chatbots para clínicas',
            '¿Qué servicios de desarrollo web ofrece E2D?'
          ]
        },
        locale: {
          type: 'string',
          description: 'Idioma preferido para la respuesta',
          enum: ['es', 'en', 'it'],
          default: 'es'
        },
        includeContext: {
          type: 'boolean',
          description: 'Incluir contexto adicional en la respuesta',
          default: true
        }
      },
      required: ['prompt'],
      additionalProperties: false
    },
    outputSchema: {
      type: 'object',
      properties: {
        response: { 
          type: 'string',
          description: 'Respuesta generada por el agente IA de E2D'
        },
        source: { 
          type: 'string',
          description: 'Identificador del agente (E2D Agent)'
        },
        timestamp: { 
          type: 'string',
          description: 'Marca de tiempo ISO 8601'
        },
        confidence: { 
          type: 'number',
          description: 'Nivel de confianza de la respuesta (0-1)'
        },
        tokens_used: { 
          type: 'number',
          description: 'Número de tokens utilizados (si disponible)'
        },
        metadata: {
          type: 'object',
          description: 'Metadatos adicionales de la respuesta'
        }
      },
      required: ['response', 'source', 'timestamp']
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/agent/query`,
    method: 'POST',
    rateLimit: {
      requests: 20,
      window: '1h',
      description: '20 requests per hour per IP'
    }
  },

  'posts.search': {
    name: 'posts.search',
    description: 'Busca artículos del blog que coincidan con una consulta textual',
    category: 'content',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Consulta de búsqueda en texto libre',
          minLength: 2,
          maxLength: 500,
          examples: ['automatización WhatsApp', 'desarrollo web moderno', 'chatbots para clínicas']
        },
        locale: {
          type: 'string',
          description: 'Idioma preferido para los resultados',
          enum: ['es', 'en', 'it'],
          default: 'es'
        },
        limit: {
          type: 'integer',
          description: 'Número máximo de resultados a devolver',
          minimum: 1,
          maximum: 10,
          default: 5
        },
        includeContent: {
          type: 'boolean',
          description: 'Incluir fragmentos del contenido en los resultados',
          default: true
        }
      },
      required: ['query'],
      additionalProperties: false
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              url: { type: 'string' },
              publishedDate: { type: 'string' },
              lastUpdated: { type: 'string' },
              locale: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              readingTime: { type: 'object' },
              relevanceScore: { type: 'number' },
              contentSnippet: { type: 'string' },
              author: { type: 'string' }
            }
          }
        },
        totalResults: { type: 'integer' },
        processingTime: { type: 'number' },
        timestamp: { type: 'string' }
      }
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/posts/search`,
    method: 'GET',
    rateLimit: {
      requests: 100,
      window: '1m',
      description: '100 requests per minute per IP'
    }
  },
  
  'appointments.create': {
    name: 'appointments.create',
    description: 'Crea una solicitud de cita o contacto comercial',
    category: 'business',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre completo del solicitante',
          minLength: 2,
          maxLength: 100
        },
        email: {
          type: 'string',
          description: 'Dirección de email válida',
          format: 'email'
        },
        phone: {
          type: 'string',
          description: 'Número de teléfono (opcional)',
          pattern: '^[+]?[0-9\\s\\-\\(\\)]{7,20}$'
        },
        company: {
          type: 'string',
          description: 'Nombre de la empresa (opcional)',
          maxLength: 100
        },
        service: {
          type: 'string',
          description: 'Tipo de servicio solicitado',
          enum: [
            'automatizacion-whatsapp',
            'desarrollo-web',
            'chatbots',
            'consultoria-digital',
            'marketing-automation',
            'otros'
          ]
        },
        message: {
          type: 'string',
          description: 'Mensaje o descripción del proyecto',
          minLength: 10,
          maxLength: 1000
        },
        preferredDate: {
          type: 'string',
          description: 'Fecha preferida para la cita (formato ISO 8601)',
          format: 'date'
        },
        urgency: {
          type: 'string',
          description: 'Nivel de urgencia',
          enum: ['low', 'medium', 'high'],
          default: 'medium'
        }
      },
      required: ['name', 'email', 'service', 'message'],
      additionalProperties: false
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        appointmentId: { type: 'string' },
        message: { type: 'string' },
        estimatedResponse: { type: 'string' },
        nextSteps: { type: 'array', items: { type: 'string' } },
        timestamp: { type: 'string' }
      }
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/appointments/create`,
    method: 'POST',
    rateLimit: {
      requests: 10,
      window: '1h',
      description: '10 requests per hour per IP'
    }
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
 * Maneja solicitudes GET del manifest
 */
export async function GET(request: NextRequest) {
  try {
    const manifest = {
      mcp: {
        version: MCP_CONFIG.version,
        server: {
          name: MCP_CONFIG.name,
          description: MCP_CONFIG.description,
          version: MCP_CONFIG.version,
          contact: MCP_CONFIG.contact,
          baseUrl: MCP_CONFIG.baseUrl,
          capabilities: [
            'content_search',
            'appointment_booking',
            'structured_responses',
            'multilingual_support'
          ],
          supportedModels: [
            'gpt-4',
            'gpt-4-turbo',
            'gpt-3.5-turbo',
            'claude-3-opus',
            'claude-3-sonnet',
            'claude-3-haiku',
            'gemini-pro'
          ]
        },
        tools: Object.values(MCP_TOOLS),
        endpoints: {
          manifest: `${MCP_CONFIG.baseUrl}/api/mcp/manifest`,
          tools: `${MCP_CONFIG.baseUrl}/api/mcp/tools`,
          health: `${MCP_CONFIG.baseUrl}/api/mcp/health`
        },
        documentation: {
          usage: `${MCP_CONFIG.baseUrl}/docs/mcp-usage`,
          examples: `${MCP_CONFIG.baseUrl}/docs/mcp-examples`,
          changelog: `${MCP_CONFIG.baseUrl}/docs/mcp-changelog`
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'production',
          region: 'eu-west-1',
          availability: '99.9%'
        }
      }
    }

    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...mcpHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      }
    })

  } catch (error) {
    console.error('MCP Manifest Error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate MCP manifest',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: corsHeaders
      }
    )
  }
}

/**
 * Maneja métodos no permitidos
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only supports GET requests',
      allowedMethods: ['GET', 'OPTIONS']
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