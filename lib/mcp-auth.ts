import { NextRequest, NextResponse } from 'next/server'

/**
 * MCP Auth Helper
 * Verifica API key para herramientas MCP que requieren autenticación.
 * Soporta dos formatos de cabecera:
 * - Authorization: Bearer <API_KEY>
 * - X-API-Key: <API_KEY>
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  const xApiKey = request.headers.get('x-api-key')

  if (xApiKey && xApiKey.trim().length > 0) {
    return xApiKey.trim()
  }

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ')
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return token.trim()
    }
  }

  return null
}

export function requireApiKey(request: NextRequest): NextResponse | null {
  const expected = process.env.E2D_MCP_API_KEY
  const provided = extractApiKey(request)

  if (!expected) {
    // Si no hay clave configurada en el entorno, bloquear por seguridad
    return NextResponse.json(
      {
        error: 'Server not configured with API key',
        message: 'Missing E2D_MCP_API_KEY on server',
      },
      { status: 500, headers: { ...corsHeaders } }
    )
  }

  if (!provided) {
    return NextResponse.json(
      { error: 'Missing API key', message: 'Provide Authorization: Bearer <API_KEY> or X-API-Key header' },
      {
        status: 401,
        headers: {
          ...corsHeaders,
          'WWW-Authenticate': 'Bearer realm="mcp"',
        },
      }
    )
  }

  if (provided !== expected) {
    return NextResponse.json(
      { error: 'Invalid API key', message: 'Unauthorized' },
      { status: 403, headers: { ...corsHeaders } }
    )
  }

  return null
}