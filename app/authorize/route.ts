import { mcpLogger } from '@/lib/mcp-logger'
import { getClientById, validateRedirectUri } from '@/lib/oauth-db'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const client_id = url.searchParams.get('client_id') || ''
  const redirect_uri = url.searchParams.get('redirect_uri') || ''
  const scopeStr = url.searchParams.get('scope') || ''
  const scope = scopeStr.split(' ').filter(Boolean)
  const state = url.searchParams.get('state') || ''
  const response_type = (url.searchParams.get('response_type') || 'code').toLowerCase()
  const code_challenge = url.searchParams.get('code_challenge') || ''
  const code_challenge_method = (url.searchParams.get('code_challenge_method') || 'S256').toUpperCase()

  const userAgent = req.headers.get('user-agent') || undefined

  // Basic presence check
  if (!client_id || !redirect_uri) {
    mcpLogger.log({
      eventType: 'validation_failed',
      level: 'warn',
      endpoint: '/authorize',
      method: 'GET',
      userAgent,
      query: url.searchParams.toString(),
      success: false,
      statusCode: 400,
      error: 'Missing required parameters: client_id and redirect_uri',
      metadata: { client_id_present: !!client_id, redirect_uri_present: !!redirect_uri }
    })
    return Response.json({ ok: false, error: 'missing_params', message: 'Required: client_id and redirect_uri' }, { status: 400 })
  }

  // Client validation via DB (runs on Node.js runtime)
  const client = getClientById(client_id)
  if (!client) {
    mcpLogger.log({
      eventType: 'validation_failed',
      level: 'warn',
      endpoint: '/authorize',
      method: 'GET',
      userAgent,
      query: url.searchParams.toString(),
      success: false,
      statusCode: 400,
      error: 'Invalid client_id',
      metadata: { client_id }
    })
    return Response.json({ ok: false, error: 'invalid_client_id' }, { status: 400 })
  }

  if (!validateRedirectUri(client, redirect_uri)) {
    mcpLogger.log({
      eventType: 'validation_failed',
      level: 'warn',
      endpoint: '/authorize',
      method: 'GET',
      userAgent,
      query: url.searchParams.toString(),
      success: false,
      statusCode: 400,
      error: 'redirect_uri not allowed for client',
      metadata: { client_id, redirect_uri, allowed: client.redirect_uris }
    })
    return Response.json({ ok: false, error: 'invalid_redirect_uri', allowed: client.redirect_uris }, { status: 400 })
  }

  // GET /authorize remains permissive with respect to scope and PKCE; strict checks occur in POST /oauth/authorize
  mcpLogger.log({
    eventType: 'success',
    level: 'info',
    endpoint: '/authorize',
    method: 'GET',
    userAgent,
    query: url.searchParams.toString(),
    success: true,
    statusCode: 200,
    metadata: { client_id, redirect_uri, scope, state, response_type, code_challenge_method, pkce_present: !!code_challenge }
  })

  return Response.json({
    ok: true,
    client_id,
    redirect_uri,
    scope,
    state,
    response_type,
    code_challenge_present: !!code_challenge,
    code_challenge_method
  }, { status: 200 })
}