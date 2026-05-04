/**
 * Validates the OAuth `resource` parameter (RFC 8707) against the canonical
 * MCP server URLs we expose. Different MCP clients pick different shapes:
 *  - Claude.ai sends the base URL with trailing slash (`https://evolve2digital.com/`)
 *  - Older/strict clients send the SSE endpoint (`.../sse`)
 *  - The bare base URL (no trailing slash) is also acceptable per RFC 8707.
 */
export function isAllowedResource(resource: string | undefined | null, baseUrl: string): boolean {
  if (!resource) return false
  const trimmed = resource.trim()
  if (!trimmed) return false
  const allowed = new Set([baseUrl, `${baseUrl}/`, `${baseUrl}/sse`])
  return allowed.has(trimmed)
}
