import { NextRequest, NextResponse } from 'next/server'

/**
 * Utilidades de formato MCP para respuestas compatibles con conectores OpenAI.
 *
 * Objetivo:
 * - Proveer helpers para construir payloads MCP (content[] con { type: 'text', text })
 * - Añadir cabeceras CORS + MCP de forma consistente
 * - Detectar si el cliente solicita formato MCP (Accept: application/mcp+json o query ?mcp=1)
 * - Mantener compatibilidad dual (MCP y JSON clásico) desde los handlers
 */

export type McpTextContent = { type: 'text'; text: string }
export type McpResponse = { content: McpTextContent[] }

const MCP_ACCEPT_HEADER = 'application/mcp+json'

// Cabeceras CORS por defecto (alineadas con endpoints existentes)
export const MCP_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

/**
 * Devuelve true si el cliente solicita formato MCP (content[])
 * - Detecta por Accept: application/mcp+json
 * - También acepta query mcp=1 o mcp=true
 */
export function getWantsMcp(request: NextRequest | Request): boolean {
  try {
    const acceptRaw = request.headers.get('accept') || ''
    if (acceptRaw.toLowerCase().includes(MCP_ACCEPT_HEADER)) return true

    // Examina query param mcp=1/true
    const url = (request as any).nextUrl
      ? (request as NextRequest).nextUrl
      : new URL((request as Request).url)
    const mcpParam = url?.searchParams?.get('mcp')
    if (mcpParam && (mcpParam === '1' || mcpParam.toLowerCase() === 'true')) {
      return true
    }
  } catch (_) {
    // Ignorar errores y devolver false
  }
  return false
}

/**
 * Construye payload MCP OK: { content: [{ type: 'text', text: JSON.stringify(payload) }] }
 * No aplica cabeceras; para cabeceras usa addMcpHeaders.
 */
export function toMcpOk(payload: unknown): McpResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload),
      },
    ],
  }
}

/**
 * Construye payload MCP Error: { content: [{ type: 'text', text: JSON.stringify({ error, status }) }] }
 * No aplica cabeceras; para cabeceras usa addMcpHeaders.
 */
export function toMcpError(
  message: string,
  status: number,
  code?: string,
  data?: any
): McpResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: { message, code, data }, status }),
      },
    ],
  }
}

/**
 * Añade cabeceras CORS + MCP a una NextResponse ya creada.
 * - X-MCP-Tool: nombre de la herramienta (si se pasa)
 * - X-MCP-Version: si está configurada en env (E2D_MCP_VERSION)
 * - X-MCP-Response-Format: content:text (declarativo)
 */
export function addMcpHeaders(
  response: NextResponse,
  toolName?: string,
  extraHeaders: Record<string, string> = {}
): NextResponse {
  const headersToApply: Record<string, string> = {
    ...MCP_CORS_HEADERS,
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  Object.entries(headersToApply).forEach(([k, v]) => {
    try {
      response.headers.set(k, v)
    } catch (_) {
      // Ignorar si no se puede setear (no debería ocurrir en NextResponse)
    }
  })

  if (toolName) {
    response.headers.set('X-MCP-Tool', toolName)
  }

  const mcpVersion = process.env.E2D_MCP_VERSION
  if (mcpVersion) {
    response.headers.set('X-MCP-Version', mcpVersion)
  }

  response.headers.set('X-MCP-Response-Format', 'content:text')
  return response
}

/**
 * Helper opcional: responde en formato MCP o JSON clásico según getWantsMcp.
 * Útil para simplificar los handlers.
 */
export function respondAsMcpOrJson(
  request: NextRequest | Request,
  payload: any,
  status = 200,
  toolName?: string,
  extraHeaders: Record<string, string> = {}
): NextResponse {
  if (getWantsMcp(request)) {
    const res = NextResponse.json(toMcpOk(payload), { status })
    return addMcpHeaders(res, toolName, extraHeaders)
  }
  return NextResponse.json(payload, { status, headers: { ...MCP_CORS_HEADERS, ...extraHeaders } })
}

/**
 * Helper opcional: responde error en formato MCP o JSON clásico según getWantsMcp.
 */
export function respondErrorAsMcpOrJson(
  request: NextRequest | Request,
  message: string,
  status: number,
  code?: string,
  data?: any,
  toolName?: string,
  extraHeaders: Record<string, string> = {}
): NextResponse {
  if (getWantsMcp(request)) {
    const res = NextResponse.json(toMcpError(message, status, code, data), { status })
    return addMcpHeaders(res, toolName, extraHeaders)
  }
  const body: Record<string, any> = { error: message }
  if (code) body.code = code
  if (data !== undefined) body.data = data
  return NextResponse.json(body, { status, headers: { ...MCP_CORS_HEADERS, ...extraHeaders } })
}