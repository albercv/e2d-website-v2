import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './oauth-jwt'
import { MCP_CORS_HEADERS } from './mcp-format'

function extractBearer(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() === 'bearer' && token) return token.trim()
  return null
}

export function requireOAuthScopes(request: NextRequest, requiredScopes: string[]): { error: NextResponse | null, claims?: any } {
  const bearer = extractBearer(request)
  if (!bearer) {
    const res = NextResponse.json(
      { error: 'Missing access token', message: 'Provide Authorization: Bearer <token>' },
      { status: 401 }
    )
    Object.entries({ ...MCP_CORS_HEADERS, 'WWW-Authenticate': 'Bearer realm="mcp", error="invalid_request"' }).forEach(([k,v]) => res.headers.set(k,v))
    return { error: res }
  }

  const claims = verifyAccessToken(bearer)
  if (!claims) {
    const res = NextResponse.json(
      { error: 'Invalid token', message: 'Signature, issuer or expiration invalid' },
      { status: 401 }
    )
    Object.entries({ ...MCP_CORS_HEADERS, 'WWW-Authenticate': 'Bearer realm="mcp", error="invalid_token"' }).forEach(([k,v]) => res.headers.set(k,v))
    return { error: res }
  }

  // Validar scopes
  const scopeList: string[] = Array.isArray(claims.scope) ? claims.scope : []
  const missing = requiredScopes.filter(s => !scopeList.includes(s))
  if (missing.length > 0) {
    const res = NextResponse.json(
      { error: 'Insufficient scope', required: requiredScopes, token_scope: scopeList },
      { status: 403 }
    )
    Object.entries({ ...MCP_CORS_HEADERS, 'WWW-Authenticate': `Bearer realm=\"mcp\", error=\"insufficient_scope\", scope=\"${requiredScopes.join(' ')}\"` }).forEach(([k,v]) => res.headers.set(k,v))
    return { error: res }
  }

  return { error: null, claims }
}