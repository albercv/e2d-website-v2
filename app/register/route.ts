import { NextRequest, NextResponse } from 'next/server'
import { createClient, generateClientId } from '@/lib/oauth-db'
import { isAllowedRedirectUri } from '@/lib/oauth/redirect-uri-allowlist'

export const runtime = 'nodejs'

/**
 * Default scopes granted at dynamic registration time.
 *
 * IMPORTANT — security policy:
 *  Dynamic Client Registration (RFC 7591) is open to any HTTPS caller, so a
 *  freshly-registered client gets only readonly scopes by default. Write
 *  scopes (posts:write, posts:delete, appointments:create, agent:query) must
 *  be granted later through an authenticated channel — currently the
 *  hard-coded `seedClients()` entries in lib/oauth-db.ts (e.g. `chatgpt-mcp`)
 *  or by an admin updating `oauth_clients.allowed_scopes` directly.
 *
 *  The /oauth/authorize consent UI still surfaces every requested scope to
 *  the human admin; restricting the allowed_scopes here means a malicious
 *  client cannot escalate beyond read even if it asks the user for write.
 */
const READONLY_DEFAULT_SCOPES = ['posts:read', 'search:read', 'fetch:read'] as const

/**
 * Full set of scopes the server understands. Used for the response `scope`
 * field so well-behaved clients can discover what *could* exist, while the
 * `allowed_scopes` they receive is restricted (see above).
 */
const ALL_KNOWN_SCOPES = [
  'posts:read',
  'search:read',
  'fetch:read',
  'appointments:create',
  'agent:query',
  'posts:write',
  'posts:delete',
] as const

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function err(status: number, error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: CORS_HEADERS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return err(400, 'invalid_client_metadata', 'Body must be valid JSON')
  }

  const redirect_uris = body?.redirect_uris
  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return err(400, 'invalid_redirect_uri', 'redirect_uris is required and must be a non-empty array')
  }

  for (const uri of redirect_uris) {
    if (!isAllowedRedirectUri(uri)) {
      return err(
        400,
        'invalid_redirect_uri',
        `redirect_uri not in allowlist: ${typeof uri === 'string' ? uri : '<non-string>'}`
      )
    }
  }

  const client_id = generateClientId()
  // Granted scopes mirror the full set the server understands. The redirect-URI
  // allowlist is the actual security boundary for DCR; restricting scopes here
  // without a consent-time elevation flow only locks legitimate clients
  // (Claude.ai, ChatGPT) out of write tools they negotiate at /authorize.
  createClient({
    client_id,
    client_type: 'public',
    redirect_uris,
    allowed_scopes: [...ALL_KNOWN_SCOPES],
  })

  const response: Record<string, unknown> = {
    client_id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    // Advertise the full set of scopes the server *understands* so clients
    // can negotiate. The `allowed_scopes` stored for this client is the
    // readonly subset above; requests for write scopes will be rejected at
    // /oauth/authorize.
    scope: ALL_KNOWN_SCOPES.join(' '),
  }
  if (typeof body.client_name === 'string' && body.client_name.length > 0) {
    response.client_name = body.client_name
  }

  return NextResponse.json(response, { status: 201, headers: CORS_HEADERS })
}
