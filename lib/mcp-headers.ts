/**
 * Shared MCP/CORS headers helper
 * Ensures consistent headers across all MCP endpoints and tools.
 */

export type HttpMethod = 'GET' | 'POST' | 'OPTIONS' | 'HEAD' | 'PUT' | 'DELETE' | 'PATCH'

export const DEFAULT_ALLOWED_METHODS: HttpMethod[] = ['GET', 'POST', 'OPTIONS']

/**
 * Standard CORS headers for MCP tools and manifest endpoints.
 * NOTE: Authorization and X-API-Key included for authenticated tools.
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS.join(', '),
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
}

/**
 * MCP-specific headers used across responses.
 */
export const MCP_HEADERS: Record<string, string> = {
  'X-MCP-Version': '1.0',
  'X-MCP-Server': 'evolve2digital',
  'X-Content-Type': 'mcp-manifest',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
}

/**
 * Apply CORS headers, allowing override of allowed methods and optional extra headers.
 */
export function applyCORS(
  allowedMethods: HttpMethod[] = DEFAULT_ALLOWED_METHODS,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    ...CORS_HEADERS,
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
  }
  if (extraHeaders) {
    Object.assign(headers, extraHeaders)
  }
  return headers
}

/**
 * Apply MCP headers with optional extra fields.
 */
export function applyMCPHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...MCP_HEADERS }
  if (extraHeaders) {
    Object.assign(headers, extraHeaders)
  }
  return headers
}

/**
 * Convenience helper to combine both CORS and MCP headers.
 */
export function withCORSAndMCP(
  allowedMethods: HttpMethod[] = DEFAULT_ALLOWED_METHODS,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  return { ...applyCORS(allowedMethods), ...applyMCPHeaders(extraHeaders) }
}