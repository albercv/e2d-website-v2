import { NextRequest } from 'next/server'
import { mcpLogger } from '@/lib/mcp-logger'

// Runtime and caching controls for MCP manifest
export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const fetchCache = 'force-no-store'
export const revalidate = 0

/**
 * MCP (Model Context Protocol) Manifest Público
 * Sirve el manifest directamente en /mcp/manifest sin redirecciones,
 * conforme al conector MCP de OpenAI/ChatGPT.
 */

/** Configuración del manifest MCP */
const MCP_CONFIG = {
  version: '1.0.0',
  name: 'Evolve2Digital MCP Server',
  description: 'Herramientas MCP para consultar contenido y servicios de Evolve2Digital',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com',
  contact: {
    name: 'Alberto Carrasco',
    email: 'alberto@evolve2digital.com',
    website: 'https://evolve2digital.com',
  },
}

// Strict headers to avoid transformations and streaming
const MANIFEST_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
}

const MANIFEST_BASE_HEADERS: Record<string, string> = {
  ...MANIFEST_CORS_HEADERS,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-transform',
  'Content-Encoding': 'identity',
  'X-MCP-Version': '1.0',
  'X-MCP-Server': 'evolve2digital',
  'X-Content-Type': 'mcp-manifest',
}

/** Definición de herramientas MCP disponibles */
const MCP_TOOLS = {
  'agent.query': {
    name: 'agent.query',
    description:
      'Consulta al agente IA interno de E2D (Johanna) para obtener respuestas especializadas sobre servicios, tecnología y automatización',
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
            '¿Qué servicios de desarrollo web ofrece E2D?',
          ],
        },
        locale: {
          type: 'string',
          description: 'Idioma preferido para la respuesta',
          enum: ['es', 'en', 'it'],
          default: 'es',
        },
        includeContext: {
          type: 'boolean',
          description: 'Incluir contexto adicional en la respuesta',
          default: true,
        },
      },
      required: ['prompt'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description: 'Respuesta generada por el agente IA de E2D',
        },
        source: { type: 'string', description: 'Identificador del agente (E2D Agent)' },
        timestamp: { type: 'string', description: 'Marca de tiempo ISO 8601' },
        confidence: { type: 'number', description: 'Nivel de confianza de la respuesta (0-1)' },
        tokens_used: { type: 'number', description: 'Número de tokens utilizados (si disponible)' },
        metadata: { type: 'object', description: 'Metadatos adicionales de la respuesta' },
      },
      required: ['response', 'source', 'timestamp'],
    },
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['agent:query'],
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/agent/query`,
    method: 'POST',
    rateLimit: { requests: 20, window: '1h', description: '20 requests per hour per IP' },
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
          examples: ['automatización WhatsApp', 'desarrollo web moderno', 'chatbots para clínicas'],
        },
        locale: { type: 'string', description: 'Idioma preferido para los resultados', enum: ['es', 'en', 'it'], default: 'es' },
        limit: { type: 'integer', description: 'Número máximo de resultados a devolver', minimum: 1, maximum: 10, default: 5 },
        includeContent: { type: 'boolean', description: 'Incluir fragmentos del contenido en los resultados', default: true },
      },
      required: ['query'],
      additionalProperties: false,
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
              author: { type: 'string' },
            },
          },
        },
        totalResults: { type: 'integer' },
        processingTime: { type: 'number' },
        timestamp: { type: 'string' },
      },
    },
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['posts:read'],
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/posts/search`,
    method: 'GET',
    rateLimit: { requests: 100, window: '1m', description: '100 requests per minute per IP' },
  },

  'appointments.create': {
    name: 'appointments.create',
    description: 'Crea una solicitud de cita o contacto comercial',
    category: 'business',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre completo del solicitante', minLength: 2, maxLength: 100 },
        email: { type: 'string', description: 'Dirección de email válida', format: 'email' },
        phone: { type: 'string', description: 'Número de teléfono (opcional)', pattern: '^[+]?[0-9\\s\\-\\(\\)]{7,20}$' },
        company: { type: 'string', description: 'Nombre de la empresa (opcional)', maxLength: 100 },
        service: {
          type: 'string',
          description: 'Tipo de servicio solicitado',
          enum: ['automatizacion-whatsapp', 'desarrollo-web', 'chatbots', 'consultoria-digital', 'marketing-automation', 'otros'],
        },
        message: { type: 'string', description: 'Mensaje o descripción del proyecto', minLength: 10, maxLength: 1000 },
        preferredDate: { type: 'string', description: 'Fecha preferida para la cita (formato ISO 8601)', format: 'date' },
        urgency: { type: 'string', description: 'Nivel de urgencia', enum: ['low', 'medium', 'high'], default: 'medium' },
      },
      required: ['name', 'email', 'service', 'message'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        appointmentId: { type: 'string' },
        message: { type: 'string' },
        estimatedResponse: { type: 'string' },
        nextSteps: { type: 'array', items: { type: 'string' } },
        timestamp: { type: 'string' },
      },
    },
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['appointments:create'],
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/appointments/create`,
    method: 'POST',
    rateLimit: { requests: 10, window: '1h', description: '10 requests per hour per IP' },
  },

  'posts.get': {
    name: 'posts.get',
    description: 'Recupera un post del blog por título o slug',
    category: 'content',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título exacto del post', minLength: 2 },
        slug: { type: 'string', description: 'Slug del post', minLength: 2 },
        locale: { type: 'string', description: 'Idioma del post', enum: ['es', 'en', 'it'], default: 'es' },
        includeContent: { type: 'boolean', description: 'Incluir el cuerpo completo del post', default: false },
      },
      anyOf: [{ required: ['title'] }, { required: ['slug'] }],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        post: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            url: { type: 'string' },
            date: { type: 'string' },
            locale: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            author: { type: 'string' },
            slug: { type: 'string' },
            wordCount: { type: 'number' },
            readingTime: { type: 'object' },
            body: { type: 'string' },
          },
        },
        timestamp: { type: 'string' },
        processingTime: { type: 'number' },
      },
    },
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['posts:read'],
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/posts/get`,
    method: 'GET',
    rateLimit: { requests: 100, window: '1m', description: '100 requests per minute per IP' },
  },

  'posts.create': {
    name: 'posts.create',
    description:
      'Crea un nuevo post del blog (MDX) en el repositorio. Requiere API key. Soporta formato MCP (Accept: application/mcp+json o ?mcp=1) y JSON clásico.',
    category: 'content',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título del post', minLength: 3 },
        description: { type: 'string', description: 'Descripción del post', minLength: 10 },
        locale: { type: 'string', description: 'Idioma del post', enum: ['es', 'en', 'it'], default: 'es' },
        content: { type: 'string', description: 'Contenido en MDX', minLength: 50 },
        tags: { type: 'array', items: { type: 'string' } },
        date: { type: 'string', description: 'Fecha ISO (YYYY-MM-DD)', format: 'date' },
        author: { type: 'string', description: 'Autor del post', default: 'Alberto Carrasco' },
        published: { type: 'boolean', description: 'Indicador de publicación', default: true },
      },
      required: ['title', 'description', 'locale', 'content'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        created: { type: 'boolean' },
        slug: { type: 'string' },
        locale: { type: 'string' },
        url: { type: 'string' },
        path: { type: 'string' },
        timestamp: { type: 'string' },
        processingTime: { type: 'number' },
      },
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/posts/create`,
    method: 'POST',
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['posts:write'],
    },
    rateLimit: { requests: 20, window: '1m', description: '20 requests per minute per IP' },
  },

  'posts.schema': {
    name: 'posts.schema',
    description: 'Devuelve la estructura y variables admitidas por los posts del blog (frontmatter y campos computados)',
    category: 'content',
    inputSchema: { type: 'object', properties: { format: { type: 'string', description: 'Formato deseado de la salida', enum: ['json'], default: 'json' } }, additionalProperties: false },
    outputSchema: {
      type: 'object',
      properties: {
        schema: { type: 'object' },
        acceptedLocales: { type: 'array', items: { type: 'string' } },
        examples: { type: 'object' },
        timestamp: { type: 'string' },
        processingTime: { type: 'number' },
      },
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/posts/schema`,
    method: 'GET',
    rateLimit: { requests: 100, window: '1m', description: '100 requests per minute per IP' },
  },

  'posts.delete': {
    name: 'posts.delete',
    description:
      'Elimina un post del blog por slug. Requiere API key. Soporta formato MCP (Accept: application/mcp+json o ?mcp=1) y JSON clásico. Método recomendado: POST (también acepta DELETE).',
    category: 'content',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Slug del post a eliminar', minLength: 2 },
        locale: { type: 'string', description: 'Idioma del post (opcional)', enum: ['es', 'en', 'it'] },
      },
      required: ['slug'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean' },
        slug: { type: 'string' },
        locale: { type: 'string' },
        url: { type: 'string' },
        path: { type: 'string' },
        timestamp: { type: 'string' },
        processingTime: { type: 'number' },
      },
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/posts/delete`,
    method: 'POST',
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['posts:delete'],
    },
    rateLimit: { requests: 20, window: '1m', description: '20 requests per minute per IP' },
  },

  search: {
    name: 'search',
    description:
      'Herramienta MCP estándar (POST) para buscar contenido del blog. Formatea salida MCP content[] y soporta JSON clásico.',
    category: 'mcp',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta de búsqueda en texto libre', minLength: 2, maxLength: 500 },
        locale: { type: 'string', description: 'Idioma preferido', enum: ['es', 'en', 'it'], default: 'es' },
        limit: { type: 'integer', description: 'Número máximo de resultados', minimum: 1, maximum: 10, default: 5 },
        includeContent: { type: 'boolean', description: 'Incluir fragmentos del contenido', default: true },
      },
      required: ['query'],
      additionalProperties: false,
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
              locale: { type: 'string' },
              slug: { type: 'string' },
              relevanceScore: { type: 'number' },
              contentSnippet: { type: 'string' },
              author: { type: 'string' },
            },
          },
        },
        totalResults: { type: 'integer' },
        processingTime: { type: 'number' },
        timestamp: { type: 'string' },
      },
    },
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['posts:read'],
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/search`,
    method: 'POST',
    rateLimit: { requests: 60, window: '1m', description: '60 requests per minute per IP' },
  },

  fetch: {
    name: 'fetch',
    description:
      'Herramienta MCP estándar (POST) para recuperar un post por slug+locale o URL. Formatea salida MCP content[] y soporta JSON clásico.',
    category: 'mcp',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL del post (p. ej. https://evolve2digital.com/es/blog/<slug>)' },
        slug: { type: 'string', description: 'Slug del post', minLength: 2 },
        locale: { type: 'string', description: 'Idioma del post', enum: ['es', 'en', 'it'], default: 'es' },
        includeContent: { type: 'boolean', description: 'Incluir el cuerpo completo', default: false },
      },
      anyOf: [{ required: ['url'] }, { required: ['slug'] }],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        post: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            url: { type: 'string' },
            date: { type: 'string' },
            locale: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            author: { type: 'string' },
            slug: { type: 'string' },
            wordCount: { type: 'number' },
            readingTime: { type: 'object' },
            body: { type: 'string' },
          },
        },
        timestamp: { type: 'string' },
        processingTime: { type: 'number' },
      },
    },
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      scopes: ['posts:read'],
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/fetch`,
    method: 'POST',
    rateLimit: { requests: 60, window: '1m', description: '60 requests per minute per IP' },
  },
}

function buildManifest() {
  return {
    mcp: {
      version: MCP_CONFIG.version,
      server: {
        name: MCP_CONFIG.name,
        description: MCP_CONFIG.description,
        version: MCP_CONFIG.version,
        contact: MCP_CONFIG.contact,
        baseUrl: MCP_CONFIG.baseUrl,
        capabilities: ['content_search', 'appointment_booking', 'structured_responses', 'multilingual_support'],
        supportedModels: [
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
          'claude-3-opus',
          'claude-3-sonnet',
          'claude-3-haiku',
          'gemini-pro',
        ],
      },
      tools: Object.values(MCP_TOOLS),
      endpoints: {
        manifest: `${MCP_CONFIG.baseUrl}/mcp/manifest`,
        tools: `${MCP_CONFIG.baseUrl}/api/mcp/tools`,
        health: `${MCP_CONFIG.baseUrl}/api/mcp/health`,
        sse: `${MCP_CONFIG.baseUrl}/sse`,
      },
      documentation: {
        usage: `${MCP_CONFIG.baseUrl}/docs/mcp-usage`,
        examples: `${MCP_CONFIG.baseUrl}/docs/mcp-examples`,
        changelog: `${MCP_CONFIG.baseUrl}/docs/mcp-changelog`,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        region: 'eu-west-1',
        availability: '99.9%',
      },
    },
  }
}

export async function OPTIONS(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  mcpLogger.logManifestRequest('/mcp/manifest', 'OPTIONS', true, Date.now() - startTime, 200, userAgent)
  return new Response(null, { status: 200, headers: MANIFEST_CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const manifest = buildManifest()
    const bodyString = JSON.stringify(manifest)
    const bodyBuffer = Buffer.from(bodyString, 'utf-8')
    const headers = new Headers(MANIFEST_BASE_HEADERS)
    headers.set('Content-Length', String(bodyBuffer.byteLength))
    mcpLogger.logManifestRequest('/mcp/manifest', 'GET', true, Date.now() - startTime, 200, request.headers.get('user-agent') || undefined)
    return new Response(bodyBuffer, { status: 200, headers })
  } catch (error) {
    mcpLogger.logError('/mcp/manifest', 'GET', (error as Error).message, 500, request.headers.get('user-agent') || undefined)
    const errBody = Buffer.from(
      JSON.stringify({ error: 'Internal server error', message: 'Failed to generate MCP manifest', timestamp: new Date().toISOString() }),
      'utf-8'
    )
    const headers = new Headers(MANIFEST_BASE_HEADERS)
    headers.set('Content-Length', String(errBody.byteLength))
    return new Response(errBody, { status: 500, headers })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const manifest = buildManifest()
    const bodyString = JSON.stringify(manifest)
    const bodyBuffer = Buffer.from(bodyString, 'utf-8')
    const headers = new Headers(MANIFEST_BASE_HEADERS)
    headers.set('Content-Length', String(bodyBuffer.byteLength))
    mcpLogger.logManifestRequest('/mcp/manifest', 'POST', true, Date.now() - startTime, 200, request.headers.get('user-agent') || undefined)
    return new Response(bodyBuffer, { status: 200, headers })
  } catch (error) {
    mcpLogger.logError('/mcp/manifest', 'POST', (error as Error).message, 500, request.headers.get('user-agent') || undefined)
    const errBody = Buffer.from(
      JSON.stringify({ error: 'Internal server error', message: 'Failed to generate MCP manifest', timestamp: new Date().toISOString() }),
      'utf-8'
    )
    const headers = new Headers(MANIFEST_BASE_HEADERS)
    headers.set('Content-Length', String(errBody.byteLength))
    return new Response(errBody, { status: 500, headers })
  }
}